import { ObjectId } from "mongodb";
import { after } from "next/server";
import { getDb } from "@/lib/db";
import { notifyAddress, notifyTopStudentsSummary, notifyWeeklyTop } from "@/lib/mail";

/**
 * Students of the week.
 *
 * A week runs from Saturday 12:00 to the next Saturday 12:00, Addis Ababa time (09:00 UTC).
 * Every eligible student gets a weekly score out of 100:
 *
 *   score = 100 × (wA·accuracy + wV·effort + wC·consistency) / (wA + wV + wC)
 *
 *   accuracy     correct answers, smoothed: (correct + 2) / (answers + 4). A short lucky streak
 *                (3 of 3) can't beat steady accuracy over many questions (95 of 100).
 *   effort       answers this week ÷ the cap (e.g. 150), at most 1, so endless clicking stops paying off.
 *   consistency  days practised this week ÷ 7 — regular study beats one cram session.
 *
 * Eligible: at least `minAnswers` answers on at least `minDays` different days.
 * Ties: more correct answers, then more answers. The super admin can change every setting.
 */
export type TopCriteria = {
  accuracyWeight: number; volumeWeight: number; consistencyWeight: number;
  minAnswers: number; minDays: number; volumeCap: number;
  scope: "overall" | "grade"; emailWinners: boolean;
};
export const DEFAULT_CRITERIA: TopCriteria = { accuracyWeight: 50, volumeWeight: 30, consistencyWeight: 20, minAnswers: 20, minDays: 2, volumeCap: 150, scope: "overall", emailWinners: true };

export type Ranked = {
  userId: string; name: string; email: string; grade: string | null;
  answers: number; correct: number; days: number; subjects: number;
  accuracy: number; smoothedAccuracy: number; effort: number; consistency: number;
  score: number; eligible: boolean; rank: number | null;
};
export type Winner = Omit<Ranked, "email" | "eligible"> & { rank: number };
export type Award = { _id: string; start: Date; end: Date; scope: TopCriteria["scope"]; criteria: TopCriteria; winners: Winner[]; createdAt: Date; trigger: string };

const TZ = "Africa/Addis_Ababa";
const WEEK = 7 * 86400000;
type CriteriaDoc = TopCriteria & { _id: string; enabledAt: Date; updatedAt?: Date };

/** Saved criteria. The first read also records when the feature started, so older weeks are never awarded. */
export async function getCriteria(): Promise<TopCriteria & { enabledAt: Date }> {
  const col = (await getDb()).collection<CriteriaDoc>("settings");
  const doc = await col.findOneAndUpdate({ _id: "topStudents" }, { $setOnInsert: { ...DEFAULT_CRITERIA, enabledAt: new Date() } }, { upsert: true, returnDocument: "after" });
  return { ...pickCriteria({ ...DEFAULT_CRITERIA, ...doc }), enabledAt: doc?.enabledAt ?? new Date() };
}
/** Only the criteria fields (drops ids, timestamps and anything else stored alongside). */
export const pickCriteria = (c: TopCriteria): TopCriteria => ({
  accuracyWeight: c.accuracyWeight, volumeWeight: c.volumeWeight, consistencyWeight: c.consistencyWeight,
  minAnswers: c.minAnswers, minDays: c.minDays, volumeCap: c.volumeCap, scope: c.scope, emailWinners: c.emailWinners,
});

export async function saveCriteria(next: TopCriteria) {
  await getCriteria(); // make sure the document (and enabledAt) exists
  await (await getDb()).collection<CriteriaDoc>("settings").updateOne({ _id: "topStudents" }, { $set: { ...next, updatedAt: new Date() } });
}

/** The most recent Saturday 12:00 Addis Ababa time (09:00 UTC) at or before `now`. */
export function lastAnnouncement(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 9));
  const back = (d.getUTCDay() - 6 + 7) % 7; // days since Saturday
  d.setUTCDate(d.getUTCDate() - back);
  if (d > now) d.setUTCDate(d.getUTCDate() - 7);
  return d;
}
export const nextAnnouncement = (now = new Date()) => new Date(lastAnnouncement(now).getTime() + WEEK);
export const weekKey = (end: Date) => end.toISOString().slice(0, 10);
export const weekLabel = (start: Date, end: Date) => {
  const f = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: TZ });
  return `${f(start)} – ${f(end)}`;
};

/** Scores every student who practised between `start` and `end`, best first. */
export async function rankStudents(start: Date, end: Date, criteria: TopCriteria): Promise<Ranked[]> {
  const db = await getDb();
  const rows = await db.collection("attempts").aggregate<{ _id: ObjectId; answers: number; correct: number; days: string[]; subjects: string[]; user: { name: string; email: string; grade?: string | null } }>([
    { $match: { createdAt: { $gte: start, $lt: end } } },
    { $lookup: { from: "questions", localField: "questionId", foreignField: "_id", as: "q", pipeline: [{ $project: { subject: 1 } }] } },
    { $group: {
      _id: "$userId", answers: { $sum: 1 }, correct: { $sum: { $cond: ["$correct", 1, 0] } },
      days: { $addToSet: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TZ } } },
      subjects: { $addToSet: { $first: "$q.subject" } },
    } },
    { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user", pipeline: [{ $match: { role: "student", status: "active" } }, { $project: { name: 1, email: 1, grade: 1 } }] } },
    { $unwind: "$user" },
  ]).toArray();

  const totalWeight = criteria.accuracyWeight + criteria.volumeWeight + criteria.consistencyWeight || 1;
  const scored = rows.map((r) => {
    const smoothedAccuracy = (r.correct + 2) / (r.answers + 4);
    const effort = Math.min(r.answers, criteria.volumeCap) / criteria.volumeCap;
    const consistency = Math.min(r.days.length, 7) / 7;
    const score = (100 * (criteria.accuracyWeight * smoothedAccuracy + criteria.volumeWeight * effort + criteria.consistencyWeight * consistency)) / totalWeight;
    return {
      userId: r._id.toString(), name: r.user.name, email: r.user.email, grade: r.user.grade ?? null,
      answers: r.answers, correct: r.correct, days: r.days.length, subjects: r.subjects.filter(Boolean).length,
      accuracy: r.answers ? r.correct / r.answers : 0, smoothedAccuracy, effort, consistency,
      score: Math.round(score * 10) / 10,
      eligible: r.answers >= criteria.minAnswers && r.days.length >= criteria.minDays,
      rank: null as number | null,
    };
  });
  scored.sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score || b.correct - a.correct || b.answers - a.answers);
  // Rank eligible students (per grade when the scope is "grade").
  const counters = new Map<string, number>();
  for (const s of scored) {
    if (!s.eligible) continue;
    const group = criteria.scope === "grade" ? s.grade ?? "No grade" : "all";
    const next = (counters.get(group) ?? 0) + 1;
    counters.set(group, next);
    s.rank = next;
  }
  return scored;
}

/** A ranked row without private or internal fields (email, eligibility). */
export const publicRow = (r: Ranked) => ({
  userId: r.userId, name: r.name, grade: r.grade, answers: r.answers, correct: r.correct, days: r.days, subjects: r.subjects,
  accuracy: r.accuracy, smoothedAccuracy: r.smoothedAccuracy, effort: r.effort, consistency: r.consistency, score: r.score, rank: r.rank,
});
const toWinner = (r: Ranked): Winner => ({ ...publicRow(r), rank: r.rank! });

/**
 * Announces the most recently finished week if that hasn't happened yet (safe to call often:
 * the week's key is unique, so only one caller ever announces it). Called by the Saturday
 * 12:00 cron job and, as a fallback, whenever students or the admin open their dashboards.
 */
export async function ensureWeeklyAward(trigger: string): Promise<Award | null> {
  const db = await getDb();
  const end = lastAnnouncement();
  const key = weekKey(end);
  const existing = await db.collection<Award>("weekly_awards").findOne({ _id: key });
  if (existing) return existing;
  const criteria = await getCriteria();
  if (end <= criteria.enabledAt) return null; // the week finished before this feature existed
  const start = new Date(end.getTime() - WEEK);
  const ranked = await rankStudents(start, end, criteria);
  const winnersRanked = ranked.filter((r) => r.rank !== null && r.rank <= 3);
  const award: Award = { _id: key, start, end, scope: criteria.scope, criteria: pickCriteria(criteria), winners: winnersRanked.map(toWinner), createdAt: new Date(), trigger };
  try {
    await db.collection<Award>("weekly_awards").insertOne(award);
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return db.collection<Award>("weekly_awards").findOne({ _id: key });
    throw error;
  }

  const label = weekLabel(start, end);
  if (winnersRanked.length) {
    await db.collection("notifications").insertMany(winnersRanked.map((w) => ({
      userId: new ObjectId(w.userId), kind: "weekly-top", weekKey: key, rank: w.rank, grade: w.grade, score: w.score,
      title: `You're #${w.rank} student of the week!`, body: `${label}: ${w.correct} correct of ${w.answers} answers on ${w.days} day${w.days === 1 ? "" : "s"}.`,
      createdAt: new Date(), readAt: null,
    })));
  }
  if (criteria.emailWinners && winnersRanked.length) {
    const runEmails = async () => {
      await Promise.all(winnersRanked.map((w) => notifyWeeklyTop(w, label, criteria.scope === "grade")));
      const admin = notifyAddress();
      if (admin) await notifyTopStudentsSummary(admin, winnersRanked, label);
    };
    try { after(runEmails); } catch { void runEmails(); } // outside a request (e.g. scripts) send directly
  }
  return award;
}

/** The latest announced week (for the "Students of the week" board). */
export async function latestAward() {
  return (await getDb()).collection<Award>("weekly_awards").find().sort({ end: -1 }).limit(1).next();
}
