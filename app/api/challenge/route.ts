import { apiError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { CHALLENGE_SIZE, answerRun, bucketOf, leaderboard, myRun, resetsIn, servedQuestion, startRun, todaysQuestions, type Run } from "@/lib/challenge";
import { titleName } from "@/lib/shop";

const shortName = (name: string) => { const [first, ...rest] = name.trim().split(/\s+/); return rest.length ? `${first} ${rest[0][0].toUpperCase()}.` : first; };

async function board(userId: string, bucket: string) {
  const rows = await leaderboard(bucket);
  const me = rows.find((r) => r.userId === userId) ?? null;
  return {
    top: rows.slice(0, 10).map((r) => ({ rank: r.rank, name: shortName(r.name), score: r.score, correct: r.correct, total: r.total, frame: r.frame, title: titleName(r.title), me: r.userId === userId })),
    me: me ? { rank: me.rank, score: me.score } : null,
    players: rows.length,
  };
}
const summary = (run: Run) => ({ score: run.score, correct: run.correct, total: run.questionIds.length, coins: run.coins, finished: Boolean(run.finishedAt), answers: run.answers.map((a) => ({ correct: a.correct, timedOut: a.timedOut, points: a.points })) });

/** Today's challenge: status, my run, the question I'm on (no answer!) and the leaderboard. */
export async function GET() {
  try {
    const auth = await requireUser(["student"]); if (auth.error) return auth.error;
    if (!auth.user.grade) return Response.json({ available: false, reason: "Choose your grade on the dashboard first." });
    const [run, questions] = await Promise.all([myRun(auth.user.id), todaysQuestions(auth.user)]);
    return Response.json({
      available: questions.length >= 3, size: Math.min(CHALLENGE_SIZE, questions.length), resetsIn: resetsIn(), grade: auth.user.grade,
      run: run ? summary(run) : null,
      question: run ? await servedQuestion(run) : null,
      board: await board(auth.user.id, bucketOf(auth.user)),
    });
  } catch (error) { return apiError(error); }
}

/** { action: "start" } or { action: "answer", index, choice } (choice -1 = time ran out). */
export async function POST(request: Request) {
  try {
    const auth = await requireUser(["student"]); if (auth.error) return auth.error;
    const body = await readJson(request);
    if (body.action === "start") {
      const run = await startRun(auth.user);
      if (!run) return Response.json({ error: "There aren't enough questions for your grade yet — try again soon." }, { status: 409 });
      return Response.json({ run: summary(run), question: await servedQuestion(run) });
    }
    if (body.action === "answer") {
      const index = Number(body.index), choice = Number(body.choice);
      if (!Number.isInteger(index) || !Number.isInteger(choice)) return Response.json({ error: "Invalid answer" }, { status: 400 });
      const result = await answerRun(auth.user, index, choice);
      if ("error" in result) return Response.json({ error: result.error }, { status: 409 });
      return Response.json({
        correct: result.correct, timedOut: result.timedOut, points: result.points, correctAnswer: result.correctAnswer, explanation: result.explanation,
        run: summary(result.run), next: result.finished ? null : await servedQuestion(result.run),
        board: result.finished ? await board(auth.user.id, bucketOf(auth.user)) : null,
      });
    }
    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) { return apiError(error); }
}
