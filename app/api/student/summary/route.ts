import { ObjectId } from "mongodb";
import { apiError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { totalUnread } from "@/lib/chat";
import { getDb } from "@/lib/db";
import { BADGES, DAILY_GOAL, XP_EXPR, bestRun, levelFor } from "@/lib/gamification";
import { getSubjects } from "@/lib/subjectStore";
import { subjectsForStudent } from "@/lib/subjects";

const TZ = "Africa/Addis_Ababa";

/** Personal progress, level, badges and what to practise next for the signed-in student. */
export async function GET() {
  try {
    const auth = await requireUser(["student"]); if (auth.error) return auth.error;
    const db = await getDb();
    const me = new ObjectId(auth.user.id);
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const [totals, week, days, bySubject, recent, history, unread, catalog, available] = await Promise.all([
      db.collection("attempts").aggregate<{ total: number; correct: number; xp: number }>([
        { $match: { userId: me } },
        { $group: { _id: null, total: { $sum: 1 }, correct: { $sum: { $cond: ["$correct", 1, 0] } }, xp: { $sum: XP_EXPR } } },
      ]).toArray(),
      db.collection("attempts").aggregate<{ total: number; xp: number }>([
        { $match: { userId: me, createdAt: { $gte: weekAgo } } },
        { $group: { _id: null, total: { $sum: 1 }, xp: { $sum: XP_EXPR } } },
      ]).toArray(),
      db.collection("attempts").aggregate<{ _id: string; count: number; correct: number }>([
        { $match: { userId: me } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TZ } }, count: { $sum: 1 }, correct: { $sum: { $cond: ["$correct", 1, 0] } } } },
        { $sort: { _id: -1 } }, { $limit: 90 },
      ]).toArray(),
      db.collection("attempts").aggregate<{ _id: string; total: number; correct: number }>([
        { $match: { userId: me } },
        { $lookup: { from: "questions", localField: "questionId", foreignField: "_id", as: "q" } },
        { $unwind: "$q" },
        { $group: { _id: "$q.subject", total: { $sum: 1 }, correct: { $sum: { $cond: ["$correct", 1, 0] } } } },
        { $sort: { total: -1 } },
      ]).toArray(),
      db.collection("attempts").aggregate<{ correct: boolean; timedOut?: boolean; createdAt: Date; q: { prompt: string; subject: string }[] }>([
        { $match: { userId: me } }, { $sort: { createdAt: -1 } }, { $limit: 6 },
        { $lookup: { from: "questions", localField: "questionId", foreignField: "_id", as: "q", pipeline: [{ $project: { prompt: 1, subject: 1 } }] } },
      ]).toArray(),
      db.collection("attempts").find({ userId: me }, { projection: { correct: 1 } }).sort({ createdAt: -1 }).limit(1000).toArray(),
      totalUnread(auth.user),
      getSubjects(),
      // Published questions per subject for this student's grade (to recommend something they can actually practise).
      db.collection("questions").aggregate<{ _id: string; count: number }>([
        { $match: { published: true, ...(auth.user.grade ? { grade: auth.user.grade } : {}) } },
        { $group: { _id: "$subject", count: { $sum: 1 } } },
      ]).toArray(),
    ]);

    // Consecutive days (ending today or yesterday, local time) with at least one answer.
    const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });
    const perDay = new Map(days.map((d) => [d._id, d]));
    let streak = 0;
    const cursor = new Date();
    if (!perDay.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (perDay.has(dayKey(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); }

    const activity = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.now() - (6 - i) * 86400000);
      const key = dayKey(d);
      return { date: key, count: perDay.get(key)?.count ?? 0, correct: perDay.get(key)?.correct ?? 0 };
    });
    const today = activity[6].count;

    const total = totals[0]?.total ?? 0;
    const correct = totals[0]?.correct ?? 0;
    const subjects = bySubject.map((s) => ({ subject: s._id, total: s.total, correct: s.correct }));
    const stats = { total, correct, streak, bestRun: bestRun(history.map((h) => Boolean(h.correct)).reverse()), subjects: subjects.length, goalDays: days.filter((d) => d.count >= DAILY_GOAL).length };
    const badges = BADGES.map((b) => {
      const [have, need] = b.progress(stats);
      return { id: b.id, name: b.name, detail: b.detail, earned: b.earned(stats), have: Math.min(have, need), need };
    });

    // What to practise next: the weakest subject (3+ answers), else one not tried yet, else the least practised.
    const counts = new Map(available.map((a) => [a._id, a.count]));
    const mine = auth.user.grade ? subjectsForStudent(auth.user.grade, auth.user.stream ?? null, catalog) : catalog;
    const open = mine.filter((s) => (counts.get(s.name) ?? 0) > 0).map((s) => s.name);
    const tried = new Map(subjects.map((s) => [s.subject, s]));
    const weakest = subjects.filter((s) => s.total >= 3 && open.includes(s.subject)).sort((a, b) => a.correct / a.total - b.correct / b.total)[0];
    const untried = open.find((name) => !tried.has(name));
    const least = [...open].sort((a, b) => (tried.get(a)?.total ?? 0) - (tried.get(b)?.total ?? 0))[0];
    const recommendation =
      weakest && weakest.correct / weakest.total < 0.7 ? { subject: weakest.subject, reason: `Your accuracy is ${Math.round((weakest.correct / weakest.total) * 100)}% — a few more questions will lift it.` }
      : untried ? { subject: untried, reason: "You haven't tried this subject yet. Earn the All-rounder badge!" }
      : least ? { subject: least, reason: "Your least-practised subject — keep every subject sharp." }
      : null;

    return Response.json({
      user: auth.user,
      total, correct,
      week: week[0]?.total ?? 0,
      weekXp: week[0]?.xp ?? 0,
      streak, unread,
      level: levelFor(totals[0]?.xp ?? 0),
      today, dailyGoal: DAILY_GOAL,
      activity, badges, recommendation,
      subjects,
      recent: recent.map((r) => ({ prompt: r.q[0]?.prompt ?? "Removed question", subject: r.q[0]?.subject ?? "", correct: r.correct, timedOut: Boolean(r.timedOut), createdAt: r.createdAt })),
    });
  } catch (error) { return apiError(error); }
}
