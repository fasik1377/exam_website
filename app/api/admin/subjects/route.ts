import { ObjectId } from "mongodb";
import { apiError, cleanString, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { syncRooms } from "@/lib/chat";
import { getDb } from "@/lib/db";
import { getSubjects, invalidateSubjects, type DbSubject } from "@/lib/subjectStore";
import { GRADES, needsStream, type Stream } from "@/lib/subjects";

/** Validates the editable fields of a subject. */
function parse(body: Record<string, unknown>, partial: boolean) {
  const out: Partial<Pick<DbSubject, "name" | "amharic" | "streams" | "grades" | "calculator" | "minutes" | "hidden">> = {};
  if (!partial || body.name !== undefined) {
    const name = cleanString(body.name, 60).replace(/\s+/g, " ");
    if (name.length < 2) return "Enter a subject name (at least 2 characters)";
    out.name = name;
  }
  if (!partial || body.amharic !== undefined) out.amharic = cleanString(body.amharic, 60);
  if (!partial || body.grades !== undefined) {
    const grades = GRADES.filter((g) => Array.isArray(body.grades) && body.grades.includes(g));
    if (!grades.length) return "Choose at least one grade";
    out.grades = grades;
  }
  if (!partial || body.streams !== undefined) {
    const streams = (Array.isArray(body.streams) ? body.streams : []).filter((s): s is Stream => s === "natural" || s === "social");
    // Streams only apply in Grades 11–12; a Grade 9–10 subject is simply open to everyone.
    if (!streams.length && (!out.grades || out.grades.some(needsStream))) return "Choose at least one stream (Natural, Social, or both)";
    out.streams = streams.length ? [...new Set(streams)] : ["natural", "social"];
  }
  if (!partial || body.minutes !== undefined) {
    const minutes = Number(body.minutes ?? 1);
    if (!Number.isFinite(minutes) || minutes < 0.5 || minutes > 10) return "Time per question must be between 0.5 and 10 minutes";
    out.minutes = Math.round(minutes * 2) / 2;
  }
  if (body.hidden !== undefined) out.hidden = body.hidden === true;
  if (body.calculator !== undefined) out.calculator = body.calculator === true;
  return out;
}

const usage = async (name: string) => {
  const db = await getDb();
  const [questions, teachers] = await Promise.all([
    db.collection("questions").countDocuments({ subject: name }),
    db.collection("users").countDocuments({ role: "admin", subject: name }),
  ]);
  return { questions, teachers };
};

/** All subjects (including hidden) with how many questions and teachers use each. */
export async function GET() {
  try {
    const auth = await requireUser(["super-admin"]); if (auth.error) return auth.error;
    invalidateSubjects();
    const subjects = await getSubjects({ includeHidden: true });
    const counts = await Promise.all(subjects.map((s) => usage(s.name)));
    return Response.json({ subjects: subjects.map((s, i) => ({ ...s, ...counts[i] })) });
  } catch (error) { return apiError(error); }
}

/** Add a subject. */
export async function POST(request: Request) {
  try {
    const auth = await requireUser(["super-admin"]); if (auth.error) return auth.error;
    const fields = parse(await readJson(request), false);
    if (typeof fields === "string") return Response.json({ error: fields }, { status: 400 });
    const db = await getDb();
    await getSubjects(); // makes sure the collection is seeded first
    const last = await db.collection<DbSubject>("subjects").find().sort({ order: -1 }).limit(1).next();
    const now = new Date();
    try {
      await db.collection<DbSubject>("subjects").insertOne({ name: fields.name!, amharic: fields.amharic ?? "", streams: fields.streams!, grades: fields.grades!, calculator: fields.calculator ?? false, minutes: fields.minutes ?? 1, hidden: false, order: (last?.order ?? 0) + 1, createdAt: now, updatedAt: now });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) return Response.json({ error: "A subject with this name already exists" }, { status: 409 });
      throw error;
    }
    invalidateSubjects();
    await syncRooms();
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) { return apiError(error); }
}

/** Update a subject. Renaming carries the new name over to its questions, teachers and chat room. */
export async function PATCH(request: Request) {
  try {
    const auth = await requireUser(["super-admin"]); if (auth.error) return auth.error;
    const body = await readJson(request);
    const id = cleanString(body.id, 40);
    if (!ObjectId.isValid(id)) return Response.json({ error: "Subject not found" }, { status: 404 });
    const fields = parse(body, true);
    if (typeof fields === "string") return Response.json({ error: fields }, { status: 400 });
    const db = await getDb();
    const current = await db.collection<DbSubject>("subjects").findOne({ _id: new ObjectId(id) });
    if (!current) return Response.json({ error: "Subject not found" }, { status: 404 });
    try {
      await db.collection<DbSubject>("subjects").updateOne({ _id: current._id }, { $set: { ...fields, updatedAt: new Date() } });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) return Response.json({ error: "A subject with this name already exists" }, { status: 409 });
      throw error;
    }
    if (fields.name && fields.name !== current.name) {
      await Promise.all([
        db.collection("questions").updateMany({ subject: current.name }, { $set: { subject: fields.name } }),
        db.collection("users").updateMany({ role: "admin", subject: current.name }, { $set: { subject: fields.name } }),
        db.collection("chats").updateMany({ kind: "room", subject: current.name }, { $set: { subject: fields.name } }),
      ]);
    }
    invalidateSubjects();
    await syncRooms();
    return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}

/** Delete a subject — only when no questions or teachers use it (hide it otherwise). */
export async function DELETE(request: Request) {
  try {
    const auth = await requireUser(["super-admin"]); if (auth.error) return auth.error;
    const id = new URL(request.url).searchParams.get("id") ?? "";
    if (!ObjectId.isValid(id)) return Response.json({ error: "Subject not found" }, { status: 404 });
    const db = await getDb();
    const subject = await db.collection<DbSubject>("subjects").findOne({ _id: new ObjectId(id) });
    if (!subject) return Response.json({ error: "Subject not found" }, { status: 404 });
    const used = await usage(subject.name);
    if (used.questions || used.teachers) {
      return Response.json({
        error: `${subject.name} still has ${used.questions} question${used.questions === 1 ? "" : "s"} and ${used.teachers} teacher${used.teachers === 1 ? "" : "s"}. Hide it instead, or move them first.`,
        ...used,
      }, { status: 409 });
    }
    const rooms = await db.collection("chats").find({ kind: "room", subject: subject.name }, { projection: { _id: 1 } }).toArray();
    await db.collection("chat_messages").deleteMany({ chatId: { $in: rooms.map((r) => r._id) } });
    await db.collection("chat_reads").deleteMany({ chatId: { $in: rooms.map((r) => r._id) } });
    await db.collection("chats").deleteMany({ _id: { $in: rooms.map((r) => r._id) } });
    await db.collection("subjects").deleteOne({ _id: subject._id });
    invalidateSubjects();
    return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}
