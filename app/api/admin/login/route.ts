import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import crypto from "crypto";

// Validate the shared admin password and, on success, set the session cookie
// the middleware checks. The cookie value is an opaque server-side token, never
// the password itself. Brute-force protected (per-IP attempt limit) and the
// password is compared in constant time.

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const MAX_ATTEMPTS = 8;        // failed tries before lockout
const WINDOW_S = 15 * 60;      // per this window, per IP

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for") ?? "";
  return xff.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}

// Constant-time compare via fixed-length hashes (avoids length-based timing and
// timingSafeEqual's length-mismatch throw).
function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

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

  // Brute-force guard: too many recent failures from this IP → refuse.
  const key = `adminlogin:${clientIp(req)}`;
  const attempts = Number(await redis.get(key)) || 0;
  if (attempts >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: "Too many attempts. Please wait 15 minutes and try again." }, { status: 429 });
  }

  if (!safeEqual(body.password ?? "", expected)) {
    const n = await redis.incr(key);
    if (n === 1) await redis.expire(key, WINDOW_S);
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  await redis.del(key); // clear the counter on a successful login
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
