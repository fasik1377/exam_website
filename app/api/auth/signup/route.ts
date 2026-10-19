import { ensureDatabase, createSession, hashPassword, roleHome, toPublicUser } from "@/lib/auth";
import { apiError, cleanString, readJson } from "@/lib/api";
import { getDb } from "@/lib/db";
import type { DbUser } from "@/lib/types";

export async function POST(request: Request) {
  try {
    await ensureDatabase();
    const body = await readJson(request);
    const name = cleanString(body.name, 80);
    const email = cleanString(body.email, 160).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";
    if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
      return Response.json({ error: "Enter a valid name, email, and password of at least 8 characters" }, { status: 400 });
    }
    const db = await getDb();
    if (await db.collection("users").findOne({ email })) return Response.json({ error: "An account with this email already exists" }, { status: 409 });
    const now = new Date();
    const result = await db.collection<DbUser>("users").insertOne({ name, email, passwordHash: await hashPassword(password), role: "student", status: "active", plan: "free", createdAt: now, updatedAt: now });
    await createSession(result.insertedId, true);
    const user = await db.collection<DbUser>("users").findOne({ _id: result.insertedId });
    return Response.json({ user: toPublicUser(user as DbUser & { _id: typeof result.insertedId }), redirect: roleHome("student") }, { status: 201 });
  } catch (error) { return apiError(error); }
}
