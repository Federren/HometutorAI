import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Gate every /admin route behind a shared-password session cookie. The login
// page and the login/logout API routes are reachable without it. Fails closed:
// if ADMIN_SESSION_TOKEN isn't set, no cookie can ever match, so access is denied.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/admin/login") return NextResponse.next();

  const session = req.cookies.get("admin_session")?.value;
  const expected = process.env.ADMIN_SESSION_TOKEN;

  if (!expected || session !== expected) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin", "/admin/:path*"] };
