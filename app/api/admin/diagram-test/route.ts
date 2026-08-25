import { NextRequest, NextResponse } from "next/server";
import { renderDiagram, svgToPng, type Lang } from "@/lib/diagram";

// Admin-only diagnostic: renders a sample geometry diagram to PNG in the live
// serverless runtime, to confirm the resvg native binary and the bundled fonts
// are actually present in the deployed lambda. Not part of the bot flow.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (req.cookies.get("admin_session")?.value !== process.env.ADMIN_SESSION_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Hebrew sample by default so a localized non-Latin unit label (ס״מ) is
  // rendered — this exercises the bundled Hebrew/Arabic font in the lambda,
  // not just the Latin one.
  const p = req.nextUrl.searchParams.get("lang");
  const lang: Lang = p === "ar" ? "ar" : p === "en" ? "en" : "he";
  const spec = { shape: "triangle", base: 12, height: 7, unit: "cm" };
  try {
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
