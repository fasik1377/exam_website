import { getSessionState } from "@/lib/auth";

export async function GET() {
  try {
    const { user, reason } = await getSessionState();
    return Response.json({ user, reason: user ? undefined : reason }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    // Treat an unreachable database as "signed out" so public pages keep working.
    console.error(error);
    return Response.json({ user: null, unavailable: true });
  }
}
