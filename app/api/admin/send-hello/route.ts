import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Redis } from "@upstash/redis";
import { personalise, HELLO_MAX_RECIPIENTS } from "@/lib/hello";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// The number these go out from. Deliberately the production line, as the invite
// and safety-alert sends are: META_PHONE_NUMBER_ID is the *test* number in local
// envs, and a hello from an unfamiliar number is worse than no hello. Override
// only via the dedicated var.
const PHONE_NUMBER_ID = (process.env.META_HELLO_PHONE_NUMBER_ID || "1116534344880535").trim();

// Meta's customer-service window: a free-form text only delivers if the person
// messaged us in the last 24 hours. Outside it, Meta rejects the send (131047)
// and only a pre-approved template gets through — which is exactly the case for
// a student who has gone quiet, so the window is checked before every send.
const WINDOW_MS = 24 * 60 * 60 * 1000;

// Optional re-engagement template, set once it's approved in WhatsApp Manager.
// Expected shape: one body parameter, the student's first name.
const TEMPLATE_NAME = (process.env.META_HELLO_TEMPLATE || "").trim();
const TEMPLATE_LANG = (process.env.META_HELLO_TEMPLATE_LANG || "en").trim();

// Mirror the webhook's conversation store so the tutor's next turn knows it
// has just said hello, instead of greeting the student all over again.
const CONV_MAX = 12;
const CONV_TTL_S = 60 * 60;

type Outcome = {
  phone: string;
  name: string;
  ok: boolean;
  via: "text" | "template" | null;
  error?: string;
};

// Turn a Meta API failure into something an admin can act on.
function explainMetaError(status: number, payload: unknown): string {
  const code = (payload as { error?: { code?: number; error_data?: { details?: string }; message?: string } })?.error;
  switch (code?.code) {
    case 131047:
      return TEMPLATE_NAME
        ? "Outside the 24-hour window and the template send also failed."
        : "Outside the 24-hour window — WhatsApp won't deliver a free-form message. Needs an approved template.";
    case 131026:
      return "Undeliverable — the number may not be on WhatsApp.";
    case 133010:
      return "That number isn't registered on WhatsApp.";
    case 131031:
      return "The WhatsApp Business account is restricted.";
    case 190:
      return "The Meta access token has expired.";
    default:
      return code?.error_data?.details || code?.message || `Meta API ${status}`;
  }
}

async function metaSend(body: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", ...body }),
  });
  if (res.ok) return { ok: true };
  let payload: unknown;
  try { payload = await res.json(); } catch { payload = await res.text(); }
  console.error("Hello send failed:", JSON.stringify(payload));
  return { ok: false, error: explainMetaError(res.status, payload) };
}

export async function POST(req: NextRequest) {
  if (req.cookies.get("admin_session")?.value !== process.env.ADMIN_SESSION_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.META_ACCESS_TOKEN) {
    return NextResponse.json({ error: "META_ACCESS_TOKEN isn't set — can't send." }, { status: 500 });
  }

  let b: { phones?: unknown; body?: unknown };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const phones = Array.isArray(b.phones)
    ? [...new Set(b.phones.map((p) => String(p).replace(/\D/g, "")).filter(Boolean))]
    : [];
  const draft = typeof b.body === "string" ? b.body.trim() : "";

  if (!phones.length) return NextResponse.json({ error: "Pick at least one student." }, { status: 400 });
  if (phones.length > HELLO_MAX_RECIPIENTS) {
    return NextResponse.json({ error: `Up to ${HELLO_MAX_RECIPIENTS} students at a time.` }, { status: 400 });
  }
  if (!draft) return NextResponse.json({ error: "The message is empty." }, { status: 400 });
  if (draft.length > 3000) return NextResponse.json({ error: "That message is too long for WhatsApp." }, { status: 400 });

  // Only ever send to a number that is an active profile — never to whatever
  // the client posted.
  const { data: rows, error: profErr } = await supabase
    .from("profiles")
    .select("phone_number,name,language")
    .eq("active", true)
    .in("phone_number", phones);
  if (profErr) {
    console.error("Hello profile lookup failed:", profErr.message);
    return NextResponse.json({ error: "Could not load the students." }, { status: 500 });
  }
  const recipients = rows ?? [];
  if (!recipients.length) {
    return NextResponse.json({ error: "No active student matched those numbers." }, { status: 400 });
  }

  // One query tells us who is inside the 24-hour window.
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const { data: recent } = await supabase
    .from("messages")
    .select("phone_number")
    .eq("role", "user")
    .gte("created_at", since)
    .in("phone_number", recipients.map((r) => r.phone_number as string));
  const openWindow = new Set((recent ?? []).map((m) => m.phone_number as string));

  const results: Outcome[] = [];
  for (const r of recipients) {
    const phone = r.phone_number as string;
    const name = (r.name as string) ?? "";
    const text = personalise(draft, name);
    const first = (name || "there").trim().split(/\s+/)[0];

    let sent: { ok: boolean; error?: string };
    let via: Outcome["via"] = null;

    if (openWindow.has(phone)) {
      via = "text";
      sent = await metaSend({ to: phone, type: "text", text: { body: text } });
    } else if (TEMPLATE_NAME) {
      // Out of window: only an approved template can reopen the conversation.
      via = "template";
      sent = await metaSend({
        to: phone,
        type: "template",
        template: {
          name: TEMPLATE_NAME,
          language: { code: TEMPLATE_LANG },
          components: [{ type: "body", parameters: [{ type: "text", text: first }] }],
        },
      });
    } else {
      via = "text";
      // Try anyway: the window is derived from our own message log, which can
      // lag or miss a reply, and Meta is the real authority on it.
      sent = await metaSend({ to: phone, type: "text", text: { body: text } });
    }

    results.push({ phone, name, ok: sent.ok, via: sent.ok ? via : null, error: sent.error });

    if (!sent.ok) continue;

    // Record it the way the tutor's own replies are recorded, so the hello shows
    // up in activity and in the next turn's context.
    const logged = via === "template"
      ? `[admin hello — template "${TEMPLATE_NAME}"]`
      : text;
    const { error: logErr } = await supabase.from("messages").insert({
      phone_number: phone,
      child_name: name,
      role: "assistant",
      content: logged,
      subject_detected: null,
    });
    if (logErr) console.error("Hello log failed:", logErr.message);

    try {
      const key = `conv:${phone}`;
      const history = (await redis.get<{ role: string; content: string }[]>(key)) ?? [];
      await redis.set(key, [...history, { role: "assistant", content: logged }].slice(-CONV_MAX), { ex: CONV_TTL_S });
    } catch (e) {
      console.error("Hello history update failed:", e);
    }
  }

  const skipped = phones.filter((p) => !recipients.some((r) => r.phone_number === p));
  return NextResponse.json({
    success: true,
    sent: results.filter((r) => r.ok).length,
    results,
    skipped,
    templateConfigured: !!TEMPLATE_NAME,
  });
}
