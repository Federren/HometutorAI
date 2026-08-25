// Deterministic geometry diagram renderer + spec validation + PNG rasterization.
//
// HARD CONSTRAINT: renders GIVEN info only — never a computed value/answer.
// The diagram is accurate by construction (drawn to scale from the given
// numbers), and it never contains an area, perimeter, angle, or any result.
//
// Rendering is fully deterministic (no AI image generation): the same spec
// always produces the same SVG, and svgToPng() rasterizes it server-side with
// bundled fonts (Latin + Hebrew + Arabic) so it works in Vercel's serverless
// runtime, which ships no system fonts.
import fs from "fs";
import path from "path";
import { Resvg } from "@resvg/resvg-js";

export type Lang = "en" | "he" | "ar";

export type DiagramSpec =
  | { shape: "rectangle"; w: number; h: number; unit: string }
  | { shape: "trapezoid"; a: number; b: number; h: number; unit: string }
  | { shape: "triangle"; base: number; height: number; unit: string }
  | { shape: "circle"; radius: number; unit: string };

const GREEN = "#1B3D2F", FILL = "#E8F0EC", TXT = "#1a1a1a", DASH = "#8A8278";
const W = 440, H = 340;
const FONT = "'Noto Sans', Arial, sans-serif";

function unitLabel(u: string, lang: Lang): string {
  if (u === "cm") return lang === "he" ? "ס״מ" : lang === "ar" ? "سم" : "cm";
  if (u === "m") return lang === "he" ? "מ׳" : lang === "ar" ? "م" : "m";
  return u;
}
const meas = (v: number, u: string, lang: Lang) => `${v} ${unitLabel(u, lang)}`;

function txt(x: number, y: number, s: string, o: { size?: number; fill?: string; anchor?: string; rtl?: boolean } = {}): string {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${o.size || 16}" font-weight="600" fill="${o.fill || TXT}" text-anchor="${o.anchor || "middle"}" dominant-baseline="middle"${o.rtl ? ' direction="rtl"' : ""}>${s}</text>`;
}
const wrap = (i: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#FAF8F5"/>${i}</svg>`;
const rtl = (l: Lang) => l !== "en";
const rightAngle = (x: number, y: number, d = 1) => `<path d="M ${x} ${y - 11} L ${x + 11 * d} ${y - 11} L ${x + 11 * d} ${y}" fill="none" stroke="${DASH}" stroke-width="1.3"/>`;

function rectangle(sp: Extract<DiagramSpec, { shape: "rectangle" }>, lang: Lang): string {
  const s = Math.min(230 / sp.w, 170 / sp.h);
  const pw = sp.w * s, ph = sp.h * s, x0 = (W - pw) / 2, y0 = (H - ph) / 2;
  return `<rect x="${x0}" y="${y0}" width="${pw}" height="${ph}" fill="${FILL}" stroke="${GREEN}" stroke-width="2.5"/>`
    + txt(x0 + pw / 2, y0 + ph + 26, meas(sp.w, sp.unit, lang), { rtl: rtl(lang) })
    + txt(x0 - 34, y0 + ph / 2, meas(sp.h, sp.unit, lang), { rtl: rtl(lang) });
}
function trapezoid(sp: Extract<DiagramSpec, { shape: "trapezoid" }>, lang: Lang): string {
  const s = Math.min(230 / Math.max(sp.a, sp.b), 150 / sp.h);
  const a = sp.a * s, b = sp.b * s, h = sp.h * s, cx = W / 2, cy = H / 2;
  const bl = [cx - a / 2, cy + h / 2], br = [cx + a / 2, cy + h / 2], tl = [cx - b / 2, cy - h / 2], tr = [cx + b / 2, cy - h / 2];
  const hx = cx - Math.min(a, b) / 2 + 16;
  return `<polygon points="${bl[0]},${bl[1]} ${br[0]},${br[1]} ${tr[0]},${tr[1]} ${tl[0]},${tl[1]}" fill="${FILL}" stroke="${GREEN}" stroke-width="2.5"/>`
    + txt(cx, cy + h / 2 + 26, meas(sp.a, sp.unit, lang), { rtl: rtl(lang) })
    + txt(cx, cy - h / 2 - 18, meas(sp.b, sp.unit, lang), { rtl: rtl(lang) })
    + `<line x1="${hx}" y1="${cy - h / 2}" x2="${hx}" y2="${cy + h / 2}" stroke="${DASH}" stroke-width="1.6" stroke-dasharray="5 4"/>`
    + rightAngle(hx, cy + h / 2)
    + txt(hx - 26, cy, meas(sp.h, sp.unit, lang), { rtl: rtl(lang) });
}
function triangle(sp: Extract<DiagramSpec, { shape: "triangle" }>, lang: Lang): string {
  const s = Math.min(230 / sp.base, 150 / sp.height);
  const base = sp.base * s, ht = sp.height * s, cx = W / 2, cy = H / 2;
  const bl = [cx - base / 2, cy + ht / 2], br = [cx + base / 2, cy + ht / 2], ax = cx - base * 0.12, footY = cy + ht / 2;
  return `<polygon points="${bl[0]},${bl[1]} ${br[0]},${br[1]} ${ax},${cy - ht / 2}" fill="${FILL}" stroke="${GREEN}" stroke-width="2.5"/>`
    + txt(cx, cy + ht / 2 + 26, meas(sp.base, sp.unit, lang), { rtl: rtl(lang) })
    + `<line x1="${ax}" y1="${cy - ht / 2}" x2="${ax}" y2="${footY}" stroke="${DASH}" stroke-width="1.6" stroke-dasharray="5 4"/>`
    + rightAngle(ax, footY)
    + txt(ax - 26, cy, meas(sp.height, sp.unit, lang), { rtl: rtl(lang) });
}
function circle(sp: Extract<DiagramSpec, { shape: "circle" }>, lang: Lang): string {
  const R = 105, cx = W / 2, cy = H / 2;
  return `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${FILL}" stroke="${GREEN}" stroke-width="2.5"/>`
    + `<circle cx="${cx}" cy="${cy}" r="3.5" fill="${GREEN}"/>`
    + `<line x1="${cx}" y1="${cy}" x2="${cx + R}" y2="${cy}" stroke="${DASH}" stroke-width="1.8"/>`
    + txt(cx + R / 2, cy - 15, meas(sp.radius, sp.unit, lang), { rtl: rtl(lang) });
}

// Validate a spec has the required GIVEN fields for its shape. Returns a clean
// typed spec or null. null -> caller falls back to text-only; this is the
// graceful failure that keeps a malformed spec from ever reaching a student.
export function validateSpec(sp: unknown): DiagramSpec | null {
  if (!sp || typeof sp !== "object") return null;
  const o = sp as Record<string, unknown>;
  const num = (v: unknown): v is number => typeof v === "number" && isFinite(v) && v > 0;
  const unit = typeof o.unit === "string" && o.unit.trim() ? o.unit.trim() : "cm";
  switch (o.shape) {
    case "rectangle": return num(o.w) && num(o.h) ? { shape: "rectangle", w: o.w, h: o.h, unit } : null;
    case "trapezoid": return num(o.a) && num(o.b) && num(o.h) ? { shape: "trapezoid", a: o.a, b: o.b, h: o.h, unit } : null;
    case "triangle": return num(o.base) && num(o.height) ? { shape: "triangle", base: o.base, height: o.height, unit } : null;
    case "circle": return num(o.radius) ? { shape: "circle", radius: o.radius, unit } : null;
    default: return null;
  }
}

export function detectLang(s: string): Lang {
  return /[֐-׿]/.test(s) ? "he" : /[؀-ۿ]/.test(s) ? "ar" : "en";
}

// Render a spec to an SVG string, or null if the spec is invalid.
export function renderDiagram(sp: unknown, lang: Lang = "en"): string | null {
  const v = validateSpec(sp);
  if (!v) return null;
  switch (v.shape) {
    case "rectangle": return wrap(rectangle(v, lang));
    case "trapezoid": return wrap(trapezoid(v, lang));
    case "triangle": return wrap(triangle(v, lang));
    case "circle": return wrap(circle(v, lang));
  }
}

// Bundled fonts covering the three label scripts (Latin, Hebrew, Arabic).
// next.config.mjs force-includes lib/fonts/** in the serverless bundle
// (outputFileTracingIncludes), so these paths resolve at runtime on Vercel.
// Resolved once, lazily, and only the files that actually exist are passed on.
let _fontFiles: string[] | null = null;
function fontFiles(): string[] {
  if (!_fontFiles) {
    const dir = path.join(process.cwd(), "lib", "fonts");
    _fontFiles = ["NotoSans.ttf", "NotoSansHebrew.ttf", "NotoSansArabic.ttf"]
      .map((f) => path.join(dir, f))
      .filter((p) => fs.existsSync(p));
  }
  return _fontFiles;
}

// Rasterize an SVG string to a PNG buffer (WhatsApp accepts PNG/JPEG, not SVG).
export function svgToPng(svg: string): Buffer {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 900 }, // 2x the 440 viewBox for a crisp image
    font: { fontFiles: fontFiles(), loadSystemFonts: false, defaultFontFamily: "Noto Sans" },
  });
  return Buffer.from(resvg.render().asPng());
}
