import { ObjectId } from "mongodb";
import { COINS, grant } from "@/lib/coins";
import { getDb } from "@/lib/db";
import { xpFor } from "@/lib/gamification";
import { getSubjects } from "@/lib/subjectStore";
import { needsStream, secondsPerQuestion, subjectsForStudent } from "@/lib/subjects";
import type { DbQuestion, PublicUser } from "@/lib/types";

/**
 * Daily Challenge: every student in the same grade (and stream) gets the same 5 questions each day
 * (Addis Ababa date) and one try. Questions are served one at a time WITHOUT the answer, and each
 * answer is checked and timed on the server, so the leaderboard is fair.
 * Points: 100 per correct answer + up to 50 for speed (time left on that question).
 */
export const CHALLENGE_SIZE = 5;
const TZ = "Africa/Addis_Ababa";
const GRACE_MS = 2500; // network delay allowance

export type RunAnswer = { questionId: ObjectId; choice: number; correct: boolean; timedOut: boolean; ms: number; points: number };
export type Run = {
  _id: string; userId: ObjectId; day: string; bucket: string; name: string; grade: string | null;
  questionIds: ObjectId[]; limits: number[]; current: number; servedAt: Date; startedAt: Date;
  answers: RunAnswer[]; score: number; correct: number; finishedAt: Date | null; coins: number;
};

export const today = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ });
export const bucketOf = (u: Pick<PublicUser, "grade" | "stream">) => `${u.grade ?? "none"}${needsStream(u.grade) && u.stream ? `:${u.stream}` : ""}`;
/** Milliseconds until the next Addis Ababa midnight. */
export const resetsIn = () => {
  const next = new Date(`${today()}T00:00:00+03:00`).getTime() + 86400000;
  return Math.max(0, next - Date.now());
};

function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}

/** Today's questions for a grade/stream (the same for everyone in it). */
export async function todaysQuestions(user: PublicUser) {
  if (!user.grade) return [];
  const subjects = await getSubjects();
  const allowed = subjectsForStudent(user.grade, user.stream ?? null, subjects).map((s) => s.name);
  const pool = await (await getDb()).collection<DbQuestion>("questions")
    .find({ published: true, grade: user.grade, subject: { $in: allowed } }, { projection: { _id: 1, subject: 1 } })
    .sort({ _id: 1 }).limit(2000).toArray();
  const random = seeded(`${today()}|${bucketOf(user)}`);
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
  const picked = shuffled.slice(0, CHALLENGE_SIZE);
  return picked.map((q) => ({ id: q._id!, limit: secondsPerQuestion(q.subject, subjects) }));
}

const runs = async () => (await getDb()).collection<Run>("challenge_runs");
export const runId = (userId: string, day = today()) => `${day}:${userId}`;
export async function myRun(userId: string) { return (await runs()).findOne({ _id: runId(userId) }); }

/** The question a student should see now — never includes the correct answer. */
export async function servedQuestion(run: Run) {
  if (run.finishedAt || run.current >= run.questionIds.length) return null;
  const q = await (await getDb()).collection<DbQuestion>("questions").findOne({ _id: run.questionIds[run.current] });
  if (!q) return null;
  const limit = run.limits[run.current];
  const left = Math.max(0, Math.ceil((run.servedAt.getTime() + limit * 1000 - Date.now()) / 1000));
  return { index: run.current, total: run.questionIds.length, subject: q.subject, type: q.type ?? "mcq", question: q.prompt, choices: q.choices, limit, left, unit: q.unit ?? "", year: q.year ?? "" };
}

export async function startRun(user: PublicUser) {
  const existing = await myRun(user.id);
  if (existing) return existing;
  const questions = await todaysQuestions(user);
  if (questions.length < 3) return null;
  const now = new Date();
  const run: Run = {
    _id: runId(user.id), userId: new ObjectId(user.id), day: today(), bucket: bucketOf(user), name: user.name, grade: user.grade ?? null,
    questionIds: questions.map((q) => q.id), limits: questions.map((q) => q.limit), current: 0, servedAt: now, startedAt: now,
    answers: [], score: 0, correct: 0, finishedAt: null, coins: 0,
  };
  try { await (await runs()).insertOne(run); } catch (error) { if ((error as { code?: number }).code !== 11000) throw error; }
  return myRun(user.id);
}

/** Checks one answer (on time?), records it, moves on, and pays coins when the run ends. */
export async function answerRun(user: PublicUser, index: number, choice: number) {
  const col = await runs();
  const run = await col.findOne({ _id: runId(user.id) });
  if (!run || run.finishedAt || run.current !== index) return { error: "This question was already answered." as const };
  const db = await getDb();
  const q = await db.collection<DbQuestion>("questions").findOne({ _id: run.questionIds[index] });
  const limitMs = run.limits[index] * 1000;
  const ms = Date.now() - run.servedAt.getTime();
  const timedOut = choice < 0 || ms > limitMs + GRACE_MS;
  const correct = !timedOut && !!q && q.correctAnswer === choice;
  const points = correct ? 100 + Math.round(50 * Math.max(0, 1 - ms / limitMs)) : 0;
  const answer: RunAnswer = { questionId: run.questionIds[index], choice: timedOut ? -1 : choice, correct, timedOut, ms, points };
  const last = index + 1 >= run.questionIds.length;
  // Only the first submission for this index counts (the filter on `current`).
  const updated = await col.findOneAndUpdate(
    { _id: run._id, current: index, finishedAt: null },
    { $push: { answers: answer }, $inc: { score: points, correct: correct ? 1 : 0, current: 1 }, $set: { servedAt: new Date(), ...(last ? { finishedAt: new Date() } : {}) } },
    { returnDocument: "after" },
  );
  if (!updated) return { error: "This question was already answered." as const };
  if (q) await db.collection("attempts").insertOne({ userId: new ObjectId(user.id), questionId: q._id, selectedAnswer: answer.choice, correct, timedOut, xp: xpFor(correct, timedOut), challenge: run.day, createdAt: new Date() });
  let coins = 0;
  if (last) {
    coins = await grant(user.id, COINS.challengeDone + COINS.challengeCorrect * updated.correct, "challenge", run.day);
    await col.updateOne({ _id: run._id }, { $set: { coins } });
  }
  return { correct, timedOut, points, correctAnswer: q?.correctAnswer ?? -1, explanation: q?.explanation ?? "", finished: last, run: { ...updated, coins } };
}

/** Today's leaderboard for a grade/stream. */
export async function leaderboard(bucket: string, day = today()) {
  const rows = await (await runs()).aggregate<Run & { gear?: { frame?: string | null; title?: string | null } }>([
    { $match: { day, bucket, finishedAt: { $ne: null } } },
    { $sort: { score: -1, finishedAt: 1 } },
    { $limit: 200 },
    { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "u", pipeline: [{ $project: { gear: 1 } }] } },
    { $set: { gear: { $first: "$u.gear" } } },
  ]).toArray();
  return rows.map((r, i) => ({ rank: i + 1, userId: r.userId.toString(), name: r.name, score: r.score, correct: r.correct, total: r.questionIds.length, frame: r.gear?.frame ?? null, title: r.gear?.title ?? null }));
}

/** How many challenges a student finished, and on how many days they came first. */
export async function challengeStats(userId: string) {
  const col = await runs();
  const mine = await col.find({ userId: new ObjectId(userId), finishedAt: { $ne: null } }, { projection: { day: 1, bucket: 1, score: 1 } }).toArray();
  if (!mine.length) return { finished: 0, wins: 0 };
  const best = await col.aggregate<{ _id: { day: string; bucket: string }; top: number }>([
    { $match: { finishedAt: { $ne: null }, $or: mine.map((m) => ({ day: m.day, bucket: m.bucket })) } },
    { $group: { _id: { day: "$day", bucket: "$bucket" }, top: { $max: "$score" } } },
  ]).toArray();
  const top = new Map(best.map((b) => [`${b._id.day}|${b._id.bucket}`, b.top]));
  // A day only counts as a win once it is over (others may still play today).
  const wins = mine.filter((m) => m.day !== today() && m.score > 0 && m.score >= (top.get(`${m.day}|${m.bucket}`) ?? Infinity)).length;
  return { finished: mine.length, wins };
}
