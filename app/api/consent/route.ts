import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { waitUntil } from "@vercel/functions";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_PHONE = "972526101313";
const ALERT_PHONE_NUMBER_ID = "1116534344880535";

async function notifyAdmin(childName: string, parentName: string, phone: string) {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) return;
  const body =
    `✅ New parental consent signed\n\n` +
    `Child: ${childName}\nParent: ${parentName}\nPhone: ${phone}\n\n` +
    `Review in the admin center, then onboard.`;
  try {
    await fetch(`https://graph.facebook.com/v20.0/${ALERT_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: ADMIN_PHONE, type: "text", text: { body } }),
    });
  } catch (e) {
    console.error("Consent notify failed:", e);
  }
}

export async function POST(req: NextRequest) {
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const parent_name = str(b.parentName);
  const parent_phone = str(b.parentPhone);
  const child_name = str(b.childName);
  const child_whatsapp = str(b.childWhatsapp);

  // The three explicit consents are mandatory.
  if (!parent_name || !parent_phone || !child_name || !child_whatsapp || b.consent_use !== true || b.consent_data_understood !== true || b.consent_whatsapp_contact !== true) {
    return NextResponse.json({ error: "Missing required fields or consent." }, { status: 400 });
  }

  const ageNum = parseInt(String(b.childAge ?? ""), 10);

  const { error } = await supabase.from("parental_consent").insert({
    parent_name,
    parent_email: str(b.parentEmail),
    parent_phone,
    child_name,
    child_whatsapp,
    child_age: Number.isFinite(ageNum) ? ageNum : null,
    child_grade: str(b.childGrade),
    language: str(b.language) ?? "en",
    consent_use: true,
    consent_data_understood: true,
    consent_whatsapp_contact: true,
    signed_name: str(b.signed_name),
    ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    user_agent: req.headers.get("user-agent"),
  });

  if (error) {
    console.error("Consent insert error:", error.message);
    return NextResponse.json({ error: "Could not save your consent. Please try again." }, { status: 500 });
  }

  waitUntil(notifyAdmin(child_name, parent_name, parent_phone));
  return NextResponse.json({ success: true });
}
