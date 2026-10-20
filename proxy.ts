import { NextResponse, type NextRequest } from "next/server";
const SESSION_COOKIE = "temarinet_session";

// Signed-out visitors to a staff area go to that area's login, remembering where they were headed.
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (request.cookies.get(SESSION_COOKIE)?.value) return NextResponse.next();
  for (const area of ["/super-admin", "/admin"]) {
    if (pathname.startsWith(area) && pathname !== `${area}/login`) {
      const login = new URL(`${area}/login`, request.url);
      login.searchParams.set("next", pathname + search);
      return NextResponse.redirect(login);
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/super-admin/:path*"] };
