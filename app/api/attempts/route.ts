import { ObjectId } from "mongodb";
import { apiError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { COINS, grant } from "@/lib/coins";
import { DAILY_GOAL, xpFor } from "@/lib/gamification";

/** Records one answer. `selectedAnswer: -1` with `timedOut: true` means the timer ran out. */
export async function POST(request: Request) {
  try {
    const auth = await requireUser(["student"]);
    if (auth.error) return auth.error;
    const body = await readJson(request);
    const questionId = typeof body.questionId === "string" ? body.questionId : "";
    const timedOut = body.timedOut === true;
    const selected = timedOut ? -1 : body.selectedAnswer;
    if (!ObjectId.isValid(questionId) || !Number.isInteger(selected) || (!timedOut && (selected as number) < 0)) return Response.json({ error: "Invalid attempt" }, { status: 400 });
    const db = await getDb();
    const question = await db.collection("questions").findOne({ _id: new ObjectId(questionId), published: true });
    if (!question) return Response.json({ error: "Question not found" }, { status: 404 });
    const correct = !timedOut && question.correctAnswer === selected;
    // Correct answers in a row, counted from the stored history (never trusted from the browser).
    let combo = 0;
    if (correct) {
      const last = await db.collection("attempts").find({ userId: new ObjectId(auth.user.id) }, { projection: { correct: 1 } }).sort({ createdAt: -1 }).limit(30).toArray();
      combo = 1;
      for (const a of last) { if (!a.correct) break; combo++; }
    }
    const xp = xpFor(correct, timedOut, combo);
    const inserted = await db.collection("attempts").insertOne({ userId: new ObjectId(auth.user.id), questionId: question._id, selectedAnswer: selected, correct, timedOut, xp, createdAt: new Date() });

    // Coins (each reward is paid at most once).
    let coins = 0;
    if (correct) {
      coins += await grant(auth.user.id, COINS.correct, "correct", inserted.insertedId.toString());
      if (combo > 0 && combo % COINS.comboEvery === 0) coins += await grant(auth.user.id, COINS.comboBonus, "combo", inserted.insertedId.toString());
    }
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Addis_Ababa" });
    const todayStart = new Date(`${today}T00:00:00+03:00`);
    if ((await db.collection("attempts").countDocuments({ userId: new ObjectId(auth.user.id), createdAt: { $gte: todayStart } })) >= DAILY_GOAL) {
      coins += await grant(auth.user.id, COINS.dailyGoal, "daily-goal", today);
    }
    return Response.json({ correct, timedOut, xp, combo, coins });
  } catch (error) { return apiError(error); }
}
