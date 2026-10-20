import { ObjectId } from "mongodb";
import { apiError, cleanString, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { findChat, markRead, type DbChat, type DbChatMessage } from "@/lib/chat";
import { getDb } from "@/lib/db";

type Context = { params: Promise<{ id: string }> };

const view = (m: DbChatMessage, me: string) => ({
  id: m._id!.toString(), mine: m.senderId.toString() === me, senderId: m.senderId.toString(), senderName: m.senderName,
  senderRole: m.senderRole, body: m.deletedAt ? "" : m.body, deleted: Boolean(m.deletedAt), createdAt: m.createdAt,
});

/** Messages in a chat (the latest 100, or only those after `after`); marks the chat read. */
export async function GET(request: Request, { params }: Context) {
  try {
    const auth = await requireUser(["student", "admin"]); if (auth.error) return auth.error;
    const chat = await findChat((await params).id, auth.user);
    if (!chat) return Response.json({ error: "Chat not found" }, { status: 404 });
    const after = new Date(new URL(request.url).searchParams.get("after") || 0);
    const db = await getDb();
    const messages = await db.collection<DbChatMessage>("chat_messages")
      .find({ chatId: chat._id!, ...(after.getTime() ? { $or: [{ createdAt: { $gt: after } }, { deletedAt: { $gt: after } }] } : {}) })
      .sort({ createdAt: -1 }).limit(100).toArray();
    await markRead(chat._id!, auth.user.id);
    return Response.json({ messages: messages.reverse().map((m) => view(m, auth.user.id)), serverTime: new Date() });
  } catch (error) { return apiError(error); }
}

/** Sends a message (max 20 per minute per person). */
export async function POST(request: Request, { params }: Context) {
  try {
    const auth = await requireUser(["student", "admin"]); if (auth.error) return auth.error;
    const chat = await findChat((await params).id, auth.user);
    if (!chat) return Response.json({ error: "Chat not found" }, { status: 404 });
    const body = cleanString((await readJson(request)).body, 2000);
    if (!body) return Response.json({ error: "Write a message first" }, { status: 400 });
    const db = await getDb();
    const me = new ObjectId(auth.user.id);
    const recent = await db.collection("chat_messages").countDocuments({ senderId: me, createdAt: { $gt: new Date(Date.now() - 60000) } });
    if (recent >= 20) return Response.json({ error: "You're sending messages too quickly. Wait a moment." }, { status: 429 });
    const now = new Date();
    const message: DbChatMessage = { chatId: chat._id!, senderId: me, senderName: auth.user.name, senderRole: auth.user.role, body, createdAt: now, deletedAt: null };
    const result = await db.collection<DbChatMessage>("chat_messages").insertOne(message);
    await db.collection<DbChat>("chats").updateOne({ _id: chat._id }, { $set: { lastMessage: body.slice(0, 140), lastMessageAt: now, lastSenderName: auth.user.name } });
    await markRead(chat._id!, auth.user.id);
    return Response.json({ message: view({ ...message, _id: result.insertedId }, auth.user.id) }, { status: 201 });
  } catch (error) { return apiError(error); }
}

/** Deletes a message: your own, or (as a teacher) any message in a study room. */
export async function DELETE(request: Request, { params }: Context) {
  try {
    const auth = await requireUser(["student", "admin"]); if (auth.error) return auth.error;
    const chat = await findChat((await params).id, auth.user);
    if (!chat) return Response.json({ error: "Chat not found" }, { status: 404 });
    const messageId = new URL(request.url).searchParams.get("messageId") ?? "";
    if (!ObjectId.isValid(messageId)) return Response.json({ error: "Message not found" }, { status: 404 });
    const db = await getDb();
    const message = await db.collection<DbChatMessage>("chat_messages").findOne({ _id: new ObjectId(messageId), chatId: chat._id! });
    if (!message) return Response.json({ error: "Message not found" }, { status: 404 });
    const own = message.senderId.toString() === auth.user.id;
    const moderator = chat.kind === "room" && auth.user.role === "admin";
    if (!own && !moderator) return Response.json({ error: "You can only delete your own messages" }, { status: 403 });
    await db.collection("chat_messages").updateOne({ _id: message._id }, { $set: { deletedAt: new Date() } });
    return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}
