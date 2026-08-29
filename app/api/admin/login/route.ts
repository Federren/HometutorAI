import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import crypto from "crypto";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Brute-force protection: cap failed attempts per IP.
const MAX_ATTEMPTS = 8;
const WINDOW_S = 15 * 60;

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

// Constant-time comparison (hash first so lengths always match).
function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// Validate the shared admin password and, on success, set the session cookie
// the middleware checks. The cookie value is an opaque server-side token, never
// the password itself.
export async function POST(req: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD;
  const token = process.env.ADMIN_SESSION_TOKEN;
  if (!expected || !token) {
    return NextResponse.json({ error: "Admin login is not configured." }, { status: 500 });
  }

  // Throttle by IP before checking anything. Fail open on a Redis hiccup so a
  // transient outage can't lock the legitimate admin out.
  const key = `adminlogin:${clientIp(req)}`;
  try {
    const attempts = await redis.incr(key);
    if (attempts === 1) await redis.expire(key, WINDOW_S);
    if (attempts > MAX_ATTEMPTS) {
      return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
    }
  } catch (e) {
    console.error("Login rate-limit error (allowing):", e);
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  if (!safeEqual(body.password ?? "", expected)) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  // Success — clear the attempt counter and issue the session cookie.
  await redis.del(key);
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
