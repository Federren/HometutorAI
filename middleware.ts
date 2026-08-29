import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Gate every /admin page and /api/admin route behind the shared-password session
// cookie. Login/logout stay reachable. Pages redirect to the login screen; API
// routes get a 401 (not a redirect). Fails closed: if ADMIN_SESSION_TOKEN isn't
// set, no cookie can ever match, so access is denied. This is defense-in-depth —
// each admin API route also checks the cookie itself.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Open endpoints needed to authenticate / sign out.
  if (pathname === "/admin/login" || pathname === "/api/admin/login" || pathname === "/api/admin/logout") {
    return NextResponse.next();
  }

  const session = req.cookies.get("admin_session")?.value;
  const expected = process.env.ADMIN_SESSION_TOKEN;

  if (!expected || session !== expected) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"] };
