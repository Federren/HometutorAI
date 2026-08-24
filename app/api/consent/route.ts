import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { waitUntil } from "@vercel/functions";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FROM = "HomeTutor AI <hello@hometutorai.io>";
const ADMIN_EMAIL = "feder.roi@gmail.com";

async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("RESEND_API_KEY not set — skipping email");
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    });
    if (!res.ok) console.error("Resend error:", res.status, await res.text());
  } catch (e) {
    console.error("Email send failed:", e);
  }
}

// Parent confirmation — matched to the language they signed up in.
function parentEmail(lang: string, parentName: string, childName: string): { subject: string; html: string } {
  if (lang === "he") {
    return {
      subject: "תודה שהצטרפתם לפיילוט של HomeTutor AI",
      html: `<div dir="rtl" style="font-family:system-ui,Arial,sans-serif;font-size:15px;color:#1a1a1a;line-height:1.7;max-width:520px">
        <p>שלום ${parentName},</p>
        <p>תודה שרשמתם את <b>${childName}</b> לפיילוט של HomeTutor AI. קיבלנו את הפרטים וההסכמה שלכם.</p>
        <p>ניצור אתכם קשר בקרוב כדי להפעיל את המורה הפרטי של ${childName} בוואטסאפ.</p>
        <p>לכל שאלה, אפשר להשיב למייל זה או לפנות ל-hello@hometutorai.io.</p>
        <p style="color:#1B3D2F;font-weight:600">צוות HomeTutor AI</p>
      </div>`,
    };
  }
  if (lang === "ar") {
    return {
      subject: "شكراً لانضمامك إلى النسخة التجريبية من HomeTutor AI",
      html: `<div dir="rtl" style="font-family:system-ui,Arial,sans-serif;font-size:15px;color:#1a1a1a;line-height:1.7;max-width:520px">
        <p>مرحباً ${parentName},</p>
        <p>شكراً لتسجيل <b>${childName}</b> في النسخة التجريبية من HomeTutor AI. لقد استلمنا بياناتك وموافقتك.</p>
        <p>سنتواصل معك قريباً لتفعيل المعلم الخاص بـ ${childName} عبر واتساب.</p>
        <p>لأي استفسار، يمكنك الرد على هذا البريد أو مراسلتنا على hello@hometutorai.io.</p>
        <p style="color:#1B3D2F;font-weight:600">فريق HomeTutor AI</p>
      </div>`,
    };
  }
  return {
    subject: "Thanks for joining the HomeTutor AI pilot",
    html: `<div style="font-family:system-ui,Arial,sans-serif;font-size:15px;color:#1a1a1a;line-height:1.7;max-width:520px">
      <p>Hi ${parentName},</p>
      <p>Thanks for signing <b>${childName}</b> up for the HomeTutor AI pilot. We've received your details and consent.</p>
      <p>We'll be in touch shortly to activate ${childName}'s personal tutor on WhatsApp.</p>
      <p>Any questions, just reply to this email or reach us at hello@hometutorai.io.</p>
      <p style="color:#1B3D2F;font-weight:600">The HomeTutor AI team</p>
    </div>`,
  };
}

function adminEmail(c: {
  child_name: string; child_age: number | null; child_grade: string | null; child_whatsapp: string;
  parent_name: string; parent_phone: string; parent_email: string | null; language: string; signed_name: string | null;
}): { subject: string; html: string } {
  const row = (k: string, v: string | number | null) => `<tr><td style="padding:3px 12px 3px 0;color:#666">${k}</td><td style="padding:3px 0;font-weight:600">${v ?? "—"}</td></tr>`;
  return {
    subject: `New pilot signup: ${c.child_name}`,
    html: `<div style="font-family:system-ui,Arial,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.6;max-width:560px">
      <h2 style="color:#1B3D2F;margin:0 0 12px">New pilot signup</h2>
      <table style="border-collapse:collapse">
        ${row("Child", c.child_name)}
        ${row("Age / grade", [c.child_age, c.child_grade].filter(Boolean).join(" / ") || "—")}
        ${row("Child WhatsApp", c.child_whatsapp)}
        ${row("Parent", c.parent_name)}
        ${row("Parent phone", c.parent_phone)}
        ${row("Parent email", c.parent_email)}
        ${row("Language", c.language)}
        ${row("Signature", c.signed_name)}
      </table>
      <p style="margin-top:16px"><a href="https://hometutorai.io/admin" style="color:#1B3D2F;font-weight:600">Review &amp; enroll in the admin center →</a></p>
    </div>`,
  };
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
  const parent_email = str(b.parentEmail);
  const child_name = str(b.childName);
  const child_whatsapp = str(b.childWhatsapp);

  // The three explicit consents are mandatory.
  if (!parent_name || !parent_phone || !child_name || !child_whatsapp || b.consent_use !== true || b.consent_data_understood !== true || b.consent_whatsapp_contact !== true) {
    return NextResponse.json({ error: "Missing required fields or consent." }, { status: 400 });
  }

  const ageNum = parseInt(String(b.childAge ?? ""), 10);
  const child_age = Number.isFinite(ageNum) ? ageNum : null;
  const child_grade = str(b.childGrade);
  const language = str(b.language) ?? "en";
  const signed_name = str(b.signed_name);

  const { error } = await supabase.from("parental_consent").insert({
    parent_name, parent_email, parent_phone,
    child_name, child_whatsapp, child_age, child_grade, language,
    consent_use: true, consent_data_understood: true, consent_whatsapp_contact: true,
    signed_name,
    ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    user_agent: req.headers.get("user-agent"),
  });

  if (error) {
    console.error("Consent insert error:", error.message);
    return NextResponse.json({ error: "Could not save your consent. Please try again." }, { status: 500 });
  }

  waitUntil((async () => {
    const admin = adminEmail({ child_name, child_age, child_grade, child_whatsapp, parent_name, parent_phone, parent_email, language, signed_name });
    await sendEmail(ADMIN_EMAIL, admin.subject, admin.html);
    if (parent_email) {
      const p = parentEmail(language, parent_name, child_name);
      await sendEmail(parent_email, p.subject, p.html);
    }
  })());

  return NextResponse.json({ success: true });
}
