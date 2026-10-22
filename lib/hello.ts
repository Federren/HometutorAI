// Shared "friendly hello" composition, used by the admin form (to show an
// editable draft) and the server (to send exactly what the admin sees/edits).
//
// These are nudges, not tutoring: a short, warm reminder that the tutor is there
// and can help with tonight's homework. {name} is filled in per recipient, so
// one draft can go to several students and still read personally.
export type HelloPreset = "hello" | "quiet" | "homework";
export type HelloLang = "en" | "he" | "ar";

export const HELLO_PRESETS: { id: HelloPreset; label: string }[] = [
  { id: "hello", label: "Friendly hello" },
  { id: "quiet", label: "Gone quiet" },
  { id: "homework", label: "Homework nudge" },
];

export const HELLO_LANGS: { id: HelloLang; label: string }[] = [
  { id: "en", label: "English" },
  { id: "he", label: "עברית" },
  { id: "ar", label: "العربية" },
];

// The profiles table stores a free-text language ("English", "Hebrew", ...).
export function langOf(profileLanguage: string | null | undefined): HelloLang {
  const l = (profileLanguage ?? "").toLowerCase();
  if (l.startsWith("he") || l.includes("עב")) return "he";
  if (l.startsWith("ar") || l.includes("عر")) return "ar";
  return "en";
}

export function isRtl(lang: HelloLang): boolean {
  return lang === "he" || lang === "ar";
}

// NOTE: the Hebrew and Arabic drafts follow the register of the existing
// parent emails but have not been through the same native review as /guide —
// worth a read before the first send to a HE/AR family.
const DRAFTS: Record<HelloLang, Record<HelloPreset, string>> = {
  en: {
    hello:
      `Hi {name}! 👋 Just saying hello from HomeTutor AI.\n\n` +
      `If you have homework tonight — maths, science, history, anything — send me the question and we'll work through it together. A photo of the page works too.`,
    quiet:
      `Hi {name}! 👋 It's been a little while — I'm still here whenever you want a hand with homework.\n\n` +
      `Send me a question, or just a photo of the page, and we'll take it step by step.`,
    homework:
      `Hi {name}! 👋 Homework to get through?\n\n` +
      `Send me the question (or a photo of it) and I'll help you figure it out step by step — I won't just hand you the answer. 🙂`,
  },
  he: {
    hello:
      `היי {name}! 👋 רק באתי להגיד שלום מ-HomeTutor AI.\n\n` +
      `אם יש לך שיעורי בית הערב — מתמטיקה, מדעים, היסטוריה, כל דבר — שלח/י לי את השאלה ונעבור עליה יחד. אפשר גם פשוט לצלם את הדף.`,
    quiet:
      `היי {name}! 👋 עבר קצת זמן — אני עדיין כאן בכל פעם שבא לך עזרה בשיעורי הבית.\n\n` +
      `שלח/י לי שאלה, או סתם תצלום של הדף, ונתקדם צעד אחר צעד.`,
    homework:
      `היי {name}! 👋 יש שיעורי בית?\n\n` +
      `שלח/י לי את השאלה (או תצלום שלה) ואעזור לך להגיע לתשובה צעד אחר צעד — לא פשוט אתן אותה. 🙂`,
  },
  ar: {
    hello:
      `مرحباً {name}! 👋 أردت فقط أن أقول أهلاً من HomeTutor AI.\n\n` +
      `إذا كان عندك واجب الليلة — رياضيات، علوم، تاريخ، أي شيء — أرسل لي السؤال ونحلّه معاً. يمكنك أيضاً إرسال صورة للصفحة.`,
    quiet:
      `مرحباً {name}! 👋 مرّ بعض الوقت — ما زلت هنا كلّما أردت مساعدة في الواجب.\n\n` +
      `أرسل لي سؤالاً، أو صورة للصفحة، ونتقدّم خطوة بخطوة.`,
    homework:
      `مرحباً {name}! 👋 هل عندك واجب؟\n\n` +
      `أرسل لي السؤال (أو صورة له) وسأساعدك في الوصول إلى الحل خطوة بخطوة — لن أعطيك الإجابة مباشرة. 🙂`,
  },
};

export function composeHelloText(preset: HelloPreset, lang: HelloLang): string {
  return DRAFTS[lang][preset];
}

// Fill the per-recipient placeholder. First name only — "Hi Gil", not "Hi Gil Feder".
export function personalise(template: string, name: string): string {
  const first = (name ?? "").trim().split(/\s+/)[0] || "there";
  return template.replace(/\{name\}/g, first);
}

export const HELLO_MAX_RECIPIENTS = 25;
