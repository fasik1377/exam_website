import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { bestRun } from "@/lib/gamification";
import { lastAnnouncement, nextAnnouncement, weekKey } from "@/lib/topStudents";

/**
 * Weekly quests: 3 goals per student per week (Saturday 12:00 → Saturday 12:00, Addis Ababa,
 * the same week as "Students of the week"). Which 3 is decided by the week and the student, so
 * classmates get different mixes. Progress comes from real answers; coins are paid once on claim.
 */
type Metric = "answers" | "correct" | "days" | "challenges" | "accuracy" | "run" | "subjects";
type Template = { id: string; title: string; metric: Metric; target: number; reward: number; icon: string };

const TEMPLATES: Template[] = [
  { id: "answers-40", title: "Answer 40 questions", metric: "answers", target: 40, reward: 25, icon: "📝" },
  { id: "answers-80", title: "Answer 80 questions", metric: "answers", target: 80, reward: 45, icon: "📚" },
  { id: "correct-25", title: "Get 25 answers right", metric: "correct", target: 25, reward: 30, icon: "✅" },
  { id: "correct-50", title: "Get 50 answers right", metric: "correct", target: 50, reward: 50, icon: "🎯" },
  { id: "days-4", title: "Practise on 4 different days", metric: "days", target: 4, reward: 35, icon: "📅" },
  { id: "days-6", title: "Practise on 6 different days", metric: "days", target: 6, reward: 55, icon: "🔥" },
  { id: "challenges-3", title: "Finish 3 daily challenges", metric: "challenges", target: 3, reward: 40, icon: "⚡" },
  { id: "challenges-5", title: "Finish 5 daily challenges", metric: "challenges", target: 5, reward: 60, icon: "🏁" },
  { id: "accuracy-80", title: "Score 80% or more (min. 20 answers)", metric: "accuracy", target: 80, reward: 45, icon: "🏹" },
  { id: "run-7", title: "Get 7 right in a row", metric: "run", target: 7, reward: 35, icon: "⚡" },
  { id: "subjects-3", title: "Practise 3 different subjects", metric: "subjects", target: 3, reward: 30, icon: "🧭" },
];

function pick(seed: string, n: number) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const random = () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h ^= h >>> 13; return (h >>> 0) / 4294967296; };
  const pool = [...TEMPLATES];
  const out: Template[] = [];
  // Never two quests measuring the same thing.
  while (out.length < n && pool.length) {
    const t = pool.splice(Math.floor(random() * pool.length), 1)[0];
    if (!out.some((o) => o.metric === t.metric)) out.push(t);
  }
  return out;
}

export async function weeklyQuests(userId: string) {
  const start = lastAnnouncement(), end = nextAnnouncement(), key = weekKey(end);
  const db = await getDb();
  const uid = new ObjectId(userId);
  const [attempts, challenges, claims] = await Promise.all([
    db.collection("attempts").aggregate<{ correct: boolean; createdAt: Date; subject?: string }>([
      { $match: { userId: uid, createdAt: { $gte: start, $lt: end } } },
      { $sort: { createdAt: 1 } },
      { $lookup: { from: "questions", localField: "questionId", foreignField: "_id", as: "q", pipeline: [{ $project: { subject: 1 } }] } },
      { $project: { correct: 1, createdAt: 1, subject: { $first: "$q.subject" } } },
    ]).toArray(),
    db.collection("challenge_runs").countDocuments({ userId: uid, finishedAt: { $gte: start, $lt: end } }),
    db.collection("coin_ledger").find({ userId: uid, reason: "quest", ref: { $regex: `^${key}:` } }, { projection: { ref: 1 } }).toArray(),
  ]);
  const answers = attempts.length, correct = attempts.filter((a) => a.correct).length;
  const values: Record<Metric, number> = {
    answers, correct, challenges,
    days: new Set(attempts.map((a) => a.createdAt.toLocaleDateString("en-CA", { timeZone: "Africa/Addis_Ababa" }))).size,
    accuracy: answers >= 20 ? Math.round((correct / answers) * 100) : 0,
    run: bestRun(attempts.map((a) => a.correct)),
    subjects: new Set(attempts.map((a) => a.subject).filter(Boolean)).size,
  };
  const claimed = new Set(claims.map((c) => String(c.ref).split(":")[1]));
  return {
    week: key, endsAt: end,
    quests: pick(`${key}|${userId}`, 3).map((t) => ({ id: t.id, title: t.title, icon: t.icon, reward: t.reward, target: t.target, progress: Math.min(values[t.metric], t.target), done: values[t.metric] >= t.target, claimed: claimed.has(t.id) })),
  };
}

export const questReward = (id: string) => TEMPLATES.find((t) => t.id === id)?.reward ?? 0;
