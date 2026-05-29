import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { waitUntil } from "@vercel/functions";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── In-memory conversation store ─────────────────────────────────────────────
// Keyed by phone number. Resets on cold start — good enough for now,
// we'll swap this for Redis when we want persistence across restarts.

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  messages: Message[];
  lastActivity: number;
}

const conversations = new Map<string, Conversation>();
const MAX_MESSAGES = 20;           // ~10 back-and-forth exchanges
const SESSION_TTL_MS = 60 * 60 * 1000; // reset context after 1 hour of inactivity

function getHistory(phone: string): Message[] {
  const conv = conversations.get(phone);
  if (!conv) return [];
  // Expire old sessions so context doesn't bleed across different study sessions
  if (Date.now() - conv.lastActivity > SESSION_TTL_MS) {
    conversations.delete(phone);
    return [];
  }
  return conv.messages;
}

function saveHistory(phone: string, messages: Message[]): void {
  conversations.set(phone, {
    messages: messages.slice(-MAX_MESSAGES),
    lastActivity: Date.now(),
  });
}

const SYSTEM_PROMPT = `You are HomeTutor AI, a Socratic tutoring assistant on WhatsApp.
Your role is to help students learn by asking guiding questions rather than giving direct answers.
Follow these principles:
- Never simply state the answer. Ask questions that lead the student to discover it themselves.
- Start by understanding what the student already knows.
- Break complex problems into smaller questions.
- When a student is stuck, give a small hint as a question, not a statement.
- Celebrate correct reasoning, not just correct answers.
- Keep responses concise — this is WhatsApp, not an essay.
- Use plain text only (no markdown, no bullet symbols that look odd on mobile).`;

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

  // Meta sends a test ping when you first save the webhook — acknowledge it
  if (body.object !== "whatsapp_business_account") {
    return NextResponse.json({ status: "ignored" }, { status: 200 });
  }

  const entry = body.entry?.[0];
  const change = entry?.changes?.[0];
  const message = change?.value?.messages?.[0];

  // Only handle incoming text messages
  if (!message || message.type !== "text") {
    return NextResponse.json({ status: "no_text_message" }, { status: 200 });
  }

  const userPhone = message.from;
  const userText = message.text.body;

  console.log(`Message from ${userPhone}: ${userText}`);

  // Return 200 to Meta immediately — if we wait for Claude, Vercel's 10s
  // hobby-plan timeout kills the function and Meta retries endlessly.
  // waitUntil keeps the process alive to finish after the response is sent.
  waitUntil(
    getClaudeResponse(userPhone, userText)
      .then((aiResponse) => sendWhatsAppMessage(userPhone, aiResponse))
      .catch((err) => console.error("Error processing message:", err))
  );

  return NextResponse.json({ status: "ok" }, { status: 200 });
}

// ── Anthropic call ───────────────────────────────────────────────────────────

async function getClaudeResponse(userPhone: string, userMessage: string): Promise<string> {
  const history = getHistory(userPhone);

  // Append the new user message
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

  // Save the full exchange (including assistant reply) for next turn
  saveHistory(userPhone, [
    ...updatedHistory,
    { role: "assistant", content: block.text },
  ]);

  return block.text;
}

// ── Meta WhatsApp send ───────────────────────────────────────────────────────

async function sendWhatsAppMessage(to: string, text: string): Promise<void> {
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;

  // Meta requires E.164 format without the leading '+' (e.g. "15551234567")
  const normalizedTo = to.replace(/^\+/, "");

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalizedTo,
    type: "text",
    text: { body: text },
  };

  console.log("Sending to Meta:", JSON.stringify({ phoneNumberId, to: normalizedTo }));

  const res = await fetch(
    `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    // Parse Meta's structured error so the code + message are visible in logs
    let metaError: unknown;
    try {
      metaError = await res.json();
    } catch {
      metaError = await res.text();
    }
    console.error("Meta API error response:", JSON.stringify(metaError));
    throw new Error(`Meta API ${res.status}: ${JSON.stringify(metaError)}`);
  }

  const result = await res.json();
  console.log("Meta send success:", JSON.stringify(result));
}

// ── Types ────────────────────────────────────────────────────────────────────

interface WhatsAppPayload {
  object: string;
  entry: Array<{
    changes: Array<{
      value: {
        messages?: Array<{
          from: string;
          type: string;
          text: { body: string };
        }>;
      };
    }>;
  }>;
}
