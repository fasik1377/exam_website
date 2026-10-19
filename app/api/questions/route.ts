import { ObjectId } from "mongodb";
import { apiError, cleanString, readJson } from "@/lib/api";
import { ensureDatabase, requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { DbQuestion } from "@/lib/types";

export async function GET(request: Request) {
  try {
    await ensureDatabase();
    const url = new URL(request.url);
    const filter: Record<string, unknown> = { published: true };
    const grade = cleanString(url.searchParams.get("grade"), 30);
    const subject = cleanString(url.searchParams.get("subject"), 60);
    const unit = cleanString(url.searchParams.get("unit"), 60);
    const year = cleanString(url.searchParams.get("year"), 30);
    if (grade) filter.grade = grade;
    if (subject) filter.subject = subject;
    if (unit && unit !== "All topics") filter.unit = unit;
    if (year) filter.year = year;
    const questions = await (await getDb()).collection<DbQuestion>("questions").find(filter).sort({ createdAt: 1 }).limit(100).toArray();
    return Response.json({ questions: questions.map((q) => ({ id: q._id?.toString(), subject: q.subject, grade: q.grade, unit: q.unit, year: q.year, question: q.prompt, choices: q.choices, answer: q.correctAnswer, explanation: q.explanation, teacher: q.teacherName })) });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const auth = await requireUser(["admin", "super-admin"]);
    if (auth.error) return auth.error;
    const body = await readJson(request);
    const choices = Array.isArray(body.choices) ? body.choices.map((item: unknown) => cleanString(item, 250)).filter(Boolean) : [];
    const correctAnswer = Number(body.correctAnswer);
    const question: Omit<DbQuestion, "_id"> = {
      subject: cleanString(body.subject, 60), grade: cleanString(body.grade, 30), unit: cleanString(body.unit, 60), year: cleanString(body.year, 30) || "2016 E.C.",
      prompt: cleanString(body.question, 1000), choices, correctAnswer, explanation: cleanString(body.explanation, 1500), teacherName: auth.user.name,
      createdBy: new ObjectId(auth.user.id), published: body.published !== false, createdAt: new Date(), updatedAt: new Date(),
    };
    if (!question.subject || !question.grade || !question.prompt || choices.length < 2 || !Number.isInteger(correctAnswer) || correctAnswer < 0 || correctAnswer >= choices.length || !question.explanation) {
      return Response.json({ error: "Complete the question, choices, correct answer, and explanation" }, { status: 400 });
    }
    const result = await (await getDb()).collection<DbQuestion>("questions").insertOne(question);
    return Response.json({ id: result.insertedId.toString() }, { status: 201 });
  } catch (error) { return apiError(error); }
}
