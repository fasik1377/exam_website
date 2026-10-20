import type { ObjectId } from "mongodb";
import { apiError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { monitoredSubject, studentsForSubject, subjectQuestionIds } from "@/lib/teacher";

/** Students' results in the teacher's subject only: one row per student. */
export async function GET(request: Request) {
  try {
    const auth = await requireUser(["admin", "super-admin"]); if (auth.error) return auth.error;
    const scope = monitoredSubject(auth.user, new URL(request.url).searchParams.get("subject"));
    if ("error" in scope) return scope.error;
    const db = await getDb();
    const qIds = await subjectQuestionIds(scope.subject);
    const stats = await db.collection("attempts").aggregate<{ _id: ObjectId; total: number; correct: number; last: Date; first: Date }>([
      { $match: { questionId: { $in: qIds } } },
      { $group: { _id: "$userId", total: { $sum: 1 }, correct: { $sum: { $cond: ["$correct", 1, 0] } }, last: { $max: "$createdAt" }, first: { $min: "$createdAt" } } },
    ]).toArray();
    const byId = new Map(stats.map((s) => [s._id.toString(), s]));
    const students = await studentsForSubject(scope.subject, stats.map((s) => s._id));
    return Response.json({
      subject: scope.subject,
      students: students.map((s) => {
        const st = byId.get(s._id!.toString());
        return {
          id: s._id!.toString(), name: s.name, email: s.email, grade: s.grade ?? null, stream: s.stream ?? null, status: s.status,
          answers: st?.total ?? 0, correct: st?.correct ?? 0, lastActive: st?.last ?? null, firstActive: st?.first ?? null,
        };
      }),
    });
  } catch (error) { return apiError(error); }
}
