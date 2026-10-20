import { apiError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

const DAYS = 14;
const TZ = "Africa/Addis_Ababa";

type DayRow = { _id: string; count: number };

/** Aggregated platform numbers for the super-admin dashboard. */
export async function GET() {
  try {
    const auth = await requireUser(["super-admin"]); if (auth.error) return auth.error;
    const db = await getDb();
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (DAYS - 1));
    const heatSince = new Date(Date.now() - 28 * 86400000);
    const day = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
    const perDay = (collection: string, extra: object = {}) =>
      db.collection(collection).aggregate<DayRow>([{ $match: { createdAt: { $gte: since }, ...extra } }, { $group: { _id: day, count: { $sum: 1 } } }]).toArray();

    const [
      byRoleStatus, signupStudents, signupTeachers, attempts, messages, questionsPerDay, attemptTotals,
      questionsBySubject, questionCount, recentQuestions, heat, subjectPerformance, topStudents, reviews, conversationCount, messageCount,
    ] = await Promise.all([
      db.collection("users").aggregate<{ _id: { role: string; status: string }; count: number }>([{ $group: { _id: { role: "$role", status: "$status" }, count: { $sum: 1 } } }]).toArray(),
      perDay("users", { role: "student" }),
      perDay("users", { role: "admin" }),
      perDay("attempts"),
      perDay("messages"),
      perDay("questions"),
      db.collection("attempts").aggregate<{ total: number; correct: number }>([{ $group: { _id: null, total: { $sum: 1 }, correct: { $sum: { $cond: ["$correct", 1, 0] } } } }]).toArray(),
      db.collection("questions").aggregate<DayRow>([{ $group: { _id: "$subject", count: { $sum: 1 } } }, { $sort: { count: -1 } }]).toArray(),
      db.collection("questions").countDocuments(),
      db.collection("questions").find({}, { projection: { prompt: 1, subject: 1, teacherName: 1, createdAt: 1 } }).sort({ createdAt: -1 }).limit(5).toArray(),
      // When do students practise? weekday (1=Sun) × hour, local time, last 4 weeks.
      db.collection("attempts").aggregate<{ _id: { d: number; h: number }; count: number }>([
        { $match: { createdAt: { $gte: heatSince } } },
        { $group: { _id: { d: { $dayOfWeek: { date: "$createdAt", timezone: TZ } }, h: { $hour: { date: "$createdAt", timezone: TZ } } }, count: { $sum: 1 } } },
      ]).toArray(),
      db.collection("attempts").aggregate<{ _id: string; total: number; correct: number }>([
        { $lookup: { from: "questions", localField: "questionId", foreignField: "_id", as: "q" } },
        { $unwind: "$q" },
        { $group: { _id: "$q.subject", total: { $sum: 1 }, correct: { $sum: { $cond: ["$correct", 1, 0] } } } },
      ]).toArray(),
      db.collection("attempts").aggregate<{ _id: unknown; total: number; correct: number; user: { name: string }[] }>([
        { $group: { _id: "$userId", total: { $sum: 1 }, correct: { $sum: { $cond: ["$correct", 1, 0] } } } },
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user", pipeline: [{ $project: { name: 1, role: 1 } }] } },
        { $match: { "user.role": "student" } },
        { $sort: { total: -1 } },
        { $limit: 5 },
      ]).toArray(),
      // Self-registered accounts that were reviewed (staff created by an admin are reviewed at creation).
      db.collection("users").aggregate<{ _id: string; count: number; avgMs: number }>([
        { $match: { reviewedAt: { $exists: true }, status: { $in: ["active", "rejected", "restricted", "banned"] } } },
        { $project: { outcome: { $cond: [{ $eq: ["$status", "rejected"] }, "rejected", "approved"] }, wait: { $subtract: ["$reviewedAt", "$createdAt"] } } },
        { $match: { wait: { $gt: 1000 } } },
        { $group: { _id: "$outcome", count: { $sum: 1 }, avgMs: { $avg: "$wait" } } },
      ]).toArray(),
      db.collection("conversations").countDocuments(),
      db.collection("messages").countDocuments(),
    ]);

    const keys = Array.from({ length: DAYS }, (_, i) => {
      const d = new Date(since);
      d.setUTCDate(since.getUTCDate() + i);
      return d.toISOString().slice(0, 10);
    });
    const series = (rows: DayRow[]) => {
      const map = new Map(rows.map((r) => [r._id, r.count]));
      return keys.map((date) => ({ date, count: map.get(date) ?? 0 }));
    };
    const students = series(signupStudents), teachers = series(signupTeachers);
    const approved = reviews.find((r) => r._id === "approved"), rejected = reviews.find((r) => r._id === "rejected");
    const reviewed = (approved?.count ?? 0) + (rejected?.count ?? 0);

    return Response.json({
      usersByRoleStatus: byRoleStatus.map((r) => ({ role: r._id.role, status: r._id.status, count: r.count })),
      signups: keys.map((date, i) => ({ date, count: students[i].count + teachers[i].count })),
      signupsByRole: keys.map((date, i) => ({ date, students: students[i].count, teachers: teachers[i].count })),
      attempts: series(attempts),
      messages: series(messages),
      questionsPerDay: series(questionsPerDay),
      attemptTotal: attemptTotals[0]?.total ?? 0,
      attemptCorrect: attemptTotals[0]?.correct ?? 0,
      questionCount,
      questionsBySubject: questionsBySubject.map((q) => ({ subject: q._id || "Unspecified", count: q.count })),
      recentQuestions: recentQuestions.map((q) => ({ id: q._id.toString(), prompt: q.prompt, subject: q.subject, teacher: q.teacherName, createdAt: q.createdAt })),
      heatmap: heat.map((h) => ({ day: h._id.d - 1, hour: h._id.h, count: h.count })),
      subjectPerformance: subjectPerformance.map((s) => ({ subject: s._id || "Unspecified", total: s.total, correct: s.correct })),
      topStudents: topStudents.map((s) => ({ name: s.user[0]?.name ?? "Former student", total: s.total, correct: s.correct })),
      approvals: { approved: approved?.count ?? 0, rejected: rejected?.count ?? 0, avgHours: reviewed ? ((approved?.avgMs ?? 0) * (approved?.count ?? 0) + (rejected?.avgMs ?? 0) * (rejected?.count ?? 0)) / reviewed / 3600000 : null },
      chat: { conversations: conversationCount, messages: messageCount },
    });
  } catch (error) { return apiError(error); }
}
