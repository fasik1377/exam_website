import { ObjectId } from "mongodb";
import { apiError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { monitoredSubject, studentsForSubject, subjectQuestionIds } from "@/lib/teacher";
import type { DbQuestion, DbUser } from "@/lib/types";

/** One student's answers in the teacher's subject (never other subjects). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireUser(["admin", "super-admin"]); if (auth.error) return auth.error;
    const scope = await monitoredSubject(auth.user, new URL(request.url).searchParams.get("subject"));
    if ("error" in scope) return scope.error;
    const { id } = await params;
    if (!ObjectId.isValid(id)) return Response.json({ error: "Student not found" }, { status: 404 });
    const db = await getDb();
    const userId = new ObjectId(id);
    const qIds = await subjectQuestionIds(scope.subject);
    const answered = await db.collection("attempts").distinct("userId", { userId, questionId: { $in: qIds } }) as ObjectId[];
    // Only students who study this subject (or have answered its questions) are visible to its teacher.
    const [student] = (await studentsForSubject(scope.subject, answered)).filter((s) => s._id!.equals(userId));
    if (!student) return Response.json({ error: "This student isn't in your subject" }, { status: 404 });

    const attempts = await db.collection("attempts").aggregate<{ _id: ObjectId; selectedAnswer: number; correct: boolean; createdAt: Date; q: DbQuestion[] }>([
      { $match: { userId, questionId: { $in: qIds } } },
      { $sort: { createdAt: -1 } }, { $limit: 200 },
      { $lookup: { from: "questions", localField: "questionId", foreignField: "_id", as: "q" } },
    ]).toArray();
    const byUnit = new Map<string, { unit: string; total: number; correct: number }>();
    for (const a of attempts) {
      const unit = a.q[0]?.unit || "General";
      const row = byUnit.get(unit) ?? { unit, total: 0, correct: 0 };
      row.total++; if (a.correct) row.correct++;
      byUnit.set(unit, row);
    }
    const profile = student as DbUser;
    return Response.json({
      subject: scope.subject,
      student: { id, name: profile.name, email: profile.email, grade: profile.grade ?? null, stream: profile.stream ?? null, status: profile.status, joined: profile.createdAt },
      total: attempts.length,
      correct: attempts.filter((a) => a.correct).length,
      units: [...byUnit.values()].sort((a, b) => b.total - a.total),
      attempts: attempts.map((a) => {
        const q = a.q[0];
        return {
          id: a._id.toString(), createdAt: a.createdAt, correct: a.correct,
          prompt: q?.prompt ?? "Removed question", type: q?.type ?? "mcq", grade: q?.grade ?? "", unit: q?.unit ?? "",
          chosen: q?.choices?.[a.selectedAnswer] ?? "—", answer: q?.choices?.[q.correctAnswer] ?? "—",
        };
      }),
    });
  } catch (error) { return apiError(error); }
}
