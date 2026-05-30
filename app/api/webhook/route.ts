import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { waitUntil } from "@vercel/functions";
import { Redis } from "@upstash/redis";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ── Conversation store (Redis) ────────────────────────────────────────────────
// History is always stored as text strings — image messages are stored as
// a caption placeholder so Redis stays lean (no base64 blobs in history).

interface Message {
  role: "user" | "assistant";
  content: string;
}

const MAX_MESSAGES = 20;        // ~10 back-and-forth exchanges
const SESSION_TTL_S = 60 * 60; // expire key after 1 hour of inactivity

function redisKey(phone: string) {
  return `conv:${phone}`;
}

async function getHistory(phone: string): Promise<Message[]> {
  const data = await redis.get<Message[]>(redisKey(phone));
  return data ?? [];
}

async function saveHistory(phone: string, messages: Message[]): Promise<void> {
  await redis.set(redisKey(phone), messages.slice(-MAX_MESSAGES), {
    ex: SESSION_TTL_S,
  });
}

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are HomeTutor AI, a Socratic tutoring assistant on WhatsApp.
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
- Start every new topic by probing what the student already knows before teaching anything.
- Break complex problems into smaller questions, one at a time.
- Celebrate correct reasoning, not just correct answers.
- Keep responses short — this is WhatsApp, not an essay. One question per message.
- Plain text only. No markdown, no bullet points, no asterisks.`;

// ── GET: Meta webhook verification ──────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    console.log("Webhook verified");
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

// ── POST: Receive WhatsApp messages ─────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: WhatsAppPayload;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.object !== "whatsapp_business_account") {
    return NextResponse.json({ status: "ignored" }, { status: 200 });
  }

  const entry = body.entry?.[0];
  const change = entry?.changes?.[0];
  const message = change?.value?.messages?.[0];

  if (!message) {
    return NextResponse.json({ status: "no_message" }, { status: 200 });
  }

  const userPhone = message.from;

  if (message.type === "text") {
    const userText = message.text!.body;
    console.log(`Text from ${userPhone}: ${userText}`);
    waitUntil(
      getClaudeResponse(userPhone, userText)
        .then((reply) => sendWhatsAppMessage(userPhone, reply))
        .catch((err) => console.error("Error processing text:", err))
    );
  } else if (message.type === "image") {
    const mediaId = message.image!.id;
    const caption = message.image!.caption;
    console.log(`Image from ${userPhone}, mediaId: ${mediaId}`);
    waitUntil(
      getClaudeImageResponse(userPhone, mediaId, caption)
        .then((reply) => sendWhatsAppMessage(userPhone, reply))
        .catch((err) => console.error("Error processing image:", err))
    );
  } else {
    console.log(`Unsupported message type: ${message.type}`);
  }

  return NextResponse.json({ status: "ok" }, { status: 200 });
}

// ── Anthropic: text ──────────────────────────────────────────────────────────

async function getClaudeResponse(userPhone: string, userMessage: string): Promise<string> {
  const history = await getHistory(userPhone);

  const updatedHistory: Message[] = [
    ...history,
    { role: "user", content: userMessage },
  ];

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: updatedHistory,
  });

  const block = response.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type");

  await saveHistory(userPhone, [
    ...updatedHistory,
    { role: "assistant", content: block.text },
  ]);

  return block.text;
}

// ── Anthropic: image ─────────────────────────────────────────────────────────

async function getClaudeImageResponse(
  userPhone: string,
  mediaId: string,
  caption?: string
): Promise<string> {
  // 1. Download image from Meta
  const { base64, mimeType } = await downloadMetaMedia(mediaId);

  // 2. Build multimodal content block for Claude
  const imageContent: Anthropic.ImageBlockParam = {
    type: "image",
    source: {
      type: "base64",
      media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
      data: base64,
    },
  };
  const textContent: Anthropic.TextBlockParam = {
    type: "text",
    text: caption || "This is my homework. Please help me work through it.",
  };

  // 3. Prepend text history, then the image as the latest user turn
  const history = await getHistory(userPhone);
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [
      ...history,
      { role: "user", content: [imageContent, textContent] },
    ],
  });

  const block = response.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type");

  // 4. Store as text placeholder — no base64 in Redis
  const historyCaption = caption ? `[Image] ${caption}` : "[Image of homework]";
  await saveHistory(userPhone, [
    ...history,
    { role: "user", content: historyCaption },
    { role: "assistant", content: block.text },
  ]);

  return block.text;
}

// ── Meta media download ──────────────────────────────────────────────────────

async function downloadMetaMedia(
  mediaId: string
): Promise<{ base64: string; mimeType: string }> {
  const accessToken = process.env.META_ACCESS_TOKEN;

  // Step 1: resolve the media URL
  const urlRes = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!urlRes.ok) throw new Error(`Media URL fetch failed: ${urlRes.status}`);
  const { url, mime_type } = (await urlRes.json()) as { url: string; mime_type: string };

  // Step 2: download the actual bytes
  const mediaRes = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!mediaRes.ok) throw new Error(`Media download failed: ${mediaRes.status}`);

  const buffer = await mediaRes.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  return { base64, mimeType: mime_type };
}

// ── Meta WhatsApp send ───────────────────────────────────────────────────────

async function sendWhatsAppMessage(to: string, text: string): Promise<void> {
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;

  const normalizedTo = to.replace(/^\+/, "");

  const res = await fetch(
    `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: normalizedTo,
        type: "text",
        text: { body: text },
      }),
    }
  );

  if (!res.ok) {
    let metaError: unknown;
    try { metaError = await res.json(); } catch { metaError = await res.text(); }
    console.error("Meta API error:", JSON.stringify(metaError));
    throw new Error(`Meta API ${res.status}: ${JSON.stringify(metaError)}`);
  }

  console.log("Meta send success:", JSON.stringify(await res.json()));
}

// ── Types ────────────────────────────────────────────────────────────────────

interface WhatsAppPayload {
  object: string;
  entry: Array<{
    changes: Array<{
      value: {
        messages?: Array<WhatsAppMessage>;
      };
    }>;
  }>;
}

interface WhatsAppMessage {
  from: string;
  type: string;
  text?: { body: string };
  image?: { id: string; caption?: string; mime_type?: string };
}
