import { ObjectId } from "mongodb";
import { apiError, cleanString, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { chatSide, publicConversation, type DbConversation } from "@/lib/chat";
import { getDb } from "@/lib/db";
import type { DbUser } from "@/lib/types";

/** My conversations, newest first. Students also get the list of teachers they can message. */
export async function GET() {
  try {
    const auth = await requireUser(["student", "admin"]); if (auth.error) return auth.error;
    const side = chatSide(auth.user)!;
    const db = await getDb();
    const mine = await db.collection<DbConversation>("conversations")
      .find({ [side === "student" ? "studentId" : "teacherId"]: new ObjectId(auth.user.id) })
      .sort({ lastMessageAt: -1 }).limit(200).toArray();
    const teachers = side === "student"
      ? (await db.collection<DbUser>("users").find({ role: "admin", status: "active" }, { projection: { name: 1, subject: 1 } }).sort({ subject: 1, name: 1 }).toArray())
        .map((t) => ({ id: t._id.toString(), name: t.name, subject: t.subject || "General" }))
      : [];
    return Response.json({ side, conversations: mine.map((c) => publicConversation(c, side)), teachers });
  } catch (error) { return apiError(error); }
}

/** A student opens (or reuses) a conversation with a teacher. */
export async function POST(request: Request) {
  try {
    const auth = await requireUser(["student"]); if (auth.error) return auth.error;
    const body = await readJson(request);
    const teacherId = cleanString(body.teacherId, 40);
    if (!ObjectId.isValid(teacherId)) return Response.json({ error: "Choose a teacher" }, { status: 400 });
    const db = await getDb();
    const teacher = await db.collection<DbUser>("users").findOne({ _id: new ObjectId(teacherId), role: "admin", status: "active" });
    if (!teacher) return Response.json({ error: "That teacher is not available" }, { status: 404 });
    const now = new Date();
    const conversation = await db.collection<DbConversation>("conversations").findOneAndUpdate(
      { studentId: new ObjectId(auth.user.id), teacherId: teacher._id },
      {
        $setOnInsert: { studentName: auth.user.name, teacherName: teacher.name, subject: teacher.subject || "General", lastMessage: "", lastMessageAt: now, unreadStudent: 0, unreadTeacher: 0, createdAt: now },
      },
      { upsert: true, returnDocument: "after" },
    );
    return Response.json({ conversation: publicConversation(conversation!, "student") }, { status: 201 });
  } catch (error) { return apiError(error); }
}
