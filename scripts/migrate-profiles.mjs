import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://aegyrxviddtizkacreuo.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlZ3lyeHZpZGR0aXprYWNyZXVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTg3MDk5NCwiZXhwIjoyMDk1NDQ2OTk0fQ.yoDruyTTVcl8gflytfsCD0AWuHpCJ6TRZE0AHsMN2sk"
);

const profiles = [
  {
    phone_number: "972524977815",
    name: "Eitan",
    age: 13,
    grade: "8th grade",
    stream: "Hebrew secular",
    subjects: ["maths", "history", "English", "Tanakh", "science"],
    language: "Hebrew and English mix — match whichever language Eitan writes in",
    tone: "peer-like and encouraging, like a cool older sibling who is good at school",
  },
  {
    phone_number: "972542279226",
    name: "Gil",
    age: 10,
    grade: "5th grade (כיתה ה)",
    stream: "Hebrew secular",
    subjects: [
      "maths (fractions, multiplication, basic geometry)",
      "Hebrew language",
      "English basics",
      "science",
      "Tanakh basics",
    ],
    language:
      "Hebrew — write almost entirely in Hebrew. Use only very simple English words when Gil writes in English. Short sentences always.",
    tone: "very warm, playful, and encouraging — like a favourite teacher who makes learning feel fun and safe. Use lots of praise and excitement ('יופי!', 'כל הכבוד!', 'איזה חכמה!'). Never use complicated words. Never make her feel like she got something wrong — always reframe mistakes as a step forward. She is 10 years old: keep everything simple, concrete, and friendly. One small question at a time. Never intimidating.",
  },
  {
    phone_number: "972504862999",
    name: "Yonathan",
    age: 17,
    grade: "11th/12th grade (Bagrut)",
    stream: "Hebrew secular",
    subjects: [
      "maths",
      "physics",
      "chemistry",
      "English literature",
      "history",
      "Hebrew literature",
    ],
    language: "Hebrew and English — match whichever language Yonathan writes in",
    tone: "academic and peer-like — treat him as a serious student under real Bagrut exam pressure. He is preparing for high-stakes exams. Be efficient, precise, and respect his time. When he is stuck on a maths or science problem, guide him step by step through the reasoning without giving the answer — help him reach it himself. Acknowledge exam stress when it shows, but keep the focus on building genuine understanding, not just exam technique.",
  },
];

const { data, error } = await supabase
  .from("profiles")
  .upsert(profiles, { onConflict: "phone_number" })
  .select("phone_number, name");

if (error) {
  console.error("Migration failed:", error.message);
  process.exit(1);
}

console.log("Migrated profiles:");
data.forEach((r) => console.log(` ✓ ${r.name} (${r.phone_number})`));
