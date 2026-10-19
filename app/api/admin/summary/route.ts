import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { apiError } from "@/lib/api";

export async function GET() {
  try {
    const auth = await requireUser(["admin", "super-admin"]);
    if (auth.error) return auth.error;
    const db = await getDb();
    const [questions, students, attempts, recent] = await Promise.all([db.collection("questions").countDocuments(), db.collection("users").countDocuments({ role: "student" }), db.collection("attempts").countDocuments(), db.collection("questions").find().sort({ createdAt: -1 }).limit(8).toArray()]);
    return Response.json({ questions, students, attempts, recent: recent.map((q) => ({ id: q._id.toString(), question: q.prompt, subject: q.subject, grade: q.grade, unit: q.unit })) });
  } catch (error) { return apiError(error); }
}
