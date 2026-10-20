import { ObjectId } from "mongodb";
import { apiError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const auth = await requireUser(["student"]);
    if (auth.error) return auth.error;
    const body = await readJson(request);
    const questionId = typeof body.questionId === "string" ? body.questionId : "";
    if (!ObjectId.isValid(questionId) || !Number.isInteger(body.selectedAnswer)) return Response.json({ error: "Invalid attempt" }, { status: 400 });
    const question = await (await getDb()).collection("questions").findOne({ _id: new ObjectId(questionId), published: true });
    if (!question) return Response.json({ error: "Question not found" }, { status: 404 });
    const correct = question.correctAnswer === body.selectedAnswer;
    await (await getDb()).collection("attempts").insertOne({ userId: new ObjectId(auth.user.id), questionId: question._id, selectedAnswer: body.selectedAnswer, correct, createdAt: new Date() });
    return Response.json({ correct });
  } catch (error) { return apiError(error); }
}
