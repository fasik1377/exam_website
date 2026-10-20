import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import type { PublicUser } from "@/lib/types";

export type DbConversation = {
  _id?: ObjectId;
  studentId: ObjectId;
  teacherId: ObjectId;
  studentName: string;
  teacherName: string;
  subject: string;
  lastMessage: string;
  lastMessageAt: Date;
  unreadStudent: number;
  unreadTeacher: number;
  createdAt: Date;
};

export type DbMessage = { _id?: ObjectId; conversationId: ObjectId; senderId: ObjectId; body: string; createdAt: Date };

/** The side of a conversation a user is on ("teacher" covers admins), or null if they may not chat. */
export const chatSide = (user: PublicUser) => (user.role === "student" ? "student" : user.role === "admin" ? "teacher" : null);

/** Loads a conversation only if the user takes part in it. */
export async function findConversation(id: unknown, user: PublicUser) {
  if (typeof id !== "string" || !ObjectId.isValid(id)) return null;
  const side = chatSide(user);
  if (!side) return null;
  const db = await getDb();
  return db.collection<DbConversation>("conversations").findOne({ _id: new ObjectId(id), [side === "student" ? "studentId" : "teacherId"]: new ObjectId(user.id) });
}

export function publicConversation(c: DbConversation, side: "student" | "teacher") {
  return {
    id: c._id!.toString(),
    with: side === "student" ? { id: c.teacherId.toString(), name: c.teacherName, role: "teacher" } : { id: c.studentId.toString(), name: c.studentName, role: "student" },
    subject: c.subject,
    lastMessage: c.lastMessage,
    lastMessageAt: c.lastMessageAt,
    unread: side === "student" ? c.unreadStudent : c.unreadTeacher,
  };
}
