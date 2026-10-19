import { ObjectId } from "mongodb";
import { apiError, cleanString, readJson } from "@/lib/api";
import { hashPassword, requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const auth = await requireUser(["super-admin"]); if (auth.error) return auth.error;
    const users = await (await getDb()).collection("users").find({}, { projection: { passwordHash: 0 } }).sort({ createdAt: -1 }).limit(200).toArray();
    return Response.json({ me: auth.user.id, users: users.map((u) => ({ id: u._id.toString(), name: u.name, email: u.email, role: u.role, plan: u.plan, status: u.status })) });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireUser(["super-admin"]); if (auth.error) return auth.error;
    const body = await readJson(request);
    const id = cleanString(body.id, 40);
    const status = cleanString(body.status, 20);
    if (!ObjectId.isValid(id) || !["active", "restricted", "banned"].includes(status)) return Response.json({ error: "Invalid account update" }, { status: 400 });
    if (id === auth.user.id) return Response.json({ error: "You cannot restrict your own account" }, { status: 400 });
    const db = await getDb();
    const userId = new ObjectId(id);
    await db.collection("users").updateOne({ _id: userId }, { $set: { status, updatedAt: new Date() } });
    if (status !== "active") await db.collection("sessions").deleteMany({ userId });
    return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const auth = await requireUser(["super-admin"]); if (auth.error) return auth.error;
    const body = await readJson(request);
    const name = cleanString(body.name, 80), email = cleanString(body.email, 160).toLowerCase(), password = typeof body.password === "string" ? body.password : "";
    const role = body.role === "super-admin" ? "super-admin" : "admin";
    if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) return Response.json({ error: "Enter a valid name, email, and password of at least 8 characters" }, { status: 400 });
    const db = await getDb(); if (await db.collection("users").findOne({ email })) return Response.json({ error: "An account with this email already exists" }, { status: 409 });
    const now = new Date(); await db.collection("users").insertOne({ name, email, passwordHash: await hashPassword(password), role, status: "active", plan: "teacher", createdAt: now, updatedAt: now });
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) { return apiError(error); }
}
