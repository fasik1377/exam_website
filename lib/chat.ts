import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { getSubjects } from "@/lib/subjectStore";
import type { PublicUser } from "@/lib/types";

/**
 * Chat model
 * - "direct": a private conversation between two approved users (student↔teacher or student↔student).
 * - "room": an open study room per subject (plus a general lounge) for every student and teacher.
 * Unread counts come from per-user read markers in `chat_reads`.
 */
export type DbChat = {
  _id?: ObjectId;
  kind: "direct" | "room";
  key: string; // direct: "dm:<idA>:<idB>" (sorted); room: "room:<slug>"
  participants?: ObjectId[];
  name?: string;
  subject?: string | null;
  description?: string;
  hidden?: boolean;
  lastMessage: string;
  lastMessageAt: Date;
  lastSenderName: string;
  createdAt: Date;
};

export type DbChatMessage = {
  _id?: ObjectId;
  chatId: ObjectId;
  senderId: ObjectId;
  senderName: string;
  senderRole: string;
  body: string;
  createdAt: Date;
  deletedAt?: Date | null;
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * One study room per subject (plus the general lounge), kept in step with the subject list:
 * new subjects get a room, renamed subjects rename theirs, hidden subjects hide theirs.
 */
export async function syncRooms() {
  const db = await getDb();
  const subjects = await getSubjects({ includeHidden: true });
  const now = new Date();
  const insertDefaults = { kind: "room" as const, lastMessage: "", lastMessageAt: new Date(0), lastSenderName: "", createdAt: now };
  await db.collection<DbChat>("chats").bulkWrite([
    { updateOne: { filter: { key: "room:general" }, update: { $set: { name: "General lounge", subject: null, description: "Say hello, share study tips and exam news", hidden: false }, $setOnInsert: insertDefaults }, upsert: true } },
    ...subjects.map((s) => ({
      updateOne: {
        filter: { kind: "room" as const, subject: s.name },
        update: { $set: { name: `${s.name} room`, description: `Questions and discussion about ${s.name}`, hidden: Boolean(s.hidden) }, $setOnInsert: { ...insertDefaults, key: `room:${slug(s.name)}-${s.id}` } },
        upsert: true,
      },
    })),
  ]);
  // Rooms whose subject no longer exists disappear from the list.
  await db.collection("chats").updateMany({ kind: "room", subject: { $nin: [null, ...subjects.map((s) => s.name)] } }, { $set: { hidden: true } });
}

/** Only approved students and teachers chat; the platform admin oversees but does not take part. */
export const canChat = (user: PublicUser) => user.role === "student" || user.role === "admin";

export const directKey = (a: string, b: string) => `dm:${[a, b].sort().join(":")}`;

const globalChat = globalThis as typeof globalThis & { chatSetup?: Promise<void> };

/** Creates indexes and the study rooms once per server process. */
export function ensureChat() {
  if (!globalChat.chatSetup) {
    globalChat.chatSetup = (async () => {
      const db = await getDb();
      await Promise.all([
        db.collection("chats").createIndex({ key: 1 }, { unique: true }),
        db.collection("chats").createIndex({ participants: 1, lastMessageAt: -1 }),
        db.collection("chat_messages").createIndex({ chatId: 1, createdAt: -1 }),
        db.collection("chat_messages").createIndex({ senderId: 1, createdAt: -1 }),
        db.collection("chat_reads").createIndex({ chatId: 1, userId: 1 }, { unique: true }),
      ]);
      await syncRooms();
    })().catch((error) => { globalChat.chatSetup = undefined; throw error; });
  }
  return globalChat.chatSetup;
}

/** Loads a chat only if the user may see it. */
export async function findChat(id: unknown, user: PublicUser) {
  if (!canChat(user) || typeof id !== "string" || !ObjectId.isValid(id)) return null;
  const db = await getDb();
  const chat = await db.collection<DbChat>("chats").findOne({ _id: new ObjectId(id) });
  if (!chat) return null;
  if (chat.kind === "direct" && !chat.participants?.some((p) => p.toString() === user.id)) return null;
  if (chat.kind === "room" && chat.hidden) return null;
  return chat;
}

/** Unread messages per chat for one user (rooms never opened count only the last 3 days). */
export async function unreadCounts(userId: string, chats: DbChat[]) {
  const db = await getDb();
  const me = new ObjectId(userId);
  const reads = await db.collection("chat_reads").find({ userId: me, chatId: { $in: chats.map((c) => c._id!) } }).toArray();
  const readAt = new Map(reads.map((r) => [r.chatId.toString(), r.lastReadAt as Date]));
  const recent = new Date(Date.now() - 3 * 86400000);
  const counts = await Promise.all(chats.map((chat) => {
    const since = readAt.get(chat._id!.toString()) ?? (chat.kind === "room" ? recent : new Date(0));
    if (chat.lastMessageAt <= since) return 0;
    return db.collection("chat_messages").countDocuments({ chatId: chat._id, createdAt: { $gt: since }, senderId: { $ne: me }, deletedAt: null }, { limit: 99 });
  }));
  return new Map(chats.map((c, i) => [c._id!.toString(), counts[i]]));
}

/** Total unread across a user's direct chats and rooms (for badges). */
export async function totalUnread(user: PublicUser) {
  if (!canChat(user)) return 0;
  await ensureChat();
  const db = await getDb();
  const chats = await db.collection<DbChat>("chats").find({ $or: [{ kind: "room", hidden: { $ne: true } }, { participants: new ObjectId(user.id) }] }).toArray();
  const counts = await unreadCounts(user.id, chats);
  return [...counts.values()].reduce((a, b) => a + b, 0);
}

export async function markRead(chatId: ObjectId, userId: string) {
  const db = await getDb();
  await db.collection("chat_reads").updateOne({ chatId, userId: new ObjectId(userId) }, { $set: { lastReadAt: new Date() } }, { upsert: true });
}
