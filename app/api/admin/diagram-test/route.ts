import { NextRequest, NextResponse } from "next/server";
import { renderDiagram, svgToPng, type Lang } from "@/lib/diagram";
import { renderEquationPng } from "@/lib/mathrender";

// Admin-only diagnostic: renders a sample geometry diagram to PNG in the live
// serverless runtime, to confirm the resvg native binary and the bundled fonts
// are actually present in the deployed lambda. Not part of the bot flow.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (req.cookies.get("admin_session")?.value !== process.env.ADMIN_SESSION_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ?type=eq exercises the MathJax equation pipeline; otherwise a diagram.
  try {
    if (req.nextUrl.searchParams.get("type") === "eq") {
      const eq = renderEquationPng("h = \\frac{a\\sqrt{3}}{2}");
      if (!eq) return NextResponse.json({ error: "renderEquationPng returned null" }, { status: 400 });
      return new NextResponse(new Uint8Array(eq), { status: 200, headers: { "Content-Type": "image/png", "Cache-Control": "no-store" } });
    }
    // Hebrew sample by default so a localized non-Latin unit label (ס״מ) is
    // rendered — this exercises the bundled Hebrew/Arabic font in the lambda.
    const p = req.nextUrl.searchParams.get("lang");
    const lang: Lang = p === "ar" ? "ar" : p === "en" ? "en" : "he";
    const spec = { shape: "triangle", base: 12, height: 7, unit: "cm" };
    const svg = renderDiagram(spec, lang);
    if (!svg) return NextResponse.json({ error: "renderDiagram returned null" }, { status: 400 });
    const png = svgToPng(svg);
    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
