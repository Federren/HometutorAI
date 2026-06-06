import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { waitUntil } from "@vercel/functions";
import { Redis } from "@upstash/redis";
import { YoutubeTranscript } from "youtube-transcript";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Conversation store (Redis) ────────────────────────────────────────────────

interface Message {
  role: "user" | "assistant";
  content: string;
}

const MAX_MESSAGES = 12;
const SESSION_TTL_S = 60 * 60;

const redisKey = (phone: string) => `conv:${phone}`;

async function getHistory(phone: string): Promise<Message[]> {
  return (await redis.get<Message[]>(redisKey(phone))) ?? [];
}

async function saveHistory(phone: string, messages: Message[]): Promise<void> {
  await redis.set(redisKey(phone), messages.slice(-MAX_MESSAGES), { ex: SESSION_TTL_S });
}

// ── Security: Meta webhook signature verification ─────────────────────────────

// Meta signs every webhook POST with HMAC-SHA256(appSecret, rawBody), sent in
// the X-Hub-Signature-256 header as "sha256=<hex>". We verify it over the exact
// raw bytes so emoji / Hebrew / Arabic don't cause re-encoding mismatches.
function verifyMetaSignature(bodyBuffer: Buffer, signatureHeader: string | null): boolean {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) {
    console.error("META_APP_SECRET not set — rejecting webhook");
    return false;
  }
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const expected = crypto.createHmac("sha256", appSecret).update(bodyBuffer).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const receivedBuf = Buffer.from(signatureHeader.slice("sha256=".length), "hex");

  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

// ── Security: per-user rate limiting (fixed window via Redis) ──────────────────

const RATE_LIMIT_MAX = 15;        // messages allowed
const RATE_LIMIT_WINDOW_S = 60;   // per this many seconds

async function checkRateLimit(
  phone: string
): Promise<{ allowed: boolean; justExceeded: boolean }> {
  const key = `rate:${phone}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, RATE_LIMIT_WINDOW_S);
  return {
    allowed: count <= RATE_LIMIT_MAX,
    justExceeded: count === RATE_LIMIT_MAX + 1,
  };
}

// ── Subject detection ─────────────────────────────────────────────────────────

function detectSubject(content: string): string | null {
  const lower = content.toLowerCase();

  // Hebrew keyword check — no \b anchors, they don't work with non-ASCII characters
  if (/[א-ת]/.test(content)) {
    if (/(מתמטיקה|אלגברה|גיאומטריה|חשבון|סטטיסטיקה|הסתברות|אינטגרל|נגזרת|משוואה|חיסור|חיבור|כפל|חילוק|עשרוניים|שברים|אחוזים)/.test(content)) return "maths";
    if (/(פיזיקה|כוח|אנרגיה|מהירות|תאוצה|מגנטיות|חשמל|תרמודינמיקה)/.test(content)) return "physics";
    if (/(כימיה|מולקולה|אטום|תגובה|חומצה|בסיס|אלקטרון|תרכובת)/.test(content)) return "chemistry";
    if (/(ביולוגיה|תא חי|דנ"א|אבולוציה|פוטוסינתזה|גנטיקה|חיידק|סרטן)/.test(content)) return "biology";
    if (/(היסטוריה|מלחמה|מהפכה|ציוויליזציה|אימפריה|תרבות עתיקה)/.test(content)) return "history";
    if (/(תנ"ך|תורה|בראשית|שמות|תהלים|תלמוד|גמרא|משנה|פרשת|חומש)/.test(content)) return "Tanakh";
    if (/(ספרות עברית|שיר|רומן|סיפור קצר|סופר|משורר)/.test(content)) return "Hebrew literature";
    if (/(אנגלית|מילה באנגלית|לתרגם|תרגום)/.test(content)) return "English";
    if (/(גאוגרפיה|מדינה|יבשת|אקלים|אוכלוסיה)/.test(content)) return "geography";
    if (/(מדעים|ניסוי|מעבדה|טבע|מערכת השמש|חומר|אנרגיה)/.test(content)) return "science";
  }

  const patterns: Array<[string, RegExp]> = [
    ["maths",              /\b(math|maths|algebra|geometry|calculus|equation|trigonometry|statistics|probability|integral|derivative|quadratic|polynomial|logarithm)\b/],
    ["physics",            /\b(physics|force|energy|velocity|acceleration|momentum|newton|gravity|electricity|magnetism|quantum|thermodynamics|optics|friction|wave|circuit)\b/],
    ["chemistry",          /\b(chemistry|chemical|molecule|atom|element|periodic|reaction|acid|base|compound|bond|electron|titration|oxidation)\b/],
    ["biology",            /\b(biology|cell|organism|dna|evolution|photosynthesis|genetics|species|ecosystem|mitosis|meiosis|protein|enzyme)\b/],
    ["history",            /\b(history|historical|war|revolution|ancient|medieval|empire|century|civilization|dynasty|holocaust|colonial)\b/],
    ["English literature", /\b(english|grammar|essay|literature|poem|poetry|novel|shakespeare|prose|metaphor|simile|narrative|author|character)\b/],
    ["Tanakh",             /\b(tanakh|torah|bible|genesis|exodus|beresheet|shemot|tehilim|mishlei|kohelet|talmud|gemara|mishnah|parasha|parshat|sefaria)\b/],
    ["science",            /\b(science|experiment|hypothesis|scientific|lab|laboratory)\b/],
    ["geography",          /\b(geography|country|continent|climate|map|region|capital city|population|latitude|longitude)\b/],
    ["coding",             /\b(code|coding|programming|python|javascript|algorithm|function|variable|loop|array|database|software)\b/],
  ];

  for (const [subject, pattern] of patterns) {
    if (pattern.test(lower)) return subject;
  }
  return null;
}

// ── Supabase message logging ──────────────────────────────────────────────────

async function logMessage(
  phone: string,
  role: "user" | "assistant",
  content: string,
  subject?: string | null
): Promise<void> {
  const profile = await getProfile(phone);
  const { error } = await supabase.from("messages").insert({
    phone_number: phone,
    child_name: profile.name,
    role,
    content,
    subject_detected: subject ?? null,
  });
  if (error) console.error("Supabase log error:", error.message);
}

// ── Student profiles (Supabase-backed) ───────────────────────────────────────

interface StudentProfile {
  name: string;
  age?: number;
  grade?: string;
  stream?: string;
  subjects?: string[];
  language: string;
  tone: string;
}

const DEFAULT_PROFILE: StudentProfile = {
  name: "Student",
  language: "English",
  tone: "professional and supportive",
};

// In-memory cache so we don't hit Supabase on every message
let _profileCache: Record<string, StudentProfile> | null = null;
let _profileCacheExpiry = 0;
const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getAllProfiles(): Promise<Record<string, StudentProfile>> {
  const now = Date.now();
  if (_profileCache && now < _profileCacheExpiry) return _profileCache;

  const { data, error } = await supabase
    .from("profiles")
    .select("phone_number, name, age, grade, stream, subjects, language, tone")
    .eq("active", true);

  if (error || !data) {
    console.error("Failed to load profiles:", error?.message);
    return _profileCache ?? {}; // fall back to stale cache or empty
  }

  const map: Record<string, StudentProfile> = {};
  for (const row of data) {
    map[row.phone_number] = {
      name: row.name,
      age: row.age ?? undefined,
      grade: row.grade ?? undefined,
      stream: row.stream ?? undefined,
      subjects: row.subjects ?? undefined,
      language: row.language,
      tone: row.tone,
    };
  }

  _profileCache = map;
  _profileCacheExpiry = now + PROFILE_CACHE_TTL_MS;
  return map;
}

async function getProfile(phone: string): Promise<StudentProfile> {
  const profiles = await getAllProfiles();
  return profiles[phone] ?? DEFAULT_PROFILE;
}

// ── System prompt (dynamic per profile) ──────────────────────────────────────

const BASE_PROMPT = `You are HomeTutor AI, a Socratic tutoring assistant on WhatsApp.
You help students with ALL school subjects — math, science, history, literature, languages, geography, coding, economics, and anything else they bring to you.
Your role is to guide students to discover answers themselves through probing questions, never by stating the answer directly.

Questioning rules — always ask questions that require the student to demonstrate knowledge:
- Never ask yes/no questions like "did you understand?" or "does that make sense?"
- Always ask questions that require the student to produce knowledge, for example:
  "Walk me through the first step."
  "What do you already know about this topic?"
  "What would happen if you changed X?"
  "How would you explain this in your own words?"
  "What have you tried so far?"
  "Where exactly did you get stuck?"
- When a student is wrong, don't say so directly — ask a question that exposes the gap: "What makes you think that?" or "What would that mean for Y?"

General principles:
- If a student sends only a greeting with no question or subject, respond warmly and ask one specific easy question to start the conversation — for example ask which subject they are working on tonight or whether they have any tests coming up.
- Start every new topic by probing what the student already knows before teaching anything.
- Break complex problems into smaller questions, one at a time.
- Celebrate correct reasoning, not just correct answers.
- Keep responses short — this is WhatsApp, not an essay. One question per message.
- Plain text only. No markdown, no bullet points, no asterisks.

YouTube tool guidance:
- Use find_youtube_video when a visual or worked example would genuinely help more than a text exchange (e.g. complex diagrams, physical processes, worked math problems, historical events).
- Do NOT use it for every question — only when a video adds clear value.
- When sharing a video, briefly say why it will help, then ask the student to watch it and come back with what they found interesting or confusing.

Sefaria tool guidance:
- Use get_sefaria_text to fetch the exact Hebrew and English text of any Tanakh, Talmud, Mishnah, Midrash, or commentary passage before discussing it. Always work from the real text.
- Use search_sefaria when the student asks a thematic question (e.g. "what does the Torah say about honesty?") to find the most relevant passages.
- After fetching a text, quote the relevant line briefly, then ask the student what they notice or what they think it means — never explain it for them first.
- Respond in Hebrew when discussing Hebrew texts with Hebrew-language students.`;

function buildSystemPrompt(profile: StudentProfile): string {
  const lines = [
    `- Name: ${profile.name}`,
    profile.age ? `- Age: ${profile.age}` : null,
    profile.grade ? `- Grade: ${profile.grade}` : null,
    profile.stream ? `- School stream: ${profile.stream}` : null,
    profile.subjects ? `- Subjects: ${profile.subjects.join(", ")}` : null,
    `- Language: ${profile.language}`,
    `- Tone: ${profile.tone}`,
  ].filter(Boolean).join("\n");

  return `${BASE_PROMPT}

Student profile — calibrate your vocabulary, examples, and language accordingly:
${lines}`;
}

// ── Tool definitions ──────────────────────────────────────────────────────────

const ALL_TOOLS: Anthropic.Tool[] = [
  {
    name: "find_youtube_video",
    description:
      "Search YouTube for a short educational video to help the student understand a concept. Use sparingly — only when a visual explanation is clearly better than text.",
    input_schema: {
      type: "object" as const,
      properties: {
        search_query: {
          type: "string",
          description: "A concise YouTube search query, e.g. 'photosynthesis explained for kids' or 'quadratic formula step by step'",
        },
      },
      required: ["search_query"],
    },
  },
  {
    name: "get_sefaria_text",
    description:
      "Fetch the Hebrew and English text of a specific Jewish text by Sefaria reference. Use for any Tanakh, Talmud, Mishnah, Midrash, or classic commentary passage. Always fetch the real text before discussing it.",
    input_schema: {
      type: "object" as const,
      properties: {
        reference: {
          type: "string",
          description: "Sefaria reference, e.g. 'Genesis 1:1', 'Exodus 20:2-14', 'Pirkei Avot 1:1', 'Rashi on Genesis 1:1', 'Berakhot 2a'",
        },
      },
      required: ["reference"],
    },
  },
  {
    name: "search_sefaria",
    description:
      "Search Sefaria's library for Jewish texts related to a topic or keyword. Use when the student asks a thematic question and you need to find the most relevant passage.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query in English or Hebrew, e.g. 'creation of the world', 'loving your neighbour', 'teshuvah'",
        },
      },
      required: ["query"],
    },
  },
];

// ── GET: Meta webhook verification ──────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// ── POST: Receive WhatsApp messages ─────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Read the exact raw bytes so we can verify Meta's HMAC signature.
  const bodyBuffer = Buffer.from(await req.arrayBuffer());
  const signature = req.headers.get("x-hub-signature-256");

  if (!verifyMetaSignature(bodyBuffer, signature)) {
    console.error("Webhook signature verification failed — rejecting");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: WhatsAppPayload;
  try {
    body = JSON.parse(bodyBuffer.toString("utf8")) as WhatsAppPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.object !== "whatsapp_business_account") {
    return NextResponse.json({ status: "ignored" }, { status: 200 });
  }

  const value = body.entry?.[0]?.changes?.[0]?.value;
  const message = value?.messages?.[0];
  if (!message) return NextResponse.json({ status: "no_message" }, { status: 200 });

  // Use whichever phone number ID received the message — works for both
  // the test number and the production Israeli number automatically.
  const phoneNumberId = value?.metadata?.phone_number_id ?? process.env.META_PHONE_NUMBER_ID!;
  const userPhone = message.from;

  console.log(`Incoming via phoneNumberId=${phoneNumberId} from=${userPhone}`);

  waitUntil(processMessage(phoneNumberId, userPhone, message).catch(
    (err) => console.error("Error processing message:", err)
  ));

  return NextResponse.json({ status: "ok" }, { status: 200 });
}

async function processMessage(
  phoneNumberId: string,
  userPhone: string,
  message: WhatsAppMessage
): Promise<void> {
  // Rate limiting — applies to everyone, before any expensive work.
  const { allowed, justExceeded } = await checkRateLimit(userPhone);
  if (!allowed) {
    console.log(`Rate limit exceeded for ${userPhone}`);
    if (justExceeded) {
      // Notify known users once that they are going too fast; drop the rest.
      const profiles = await getAllProfiles();
      if (profiles[userPhone]) {
        await sendWhatsAppMessage(
          phoneNumberId,
          userPhone,
          "You're sending messages very fast — give me a moment to catch up, then try again. 😊"
        );
      }
    }
    return;
  }

  // Reject unknown numbers — deduped to one rejection per hour to avoid
  // an unknown sender triggering a flood of rejection messages.
  const profiles = await getAllProfiles();
  if (!profiles[userPhone]) {
    const alreadyRejected = await redis.get(`rejected:${userPhone}`);
    if (!alreadyRejected) {
      await redis.set(`rejected:${userPhone}`, "1", { ex: 3600 });
      await sendWhatsAppMessage(
        phoneNumberId,
        userPhone,
        "This is a private service. To learn more visit hometutorai.to"
      );
      console.log(`Unknown number ${userPhone} — rejection sent`);
    } else {
      console.log(`Unknown number ${userPhone} — rejection suppressed (deduped)`);
    }
    return;
  }

  if (message.type === "text") {
    const userText = message.text!.body;
    console.log(`Text from ${userPhone}: ${userText}`);

    const videoId = extractYouTubeId(userText);
    const reply = videoId
      ? await handleYouTubeLink(userPhone, videoId, userText)
      : await getClaudeResponse(userPhone, userText);
    await sendWhatsAppMessage(phoneNumberId, userPhone, reply);

  } else if (message.type === "image") {
    const mediaId = message.image!.id;
    const caption = message.image!.caption;
    console.log(`Image from ${userPhone}`);
    const reply = await getClaudeImageResponse(userPhone, mediaId, caption);
    await sendWhatsAppMessage(phoneNumberId, userPhone, reply);

  } else if (message.type === "audio") {
    const mediaId = message.audio!.id;
    console.log(`Voice message from ${userPhone}`);
    const reply = await transcribeAndRespond(userPhone, mediaId);
    await sendWhatsAppMessage(phoneNumberId, userPhone, reply);

  } else {
    console.log(`Unsupported message type: ${message.type}`);
  }
}

// ── Anthropic: text (with YouTube tool use) ──────────────────────────────────

async function getClaudeResponse(userPhone: string, userMessage: string): Promise<string> {
  const profile = await getProfile(userPhone);
  const history = await getHistory(userPhone);
  const updatedHistory: Message[] = [...history, { role: "user", content: userMessage }];

  const subject = detectSubject(userMessage);
  logMessage(userPhone, "user", userMessage, subject).catch(e => console.error("Log error:", e));

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: buildSystemPrompt(profile),
    tools: ALL_TOOLS,
    messages: updatedHistory,
  });

  // Claude called a tool — resolve it and get the final response
  if (response.stop_reason === "tool_use") {
    const toolBlock = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (toolBlock) {
      let toolResult = "No result found.";

      if (toolBlock.name === "find_youtube_video") {
        const query = (toolBlock.input as { search_query: string }).search_query;
        console.log(`Claude searching YouTube: "${query}"`);
        const video = await searchYouTube(query);
        toolResult = video ? `Title: ${video.title}\nURL: ${video.url}` : "No suitable video found.";

      } else if (toolBlock.name === "get_sefaria_text") {
        const ref = (toolBlock.input as { reference: string }).reference;
        console.log(`Claude fetching Sefaria text: "${ref}"`);
        toolResult = await getSefariaText(ref);

      } else if (toolBlock.name === "search_sefaria") {
        const query = (toolBlock.input as { query: string }).query;
        console.log(`Claude searching Sefaria: "${query}"`);
        toolResult = await searchSefaria(query);
      }

      const finalResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 512,
        system: buildSystemPrompt(profile),
        tools: ALL_TOOLS,
        messages: [
          ...updatedHistory,
          { role: "assistant", content: response.content },
          { role: "user", content: [{ type: "tool_result", tool_use_id: toolBlock.id, content: toolResult }] },
        ],
      });

      const finalBlock = finalResponse.content.find((b): b is Anthropic.TextBlock => b.type === "text");
      const reply = finalBlock?.text ?? "";
      await saveHistory(userPhone, [...updatedHistory, { role: "assistant", content: reply }]);
      logMessage(userPhone, "assistant", reply, subject).catch(e => console.error("Log error:", e));
      return reply;
    }
  }

  // Normal text response
  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  const reply = textBlock?.text ?? "";
  await saveHistory(userPhone, [...updatedHistory, { role: "assistant", content: reply }]);
  logMessage(userPhone, "assistant", reply, subject).catch(e => console.error("Log error:", e));
  return reply;
}

// ── Anthropic: incoming YouTube link ─────────────────────────────────────────

async function handleYouTubeLink(
  userPhone: string,
  videoId: string,
  originalMessage: string
): Promise<string> {
  const profile = await getProfile(userPhone);
  const history = await getHistory(userPhone);

  let userContent: string;

  // Try to get transcript
  const transcript = await fetchYouTubeTranscript(videoId);
  if (transcript) {
    console.log(`Fetched transcript for video ${videoId} (${transcript.length} chars)`);
    userContent =
      `The student shared a YouTube video (https://youtu.be/${videoId}).\n` +
      `Their message: "${originalMessage}"\n\n` +
      `Video transcript (first portion):\n${transcript}`;
  } else {
    userContent =
      `The student shared a YouTube video (https://youtu.be/${videoId}).\n` +
      `Their message: "${originalMessage}"\n\n` +
      `No transcript was available for this video. Ask the student what the video is about and what they found confusing.`;
  }

  const updatedHistory: Message[] = [...history, { role: "user", content: userContent }];

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: buildSystemPrompt(profile),
    messages: updatedHistory,
  });

  const block = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  const reply = block?.text ?? "";

  // Store a clean placeholder in history (not the full transcript)
  await saveHistory(userPhone, [
    ...history,
    { role: "user", content: `[YouTube video: https://youtu.be/${videoId}]` },
    { role: "assistant", content: reply },
  ]);

  logMessage(userPhone, "user", `[YouTube video: https://youtu.be/${videoId}] ${originalMessage}`.trim(), "YouTube").catch(e => console.error("Log error:", e));
  logMessage(userPhone, "assistant", reply, "YouTube").catch(e => console.error("Log error:", e));

  return reply;
}

// ── Anthropic: image ─────────────────────────────────────────────────────────

async function getClaudeImageResponse(
  userPhone: string,
  mediaId: string,
  caption?: string
): Promise<string> {
  const profile = await getProfile(userPhone);
  const { base64, mimeType } = await downloadMetaMedia(mediaId);
  const history = await getHistory(userPhone);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: buildSystemPrompt(profile),
    messages: [
      ...history,
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data: base64 } },
          { type: "text", text: caption || "This is my homework. Please help me work through it." },
        ],
      },
    ],
  });

  const block = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  const reply = block?.text ?? "";

  const imageLabel = caption ? `[Image] ${caption}` : "[Image of homework]";
  await saveHistory(userPhone, [
    ...history,
    { role: "user", content: imageLabel },
    { role: "assistant", content: reply },
  ]);

  const imageSubject = detectSubject(caption ?? "");
  logMessage(userPhone, "user", imageLabel, imageSubject).catch(e => console.error("Log error:", e));
  logMessage(userPhone, "assistant", reply, imageSubject).catch(e => console.error("Log error:", e));

  return reply;
}

// ── Sefaria helpers ───────────────────────────────────────────────────────────

async function getSefariaText(reference: string): Promise<string> {
  try {
    const encoded = encodeURIComponent(reference);
    const res = await fetch(
      `https://www.sefaria.org/api/texts/${encoded}?lang=en&commentary=0&context=0`
    );
    if (!res.ok) return `Text not found for reference: ${reference}`;
    const data = await res.json() as {
      ref?: string;
      heRef?: string;
      text?: string | string[];
      he?: string | string[];
      error?: string;
    };

    if (data.error) return `Sefaria error: ${data.error}`;

    const flatten = (t: string | string[] | undefined): string => {
      if (!t) return "";
      if (typeof t === "string") return t;
      return t.flat(Infinity).join(" ");
    };

    const heText = flatten(data.he).replace(/<[^>]+>/g, "").trim();
    const enText = flatten(data.text).replace(/<[^>]+>/g, "").trim();

    return [
      `Reference: ${data.ref ?? reference}`,
      heText ? `Hebrew: ${heText}` : "",
      enText ? `English: ${enText}` : "",
    ]
      .filter(Boolean)
      .join("\n")
      .slice(0, 3000);
  } catch (err) {
    console.error("Sefaria getText error:", err);
    return "Could not retrieve text from Sefaria.";
  }
}

async function searchSefaria(query: string): Promise<string> {
  try {
    const res = await fetch(
      `https://www.sefaria.org/api/search-wrapper?query=${encodeURIComponent(query)}&type=text&field=exact&slop=10&sort_type=score&sort_dir=desc&size=3&from=0`
    );
    if (!res.ok) return "Sefaria search failed.";
    const data = await res.json() as { hits?: { hits?: Array<{ _source?: { ref?: string; text?: { en?: string } } }> } };
    const hits = data.hits?.hits ?? [];
    if (!hits.length) return "No results found in Sefaria for that query.";

    return hits
      .map((h) => `${h._source?.ref}: ${h._source?.text?.en ?? ""}`)
      .join("\n\n")
      .replace(/<[^>]+>/g, "")
      .slice(0, 2000);
  } catch (err) {
    console.error("Sefaria search error:", err);
    return "Could not search Sefaria.";
  }
}

// ── YouTube helpers ───────────────────────────────────────────────────────────

function extractYouTubeId(text: string): string | null {
  const match = text.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
  );
  return match?.[1] ?? null;
}

async function fetchYouTubeTranscript(videoId: string): Promise<string | null> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    // Join and cap at ~6000 chars (~15 min of speech) to stay within token budget
    return transcript
      .map((t) => t.text)
      .join(" ")
      .slice(0, 6000);
  } catch {
    return null;
  }
}

async function searchYouTube(query: string): Promise<{ title: string; url: string } | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn("YOUTUBE_API_KEY not set — returning search URL fallback");
    return {
      title: "YouTube search results",
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
    };
  }

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoDuration=short&maxResults=1&key=${apiKey}`
    );
    const data = await res.json();
    const item = data.items?.[0];
    if (!item) return null;
    return {
      title: item.snippet.title,
      url: `https://youtu.be/${item.id.videoId}`,
    };
  } catch (err) {
    console.error("YouTube search error:", err);
    return null;
  }
}

// ── Whisper voice transcription ──────────────────────────────────────────────

async function transcribeAndRespond(userPhone: string, mediaId: string): Promise<string> {
  // Download voice note from Meta (WhatsApp sends OGG/Opus)
  const { buffer, mimeType } = await downloadMetaMediaBuffer(mediaId);

  // Send to Whisper for transcription
  const file = new File([buffer], "voice.ogg", { type: mimeType });
  const transcription = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
  });

  const transcript = transcription.text.trim();
  console.log(`Transcribed voice: "${transcript}"`);

  if (!transcript) {
    return "I couldn't make out what you said — could you try again or type your question?";
  }

  // Treat the transcript exactly like a text message
  return getClaudeResponse(userPhone, transcript);
}

// ── Meta media download ──────────────────────────────────────────────────────

async function downloadMetaMediaBuffer(
  mediaId: string
): Promise<{ buffer: ArrayBuffer; mimeType: string }> {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const urlRes = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!urlRes.ok) throw new Error(`Media URL fetch failed: ${urlRes.status}`);
  const { url, mime_type } = (await urlRes.json()) as { url: string; mime_type: string };

  const mediaRes = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!mediaRes.ok) throw new Error(`Media download failed: ${mediaRes.status}`);

  return { buffer: await mediaRes.arrayBuffer(), mimeType: mime_type };
}

async function downloadMetaMedia(mediaId: string): Promise<{ base64: string; mimeType: string }> {
  const { buffer, mimeType } = await downloadMetaMediaBuffer(mediaId);
  return { base64: Buffer.from(buffer).toString("base64"), mimeType };
}

// ── Meta WhatsApp send ───────────────────────────────────────────────────────

async function sendWhatsAppMessage(phoneNumberId: string, to: string, text: string): Promise<void> {
  const res = await fetch(
    `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to.replace(/^\+/, ""),
        type: "text",
        text: { body: text },
      }),
    }
  );

  if (!res.ok) {
    let err: unknown;
    try { err = await res.json(); } catch { err = await res.text(); }
    console.error("Meta API error:", JSON.stringify(err));
    throw new Error(`Meta API ${res.status}`);
  }
  console.log("Sent:", JSON.stringify(await res.json()));
}

// ── Types ────────────────────────────────────────────────────────────────────

interface WhatsAppPayload {
  object: string;
  entry: Array<{
    changes: Array<{
      value: {
        metadata?: { phone_number_id: string; display_phone_number: string };
        messages?: WhatsAppMessage[];
      };
    }>;
  }>;
}

interface WhatsAppMessage {
  from: string;
  type: string;
  text?: { body: string };
  image?: { id: string; caption?: string; mime_type?: string };
  audio?: { id: string; mime_type?: string };
}
