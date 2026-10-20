import { NextResponse, type NextRequest } from "next/server";
import { ROLE_COOKIE, SESSION_COOKIE, roleHome, verifyRole } from "@/lib/roleCookie";
import type { UserRole } from "@/lib/types";

/**
 * Role-based route protection. Runs before every protected page:
 * - signed-out visitors go to the login page for that area (remembering where they were going);
 * - signed-in users with the wrong role go to their own dashboard.
 * Every API route also checks the real database session, so this is the first of two locks.
 */
const AREAS: { prefix: string; roles: UserRole[]; login: string }[] = [
  { prefix: "/super-admin", roles: ["super-admin"], login: "/super-admin/login" },
  { prefix: "/admin", roles: ["admin", "super-admin"], login: "/admin/login" },
  { prefix: "/student", roles: ["student"], login: "/login" },
  { prefix: "/chat", roles: ["student", "admin"], login: "/login" },
];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const area = AREAS.find((a) => pathname === a.prefix || pathname.startsWith(`${a.prefix}/`));
  // Login pages are always reachable; they decide on the client using the real session.
  if (!area || pathname === area.login) return NextResponse.next();

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const claim = hasSession ? verifyRole(request.cookies.get(ROLE_COOKIE)?.value) : null;

  if (!claim) {
    const login = new URL(area.login, request.url);
    login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }
  if (!area.roles.includes(claim.role)) {
    const home = new URL(roleHome(claim.role), request.url);
    home.searchParams.set("denied", area.prefix.slice(1));
    return NextResponse.redirect(home);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/super-admin/:path*", "/student/:path*", "/chat/:path*"] };
