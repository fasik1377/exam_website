import { ObjectId } from "mongodb";
import { apiError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { parseGradeStream } from "@/lib/subjects";

/** A student updates their grade and (Grades 11–12) stream. */
export async function PATCH(request: Request) {
  try {
    const auth = await requireUser(["student"]); if (auth.error) return auth.error;
    const body = await readJson(request);
    const level = parseGradeStream(body.grade, body.stream);
    if (typeof level === "string") return Response.json({ error: level }, { status: 400 });
    await (await getDb()).collection("users").updateOne({ _id: new ObjectId(auth.user.id) }, { $set: { grade: level.grade, stream: level.stream, updatedAt: new Date() } });
    return Response.json({ ok: true, ...level });
  } catch (error) { return apiError(error); }
}
