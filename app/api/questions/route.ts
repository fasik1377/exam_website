import { ObjectId } from "mongodb";
import { apiError, cleanString, readJson } from "@/lib/api";
import { ensureDatabase, getCurrentUser, requireUser } from "@/lib/auth";
import { getSettings, hasFullAccess } from "@/lib/settings";
import { getDb } from "@/lib/db";
import type { DbQuestion } from "@/lib/types";
import { findSubject } from "@/lib/subjectStore";

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
    const [all, user, settings] = await Promise.all([
      (await getDb()).collection<DbQuestion>("questions").find(filter).sort({ createdAt: 1 }).limit(100).toArray(),
      getCurrentUser(),
      getSettings(),
    ]);
    // With payment on, free students and visitors get only the free questions and no explanations.
    const full = hasFullAccess(user, settings);
    const questions = full ? all : all.slice(0, settings.freeQuestions);
    return Response.json({
      limited: !full, total: all.length, freeQuestions: settings.freeQuestions, paymentRequired: settings.paymentRequired,
      questions: questions.map((q) => ({ id: q._id?.toString(), subject: q.subject, grade: q.grade, unit: q.unit, year: q.year, type: q.type ?? "mcq", question: q.prompt, choices: q.choices, answer: q.correctAnswer, explanation: full ? q.explanation : "", teacher: q.teacherName })),
    });
  } catch (error) { return apiError(error); }
}

type Defaults = { subject: string; grade: string; unit: string; year: string };

/** Validates one incoming question; returns an error message or the document to insert. */
function toQuestion(input: Record<string, unknown>, defaults: Defaults, teacher: { id: string; name: string }): Omit<DbQuestion, "_id"> | string {
  const type = input.type === "truefalse" ? "truefalse" : "mcq";
  const choices = type === "truefalse" ? ["True", "False"] : Array.isArray(input.choices) ? input.choices.map((item: unknown) => cleanString(item, 250)) : [];
  const correctAnswer = Number(input.correctAnswer);
  const now = new Date();
  const question: Omit<DbQuestion, "_id"> = {
    subject: cleanString(input.subject, 60) || defaults.subject, grade: cleanString(input.grade, 30) || defaults.grade,
    unit: cleanString(input.unit, 60) || defaults.unit, year: cleanString(input.year, 30) || defaults.year || "2016 E.C.",
    type, prompt: cleanString(input.question ?? input.prompt, 1000), choices, correctAnswer, explanation: cleanString(input.explanation, 1500),
    teacherName: teacher.name, createdBy: new ObjectId(teacher.id), published: input.published !== false, createdAt: now, updatedAt: now,
  };
  if (!question.subject || !question.grade) return "Choose a subject and grade";
  if (!question.prompt) return "Question text is missing";
  if (choices.length < 2 || choices.length > 8 || choices.some((c) => !c)) return "Each question needs 2–8 non-empty choices";
  if (!Number.isInteger(correctAnswer) || correctAnswer < 0 || correctAnswer >= choices.length) return type === "truefalse" ? "Choose True or False" : "Select the correct answer";
  return question;
}

/** Publishes one question, or a batch: { questions: [...], subject, grade, unit, year }. */
export async function POST(request: Request) {
  try {
    const auth = await requireUser(["admin", "super-admin"]);
    if (auth.error) return auth.error;
    const body = await readJson(request);
    const defaults: Defaults = { subject: auth.user.role === "admin" ? auth.user.subject ?? "" : cleanString(body.subject, 60), grade: cleanString(body.grade, 30), unit: cleanString(body.unit, 60), year: cleanString(body.year, 30) };
    const items = Array.isArray(body.questions) ? (body.questions as Record<string, unknown>[]) : [body];
    if (!items.length || items.length > 300) return Response.json({ error: "Send between 1 and 300 questions" }, { status: 400 });
    const docs: Omit<DbQuestion, "_id">[] = [];
    for (const [index, item] of items.entries()) {
      const result = toQuestion(item && typeof item === "object" ? item : {}, defaults, auth.user);
      if (typeof result === "string") return Response.json({ error: items.length > 1 ? `Question ${index + 1}: ${result}` : result, index }, { status: 400 });
      // Teachers can only publish in their own subject; anyone else must pick an existing subject.
      if (auth.user.role !== "admin" && !(await findSubject(result.subject, { includeHidden: true }))) {
        return Response.json({ error: `Unknown subject "${result.subject}"` }, { status: 400 });
      }
      if (auth.user.role === "admin") {
        if (!auth.user.subject) return Response.json({ error: "Your account has no subject yet. Ask the platform administrator to assign one." }, { status: 409 });
        result.subject = auth.user.subject;
      }
      docs.push(result);
    }
    const result = await (await getDb()).collection<DbQuestion>("questions").insertMany(docs);
    return Response.json({ inserted: result.insertedCount, id: result.insertedIds[0]?.toString() }, { status: 201 });
  } catch (error) { return apiError(error); }
}

/** Hide/publish a question. Teachers: their own questions only; super admin: any. */
export async function PATCH(request: Request) {
  try {
    const auth = await requireUser(["admin", "super-admin"]); if (auth.error) return auth.error;
    const body = await readJson(request);
    const id = cleanString(body.id, 40);
    if (!ObjectId.isValid(id) || typeof body.published !== "boolean") return Response.json({ error: "Invalid update" }, { status: 400 });
    const filter = { _id: new ObjectId(id), ...(auth.user.role === "admin" ? { createdBy: new ObjectId(auth.user.id) } : {}) };
    const result = await (await getDb()).collection("questions").updateOne(filter, { $set: { published: body.published, updatedAt: new Date() } });
    if (!result.matchedCount) return Response.json({ error: "You can only change your own questions" }, { status: 403 });
    return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}

/** Delete a question (and its practice answers). Teachers: their own only; super admin: any. */
export async function DELETE(request: Request) {
  try {
    const auth = await requireUser(["admin", "super-admin"]); if (auth.error) return auth.error;
    const id = new URL(request.url).searchParams.get("id") ?? "";
    if (!ObjectId.isValid(id)) return Response.json({ error: "Question not found" }, { status: 404 });
    const db = await getDb();
    const filter = { _id: new ObjectId(id), ...(auth.user.role === "admin" ? { createdBy: new ObjectId(auth.user.id) } : {}) };
    const result = await db.collection("questions").deleteOne(filter);
    if (!result.deletedCount) return Response.json({ error: "You can only delete your own questions" }, { status: 403 });
    await db.collection("attempts").deleteMany({ questionId: new ObjectId(id) });
    return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}
