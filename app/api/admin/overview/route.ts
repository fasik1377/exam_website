import { apiError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

const DAYS = 14;

/** Aggregated platform numbers for the super-admin dashboard. */
export async function GET() {
  try {
    const auth = await requireUser(["super-admin"]); if (auth.error) return auth.error;
    const db = await getDb();
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (DAYS - 1));
    const day = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };

    const [byRoleStatus, signups, attempts, attemptTotals, questionsBySubject, questionCount, recentQuestions] = await Promise.all([
      db.collection("users").aggregate<{ _id: { role: string; status: string }; count: number }>([{ $group: { _id: { role: "$role", status: "$status" }, count: { $sum: 1 } } }]).toArray(),
      db.collection("users").aggregate<{ _id: string; count: number }>([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: day, count: { $sum: 1 } } }]).toArray(),
      db.collection("attempts").aggregate<{ _id: string; count: number }>([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: day, count: { $sum: 1 } } }]).toArray(),
      db.collection("attempts").aggregate<{ _id: null; total: number; correct: number }>([{ $group: { _id: null, total: { $sum: 1 }, correct: { $sum: { $cond: ["$correct", 1, 0] } } } }]).toArray(),
      db.collection("questions").aggregate<{ _id: string; count: number }>([{ $group: { _id: "$subject", count: { $sum: 1 } } }, { $sort: { count: -1 } }]).toArray(),
      db.collection("questions").countDocuments(),
      db.collection("questions").find({}, { projection: { prompt: 1, subject: 1, teacherName: 1, createdAt: 1 } }).sort({ createdAt: -1 }).limit(5).toArray(),
    ]);

    // Fill every day in the window so the chart has no gaps.
    const series = (rows: { _id: string; count: number }[]) => {
      const map = new Map(rows.map((r) => [r._id, r.count]));
      return Array.from({ length: DAYS }, (_, i) => {
        const d = new Date(since);
        d.setUTCDate(since.getUTCDate() + i);
        const key = d.toISOString().slice(0, 10);
        return { date: key, count: map.get(key) ?? 0 };
      });
    };

    return Response.json({
      usersByRoleStatus: byRoleStatus.map((r) => ({ role: r._id.role, status: r._id.status, count: r.count })),
      signups: series(signups),
      attempts: series(attempts),
      attemptTotal: attemptTotals[0]?.total ?? 0,
      attemptCorrect: attemptTotals[0]?.correct ?? 0,
      questionCount,
      questionsBySubject: questionsBySubject.map((q) => ({ subject: q._id || "Unspecified", count: q.count })),
      recentQuestions: recentQuestions.map((q) => ({ id: q._id.toString(), prompt: q.prompt, subject: q.subject, teacher: q.teacherName, createdAt: q.createdAt })),
    });
  } catch (error) { return apiError(error); }
}
