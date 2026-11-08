import { ObjectId, type Db } from "mongodb";
import { apiError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { COINS, grant, grantMany } from "@/lib/coins";
import { DAILY_GOAL, xpFor } from "@/lib/gamification";

type Outcome = { questionId: string; correct: boolean; timedOut: boolean; skipped: boolean; xp: number; combo: number; coins: number };

/** Records one answer and pays its coins. `selected` -1 = time ran out / left unanswered. */
async function recordAnswer(db: Db, userId: string, questionId: string, selected: number, timedOut: boolean, skipped: boolean): Promise<Outcome | null> {
  const question = await db.collection("questions").findOne({ _id: new ObjectId(questionId), published: true });
  if (!question) return null;
  const correct = !timedOut && question.correctAnswer === selected;
  // Correct answers in a row, counted from the stored history (never trusted from the browser).
  let combo = 0;
  if (correct) {
    const last = await db.collection("attempts").find({ userId: new ObjectId(userId) }, { projection: { correct: 1 } }).sort({ createdAt: -1 }).limit(30).toArray();
    combo = 1;
    for (const a of last) { if (!a.correct) break; combo++; }
  }
  const xp = xpFor(correct, timedOut, combo);
  const inserted = await db.collection("attempts").insertOne({ userId: new ObjectId(userId), questionId: question._id, selectedAnswer: selected, correct, timedOut, ...(skipped ? { skipped: true } : {}), xp, createdAt: new Date() });
  // Coins (each reward is paid at most once).
  let coins = 0;
  if (correct) {
    coins += await grant(userId, COINS.correct, "correct", inserted.insertedId.toString());
    if (combo > 0 && combo % COINS.comboEvery === 0) coins += await grant(userId, COINS.comboBonus, "combo", inserted.insertedId.toString());
  }
  return { questionId, correct, timedOut, skipped, xp, combo, coins };
}

/** Pays the daily-goal reward once the student has answered enough today. */
async function dailyGoal(db: Db, userId: string) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Addis_Ababa" });
  const todayStart = new Date(`${today}T00:00:00+03:00`);
  if ((await db.collection("attempts").countDocuments({ userId: new ObjectId(userId), createdAt: { $gte: todayStart } })) < DAILY_GOAL) return 0;
  return grant(userId, COINS.dailyGoal, "daily-goal", today);
}

/**
 * One answer:   { questionId, selectedAnswer }  or  { questionId, timedOut: true }
 * Whole exam:   { answers: [{ questionId, selectedAnswer: number | null }] }  (null = left unanswered)
 */
export async function POST(request: Request) {
  try {
    const auth = await requireUser(["student"]);
    if (auth.error) return auth.error;
    const body = await readJson(request);
    const db = await getDb();

    if (Array.isArray(body.answers)) {
      const items = body.answers as { questionId?: unknown; selectedAnswer?: unknown }[];
      if (!items.length || items.length > 200) return Response.json({ error: "Send between 1 and 200 answers" }, { status: 400 });
      if (items.some((a) => typeof a?.questionId !== "string" || !ObjectId.isValid(a.questionId) || !(a.selectedAnswer === null || (Number.isInteger(a.selectedAnswer) && (a.selectedAnswer as number) >= 0)))) {
        return Response.json({ error: "Invalid answers" }, { status: 400 });
      }
      // A whole exam in a few round trips: load all questions, mark them, insert all attempts, pay all coins.
      const uid = new ObjectId(auth.user.id);
      const qids = items.map((a) => new ObjectId(a.questionId as string));
      const [found, history] = await Promise.all([
        db.collection("questions").find({ _id: { $in: qids }, published: true }, { projection: { correctAnswer: 1 } }).toArray(),
        db.collection("attempts").find({ userId: uid }, { projection: { correct: 1 } }).sort({ createdAt: -1 }).limit(30).toArray(),
      ]);
      const byId = new Map(found.map((q) => [q._id.toString(), q]));
      let run = 0;
      for (const h of history) { if (!h.correct) break; run++; }
      const now = Date.now();
      const docs: Record<string, unknown>[] = [];
      const marked = items.map((a, i) => {
        const q = byId.get(a.questionId as string);
        if (!q) return null;
        const unanswered = a.selectedAnswer === null;
        const selected = unanswered ? -1 : (a.selectedAnswer as number);
        const correct = !unanswered && q.correctAnswer === selected;
        run = correct ? run + 1 : 0;
        const combo = correct ? run : 0;
        const xp = xpFor(correct, unanswered, combo);
        const _id = new ObjectId();
        docs.push({ _id, userId: uid, questionId: q._id, selectedAnswer: selected, correct, timedOut: unanswered, ...(unanswered ? { skipped: true } : {}), xp, exam: true, createdAt: new Date(now + i) });
        return { id: _id.toString(), questionId: a.questionId as string, correct, timedOut: unanswered, skipped: unanswered, xp, combo };
      });
      if (docs.length) await db.collection("attempts").insertMany(docs);
      const paid = await grantMany(auth.user.id, marked.flatMap((m) => (!m || !m.correct ? [] : [
        { amount: COINS.correct, reason: "correct", ref: m.id },
        ...(m.combo % COINS.comboEvery === 0 ? [{ amount: COINS.comboBonus, reason: "combo", ref: m.id }] : []),
      ])));
      const results: (Outcome | null)[] = marked.map((m) => (m ? { questionId: m.questionId, correct: m.correct, timedOut: m.timedOut, skipped: m.skipped, xp: m.xp, combo: m.combo, coins: (paid.get(`${m.id}|correct`) ?? 0) + (paid.get(`${m.id}|combo`) ?? 0) } : null));
      const goalCoins = await dailyGoal(db, auth.user.id);
      return Response.json({ results, goalCoins });
    }

    const questionId = typeof body.questionId === "string" ? body.questionId : "";
    const timedOut = body.timedOut === true;
    const selected = timedOut ? -1 : body.selectedAnswer;
    if (!ObjectId.isValid(questionId) || !Number.isInteger(selected) || (!timedOut && (selected as number) < 0)) return Response.json({ error: "Invalid attempt" }, { status: 400 });
    const outcome = await recordAnswer(db, auth.user.id, questionId, selected as number, timedOut, false);
    if (!outcome) return Response.json({ error: "Question not found" }, { status: 404 });
    const coins = outcome.coins + (await dailyGoal(db, auth.user.id));
    return Response.json({ correct: outcome.correct, timedOut, xp: outcome.xp, combo: outcome.combo, coins });
  } catch (error) { return apiError(error); }
}
