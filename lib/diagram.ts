// Deterministic geometry diagram renderer + spec validation + PNG rasterization.
//
// HARD CONSTRAINT: renders GIVEN info only — never a computed value/answer.
//
// Measurements may be numeric (drawn to scale) OR symbolic strings like "a",
// "2b", "h" (drawn with sensible default proportions, labeled with the symbol).
// This is the deterministic tier of the hybrid diagram feature: for these four
// shapes the figure is accurate by construction. Anything else is handled by
// the generative tier (lib/diagram-generate.ts) with a validation pass.
import fs from "fs";
import path from "path";
import { Resvg } from "@resvg/resvg-js";

export type Lang = "en" | "he" | "ar";
export type Measure = number | string;

export type DiagramSpec =
  | { shape: "rectangle"; w: Measure; h: Measure; unit: string }
  | { shape: "trapezoid"; a: Measure; b: Measure; h: Measure; unit: string }
  | { shape: "triangle"; base: Measure; height: Measure; unit: string }
  | { shape: "circle"; radius: Measure; unit: string };

const GREEN = "#1B3D2F", FILL = "#E8F0EC", TXT = "#1a1a1a", DASH = "#8A8278";
const W = 440, H = 340;
const FONT = "'Noto Sans', Arial, sans-serif";

const isNum = (v: Measure): v is number => typeof v === "number";

function unitLabel(u: string, lang: Lang): string {
  if (u === "cm") return lang === "he" ? "ס״מ" : lang === "ar" ? "سم" : "cm";
  if (u === "m") return lang === "he" ? "מ׳" : lang === "ar" ? "م" : "m";
  return u;
}
// Numeric measurements get a unit ("8 cm"); symbolic ones are shown as-is ("a").
function labelOf(v: Measure, unit: string, lang: Lang): string {
  return isNum(v) ? `${v} ${unitLabel(unit, lang)}` : String(v);
}
// Geometry size for a measurement: the number if numeric, else a default so
// symbolic shapes still draw with reasonable proportions.
const dim = (v: Measure, fallback: number): number => (isNum(v) ? v : fallback);

function txt(x: number, y: number, s: string, o: { size?: number; fill?: string; anchor?: string; rtl?: boolean } = {}): string {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${o.size || 16}" font-weight="600" fill="${o.fill || TXT}" text-anchor="${o.anchor || "middle"}" dominant-baseline="middle"${o.rtl ? ' direction="rtl"' : ""}>${escapeXml(s)}</text>`;
}
function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
const wrap = (i: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#FAF8F5"/>${i}</svg>`;
const rtl = (l: Lang) => l !== "en";
const rightAngle = (x: number, y: number, d = 1) => `<path d="M ${x} ${y - 11} L ${x + 11 * d} ${y - 11} L ${x + 11 * d} ${y}" fill="none" stroke="${DASH}" stroke-width="1.3"/>`;

function rectangle(sp: Extract<DiagramSpec, { shape: "rectangle" }>, lang: Lang): string {
  const gw = dim(sp.w, 8), gh = dim(sp.h, 5);
  const s = Math.min(230 / gw, 170 / gh);
  const pw = gw * s, ph = gh * s, x0 = (W - pw) / 2, y0 = (H - ph) / 2;
  return `<rect x="${x0}" y="${y0}" width="${pw}" height="${ph}" fill="${FILL}" stroke="${GREEN}" stroke-width="2.5"/>`
    + txt(x0 + pw / 2, y0 + ph + 26, labelOf(sp.w, sp.unit, lang), { rtl: rtl(lang) })
    + txt(x0 - 34, y0 + ph / 2, labelOf(sp.h, sp.unit, lang), { rtl: rtl(lang) });
}
function trapezoid(sp: Extract<DiagramSpec, { shape: "trapezoid" }>, lang: Lang): string {
  const ga = dim(sp.a, 9), gb = dim(sp.b, 5), gh = dim(sp.h, 6);
  const s = Math.min(230 / Math.max(ga, gb), 150 / gh);
  const a = ga * s, b = gb * s, h = gh * s, cx = W / 2, cy = H / 2;
  const bl = [cx - a / 2, cy + h / 2], br = [cx + a / 2, cy + h / 2], tl = [cx - b / 2, cy - h / 2], tr = [cx + b / 2, cy - h / 2];
  const hx = cx - Math.min(a, b) / 2 + 16;
  return `<polygon points="${bl[0]},${bl[1]} ${br[0]},${br[1]} ${tr[0]},${tr[1]} ${tl[0]},${tl[1]}" fill="${FILL}" stroke="${GREEN}" stroke-width="2.5"/>`
    + txt(cx, cy + h / 2 + 26, labelOf(sp.a, sp.unit, lang), { rtl: rtl(lang) })
    + txt(cx, cy - h / 2 - 18, labelOf(sp.b, sp.unit, lang), { rtl: rtl(lang) })
    + `<line x1="${hx}" y1="${cy - h / 2}" x2="${hx}" y2="${cy + h / 2}" stroke="${DASH}" stroke-width="1.6" stroke-dasharray="5 4"/>`
    + rightAngle(hx, cy + h / 2)
    + txt(hx - 26, cy, labelOf(sp.h, sp.unit, lang), { rtl: rtl(lang) });
}
function triangle(sp: Extract<DiagramSpec, { shape: "triangle" }>, lang: Lang): string {
  const gbase = dim(sp.base, 10), gheight = dim(sp.height, 6);
  const s = Math.min(230 / gbase, 150 / gheight);
  const base = gbase * s, ht = gheight * s, cx = W / 2, cy = H / 2;
  const bl = [cx - base / 2, cy + ht / 2], br = [cx + base / 2, cy + ht / 2], ax = cx - base * 0.12, footY = cy + ht / 2;
  return `<polygon points="${bl[0]},${bl[1]} ${br[0]},${br[1]} ${ax},${cy - ht / 2}" fill="${FILL}" stroke="${GREEN}" stroke-width="2.5"/>`
    + txt(cx, cy + ht / 2 + 26, labelOf(sp.base, sp.unit, lang), { rtl: rtl(lang) })
    + `<line x1="${ax}" y1="${cy - ht / 2}" x2="${ax}" y2="${footY}" stroke="${DASH}" stroke-width="1.6" stroke-dasharray="5 4"/>`
    + rightAngle(ax, footY)
    + txt(ax - 26, cy, labelOf(sp.height, sp.unit, lang), { rtl: rtl(lang) });
}
function circle(sp: Extract<DiagramSpec, { shape: "circle" }>, lang: Lang): string {
  const R = 105, cx = W / 2, cy = H / 2;
  return `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${FILL}" stroke="${GREEN}" stroke-width="2.5"/>`
    + `<circle cx="${cx}" cy="${cy}" r="3.5" fill="${GREEN}"/>`
    + `<line x1="${cx}" y1="${cy}" x2="${cx + R}" y2="${cy}" stroke="${DASH}" stroke-width="1.8"/>`
    + txt(cx + R / 2, cy - 15, labelOf(sp.radius, sp.unit, lang), { rtl: rtl(lang) });
}

// A measurement is a positive number or a short symbolic string ("a", "2b", "h").
function measure(v: unknown): Measure | null {
  if (typeof v === "number" && isFinite(v) && v > 0) return v;
  if (typeof v === "string") {
    const t = v.trim();
    if (t && t.length <= 16) return t;
  }
  return null;
}

// Validate a spec has the required GIVEN fields for its shape. Returns a clean
// typed spec or null (null -> caller falls back to text or the generative tier).
export function validateSpec(sp: unknown): DiagramSpec | null {
  if (!sp || typeof sp !== "object") return null;
  const o = sp as Record<string, unknown>;
  const unit = typeof o.unit === "string" && o.unit.trim() ? o.unit.trim() : "cm";
  const w = measure(o.w), h = measure(o.h), a = measure(o.a), b = measure(o.b),
    base = measure(o.base), height = measure(o.height), radius = measure(o.radius);
  switch (o.shape) {
    case "rectangle": return w !== null && h !== null ? { shape: "rectangle", w, h, unit } : null;
    case "trapezoid": return a !== null && b !== null && h !== null ? { shape: "trapezoid", a, b, h, unit } : null;
    case "triangle": return base !== null && height !== null ? { shape: "triangle", base, height, unit } : null;
    case "circle": return radius !== null ? { shape: "circle", radius, unit } : null;
    default: return null;
  }
}

export function detectLang(s: string): Lang {
  return /[֐-׿]/.test(s) ? "he" : /[؀-ۿ]/.test(s) ? "ar" : "en";
}

// Render a validated template spec to an SVG string, or null if invalid.
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
// Throws if the SVG can't be parsed/rendered — callers treat that as failure.
export function svgToPng(svg: string): Buffer {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 900 }, // 2x the 440 viewBox for a crisp image
    font: { fontFiles: fontFiles(), loadSystemFonts: false, defaultFontFamily: "Noto Sans" },
  });
  return Buffer.from(resvg.render().asPng());
}

// Give a nested <svg> a position + display size (keeping its own viewBox), so
// several self-contained SVGs can be laid out in one parent canvas.
function placeSvg(svg: string, x: number, y: number, w: number, h: number): string {
  return svg
    .replace(/\swidth="[^"]*"/, "")
    .replace(/\sheight="[^"]*"/, "")
    .replace(/^<svg\b/, `<svg x="${x}" y="${y}" width="${w}" height="${h}"`);
}

// Stack several self-contained SVGs vertically (centered) into ONE PNG — used to
// send a diagram and an equation as a single WhatsApp message instead of two.
export function composeVerticalPng(items: { svg: string; w: number; h: number }[]): Buffer {
  const PAD = 24, GAP = 22;
  const maxW = Math.max(...items.map((i) => i.w));
  const CW = maxW + PAD * 2;
  let y = PAD;
  const placed: string[] = [];
  for (const it of items) {
    placed.push(placeSvg(it.svg, (CW - it.w) / 2, y, it.w, it.h));
    y += it.h + GAP;
  }
  const CH = y - GAP + PAD;
  const parent = `<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="${CH}" viewBox="0 0 ${CW} ${CH}"><rect width="${CW}" height="${CH}" fill="#FAF8F5"/>${placed.join("")}</svg>`;
  const resvg = new Resvg(parent, {
    fitTo: { mode: "width", value: CW * 2 },
    font: { fontFiles: fontFiles(), loadSystemFonts: false, defaultFontFamily: "Noto Sans" },
  });
  return Buffer.from(resvg.render().asPng());
}
