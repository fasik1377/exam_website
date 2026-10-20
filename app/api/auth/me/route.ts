import { clearRoleCookie, getCurrentUser, syncRoleCookie } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (user) await syncRoleCookie(user);
    else await clearRoleCookie();
    return Response.json({ user });
  } catch (error) {
    // Treat an unreachable database as "signed out" so public pages keep working.
    console.error(error);
    return Response.json({ user: null, unavailable: true });
  }
}
