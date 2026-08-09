import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Age-appropriate Socratic tone (same logic as Add Student).
function defaultTone(age: number | null, name: string): string {
  const n = name || "the student";
  if (age !== null && age <= 9)
    return `very warm, gentle, and playful — like a favourite teacher who makes learning feel fun and safe. ${n} is young: use very simple words and short sentences, celebrate every answer enthusiastically, ask only one small question at a time, and never make them feel they got something wrong — always reframe mistakes as a step forward. Use encouraging emojis.`;
  if (age !== null && age <= 12)
    return `warm, playful, and encouraging. Keep language simple and sentences short, celebrate correct reasoning, and ask one question at a time. Never intimidating; always reframe mistakes as progress.`;
  if (age !== null && age <= 15)
    return `warm and peer-like — treat ${n} as a capable student. Encouraging but not childish. When they are stuck, guide them step by step with questions without giving the answer. Acknowledge when a topic is genuinely hard.`;
  if (age !== null)
    return `academic and peer-like — treat ${n} as a serious student, possibly under real exam pressure. Be efficient and precise, respect their time, and guide them through the reasoning step by step without giving the answer.`;
  return `warm, encouraging, and fully Socratic — guide ${n} to answers with probing questions rather than giving them directly. Calibrate difficulty to their responses.`;
}

function langString(code: string | null): string {
  if (code === "he") return "Hebrew — respond in Hebrew, and match whichever language the student writes in.";
  if (code === "ar") return "Arabic — respond in Arabic, and match whichever language the student writes in.";
  return "English — respond in English, and match whichever language the student writes in.";
}

export async function POST(req: NextRequest) {
  if (req.cookies.get("admin_session")?.value !== process.env.ADMIN_SESSION_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let b: { consentId?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (!b.consentId) return NextResponse.json({ error: "consentId required" }, { status: 400 });

  const { data: consent, error: readErr } = await supabase
    .from("parental_consent")
    .select("id, child_name, child_age, child_grade, child_whatsapp, language, enrolled_at")
    .eq("id", b.consentId)
    .maybeSingle();

  if (readErr || !consent) return NextResponse.json({ error: "Consent not found." }, { status: 404 });
  if (consent.enrolled_at) return NextResponse.json({ error: "This child is already enrolled." }, { status: 409 });

  const phone = (consent.child_whatsapp ?? "").replace(/[^0-9]/g, "");
  if (phone.length < 8) {
    return NextResponse.json({ error: "This consent has no valid child WhatsApp number — enroll manually via Add Student." }, { status: 400 });
  }

  // Create the student profile.
  const { error: insErr } = await supabase.from("profiles").insert({
    phone_number: phone,
    name: consent.child_name,
    role: "student",
    age: consent.child_age ?? null,
    grade: consent.child_grade ?? null,
    language: langString(consent.language),
    tone: defaultTone(consent.child_age ?? null, consent.child_name ?? ""),
    active: true,
  });
  if (insErr && insErr.code !== "23505") {
    console.error("Enroll insert error:", insErr.message);
    return NextResponse.json({ error: "Could not create the student profile." }, { status: 500 });
  }
  // 23505 (number already a profile) is fine — still mark the consent enrolled.

  const { error: updErr } = await supabase
    .from("parental_consent")
    .update({ enrolled_at: new Date().toISOString() })
    .eq("id", b.consentId);
  if (updErr) console.error("Enroll mark error:", updErr.message);

  return NextResponse.json({ success: true, alreadyExisted: insErr?.code === "23505" });
}
