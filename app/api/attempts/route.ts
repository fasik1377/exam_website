import { ObjectId } from "mongodb";
import { apiError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { xpFor } from "@/lib/gamification";

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
    await db.collection("attempts").insertOne({ userId: new ObjectId(auth.user.id), questionId: question._id, selectedAnswer: selected, correct, timedOut, xp, createdAt: new Date() });
    return Response.json({ correct, timedOut, xp, combo });
  } catch (error) { return apiError(error); }
}
