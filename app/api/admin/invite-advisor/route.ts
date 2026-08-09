import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ALERT_PHONE_NUMBER_ID = "1116534344880535";

// The hybrid advisor experience: student-by-default, but can pull back the
// curtain on request (same profile Stanley & Matthew have).
const ADVISOR_TONE =
  "This person is an advisor to HomeTutor AI who wants to experience the platform exactly as a student does, while keeping an advisor's ability to see behind the curtain. BY DEFAULT, give them the authentic student experience: use the Socratic method, guide with questions, probe what they already know, and do not simply hand over answers. HOWEVER, because they are an advisor, if they explicitly ask for a direct answer, provide it — and when you do, briefly break the fourth wall: tell them you are giving it directly because they are an advisor to the platform, then explain what you would do with a real student instead (for example: \"for a student, I would not give this outright — I would first ask what they already know, then guide them step by step toward it\"). So: default to the full student experience, but whenever they ask for the answer or how it works, be transparent — give it and narrate how a genuine student interaction would differ.";

export async function POST(req: NextRequest) {
  // Admin-only — this route isn't covered by the /admin middleware matcher.
  if (req.cookies.get("admin_session")?.value !== process.env.ADMIN_SESSION_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let b: { name?: string; phone?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const name = (b.name ?? "").trim();
  const phone = (b.phone ?? "").replace(/[^0-9]/g, ""); // digits only, no leading +
  if (!name || phone.length < 8) {
    return NextResponse.json({ error: "Name and a valid phone number (with country code) are required." }, { status: 400 });
  }

  const { error } = await supabase.from("profiles").insert({
    phone_number: phone,
    name,
    language: "English",
    tone: ADVISOR_TONE,
    active: true,
  });
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "That number is already registered." }, { status: 409 });
    console.error("Invite advisor insert error:", error.message);
    return NextResponse.json({ error: "Could not create the advisor profile." }, { status: 500 });
  }

  // Best-effort WhatsApp invite. WhatsApp may not deliver a business-initiated
  // first message until the recipient messages the bot, so we report accepted,
  // not delivered.
  let sent = false;
  const token = process.env.META_ACCESS_TOKEN;
  if (token) {
    const msg =
      `Hi ${name}! 👋 This is HomeTutor AI. You've been added as an advisor to the platform — welcome!\n\n` +
      `Try it exactly as a student would: ask me for help with any topic and I'll guide you with questions. ` +
      `Any time, as an advisor, you can ask me directly how something works and I'll explain what's happening under the hood.\n\n` +
      `Just reply here whenever you'd like to start.`;
    try {
      const r = await fetch(`https://graph.facebook.com/v20.0/${ALERT_PHONE_NUMBER_ID}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: phone, type: "text", text: { body: msg } }),
      });
      sent = r.ok;
    } catch (e) {
      console.error("Invite send failed:", e);
    }
  }

  return NextResponse.json({ success: true, sent });
}
