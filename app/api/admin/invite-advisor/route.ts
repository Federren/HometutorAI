import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ALERT_PHONE_NUMBER_ID = "1116534344880535";

type Role = "advisor" | "teacher" | "tester";
const ROLES: Role[] = ["advisor", "teacher", "tester"];

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

  let b: { name?: string; phone?: string; role?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const name = (b.name ?? "").trim();
  const phone = (b.phone ?? "").replace(/[^0-9]/g, "");
  const role: Role = ROLES.includes(b.role as Role) ? (b.role as Role) : "advisor";
  if (!name || phone.length < 8) {
    return NextResponse.json({ error: "Name and a valid phone number (with country code) are required." }, { status: 400 });
  }

  const { error } = await supabase.from("profiles").insert({
    phone_number: phone,
    name,
    role,
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

  return NextResponse.json({ success: true, sent, role });
}
