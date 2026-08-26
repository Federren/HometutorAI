// Render a LaTeX equation to a clean PNG (textbook-quality), for sending the
// tutor's own math over WhatsApp instead of hard-to-read ASCII like
// "h = a√3 / 2". MathJax typesets to SVG (glyphs as paths, no font files
// needed), then resvg rasterizes it on our cream background.
import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import { AllPackages } from "mathjax-full/js/input/tex/AllPackages.js";
import { Resvg } from "@resvg/resvg-js";

const GROUND = "#FAF8F5";
const INK = "#14281F";

// MathJax pipeline is set up once at module load.
const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
const texInput = new TeX({ packages: AllPackages });
const svgOutput = new SVG({ fontCache: "none" }); // inline glyph paths (no <use>)
const mjDoc = mathjax.document("", { InputJax: texInput, OutputJax: svgOutput });

// Render a single LaTeX expression to a PNG buffer, or null on any failure.
export function renderEquationPng(tex: string): Buffer | null {
  try {
    const clean = tex.trim();
    if (!clean || clean.length > 500) return null;
    const node = mjDoc.convert(clean, { display: true });
    let inner: string = adaptor.innerHTML(node);
    if (!inner.includes("<svg")) return null;
    // MathJax colors glyphs with currentColor; set a concrete ink color.
    inner = inner.replace(/<svg /, `<svg color="${INK}" `);

    // Build a padded canvas sized from the equation's intrinsic ex dimensions.
    const wEx = parseFloat((inner.match(/width="([\d.]+)ex"/) || [])[1] || "10");
    const hEx = parseFloat((inner.match(/height="([\d.]+)ex"/) || [])[1] || "3");
    const EX = 9, pad = 24;
    const W = Math.round(wEx * EX + pad * 2);
    const H = Math.round(hEx * EX + pad * 2);
    const sized = inner
      .replace(/width="[\d.]+ex"/, `width="${wEx * EX}"`)
      .replace(/height="[\d.]+ex"/, `height="${hEx * EX}"`);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${GROUND}"/><g transform="translate(${pad}, ${pad})">${sized}</g></svg>`;

    const png = new Resvg(svg, { fitTo: { mode: "zoom", value: 2 }, background: GROUND }).render().asPng();
    return Buffer.from(png);
  } catch (e) {
    console.error("Equation render error:", e);
    return null;
  }
}

// Best-effort LaTeX -> readable plain text, for when image rendering is off or
// fails so a raw "$$\\frac{a}{b}$$" never reaches a student.
export function texToPlain(tex: string): string {
  let s = tex.trim();
  // Repeatedly collapse \frac{A}{B} -> (A)/(B) to handle simple nesting.
  for (let i = 0; i < 4; i++) {
    const next = s.replace(/\\d?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "($1)/($2)");
    if (next === s) break;
    s = next;
  }
  s = s.replace(/\\sqrt\s*\{([^{}]*)\}/g, "√($1)");
  s = s.replace(/\\sqrt\s+(\w+)/g, "√$1");
  s = s.replace(/\\pm/g, "±").replace(/\\mp/g, "∓")
    .replace(/\\times/g, "×").replace(/\\cdot/g, "·").replace(/\\div/g, "÷")
    .replace(/\\leq/g, "≤").replace(/\\geq/g, "≥").replace(/\\neq/g, "≠")
    .replace(/\\pi/g, "π").replace(/\\theta/g, "θ").replace(/\\alpha/g, "α").replace(/\\beta/g, "β")
    .replace(/\\degree/g, "°").replace(/\\left|\\right/g, "");
  s = s.replace(/\^\{([^{}]*)\}/g, "^($1)").replace(/_\{([^{}]*)\}/g, "_($1)");
  s = s.replace(/\\[a-zA-Z]+/g, "").replace(/[{}]/g, "").replace(/\s+/g, " ").trim();
  return s;
}
