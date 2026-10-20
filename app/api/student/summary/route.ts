import { ObjectId } from "mongodb";
import { apiError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { totalUnread } from "@/lib/chat";
import { getDb } from "@/lib/db";

const TZ = "Africa/Addis_Ababa";

/** Personal progress for the signed-in student. */
export async function GET() {
  try {
    const auth = await requireUser(["student"]); if (auth.error) return auth.error;
    const db = await getDb();
    const me = new ObjectId(auth.user.id);
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const [totals, week, days, bySubject, recent, unread] = await Promise.all([
      db.collection("attempts").aggregate<{ total: number; correct: number }>([{ $match: { userId: me } }, { $group: { _id: null, total: { $sum: 1 }, correct: { $sum: { $cond: ["$correct", 1, 0] } } } }]).toArray(),
      db.collection("attempts").countDocuments({ userId: me, createdAt: { $gte: weekAgo } }),
      db.collection("attempts").aggregate<{ _id: string }>([
        { $match: { userId: me } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TZ } } } },
        { $sort: { _id: -1 } }, { $limit: 60 },
      ]).toArray(),
      db.collection("attempts").aggregate<{ _id: string; total: number; correct: number }>([
        { $match: { userId: me } },
        { $lookup: { from: "questions", localField: "questionId", foreignField: "_id", as: "q" } },
        { $unwind: "$q" },
        { $group: { _id: "$q.subject", total: { $sum: 1 }, correct: { $sum: { $cond: ["$correct", 1, 0] } } } },
        { $sort: { total: -1 } },
      ]).toArray(),
      db.collection("attempts").aggregate<{ correct: boolean; createdAt: Date; q: { prompt: string; subject: string }[] }>([
        { $match: { userId: me } }, { $sort: { createdAt: -1 } }, { $limit: 6 },
        { $lookup: { from: "questions", localField: "questionId", foreignField: "_id", as: "q", pipeline: [{ $project: { prompt: 1, subject: 1 } }] } },
      ]).toArray(),
      totalUnread(auth.user),
    ]);

    // Consecutive days (ending today or yesterday, local time) with at least one answer.
    const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });
    const practiced = new Set(days.map((d) => d._id));
    let streak = 0;
    const cursor = new Date();
    if (!practiced.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (practiced.has(dayKey(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); }

    return Response.json({
      user: auth.user,
      total: totals[0]?.total ?? 0,
      correct: totals[0]?.correct ?? 0,
      week,
      streak,
      unread,
      subjects: bySubject.map((s) => ({ subject: s._id, total: s.total, correct: s.correct })),
      recent: recent.map((r) => ({ prompt: r.q[0]?.prompt ?? "Removed question", subject: r.q[0]?.subject ?? "", correct: r.correct, createdAt: r.createdAt })),
    });
  } catch (error) { return apiError(error); }
}
