// Hybrid diagram planning: decide whether a visual helps a student, and route
// to the accurate deterministic renderer when a template fits, or to a
// model-drawn SVG (validated before use) for the long tail.
//
// Flow: planDiagramSvg(message, lang)
//   1. planDiagram  — one Claude call: template spec | freeform brief | nothing
//   2a. template    — deterministic renderDiagram (accurate by construction)
//   2b. freeform    — generateSvg -> sanitizeSvg -> validateGeneratedSvg (safety)
// Any failure returns null and the bot just replies in text.
import Anthropic from "@anthropic-ai/sdk";
import { renderDiagram, type Lang } from "./diagram";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-6";

// ── Step 1: router ───────────────────────────────────────────────────────────

const PLAN_SYSTEM = `You decide whether a simple line drawing would genuinely help a student understand a problem, and how to produce it.

Choose ONE:
- If it is about a rectangle, triangle, trapezoid, or circle that can be shown with labeled sides — numeric (8) OR symbolic ("a", "2b", "h") — call emit_shape with ONLY the given measurements/labels.
- Otherwise, if a simple diagram would clearly help — e.g. an equilateral or right triangle with its height, a number line, a fraction bar or pie, an angle, a labeled coordinate sketch, a bar model — call emit_freeform with a precise "brief" describing exactly what to draw from the GIVEN information.
- If a drawing wouldn't add much (pure arithmetic, definitions, reading/essay questions, or anything not naturally visual), call NEITHER tool.

Absolute rule: show ONLY what the student was GIVEN. NEVER compute, include, label, or hint at the answer (area, perimeter, circumference, the solved unknown, etc.).

Questions may be in English, Hebrew, or Arabic. Prefer emit_shape when either fits.`;

const MEASURE = { type: ["number", "string"] as const };
const SHAPE_TOOL: Anthropic.Tool = {
  name: "emit_shape",
  description: "Render one of the four supported shapes deterministically from its given measurements (numeric or symbolic).",
  input_schema: {
    type: "object",
    properties: {
      shape: { type: "string", enum: ["rectangle", "trapezoid", "triangle", "circle"] },
      unit: { type: "string", description: "unit for numeric measurements, e.g. cm (ignored for symbolic labels)" },
      w: { ...MEASURE, description: "rectangle width" },
      h: { ...MEASURE, description: "rectangle height, or trapezoid height" },
      a: { ...MEASURE, description: "trapezoid longer parallel side" },
      b: { ...MEASURE, description: "trapezoid shorter parallel side" },
      base: { ...MEASURE, description: "triangle base" },
      height: { ...MEASURE, description: "triangle height" },
      radius: { ...MEASURE, description: "circle radius" },
    },
    required: ["shape"],
  },
};
const FREEFORM_TOOL: Anthropic.Tool = {
  name: "emit_freeform",
  description: "Request a custom simple diagram for a case the four templates don't cover. Only when a drawing clearly helps.",
  input_schema: {
    type: "object",
    properties: {
      brief: { type: "string", description: "Precisely what to draw, using only GIVEN information. No answer/result values." },
    },
    required: ["brief"],
  },
};

type Plan = { kind: "shape"; spec: unknown } | { kind: "freeform"; brief: string } | null;

async function planDiagram(message: string): Promise<Plan> {
  const r = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 400,
    system: PLAN_SYSTEM,
    tools: [SHAPE_TOOL, FREEFORM_TOOL],
    messages: [{ role: "user", content: message }],
  });
  const tool = r.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!tool) return null;
  if (tool.name === "emit_shape") return { kind: "shape", spec: tool.input };
  if (tool.name === "emit_freeform") {
    const brief = (tool.input as { brief?: string }).brief;
    return brief ? { kind: "freeform", brief } : null;
  }
  return null;
}

// ── Step 2b: generative SVG + validation ─────────────────────────────────────

const GEN_SYSTEM = `You draw a single, simple educational diagram as static SVG. Output ONLY the SVG markup — no prose, no markdown, no code fences.

Requirements:
- Root: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 340" width="440" height="340">, first child a full-size rect fill "#FAF8F5".
- Style: shape strokes "#1B3D2F" width 2.5, shape fills "#E8F0EC", helper/dashed lines "#8A8278", text fill "#1a1a1a" font-family "Noto Sans" font-size 16 font-weight 600. Mark right angles with a small square.
- Use only these elements: rect, circle, ellipse, line, polyline, polygon, path, text, g. NO <script>, <style>, <foreignObject>, <image>, <use>, external URLs, or event handlers.
- Draw ONLY the GIVEN information in the brief. NEVER draw, label, compute, or hint at the answer or any solved value. Label given quantities (numeric or symbolic like "a", "h").
- Keep it clean, legible, and correct. Fit within the 440x340 canvas with margins.

Right-to-left note: for Hebrew/Arabic labels you may add direction="rtl" on the <text>.`;

// Structural safety filter. Returns cleaned SVG or null if it looks unsafe/malformed.
function sanitizeSvg(raw: string): string | null {
  if (!raw) return null;
  const start = raw.indexOf("<svg");
  const end = raw.lastIndexOf("</svg>");
  if (start === -1 || end === -1) return null;
  const svg = raw.slice(start, end + "</svg>".length);
  if (svg.length > 20000) return null;
  const lower = svg.toLowerCase();
  const banned = ["<script", "<foreignobject", "<image", "<use", "<a ", "<!entity", "<!doctype", "javascript:", "onload", "onclick", "onerror", "data:"];
  if (banned.some((b) => lower.includes(b))) return null;
  if (/\son\w+\s*=/.test(lower)) return null; // inline event handlers
  // No href to an external/data target (internal href="#id" is fine).
  if (/(?:xlink:href|href)\s*=\s*["']\s*(?:https?:|data:|\/\/)/i.test(svg)) return null;
  // Allow only the W3C namespace URLs (xmlns); reject any other http(s) URL.
  const urls = lower.match(/https?:\/\/[^"'\s>]+/g) || [];
  if (urls.some((u) => !u.startsWith("http://www.w3.org/"))) return null;
  if (!lower.includes("viewbox")) return null;
  return svg;
}

const VALIDATE_SYSTEM = `You are a safety check for a tutoring diagram. You are given a student's problem and an SVG diagram meant to accompany a Socratic hint. Approve it ONLY if ALL hold:
- It depicts the problem's GIVEN setup correctly and would genuinely help.
- It does NOT reveal, state, or label the answer or any solved/computed value (e.g. the area, perimeter, the found unknown).
- It is a sensible, not misleading, drawing.
Call the verdict tool.`;

const VERDICT_TOOL: Anthropic.Tool = {
  name: "verdict",
  description: "Approve or reject the diagram.",
  input_schema: {
    type: "object",
    properties: {
      ok: { type: "boolean", description: "true only if safe, correct, and helpful" },
      reason: { type: "string", description: "brief reason" },
    },
    required: ["ok"],
  },
};

async function validateGeneratedSvg(svg: string, message: string): Promise<boolean> {
  try {
    // Pass the visible text labels + the markup so the checker can see both.
    const labels = (svg.match(/<text[^>]*>([\s\S]*?)<\/text>/g) || []).join(" ");
    const r = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 200,
      system: VALIDATE_SYSTEM,
      tools: [VERDICT_TOOL],
      tool_choice: { type: "tool", name: "verdict" },
      messages: [{ role: "user", content: `Problem:\n${message}\n\nDiagram labels: ${labels}\n\nSVG:\n${svg}` }],
    });
    const tool = r.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    return tool ? (tool.input as { ok?: boolean }).ok === true : false;
  } catch (e) {
    console.error("Diagram validate error:", e);
    return false; // fail closed
  }
}

async function generateSvg(brief: string, message: string, lang: Lang): Promise<string | null> {
  const r = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: GEN_SYSTEM,
    messages: [{ role: "user", content: `Language for labels: ${lang}\nStudent problem: ${message}\n\nDraw: ${brief}` }],
  });
  const text = r.content.filter((b) => b.type === "text").map((b) => (b as Anthropic.TextBlock).text).join("");
  return sanitizeSvg(text);
}

// ── Orchestrator ─────────────────────────────────────────────────────────────

// Returns an SVG string ready to rasterize, or null (bot replies in text).
// Never throws.
export async function planDiagramSvg(message: string, lang: Lang): Promise<string | null> {
  try {
    const plan = await planDiagram(message);
    console.log(`diagram plan: ${plan ? plan.kind : "none"}${plan?.kind === "freeform" ? ` — ${plan.brief.slice(0, 80)}` : ""}`);
    if (!plan) return null;
    if (plan.kind === "shape") {
      const svg = renderDiagram(plan.spec, lang); // deterministic; null if spec invalid
      if (!svg) console.log(`diagram: shape spec invalid — ${JSON.stringify(plan.spec)}`);
      return svg;
    }
    // freeform: generate -> sanitize -> model safety check
    const svg = await generateSvg(plan.brief, message, lang);
    if (!svg) { console.log("diagram: freeform generate/sanitize failed"); return null; }
    const ok = await validateGeneratedSvg(svg, message);
    console.log(`diagram: freeform validated=${ok}`);
    return ok ? svg : null;
  } catch (e) {
    console.error("planDiagramSvg error:", e);
    return null;
  }
}
