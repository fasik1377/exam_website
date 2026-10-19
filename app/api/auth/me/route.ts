import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    return Response.json({ user: await getCurrentUser() });
  } catch (error) {
    // Treat an unreachable database as "signed out" so public pages keep working.
    console.error(error);
    return Response.json({ user: null, unavailable: true });
  }
}
