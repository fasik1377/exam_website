import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, lookupSession, roleHome, type SessionEndReason } from "@/lib/session";
import type { PublicUser, UserRole } from "@/lib/types";

/**
 * Role-based route protection, decided on the server before a protected page renders
 * (so there is no flash-then-redirect). The session is checked against the database:
 * - signed-out visitors go to that area's login page (remembering where they were going);
 * - signed-in users with the wrong role go to their own dashboard.
 * Every API route checks the session again, so data is protected even without this.
 */
const AREAS: { prefix: string; roles: UserRole[]; login: string }[] = [
  { prefix: "/super-admin", roles: ["super-admin"], login: "/super-admin/login" },
  { prefix: "/admin", roles: ["admin", "super-admin"], login: "/admin/login" },
  { prefix: "/student", roles: ["student"], login: "/login" },
  { prefix: "/chat", roles: ["student", "admin"], login: "/login" },
  // Practising needs an account; teachers and the platform admin may preview.
  { prefix: "/exam", roles: ["student", "admin", "super-admin"], login: "/login" },
];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const area = AREAS.find((a) => pathname === a.prefix || pathname.startsWith(`${a.prefix}/`));
  // Login pages always render; they show a "you're signed in" card instead of auto-forwarding.
  if (!area || pathname === area.login) return NextResponse.next();

  let user: PublicUser | null;
  let reason: SessionEndReason | undefined;
  try {
    ({ user, reason } = await lookupSession(request.cookies.get(SESSION_COOKIE)?.value));
  } catch {
    // Database unreachable: let the page load and show its own "service unavailable" message.
    return NextResponse.next();
  }

  if (!user) {
    const login = new URL(area.login, request.url);
    login.searchParams.set("next", pathname + search);
    if (reason === "replaced" || reason === "signed-out-everywhere") login.searchParams.set("reason", reason);
    return NextResponse.redirect(login);
  }
  if (!area.roles.includes(user.role)) {
    const home = new URL(roleHome(user.role), request.url);
    home.searchParams.set("denied", area.prefix.slice(1));
    return NextResponse.redirect(home);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/super-admin/:path*", "/student/:path*", "/chat/:path*", "/exam/:path*"] };
