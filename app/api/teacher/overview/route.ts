import { ObjectId } from "mongodb";
import { apiError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { monitoredSubject, studentsForSubject, subjectQuestionIds } from "@/lib/teacher";

const DAYS = 14;

/** Teacher dashboard numbers — everything scoped to the teacher's own subject. */
export async function GET(request: Request) {
  try {
    const auth = await requireUser(["admin", "super-admin"]); if (auth.error) return auth.error;
    const scope = monitoredSubject(auth.user, new URL(request.url).searchParams.get("subject"));
    if ("error" in scope) return scope.error;
    const { subject } = scope;
    const db = await getDb();
    const me = new ObjectId(auth.user.id);
    const qIds = await subjectQuestionIds(subject);
    const since = new Date(); since.setUTCHours(0, 0, 0, 0); since.setUTCDate(since.getUTCDate() - (DAYS - 1));

    const [questionCount, mine, totals, perDay, answered, hardest, recent] = await Promise.all([
      db.collection("questions").countDocuments({ subject }),
      db.collection("questions").countDocuments({ subject, createdBy: me }),
      db.collection("attempts").aggregate<{ total: number; correct: number }>([{ $match: { questionId: { $in: qIds } } }, { $group: { _id: null, total: { $sum: 1 }, correct: { $sum: { $cond: ["$correct", 1, 0] } } } }]).toArray(),
      db.collection("attempts").aggregate<{ _id: string; count: number }>([
        { $match: { questionId: { $in: qIds }, createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
      ]).toArray(),
      db.collection("attempts").distinct("userId", { questionId: { $in: qIds } }) as Promise<ObjectId[]>,
      db.collection("attempts").aggregate<{ _id: ObjectId; total: number; correct: number; q: { prompt: string; grade: string }[] }>([
        { $match: { questionId: { $in: qIds } } },
        { $group: { _id: "$questionId", total: { $sum: 1 }, correct: { $sum: { $cond: ["$correct", 1, 0] } } } },
        { $addFields: { rate: { $divide: ["$correct", "$total"] } } },
        { $sort: { rate: 1, total: -1 } }, { $limit: 5 },
        { $lookup: { from: "questions", localField: "_id", foreignField: "_id", as: "q", pipeline: [{ $project: { prompt: 1, grade: 1 } }] } },
      ]).toArray(),
      db.collection("attempts").aggregate<{ correct: boolean; createdAt: Date; u: { name: string; grade?: string }[]; q: { prompt: string }[] }>([
        { $match: { questionId: { $in: qIds } } }, { $sort: { createdAt: -1 } }, { $limit: 8 },
        { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "u", pipeline: [{ $project: { name: 1, grade: 1 } }] } },
        { $lookup: { from: "questions", localField: "questionId", foreignField: "_id", as: "q", pipeline: [{ $project: { prompt: 1 } }] } },
      ]).toArray(),
    ]);
    const students = await studentsForSubject(subject, answered);
    const dayMap = new Map(perDay.map((d) => [d._id, d.count]));
    const series = Array.from({ length: DAYS }, (_, i) => {
      const d = new Date(since); d.setUTCDate(since.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      return { date: key, count: dayMap.get(key) ?? 0 };
    });

    return Response.json({
      subject,
      questions: questionCount,
      myQuestions: mine,
      students: students.length,
      activeLearners: answered.length,
      answers: totals[0]?.total ?? 0,
      correct: totals[0]?.correct ?? 0,
      perDay: series,
      hardest: hardest.map((h) => ({ id: h._id.toString(), prompt: h.q[0]?.prompt ?? "Removed question", grade: h.q[0]?.grade ?? "", total: h.total, correct: h.correct })),
      recent: recent.map((r) => ({ student: r.u[0]?.name ?? "Deleted student", grade: r.u[0]?.grade ?? "", prompt: r.q[0]?.prompt ?? "Removed question", correct: r.correct, createdAt: r.createdAt })),
    });
  } catch (error) { return apiError(error); }
}
