import { deleteSession } from "@/lib/auth";
import { readJson } from "@/lib/api";

/** Signs out. Send { "everywhere": true } to sign out of every device. */
export async function POST(request: Request) {
  const body = await readJson(request);
  try {
    await deleteSession(body.everywhere === true);
  } catch (error) {
    console.error(error);
  }
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
