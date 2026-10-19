import { NextResponse, type NextRequest } from "next/server";
const SESSION_COOKIE = "temarinet_session";

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  if (!hasSession && (path.startsWith("/admin") && path !== "/admin/login")) return NextResponse.redirect(new URL("/admin/login", request.url));
  if (!hasSession && (path.startsWith("/super-admin") && path !== "/super-admin/login")) return NextResponse.redirect(new URL("/super-admin/login", request.url));
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/super-admin/:path*"] };
