"use client";

import { useState } from "react";

type Lang = "en" | "he" | "ar";

interface Content {
  dir: "ltr" | "rtl";
  langName: string;
  eyebrow: string;
  title: string;
  intro: string;
  rememberH: string;
  rememberCallout: string;
  rememberP: string;
  canDoH: string;
  canDo: string[];
  unstuckH: string;
  unstuckP: string;
  unstuck: string[];
  warningH: string;
  warningP: string;
  tipsH: string;
  tips: string[];
  safety: string;
  signoff: string;
}

const T: Record<Lang, Content> = {
  en: {
    dir: "ltr",
    langName: "EN",
    eyebrow: "Your HomeTutor AI",
    title: "How to get the most out of me",
    intro: "Hi! I'm your tutor. I work a bit differently from just Googling an answer — instead of handing you the answer, I ask you questions and help you work it out yourself. That's what makes it actually stick. Here's how to get the most out of me.",
    rememberH: "The one thing to remember",
    rememberCallout: "You never need the “right” answer. Just tell me what you're thinking — even a guess — and say if you get stuck.",
    rememberP: "When I ask you something, don't worry about getting it perfect. A guess is great. And “I'm stuck” or “I don't get it” isn't failing — it's exactly when I can help you most. The more you talk to me the way you would a teacher or a study buddy, the more I can help.",
    canDoH: "What you can do",
    canDo: [
      "Ask me about any subject — maths, science, history, English, whatever you're working on.",
      "Send a photo of your homework or your working — I can read it, even your handwriting.",
      "Send a voice note if that's easier than typing.",
      "Ask me to draw a diagram, show the maths step by step, or find you a short video.",
    ],
    unstuckH: "The trick to getting unstuck",
    unstuckP: "Here's what the students who get the most out of me do — they tell me exactly what's confusing them. So:",
    unstuck: [
      "Instead of “I don't know”, try “I don't get why we do this bit.”",
      "Tell me what you're thinking, even if you're not sure.",
      "If my explanation doesn't click, just say “can you explain it a different way?”",
      "Ask “why?” whenever you're curious — I love that.",
    ],
    warningH: "Fair warning 😄",
    warningP: "I won't just do your homework or write your essay for you. I know it would make life way easier — but it's on purpose. If I handed you the answer, you'd forget it by the next test. Instead I'll help you get there, one step at a time. It feels slower, but it's how you actually learn it.",
    tipsH: "A few tips",
    tips: [
      "Little and often beats one long session — 15 minutes when you're stuck is perfect.",
      "Don't be scared to guess and be wrong. That's literally how learning works.",
      "Take a second to think before you answer — the tricky ones are the ones worth it.",
    ],
    safety: "And if you're having a hard time with something that isn't schoolwork, you can tell me — I'll help you find the right person to talk to.",
    signoff: "That's it — say hi whenever you're ready. What are you working on? 👋",
  },
  he: {
    dir: "rtl",
    langName: "עברית",
    eyebrow: "המורה HomeTutor AI שלך",
    title: "איך להפיק ממני את המקסימום",
    intro: "היי! אני המורה שלך. אני עובד קצת אחרת מסתם חיפוש בגוגל — במקום לתת לך את התשובה, אני שואל אותך שאלות ועוזר לך להגיע אליה בעצמך. ככה שזה באמת נשאר לך בראש. איך להפיק ממני את המקסימום?",
    rememberH: "הדבר הכי חשוב לזכור",
    rememberCallout: "אף פעם לא צריך את התשובה ה“נכונה”. פשוט תגיד/י לי מה עובר לך בראש — גם ניחוש זה מצוין — ותגיד/י לי אם נתקעת.",
    rememberP: "כשאני שואל אותך משהו, אל תדאג/י מתשובה נכונה ומדויקת. ניחוש זה נהדר. ו“אני תקוע” או “אני לא מבין/ה” זה לא כישלון — זה בדיוק הרגע שבו אני יכול לעזור לך הכי הרבה. ככל שתדבר/י איתי יותר כמו אל מורה או חבר לימודי, כך אוכל לעזור יותר.",
    canDoH: "מה אפשר לעשות",
    canDo: [
      "לשאול אותי על כל מקצוע — מתמטיקה, מדעים, היסטוריה, אנגלית, וכל מקצוע אחר שאתה/את לומד/ת.",
      "לשלוח תמונה של שיעורי הבית או של הפתרון שלך — אני יודע לקרוא, גם כתב יד.",
      "לשלוח הודעה קולית אם יותר קל לך מלהקליד.",
      "לבקש ממני לצייר תרשים, להראות את החישוב שלב-אחר-שלב, או למצוא לך סרטון קצר.",
    ],
    unstuckH: "איך לצאת מתקיעות",
    unstuckP: "הנה מה שהתלמידים שמפיקים ממני הכי הרבה עושים — הם אומרים לי בדיוק מה מבלבל אותם:",
    unstuck: [
      "במקום “אני לא יודע”, נסה/י “אני לא מבין/ה למה עושים את החלק הזה”.",
      "תגיד/י לי מה אתה/את חושב/ת, גם אם אתה/את לא בטוח/ה.",
      "אם ההסבר שלי לא מובן, פשוט תגיד/י “אפשר להסביר בדרך אחרת?”",
      "תשאל/י “למה?” בכל פעם שאתה/את סקרן/ית — אני מת על זה.",
    ],
    warningH: "אזהרה קטנה 😄",
    warningP: "אני לא אעשה בשבילך את שיעורי הבית ולא אכתוב לך את החיבור. אני יודע שזה ממש מקל, אבל זה בכוונה. אם פשוט הייתי נותן לך את התשובה, היית שוכח/ת אותה עד המבחן הבא. במקום זה אני אעזור לך להגיע לשם בעצמך, צעד אחרי צעד. זה מרגיש איטי יותר, אבל כך באמת לומדים.",
    tipsH: "כמה טיפים",
    tips: [
      "מעט וקבוע עדיף על מאמץ ארוך — 15 דקות כשנתקעת זה תהליך מושלם.",
      "אל תפחד/י לנחש ולטעות. כך בדיוק לומדים.",
      "קח/י רגע לחשוב לפני שאתה/את עונה — השאלות הקשות הן אלה ששוות את המאמץ.",
    ],
    safety: "ואם קשה לך עם משהו שהוא לא שיעורי בית, אתה/את יכול/ה לספר לי — אני אעזור לך למצוא את האדם הנכון לדבר איתו.",
    signoff: "זהו — תגיד/י שלום מתי שבא לך. על מה אתה/את עובד/ת? 👋",
  },
  ar: {
    dir: "rtl",
    langName: "العربية",
    eyebrow: "معلّمك HomeTutor AI",
    title: "كيف تحصل على أقصى استفادة مني",
    intro: "مرحباً! أنا معلّمك. أعمل بشكل مختلف قليلاً عن مجرّد البحث في جوجل — بدلاً من أن أعطيك الإجابة، أطرح عليك أسئلة وأساعدك على الوصول إليها بنفسك. هكذا تترسّخ المعلومة فعلاً. كيف تحصل على أقصى استفادة مني؟",
    rememberH: "أهم شيء تتذكّره",
    rememberCallout: "لست بحاجة أبداً إلى الإجابة ال“صحيحة”. فقط أخبرني بما تفكّر فيه — حتى التخمين رائع — وقل لي إن تعثّرت.",
    rememberP: "عندما أسألك شيئاً، لا تقلق بشأن الإجابة الصحيحة والدقيقة. التخمين رائع. و“أنا عالق” أو “لا أفهم” ليست فشلاً — بل هي بالضبط اللحظة التي أستطيع فيها مساعدتك أكثر. كلما تحدّثت معي كما مع معلّم أو صديق دراسة، استطعت مساعدتك أكثر.",
    canDoH: "ماذا يمكنك أن تفعل",
    canDo: [
      "اسألني عن أي مادة — رياضيات، علوم، تاريخ، إنجليزي، وأي مادة أخرى تعمل عليها.",
      "أرسل صورة لواجبك أو لحلّك — أستطيع قراءتها، حتى بخط اليد.",
      "أرسل رسالة صوتية إن كان ذلك أسهل لك من الكتابة.",
      "اطلب مني رسم مخطط، أو عرض الرياضيات خطوة بخطوة، أو إيجاد مقطع فيديو قصير لك.",
    ],
    unstuckH: "كيف تخرج من التعثّر",
    unstuckP: "إليك ما يفعله الطلاب الذين يستفيدون مني أكثر — يخبرونني بالضبط ما الذي يربكهم:",
    unstuck: [
      "بدلاً من “لا أعرف”، جرّب “لا أفهم لماذا نفعل هذا الجزء”.",
      "أخبرني بما تفكّر فيه، حتى لو لم تكن متأكداً.",
      "إذا لم يكن شرحي واضحاً، فقط قل “هل يمكنك الشرح بطريقة أخرى؟”",
      "اسأل “لماذا؟” كلما كنت فضولياً — أحبّ ذلك.",
    ],
    warningH: "تنبيه صغير 😄",
    warningP: "لن أقوم بحلّ واجبك أو كتابة مقالتك بدلاً منك. أعرف أن ذلك يسهّل الأمور كثيراً، لكنه مقصود. لو أعطيتك الإجابة فقط، لنسيتها بحلول الامتحان التالي. بدلاً من ذلك سأساعدك على الوصول بنفسك، خطوة بخطوة. يبدو أبطأ، لكن هكذا تتعلّم فعلاً.",
    tipsH: "بعض النصائح",
    tips: [
      "القليل والمنتظم أفضل من مجهود طويل واحد — 15 دقيقة عندما تتعثّر مثالية.",
      "لا تخف من التخمين والخطأ. هكذا يحدث التعلّم فعلاً.",
      "خذ لحظة للتفكير قبل أن تجيب — الأسئلة الصعبة هي التي تستحق العناء.",
    ],
    safety: "وإذا مررت بوقت صعب في شيء ليس واجباً مدرسياً، يمكنك إخباري — سأساعدك في إيجاد الشخص المناسب للحديث معه.",
    signoff: "هذا كل شيء — قل مرحباً متى شئت. على ماذا تعمل؟ 👋",
  },
};

const green = "#1B3D2F";
const cream = "#FAF8F5";

export default function GuideContent() {
  const [lang, setLang] = useState<Lang>("en");
  const t = T[lang];
  const rtl = t.dir === "rtl";
  const ta = rtl ? ("right" as const) : ("left" as const);

  const H = ({ children }: { children: React.ReactNode }) => (
    <h2 style={{ fontSize: 20, fontWeight: 700, color: green, margin: "34px 0 10px", lineHeight: 1.3, textAlign: ta, direction: t.dir }}>{children}</h2>
  );
  const P = ({ children }: { children: React.ReactNode }) => (
    <p style={{ fontSize: 16, color: "#3a352e", lineHeight: 1.8, margin: "0 0 10px", textAlign: ta, direction: t.dir }}>{children}</p>
  );
  const UL = ({ items }: { items: string[] }) => (
    <ul style={{ direction: t.dir, textAlign: ta, paddingInlineStart: 22, margin: "0 0 10px" }}>
      {items.map((it, i) => (
        <li key={i} style={{ fontSize: 16, color: "#3a352e", lineHeight: 1.7, marginBottom: 8 }}>{it}</li>
      ))}
    </ul>
  );

  const langBtn = (l: Lang): React.CSSProperties => ({
    padding: "5px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer",
    border: `1.5px solid ${lang === l ? green : "#DDD8CE"}`, borderRadius: 999,
    background: lang === l ? green : "white", color: lang === l ? "white" : "#5c554b",
  });

  return (
    <main style={{ minHeight: "100vh", background: cream, fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", color: "#151210" }}>
      <div style={{ maxWidth: 660, margin: "0 auto", padding: "32px 22px 96px" }} dir={t.dir}>
        <div style={{ display: "flex", gap: 8, justifyContent: rtl ? "flex-start" : "flex-end", marginBottom: 20, direction: "ltr" }}>
          <button style={langBtn("en")} onClick={() => setLang("en")}>EN</button>
          <button style={langBtn("he")} onClick={() => setLang("he")}>עברית</button>
          <button style={langBtn("ar")} onClick={() => setLang("ar")}>العربية</button>
        </div>

        <div style={{ fontSize: 13, color: "#7A7168", marginBottom: 6, letterSpacing: ".02em", textAlign: ta, direction: t.dir }}>{t.eyebrow}</div>
        <h1 style={{ fontSize: 31, fontWeight: 800, color: green, margin: "0 0 12px", lineHeight: 1.15, textAlign: ta, direction: t.dir }}>{t.title}</h1>
        <P>{t.intro}</P>

        <H>{t.rememberH}</H>
        <div style={{ background: "#E8F0EC", border: "1px solid #CFE0D6", borderRadius: 12, padding: "16px 18px", margin: "18px 0", fontSize: 16.5, fontWeight: 600, color: "#1c2a22", lineHeight: 1.7, textAlign: ta, direction: t.dir }}>
          {t.rememberCallout}
        </div>
        <P>{t.rememberP}</P>

        <H>{t.canDoH}</H>
        <UL items={t.canDo} />

        <H>{t.unstuckH}</H>
        <P>{t.unstuckP}</P>
        <UL items={t.unstuck} />

        <H>{t.warningH}</H>
        <P>{t.warningP}</P>

        <H>{t.tipsH}</H>
        <UL items={t.tips} />

        <P>{t.safety}</P>

        <div style={{ marginTop: 28, fontSize: 17, fontWeight: 600, color: green, textAlign: ta, direction: t.dir }}>{t.signoff}</div>
      </div>
    </main>
  );
}
