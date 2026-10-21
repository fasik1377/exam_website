import { ObjectId } from "mongodb";
import { apiError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { monitoredSubject } from "@/lib/teacher";
import type { DbQuestion } from "@/lib/types";

/** Questions in the teacher's subject, with how students are doing on each. */
export async function GET(request: Request) {
  try {
    const auth = await requireUser(["admin", "super-admin"]); if (auth.error) return auth.error;
    const scope = await monitoredSubject(auth.user, new URL(request.url).searchParams.get("subject"));
    if ("error" in scope) return scope.error;
    const db = await getDb();
    const questions = await db.collection<DbQuestion>("questions").find({ subject: scope.subject }).sort({ createdAt: -1 }).limit(500).toArray();
    const stats = await db.collection("attempts").aggregate<{ _id: ObjectId; total: number; correct: number }>([
      { $match: { questionId: { $in: questions.map((q) => q._id!) } } },
      { $group: { _id: "$questionId", total: { $sum: 1 }, correct: { $sum: { $cond: ["$correct", 1, 0] } } } },
    ]).toArray();
    const byId = new Map(stats.map((s) => [s._id.toString(), s]));
    return Response.json({
      subject: scope.subject,
      questions: questions.map((q) => ({
        id: q._id!.toString(), prompt: q.prompt, type: q.type ?? "mcq", grade: q.grade, unit: q.unit, year: q.year,
        published: q.published !== false, teacher: q.teacherName, mine: q.createdBy?.toString() === auth.user.id, createdAt: q.createdAt,
        answers: byId.get(q._id!.toString())?.total ?? 0, correct: byId.get(q._id!.toString())?.correct ?? 0,
      })),
    });
  } catch (error) { return apiError(error); }
}
