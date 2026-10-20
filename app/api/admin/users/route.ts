import { ObjectId } from "mongodb";
import { after } from "next/server";
import { notifyDecision } from "@/lib/mail";
import { apiError, cleanString, readJson } from "@/lib/api";
import { hashPassword, requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { SUBJECTS } from "@/lib/subjects";
import type { UserStatus } from "@/lib/types";

const validSubject = (value: unknown) => SUBJECTS.some((s) => s.name === value);

const SETTABLE: UserStatus[] = ["active", "restricted", "banned", "rejected"];

export async function GET() {
  try {
    const auth = await requireUser(["super-admin"]); if (auth.error) return auth.error;
    const users = await (await getDb()).collection("users").find({}, { projection: { passwordHash: 0 } }).sort({ createdAt: -1 }).limit(500).toArray();
    return Response.json({
      me: auth.user.id,
      users: users.map((u) => ({ id: u._id.toString(), name: u.name, email: u.email, role: u.role, plan: u.plan, status: u.status, subject: u.subject ?? null, createdAt: u.createdAt })),
    });
  } catch (error) { return apiError(error); }
}

/** Change account status. Approving a pending account = setting it to "active". Accepts one `id` or a list of `ids`. */
export async function PATCH(request: Request) {
  try {
    const auth = await requireUser(["super-admin"]); if (auth.error) return auth.error;
    const body = await readJson(request);
    // Assigning a teacher's subject is a separate, single-account update.
    if (body.subject !== undefined) {
      const id = cleanString(body.id, 40);
      if (!ObjectId.isValid(id) || !validSubject(body.subject)) return Response.json({ error: "Choose a valid subject" }, { status: 400 });
      const db = await getDb();
      const result = await db.collection("users").updateOne({ _id: new ObjectId(id), role: "admin" }, { $set: { subject: body.subject, updatedAt: new Date() } });
      if (!result.matchedCount) return Response.json({ error: "Teacher not found" }, { status: 404 });
      await db.collection("conversations").updateMany({ teacherId: new ObjectId(id) }, { $set: { subject: body.subject } });
      return Response.json({ ok: true });
    }
    const status = cleanString(body.status, 20) as UserStatus;
    const rawIds = Array.isArray(body.ids) ? body.ids : [body.id];
    const ids = rawIds.map((id) => cleanString(id, 40)).filter((id) => ObjectId.isValid(id));
    if (!ids.length || ids.length > 200 || !SETTABLE.includes(status)) return Response.json({ error: "Invalid account update" }, { status: 400 });
    if (ids.includes(auth.user.id)) return Response.json({ error: "You cannot change your own account status" }, { status: 400 });
    const db = await getDb();
    const objectIds = ids.map((id) => new ObjectId(id));
    // Applicants whose pending registration is being decided get an email about the outcome.
    const decided = status === "active" || status === "rejected"
      ? await db.collection("users").find({ _id: { $in: objectIds }, status: "pending" }, { projection: { name: 1, email: 1 } }).toArray()
      : [];
    const result = await db.collection("users").updateMany(
      { _id: { $in: objectIds } },
      { $set: { status, updatedAt: new Date(), reviewedAt: new Date(), reviewedBy: new ObjectId(auth.user.id) } },
    );
    if (status !== "active") await db.collection("sessions").deleteMany({ userId: { $in: objectIds } });
    if (decided.length) after(() => Promise.all(decided.map((u) => notifyDecision({ name: u.name, email: u.email }, status === "active"))));
    return Response.json({ ok: true, updated: result.modifiedCount });
  } catch (error) { return apiError(error); }
}

/** Super admins create staff accounts directly; these are active immediately. */
export async function POST(request: Request) {
  try {
    const auth = await requireUser(["super-admin"]); if (auth.error) return auth.error;
    const body = await readJson(request);
    const name = cleanString(body.name, 80), email = cleanString(body.email, 160).toLowerCase(), password = typeof body.password === "string" ? body.password : "";
    const role = body.role === "super-admin" ? "super-admin" : "admin";
    if (role === "admin" && !validSubject(body.subject)) return Response.json({ error: "Choose the teacher's subject" }, { status: 400 });
    if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) return Response.json({ error: "Enter a valid name, email, and password of at least 8 characters" }, { status: 400 });
    const db = await getDb(); if (await db.collection("users").findOne({ email })) return Response.json({ error: "An account with this email already exists" }, { status: 409 });
    const now = new Date(); await db.collection("users").insertOne({ name, email, passwordHash: await hashPassword(password), role, status: "active", plan: "teacher", ...(role === "admin" ? { subject: body.subject } : {}), createdAt: now, updatedAt: now, reviewedAt: now, reviewedBy: new ObjectId(auth.user.id) });
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) { return apiError(error); }
}
