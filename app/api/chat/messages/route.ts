import { ObjectId } from "mongodb";
import { apiError, cleanString, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { chatSide, findConversation, type DbConversation, type DbMessage } from "@/lib/chat";
import { getDb } from "@/lib/db";

/** Messages in a conversation (optionally only those after `after`), and marks them read for me. */
export async function GET(request: Request) {
  try {
    const auth = await requireUser(["student", "admin"]); if (auth.error) return auth.error;
    const url = new URL(request.url);
    const conversation = await findConversation(url.searchParams.get("conversationId"), auth.user);
    if (!conversation) return Response.json({ error: "Conversation not found" }, { status: 404 });
    const after = new Date(url.searchParams.get("after") || 0);
    const db = await getDb();
    const messages = await db.collection<DbMessage>("messages")
      .find({ conversationId: conversation._id!, ...(after.getTime() ? { createdAt: { $gt: after } } : {}) })
      .sort({ createdAt: -1 }).limit(200).toArray();
    const side = chatSide(auth.user)!;
    const unreadField = side === "student" ? "unreadStudent" : "unreadTeacher";
    if (conversation[unreadField]) await db.collection<DbConversation>("conversations").updateOne({ _id: conversation._id }, { $set: { [unreadField]: 0 } });
    return Response.json({
      messages: messages.reverse().map((m) => ({ id: m._id!.toString(), mine: m.senderId.toString() === auth.user.id, body: m.body, createdAt: m.createdAt })),
    });
  } catch (error) { return apiError(error); }
}

/** Sends a message. */
export async function POST(request: Request) {
  try {
    const auth = await requireUser(["student", "admin"]); if (auth.error) return auth.error;
    const body = await readJson(request);
    const conversation = await findConversation(body.conversationId, auth.user);
    if (!conversation) return Response.json({ error: "Conversation not found" }, { status: 404 });
    const text = cleanString(body.body, 2000);
    if (!text) return Response.json({ error: "Write a message first" }, { status: 400 });
    const db = await getDb();
    const now = new Date();
    const message: DbMessage = { conversationId: conversation._id!, senderId: new ObjectId(auth.user.id), body: text, createdAt: now };
    const result = await db.collection<DbMessage>("messages").insertOne(message);
    const otherUnread = chatSide(auth.user) === "student" ? "unreadTeacher" : "unreadStudent";
    await db.collection<DbConversation>("conversations").updateOne(
      { _id: conversation._id },
      { $set: { lastMessage: text.slice(0, 140), lastMessageAt: now }, $inc: { [otherUnread]: 1 } },
    );
    return Response.json({ message: { id: result.insertedId.toString(), mine: true, body: text, createdAt: now } }, { status: 201 });
  } catch (error) { return apiError(error); }
}
