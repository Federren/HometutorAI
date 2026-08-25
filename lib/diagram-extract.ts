// Diagram extraction step: a dedicated Claude tool-use call that reads a
// student's message and either emits a structured spec of the GIVEN
// measurements, or returns null (no diagram helps). This one call is BOTH the
// relevance decision and the extraction — when a drawing wouldn't help, the
// model simply doesn't call the tool.
//
// Kept separate from the main tutoring call so the tutor's Socratic response is
// never contaminated by diagram concerns, and so this can be tuned / disabled
// independently.
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You extract structured specs for simple geometry diagrams that help a student visualize a problem.

Call the emit_diagram tool ONLY when ALL of these hold:
- The message is about ONE of these 2D shapes: rectangle, trapezoid, triangle, or circle.
- The message gives specific NUMERIC measurements for that shape (side lengths, height, base, radius).
- A simple labeled drawing would genuinely help the student picture it.

Provide ONLY the measurements the student was GIVEN. NEVER compute, include, or infer an area, perimeter, circumference, angle, or any answer — only the given values.

Do NOT call the tool when:
- There is no specific shape, or no numeric measurements (e.g. "sum of angles in a triangle").
- It involves 3D shapes, multiple shapes, graphs/functions, or non-geometry (algebra, history, etc.).
- A drawing would not add anything.

Questions may be in English, Hebrew, or Arabic. Extract the numbers regardless of language.`;

const TOOL: Anthropic.Tool = {
  name: "emit_diagram",
  description: "Emit a diagram spec of the GIVEN measurements for a supported 2D shape. Only call when a labeled drawing clearly helps.",
  input_schema: {
    type: "object",
    properties: {
      shape: { type: "string", enum: ["rectangle", "trapezoid", "triangle", "circle"] },
      unit: { type: "string", description: "measurement unit, e.g. cm" },
      w: { type: "number", description: "rectangle width" },
      h: { type: "number", description: "rectangle height, or trapezoid height" },
      a: { type: "number", description: "trapezoid longer parallel side" },
      b: { type: "number", description: "trapezoid shorter parallel side" },
      base: { type: "number", description: "triangle base" },
      height: { type: "number", description: "triangle height" },
      radius: { type: "number", description: "circle radius" },
    },
    required: ["shape", "unit"],
  },
};

// Returns the raw tool input (validated downstream by validateSpec), or null.
// Never throws — on any error it returns null so the tutor still replies in text.
export async function extractDiagram(message: string): Promise<unknown | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const r = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      system: SYSTEM,
      tools: [TOOL],
      messages: [{ role: "user", content: message }],
    });
    const t = r.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    return t ? t.input : null;
  } catch (e) {
    console.error("Diagram extract error:", e);
    return null;
  }
}
