import { ObjectId } from "mongodb";
import { apiError, cleanString, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { directKey, ensureChat, unreadCounts, type DbChat } from "@/lib/chat";
import { getDb } from "@/lib/db";
import type { DbUser } from "@/lib/types";

/** My direct chats and all study rooms, newest activity first, with unread counts. */
export async function GET() {
  try {
    const auth = await requireUser(["student", "admin"]); if (auth.error) return auth.error;
    await ensureChat();
    const db = await getDb();
    const me = new ObjectId(auth.user.id);
    const chats = await db.collection<DbChat>("chats").find({ $or: [{ kind: "room", hidden: { $ne: true } }, { participants: me }] }).sort({ lastMessageAt: -1 }).limit(300).toArray();
    // Profiles of the people on the other side of direct chats.
    const otherIds = chats.flatMap((c) => (c.kind === "direct" ? c.participants!.filter((p) => !p.equals(me)) : []));
    const people = await db.collection<DbUser>("users").find({ _id: { $in: otherIds } }, { projection: { name: 1, role: 1, subject: 1, status: 1 } }).toArray();
    const byId = new Map(people.map((p) => [p._id!.toString(), p]));
    const unread = await unreadCounts(auth.user.id, chats);

    return Response.json({
      me: { id: auth.user.id, role: auth.user.role, name: auth.user.name },
      chats: chats.map((c) => {
        const other = c.kind === "direct" ? byId.get(c.participants!.find((p) => !p.equals(me))!.toString()) : undefined;
        return {
          id: c._id!.toString(),
          kind: c.kind,
          title: c.kind === "room" ? c.name : other?.name ?? "Former member",
          subtitle: c.kind === "room" ? c.description : other ? (other.role === "admin" ? `${other.subject ?? "Subject"} teacher` : "Student") : "",
          subject: c.subject ?? other?.subject ?? null,
          other: other ? { id: other._id!.toString(), name: other.name, role: other.role, active: other.status === "active" } : null,
          lastMessage: c.lastMessage,
          lastSenderName: c.lastSenderName,
          lastMessageAt: c.lastMessageAt.getTime() ? c.lastMessageAt : null,
          unread: unread.get(c._id!.toString()) ?? 0,
        };
      }),
    });
  } catch (error) { return apiError(error); }
}

/** Opens (or reuses) a private chat with another approved student or teacher. */
export async function POST(request: Request) {
  try {
    const auth = await requireUser(["student", "admin"]); if (auth.error) return auth.error;
    await ensureChat();
    const body = await readJson(request);
    const userId = cleanString(body.userId, 40);
    if (!ObjectId.isValid(userId) || userId === auth.user.id) return Response.json({ error: "Choose someone to message" }, { status: 400 });
    const db = await getDb();
    const other = await db.collection<DbUser>("users").findOne({ _id: new ObjectId(userId), status: "active", role: { $in: ["student", "admin"] } });
    if (!other) return Response.json({ error: "That person is not available for chat" }, { status: 404 });
    const now = new Date();
    const chat = await db.collection<DbChat>("chats").findOneAndUpdate(
      { key: directKey(auth.user.id, userId) },
      { $setOnInsert: { kind: "direct", participants: [new ObjectId(auth.user.id), other._id!], lastMessage: "", lastMessageAt: new Date(0), lastSenderName: "", createdAt: now } },
      { upsert: true, returnDocument: "after" },
    );
    return Response.json({ id: chat!._id!.toString() }, { status: 201 });
  } catch (error) { return apiError(error); }
}
