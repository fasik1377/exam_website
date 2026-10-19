import { deleteSession } from "@/lib/auth";

export async function POST() {
  try {
    await deleteSession();
  } catch (error) {
    console.error(error);
  }
  return Response.json({ ok: true });
}
