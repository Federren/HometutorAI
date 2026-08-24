import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Only these tables can be deleted from, and only by row id.
const ALLOWED = new Set(["profiles", "waitlist", "parental_consent"]);

export async function POST(req: NextRequest) {
  if (req.cookies.get("admin_session")?.value !== process.env.ADMIN_SESSION_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let b: { table?: string; id?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  if (!b.table || !ALLOWED.has(b.table) || !b.id) {
    return NextResponse.json({ error: "Invalid table or id." }, { status: 400 });
  }

  const { error } = await supabase.from(b.table).delete().eq("id", b.id);
  if (error) {
    console.error("Admin delete error:", error.message);
    return NextResponse.json({ error: "Could not delete." }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
