"use client";

import { useState } from "react";

type Lang = "en" | "he" | "ar";

// Trilingual content transcribed from the drafted consent form, with the
// Data & Privacy section expanded to disclose voice notes (OpenAI Whisper),
// homework photos (Claude vision), and every third-party processor by name.
// NOTE: this wording is a good-faith pilot draft. It MUST be reviewed by
// qualified counsel before use beyond the already-consented pilot families.
const T: Record<Lang, {
  dir: "ltr" | "rtl";
  title: string; intro: string;
  detailsH: string; childName: string; childAge: string; childGrade: string; childWhatsapp: string;
  parentName: string; parentPhone: string; parentEmail: string;
  howH: string; how: string[];
  dataH: string; data: string[];
  safetyH: string; safety: string[];
  consentH: string; consents: string[];
  sigH: string; sigLabel: string; dateLabel: string;
  submit: string; sending: string; success: string; required: string;
  privacy: string; footer: string;
}> = {
  en: {
    dir: "ltr",
    title: "Join the Pilot",
    intro: "HomeTutor AI is a private WhatsApp-based tutoring assistant for your child, currently in pilot. This form confirms your consent for your child to use the service and explains how their information is used.",
    detailsH: "Child & Parent Details",
    childName: "Child's full name", childAge: "Child's age", childGrade: "Child's grade",
    childWhatsapp: "Child's WhatsApp number (the number they'll use the tutor from)",
    parentName: "Parent / guardian full name", parentPhone: "Parent's phone (WhatsApp)", parentEmail: "Email address",
    howH: "How HomeTutor AI Works",
    how: [
      "Your child messages an AI tutor on WhatsApp with homework questions — by text, voice note, or photo.",
      "The tutor uses guiding questions (the Socratic method) and never gives direct answers or completes assignments.",
      "The tutor is powered by Anthropic's Claude AI, and conversations are stored securely in our database.",
    ],
    dataH: "Data & Privacy",
    data: [
      "We collect your child's name, age/grade, phone number, and their full conversation history with the tutor — including text messages, voice notes, and photos of homework they send.",
      "To help the tutor adapt to your child over time, we also keep a brief, ongoing learning summary — a few notes on the topics your child has worked on and how they learn best (for example, that they do better with step-by-step explanations). It records how your child learns, never their answers, and it is deleted whenever their data is deleted.",
      "To run the service, this information is processed by trusted providers: Anthropic (the Claude AI tutor), OpenAI (transcribing voice notes via Whisper), Meta (WhatsApp messaging), Supabase (secure database, stored in the EU), and Vercel (application hosting).",
      "Your child's data is used only to provide and improve the tutoring service. It is never sold, and never shared with third parties for marketing.",
      "You can request a copy of your child's data, or ask us to delete it, at any time by contacting us.",
      "This is a private pilot. Your child's number will only be contacted by HomeTutor AI, and only for tutoring.",
    ],
    safetyH: "Child Safety",
    safety: [
      "The tutor is restricted to academic subjects and schoolwork only.",
      "If a child's messages indicate distress, the system responds with care and may point them toward appropriate support resources (such as ERAN, Israel's emotional support hotline).",
      "You can pause or remove your child from the pilot at any time by contacting us via WhatsApp.",
    ],
    consentH: "Consent",
    consents: [
      "I confirm I am the parent or legal guardian of the child named above, and I give permission for my child to use HomeTutor AI as part of this pilot.",
      "I understand how my child's data is collected, used, and stored as described above.",
      "I consent to being contacted via WhatsApp regarding my child's use of the pilot.",
    ],
    sigH: "Signature",
    sigLabel: "Type your full name to sign", dateLabel: "Date",
    submit: "Submit consent", sending: "Submitting…",
    success: "Thank you — your sign-up has been received. We'll email you shortly to activate your child's tutor.",
    required: "Please complete all fields and tick all three consent boxes.",
    privacy: "Privacy Policy",
    footer: "HomeTutor AI · Private Pilot · hello@hometutorai.io",
  },
  he: {
    dir: "rtl",
    title: "הצטרפות לפיילוט",
    intro: "HomeTutor AI הינו עוזר הוראה פרטי בוואטסאפ עבור ילדך, הנמצא כעת בפיילוט. טופס זה מאשר את הסכמתך לשימוש ילדך בשירות ומסביר כיצד נעשה שימוש במידע שלו/ה.",
    detailsH: "פרטי הילד/ה וההורה",
    childName: "שם מלא של הילד/ה", childAge: "גיל הילד/ה", childGrade: "כיתה",
    childWhatsapp: "מספר הוואטסאפ של הילד/ה (המספר שממנו ישתמש/תשתמש במורה)",
    parentName: "שם מלא של ההורה / האפוטרופוס", parentPhone: "טלפון של ההורה (וואטסאפ)", parentEmail: "כתובת אימייל",
    howH: "כיצד HomeTutor AI עובד",
    how: [
      "ילדך שולח/ת הודעות למורה AI בוואטסאפ עם שאלות שיעורי בית — בטקסט, הודעה קולית, או תצלום.",
      "המורה משתמש בשאלות מנחות (השיטה הסוקרטית) ולעולם לא נותן תשובות ישירות או משלים מטלות.",
      "המורה מופעל על ידי Claude AI של Anthropic, והשיחות מאוחסנות באופן מאובטח במסד הנתונים שלנו.",
    ],
    dataH: "מידע ופרטיות",
    data: [
      "אנו אוספים את שם הילד/ה, גיל/כיתה, מספר טלפון, ואת כל תיעוד השיחות עם המורה — כולל הודעות טקסט, הודעות קוליות, ותצלומי שיעורי בית שנשלחים.",
      "כדי לאפשר למורה להתאים את עצמו לילדך לאורך זמן, אנו גם שומרים סיכום למידה קצר ומתעדכן — מספר הערות על הנושאים שהילד/ה עבד/ה עליהם וכיצד הוא/היא לומד/ת בצורה הטובה ביותר (למשל, שהוא/היא מפיק/ה תועלת מהסברים צעד-אחר-צעד). הסיכום מתעד כיצד ילדך לומד/ת, לעולם לא את התשובות שלו/ה, והוא נמחק יחד עם שאר המידע בעת מחיקה.",
      "לצורך הפעלת השירות, המידע מעובד על ידי ספקים מהימנים: Anthropic (מורה ה-AI, Claude), OpenAI (תמלול הודעות קוליות באמצעות Whisper), Meta (הודעות וואטסאפ), Supabase (מסד נתונים מאובטח, מאוחסן באיחוד האירופי), ו-Vercel (אחסון האפליקציה).",
      "המידע של ילדך משמש רק למתן ולשיפור שירות ההוראה. הוא אינו נמכר לעולם, ואינו משותף עם צדדים שלישיים לצרכי שיווק.",
      "ניתן לבקש עותק של מידע ילדך, או לבקש את מחיקתו, בכל עת על ידי פנייה אלינו.",
      "זהו פיילוט פרטי. מספר הטלפון של ילדך ייצור איתו קשר רק HomeTutor AI, ורק למטרות הוראה.",
    ],
    safetyH: "בטיחות הילד/ה",
    safety: [
      "המורה מוגבל לנושאים אקדמיים ושיעורי בית בלבד.",
      "אם הודעות הילד/ה מצביעות על מצוקה, המערכת תגיב באכפתיות ועשויה להפנות אותם למשאבי תמיכה מתאימים (כגון ער\"ן, קו הסיוע הרגשי בישראל).",
      "ניתן להשהות או להוציא את ילדך מהפיילוט בכל עת על ידי פנייה אלינו בוואטסאפ.",
    ],
    consentH: "הסכמה",
    consents: [
      "אני מאשר/ת שאני ההורה או האפוטרופוס החוקי של הילד/ה הנקוב/ה לעיל, ואני נותן/ת הסכמה לשימוש ילדי ב-HomeTutor AI כחלק מהפיילוט.",
      "אני מבין/ה כיצד נאסף, נעשה בו שימוש ומאוחסן המידע של ילדי כמתואר לעיל.",
      "אני מסכים/ה להיות בקשר באמצעות וואטסאפ בנוגע לשימוש ילדי בפיילוט.",
    ],
    sigH: "חתימה",
    sigLabel: "הקלד/י את שמך המלא לחתימה", dateLabel: "תאריך",
    submit: "שליחת הסכמה", sending: "שולח…",
    success: "תודה — ההרשמה התקבלה. נשלח לכם מייל בקרוב כדי להפעיל את המורה של ילדכם.",
    required: "יש למלא את כל השדות ולסמן את שלוש תיבות ההסכמה.",
    privacy: "מדיניות פרטיות",
    footer: "HomeTutor AI · פיילוט פרטי · hello@hometutorai.io",
  },
  ar: {
    dir: "rtl",
    title: "الانضمام إلى النسخة التجريبية",
    intro: "HomeTutor AI هو مساعد تعليمي خاص عبر واتساب لطفلك، وهو حالياً في مرحلة تجريبية. يؤكد هذا النموذج موافقتك على استخدام طفلك للخدمة ويوضح كيفية استخدام معلوماته.",
    detailsH: "بيانات الطفل وولي الأمر",
    childName: "اسم الطفل الكامل", childAge: "عمر الطفل", childGrade: "الصف الدراسي",
    childWhatsapp: "رقم واتساب الطفل (الرقم الذي سيستخدمه للتواصل مع المعلم)",
    parentName: "اسم ولي الأمر الكامل", parentPhone: "هاتف ولي الأمر (واتساب)", parentEmail: "البريد الإلكتروني",
    howH: "كيف يعمل HomeTutor AI",
    how: [
      "يرسل طفلك رسائل إلى معلم ذكاء اصطناعي عبر واتساب لطرح أسئلة الواجبات — نصاً أو رسالة صوتية أو صورة.",
      "يستخدم المعلم أسئلة إرشادية (الطريقة السقراطية) ولا يقدم إجابات مباشرة أو يكمل الواجبات.",
      "يعمل المعلم بواسطة Claude AI من Anthropic، وتُخزَّن المحادثات بأمان في قاعدة بياناتنا.",
    ],
    dataH: "البيانات والخصوصية",
    data: [
      "نجمع اسم الطفل، العمر/الصف، رقم الهاتف، وكامل سجل المحادثات مع المعلم — بما في ذلك الرسائل النصية والرسائل الصوتية وصور الواجبات التي يرسلها.",
      "لمساعدة المعلم على التكيّف مع طفلك بمرور الوقت، نحتفظ أيضاً بملخّص تعليمي موجز ومتجدّد — بضع ملاحظات عن المواضيع التي تناولها طفلك وكيف يتعلّم على أفضل وجه (مثلاً أنه يستفيد من الشرح خطوة بخطوة). يصف الملخّص كيف يتعلّم طفلك، وليس إجاباته أبداً، ويُحذف مع باقي بياناته عند الحذف.",
      "لتشغيل الخدمة، تتم معالجة هذه المعلومات بواسطة مزودين موثوقين: Anthropic (معلم Claude للذكاء الاصطناعي)، وOpenAI (تفريغ الرسائل الصوتية عبر Whisper)، وMeta (مراسلة واتساب)، وSupabase (قاعدة بيانات آمنة، مخزَّنة في الاتحاد الأوروبي)، وVercel (استضافة التطبيق).",
      "تُستخدم بيانات طفلك فقط لتقديم وتحسين خدمة التعليم. لا تُباع أبداً، ولا تُشارك مع أطراف ثالثة لأغراض تسويقية.",
      "يمكنك طلب نسخة من بيانات طفلك، أو طلب حذفها، في أي وقت عبر التواصل معنا.",
      "هذه نسخة تجريبية خاصة. لن يتواصل مع رقم طفلك سوى HomeTutor AI، ولأغراض تعليمية فقط.",
    ],
    safetyH: "سلامة الطفل",
    safety: [
      "يقتصر المعلم على المواضيع الأكاديمية والواجبات الدراسية فقط.",
      "إذا أشارت رسائل الطفل إلى ضيق نفسي، يستجيب النظام بحرص وقد يوجهه إلى مصادر دعم مناسبة (مثل خط ער\"ן للدعم العاطفي في إسرائيل).",
      "يمكنك إيقاف أو إزالة طفلك من النسخة التجريبية في أي وقت عبر التواصل معنا على واتساب.",
    ],
    consentH: "الموافقة",
    consents: [
      "أؤكد أنني الوالد أو الوصي القانوني للطفل المذكور أعلاه، وأمنح إذناً لاستخدام طفلي لـ HomeTutor AI كجزء من هذه النسخة التجريبية.",
      "أتفهم كيفية جمع بيانات طفلي واستخدامها وتخزينها كما هو موضح أعلاه.",
      "أوافق على التواصل معي عبر واتساب بخصوص استخدام طفلي للنسخة التجريبية.",
    ],
    sigH: "التوقيع",
    sigLabel: "اكتب اسمك الكامل للتوقيع", dateLabel: "التاريخ",
    submit: "إرسال الموافقة", sending: "جارٍ الإرسال…",
    success: "شكراً لك — تم استلام تسجيلك. سنرسل لك بريداً إلكترونياً قريباً لتفعيل معلّم طفلك.",
    required: "يرجى إكمال جميع الحقول ووضع علامة في مربعات الموافقة الثلاثة.",
    privacy: "سياسة الخصوصية",
    footer: "HomeTutor AI · نسخة تجريبية خاصة · hello@hometutorai.io",
  },
};

const green = "#1B3D2F";
const cream = "#FAF8F5";
const border = "#DDD8CE";

// Grades 1–12. Stored as a canonical value ("Grade 8") so it's language-stable;
// only the displayed label localizes.
const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const HE_GRADES = ["א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י", "יא", "יב"];
const AR_GRADES = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن", "التاسع", "العاشر", "الحادي عشر", "الثاني عشر"];
function gradeLabel(n: number, lang: Lang): string {
  if (lang === "he") return `כיתה ${HE_GRADES[n - 1]}`;
  if (lang === "ar") return `الصف ${AR_GRADES[n - 1]}`;
  return `Grade ${n}`;
}

export default function ConsentPage() {
  const [lang, setLang] = useState<Lang>("en");
  const t = T[lang];
  const rtl = t.dir === "rtl";

  const [f, setF] = useState({ childName: "", childAge: "", childGrade: "", childWhatsapp: "", parentName: "", parentPhone: "", parentEmail: "" });
  const [c, setC] = useState([false, false, false]);
  const [signature, setSignature] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const today = new Date().toLocaleDateString(lang === "en" ? "en-GB" : lang === "he" ? "he-IL" : "ar");

  function set(k: keyof typeof f, v: string) { setF({ ...f, [k]: v }); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const allFilled = f.childName && f.childWhatsapp && f.parentName && f.parentPhone && f.parentEmail && signature.trim();
    if (!allFilled || !c[0] || !c[1] || !c[2]) { setErr(t.required); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/consent", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...f, language: lang, signed_name: signature.trim(),
          consent_use: c[0], consent_data_understood: c[1], consent_whatsapp_contact: c[2],
        }),
      });
      if (!res.ok) throw new Error("failed");
      setDone(true);
    } catch {
      setErr(t.required === T.en.required ? "Something went wrong. Please try again." : t.required);
      setBusy(false);
    }
  }

  const ta: "right" | "left" = rtl ? "right" : "left";
  const label: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, color: green, marginBottom: 6, marginTop: 14, textAlign: ta };
  const input: React.CSSProperties = { width: "100%", padding: "11px 13px", fontSize: 15, border: `1.5px solid ${border}`, borderRadius: 10, outline: "none", boxSizing: "border-box", background: "white", direction: t.dir, textAlign: ta };
  const section: React.CSSProperties = { marginTop: 26 };
  const sh: React.CSSProperties = { fontSize: 17, fontWeight: 700, color: green, margin: "0 0 10px", textAlign: ta };
  const bullet: React.CSSProperties = { fontSize: 14, color: "#3a352e", lineHeight: 1.7, marginBottom: 8, paddingInlineStart: 4, textAlign: ta };

  return (
    <main dir={t.dir} style={{ minHeight: "100vh", background: cream, fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", color: "#151210", textAlign: rtl ? "right" : "left" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "20px 18px 80px" }}>
        {/* Language toggle */}
        <div style={{ display: "flex", gap: 6, justifyContent: rtl ? "flex-start" : "flex-end", marginBottom: 18 }}>
          {(["en", "he", "ar"] as Lang[]).map((l) => (
            <button key={l} onClick={() => setLang(l)} style={{
              padding: "5px 11px", fontSize: 13, borderRadius: 7, cursor: "pointer",
              border: `1.5px solid ${lang === l ? green : border}`,
              background: lang === l ? green : "white", color: lang === l ? "white" : "#7A7168", fontWeight: 600,
            }}>{l === "en" ? "EN" : l === "he" ? "עב" : "عر"}</button>
          ))}
        </div>

        {done ? (
          <div style={{ background: "white", border: `1px solid ${border}`, borderRadius: 16, padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
            <p style={{ fontSize: 16, color: green, lineHeight: 1.7, margin: 0 }}>{t.success}</p>
          </div>
        ) : (
          <form onSubmit={submit} style={{ background: "white", border: `1px solid ${border}`, borderRadius: 16, padding: "26px 24px" }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: green, margin: "0 0 6px" }}>HomeTutor AI</h1>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#C8922A", marginBottom: 14 }}>{t.title}</div>
            <p style={{ fontSize: 14, color: "#3a352e", lineHeight: 1.7, margin: 0 }}>{t.intro}</p>

            {/* Details */}
            <div style={section}>
              <h2 style={sh}>{t.detailsH}</h2>
              <label style={label}>{t.childName}</label>
              <input style={input} value={f.childName} onChange={(e) => set("childName", e.target.value)} />
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={label}>{t.childAge}</label>
                  <input style={input} type="number" min={4} max={19} value={f.childAge} onChange={(e) => set("childAge", e.target.value)} />
                </div>
                <div style={{ flex: 2 }}>
                  <label style={label}>{t.childGrade}</label>
                  <select style={{ ...input, cursor: "pointer" }} value={f.childGrade} onChange={(e) => set("childGrade", e.target.value)}>
                    <option value="">{lang === "he" ? "בחר/י כיתה" : lang === "ar" ? "اختر الصف" : "Select grade"}</option>
                    {GRADES.map((n) => <option key={n} value={`Grade ${n}`}>{gradeLabel(n, lang)}</option>)}
                  </select>
                </div>
              </div>
              <label style={label}>{t.childWhatsapp}</label>
              <input style={input} value={f.childWhatsapp} onChange={(e) => set("childWhatsapp", e.target.value)} placeholder="+972…" />
              <label style={label}>{t.parentName}</label>
              <input style={input} value={f.parentName} onChange={(e) => set("parentName", e.target.value)} />
              <label style={label}>{t.parentPhone}</label>
              <input style={input} value={f.parentPhone} onChange={(e) => set("parentPhone", e.target.value)} placeholder="+972…" />
              <label style={label}>{t.parentEmail}</label>
              <input style={input} type="email" value={f.parentEmail} onChange={(e) => set("parentEmail", e.target.value)} />
            </div>

            {/* Disclosures */}
            {([[t.howH, t.how], [t.dataH, t.data], [t.safetyH, t.safety]] as [string, string[]][]).map(([h, items]) => (
              <div key={h} style={section}>
                <h2 style={sh}>{h}</h2>
                {items.map((it, i) => (
                  <div key={i} style={bullet}>• {it}</div>
                ))}
              </div>
            ))}

            {/* Consent checkboxes */}
            <div style={section}>
              <h2 style={sh}>{t.consentH}</h2>
              {t.consents.map((txt, i) => (
                <label key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12, cursor: "pointer", flexDirection: rtl ? "row-reverse" : "row" }}>
                  <input type="checkbox" checked={c[i]} onChange={(e) => { const n = [...c]; n[i] = e.target.checked; setC(n); }} style={{ marginTop: 3, width: 18, height: 18, flexShrink: 0, accentColor: green }} />
                  <span style={{ fontSize: 14, color: "#3a352e", lineHeight: 1.6 }}>{txt}</span>
                </label>
              ))}
            </div>

            {/* Signature */}
            <div style={section}>
              <h2 style={sh}>{t.sigH}</h2>
              <label style={label}>{t.sigLabel}</label>
              <input style={{ ...input, fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 17 }} value={signature} onChange={(e) => setSignature(e.target.value)} />
              <div style={{ fontSize: 13, color: "#7A7168", marginTop: 8 }}>{t.dateLabel}: {today}</div>
            </div>

            {err && <div style={{ color: "#b3261e", fontSize: 13.5, marginTop: 16 }}>{err}</div>}

            <button type="submit" disabled={busy} style={{ width: "100%", marginTop: 22, padding: 14, fontSize: 16, fontWeight: 700, color: "white", background: busy ? "#7A9A8B" : green, border: "none", borderRadius: 12, cursor: busy ? "default" : "pointer" }}>
              {busy ? t.sending : t.submit}
            </button>

            <div style={{ textAlign: "center", marginTop: 18, fontSize: 12, color: "#9a938a" }}>
              <a href="/privacy" style={{ color: "#7A7168" }}>{t.privacy}</a>
              <div style={{ marginTop: 6 }}>{t.footer}</div>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
