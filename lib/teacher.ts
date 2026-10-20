import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { SUBJECTS, subjectsForStudent } from "@/lib/subjects";
import type { DbUser, PublicUser } from "@/lib/types";

/**
 * The subject a teacher may monitor. Teachers are locked to the subject on their account
 * (any ?subject= they send is ignored); the super admin may choose any subject.
 */
export function monitoredSubject(user: PublicUser, requested: string | null): { subject: string } | { error: Response } {
  if (user.role === "admin") {
    if (!user.subject) return { error: Response.json({ error: "Your account has no subject yet. Ask the platform administrator to assign one." }, { status: 409 }) };
    return { subject: user.subject };
  }
  const subject = SUBJECTS.find((s) => s.name === requested)?.name ?? SUBJECTS[0].name;
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
  const students = await db.collection<DbUser>("users").find(
    { role: "student", $or: [{ status: "active" }, { _id: { $in: answeredIds } }] },
    { projection: { name: 1, email: 1, grade: 1, stream: 1, status: 1, createdAt: 1 } },
  ).toArray();
  return students.filter((s) => answeredIds.some((id) => id.equals(s._id!)) || !s.grade || subjectsForStudent(s.grade, s.stream).some((x) => x.name === subject));
}
