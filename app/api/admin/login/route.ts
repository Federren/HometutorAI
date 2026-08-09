import { NextRequest, NextResponse } from "next/server";

// Validate the shared admin password and, on success, set the session cookie
// the middleware checks. The cookie value is an opaque server-side token, never
// the password itself.
export async function POST(req: NextRequest) {
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const expected = process.env.ADMIN_PASSWORD;
  const token = process.env.ADMIN_SESSION_TOKEN;
  if (!expected || !token) {
    return NextResponse.json({ error: "Admin login is not configured." }, { status: 500 });
  }

  if ((body.password ?? "") !== expected) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set("admin_session", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return res;
}
