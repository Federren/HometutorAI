import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { waitUntil } from "@vercel/functions";
import { sendEmail } from "@/lib/email";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ALERT_PHONE_NUMBER_ID = "1116534344880535";
const BOT_NUMBER = "+972 55-935-5411";

type Role = "advisor" | "teacher" | "tester";
const ROLES: Role[] = ["advisor", "teacher", "tester"];

// Reliable invitation email (WhatsApp can't reach a new contact first).
function inviteEmail(role: Role, name: string): { subject: string; html: string } {
  const label = role === "teacher" ? "teacher" : role === "tester" ? "tester" : "advisor";
  const teacherLine = role === "teacher"
    ? `<p>As a teacher, feel free to probe how it handles a struggling student, why it withholds answers, and the soundness of its explanations — your critique is exactly what we want.</p>`
    : "";
  return {
    subject: "You're invited to try HomeTutor AI",
    html: `<div style="font-family:system-ui,Arial,sans-serif;font-size:15px;color:#1a1a1a;line-height:1.7;max-width:520px">
      <p>Hi ${name},</p>
      <p>You've been invited to try <b>HomeTutor AI</b> as ${label === "advisor" ? "an" : "a"} ${label}. It's a WhatsApp tutor that guides students to answers with questions — never just handing them over.</p>
      <p><b>To start:</b> open WhatsApp and send a "hi" to <span dir="ltr">${BOT_NUMBER}</span>. It'll greet you, and you can try it exactly as a student would. Any time, you can also ask it directly how it works and it'll explain what's happening under the hood.</p>
      ${teacherLine}
      <p>Any questions, just reply to this email or reach us at hello@hometutorai.io.</p>
      <p style="color:#1B3D2F;font-weight:600">The HomeTutor AI team</p>
    </div>`,
  };
}

function roleNoun(role: Role): string {
  return role === "teacher" ? "a teacher evaluating HomeTutor AI"
    : role === "tester" ? "a tester of HomeTutor AI"
    : "an advisor to HomeTutor AI";
}

// Same hybrid engine for all three roles: student experience by default, but
// they can pull back the curtain. Teachers get an extra educator-focused nudge.
function toneFor(role: Role, name: string): string {
  const who = name ? `${name} is` : "This person is";
  const base =
    `${who} ${roleNoun(role)} who wants to experience the platform exactly as a student does, while keeping the ability to see behind the curtain. ` +
    `BY DEFAULT, give them the authentic student experience: use the Socratic method, guide with questions, probe what they already know, and do not simply hand over answers. ` +
    `HOWEVER, because they are here to evaluate the platform, if they explicitly ask for a direct answer, provide it — and when you do, briefly break the fourth wall: tell them you are giving it directly because they are evaluating the platform, then explain what you would do with a real student instead ` +
    `(for example: "for a student, I would not give this outright — I would first ask what they already know, then guide them step by step toward it"). ` +
    `So: default to the full student experience, but whenever they ask for the answer or how it works, be transparent — give it and narrate how a genuine student interaction would differ.`;
  if (role === "teacher") {
    return base +
      ` They are a teacher evaluating the platform as an educator: proactively invite them to probe your teaching — how you handle a struggling or wrong answer, why you withhold answers, and the soundness of your subject explanations — and welcome their pedagogical critique.`;
  }
  return base;
}

function inviteMsg(role: Role, name: string): string {
  if (role === "teacher") {
    return `Hi ${name}! 👋 This is HomeTutor AI. You've been added as a teacher to help evaluate the platform — welcome!\n\n` +
      `Try it exactly as a student would, and feel free to probe how I handle struggling students or push back on my teaching method. Any time, ask me directly how something works and I'll explain what's happening under the hood.\n\n` +
      `Just reply here whenever you'd like to start.`;
  }
  const label = role === "tester" ? "a tester" : "an advisor";
  return `Hi ${name}! 👋 This is HomeTutor AI. You've been added as ${label} to the platform — welcome!\n\n` +
    `Try it exactly as a student would: ask me for help with any topic and I'll guide you with questions. Any time, you can ask me directly how something works and I'll explain what's happening under the hood.\n\n` +
    `Just reply here whenever you'd like to start.`;
}

export async function POST(req: NextRequest) {
  if (req.cookies.get("admin_session")?.value !== process.env.ADMIN_SESSION_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let b: { name?: string; phone?: string; role?: string; email?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const name = (b.name ?? "").trim();
  const phone = (b.phone ?? "").replace(/[^0-9]/g, "");
  const email = (b.email ?? "").trim() || null;
  const role: Role = ROLES.includes(b.role as Role) ? (b.role as Role) : "advisor";
  if (!name || phone.length < 8) {
    return NextResponse.json({ error: "Name and a valid phone number (with country code) are required." }, { status: 400 });
  }

  const { error } = await supabase.from("profiles").insert({
    phone_number: phone,
    name,
    role,
    email,
    language: "English",
    tone: toneFor(role, name),
    active: true,
  });
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "That number is already registered." }, { status: 409 });
    console.error("Invite insert error:", error.message);
    return NextResponse.json({ error: "Could not create the profile." }, { status: 500 });
  }

  let sent = false;
  const token = process.env.META_ACCESS_TOKEN;
  if (token) {
    try {
      const r = await fetch(`https://graph.facebook.com/v20.0/${ALERT_PHONE_NUMBER_ID}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: phone, type: "text", text: { body: inviteMsg(role, name) } }),
      });
      sent = r.ok;
    } catch (e) {
      console.error("Invite send failed:", e);
    }
  }

  // The reliable notification: email the invitee (WhatsApp can't start a chat).
  let emailed = false;
  if (email) {
    const e = inviteEmail(role, name);
    waitUntil(sendEmail(email, e.subject, e.html));
    emailed = true;
  }

  return NextResponse.json({ success: true, sent, emailed, role });
}
