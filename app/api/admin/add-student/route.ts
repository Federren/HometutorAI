import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Build a sensible age-appropriate Socratic tone when the admin doesn't write
// one, mirroring how the pilot profiles were calibrated by hand.
function defaultTone(age: number | null, name: string): string {
  const n = name || "the student";
  if (age !== null && age <= 9)
    return `very warm, gentle, and playful — like a favourite teacher who makes learning feel fun and safe. ${n} is young: use very simple words and short sentences, celebrate every answer enthusiastically, ask only one small question at a time, and never make them feel they got something wrong — always reframe mistakes as a step forward. Use encouraging emojis.`;
  if (age !== null && age <= 12)
    return `warm, playful, and encouraging. Keep language simple and sentences short, celebrate correct reasoning, and ask one question at a time. Never intimidating; always reframe mistakes as progress.`;
  if (age !== null && age <= 15)
    return `warm and peer-like — treat ${n} as a capable student. Encouraging but not childish. When they are stuck, guide them step by step with questions without giving the answer. Acknowledge when a topic is genuinely hard.`;
  if (age !== null)
    return `academic and peer-like — treat ${n} as a serious student, possibly under real exam pressure. Be efficient and precise, respect their time, and guide them through the reasoning step by step without giving the answer. Acknowledge exam stress when it shows, but keep the focus on genuine understanding.`;
  return `warm, encouraging, and fully Socratic — guide ${n} to answers with probing questions rather than giving them directly. Calibrate difficulty to their responses.`;
}

export async function POST(req: NextRequest) {
  if (req.cookies.get("admin_session")?.value !== process.env.ADMIN_SESSION_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const name = str(b.name);
  const phone = (typeof b.phone === "string" ? b.phone : "").replace(/[^0-9]/g, "");
  if (!name || phone.length < 8) {
    return NextResponse.json({ error: "Name and a valid phone number (with country code) are required." }, { status: 400 });
  }

  const ageNum = parseInt(String(b.age ?? ""), 10);
  const age = Number.isFinite(ageNum) ? ageNum : null;

  const subjects = str(b.subjects)
    ? String(b.subjects).split(",").map((s) => s.trim()).filter(Boolean)
    : null;

  const language = str(b.language) ?? "Hebrew and English — match whichever language the student writes in";
  const tone = str(b.tone) ?? defaultTone(age, name);

  const { error } = await supabase.from("profiles").insert({
    phone_number: phone,
    name,
    age,
    grade: str(b.grade),
    stream: str(b.stream),
    subjects,
    language,
    tone,
    active: true,
  });

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "That number is already registered." }, { status: 409 });
    console.error("Add student insert error:", error.message);
    return NextResponse.json({ error: "Could not add the student." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
