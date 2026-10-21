import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { subjectsForStudent } from "@/lib/subjects";
import { getSubjects } from "@/lib/subjectStore";
import type { DbUser, PublicUser } from "@/lib/types";

/**
 * The subject a teacher may monitor. Teachers are locked to the subject on their account
 * (any ?subject= they send is ignored); the super admin may choose any subject.
 */
export async function monitoredSubject(user: PublicUser, requested: string | null): Promise<{ subject: string } | { error: Response }> {
  if (user.role === "admin") {
    if (!user.subject) return { error: Response.json({ error: "Your account has no subject yet. Ask the platform administrator to assign one." }, { status: 409 }) };
    return { subject: user.subject };
  }
  const all = await getSubjects({ includeHidden: true });
  const subject = all.find((s) => s.name === requested)?.name ?? all[0]?.name ?? "Mathematics";
  return { subject };
}

/** Ids of the published-or-not questions in a subject (results are always scoped through these). */
export async function subjectQuestionIds(subject: string) {
  const db = await getDb();
  return (await db.collection("questions").find({ subject }, { projection: { _id: 1 } }).toArray()).map((q) => q._id as ObjectId);
}

/** Active students who study this subject (by grade/stream), plus anyone who has answered its questions. */
export async function studentsForSubject(subject: string, answeredIds: ObjectId[]) {
  const db = await getDb();
  const subjects = await getSubjects({ includeHidden: true });
  const students = await db.collection<DbUser>("users").find(
    { role: "student", $or: [{ status: "active" }, { _id: { $in: answeredIds } }] },
    { projection: { name: 1, email: 1, grade: 1, stream: 1, status: 1, createdAt: 1 } },
  ).toArray();
  return students.filter((s) => answeredIds.some((id) => id.equals(s._id!)) || !s.grade || subjectsForStudent(s.grade, s.stream, subjects).some((x) => x.name === subject));
}
