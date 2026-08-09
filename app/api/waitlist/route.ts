import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { waitUntil } from "@vercel/functions";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_PHONE = "972526101313";               // Roi — receives signup pings
const ALERT_PHONE_NUMBER_ID = "1116534344880535"; // production number

// Server-side email validation — never trust the client alone.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Best-effort WhatsApp ping so you know about a signup without opening Supabase.
async function notifyAdmin(name: string, email: string, language: string) {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) return;
  const body =
    `📝 New HomeTutor AI waitlist signup\n\n` +
    `Name: ${name || "(not given)"}\n` +
    `Email: ${email}\n` +
    `Language: ${language}`;
  try {
    await fetch(`https://graph.facebook.com/v20.0/${ALERT_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: ADMIN_PHONE,
        type: "text",
        text: { body },
      }),
    });
  } catch (e) {
    console.error("Waitlist notify failed:", e);
  }
}

export async function POST(req: NextRequest) {
  let body: { name?: string; email?: string; language?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const name = (body.name ?? "").trim();
  const language = ((body.language ?? "").trim().slice(0, 5)) || "en";

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  const { error } = await supabase.from("waitlist").insert({
    name: name || null,
    email,
    language,
    source: "holding_page",
  });

  if (error) {
    // Duplicate email is fine from the user's perspective — treat as success.
    if (error.code === "23505") return NextResponse.json({ success: true, duplicate: true });
    console.error("Waitlist insert error:", error.message);
    return NextResponse.json({ error: "Could not save your signup. Please try again." }, { status: 500 });
  }

  waitUntil(notifyAdmin(name, email, language));
  return NextResponse.json({ success: true });
}
