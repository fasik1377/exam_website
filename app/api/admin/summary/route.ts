import { ObjectId } from "mongodb";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { totalUnread } from "@/lib/chat";
import { apiError } from "@/lib/api";

export async function GET() {
  try {
    const auth = await requireUser(["admin", "super-admin"]);
    if (auth.error) return auth.error;
    const db = await getDb();
    const me = new ObjectId(auth.user.id);
    const [questions, mine, students, attempts, recent, unread] = await Promise.all([
      db.collection("questions").countDocuments(),
      db.collection("questions").countDocuments({ createdBy: me }),
      db.collection("users").countDocuments({ role: "student", status: "active" }),
      db.collection("attempts").countDocuments(),
      db.collection("questions").find().sort({ createdAt: -1 }).limit(8).toArray(),
      totalUnread(auth.user),
    ]);
    return Response.json({
      questions, myQuestions: mine, students, attempts, unreadMessages: unread,
      recent: recent.map((q) => ({ id: q._id.toString(), question: q.prompt, subject: q.subject, grade: q.grade, unit: q.unit })),
    });
  } catch (error) { return apiError(error); }
}
