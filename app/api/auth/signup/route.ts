import { after } from "next/server";
import { ensureDatabase, hashPassword } from "@/lib/auth";
import { notifyNewRegistration, notifyRegistrationReceived } from "@/lib/mail";
import { apiError, cleanString, readJson } from "@/lib/api";
import { getDb } from "@/lib/db";
import { SUBJECTS } from "@/lib/subjects";
import type { DbUser } from "@/lib/types";

/** Students and teachers register here; every new account waits for super-admin approval before it can sign in. */
export async function POST(request: Request) {
  try {
    await ensureDatabase();
    const body = await readJson(request);
    const name = cleanString(body.name, 80);
    const email = cleanString(body.email, 160).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";
    const role = body.role === "teacher" ? "admin" : "student";
    const subject = cleanString(body.subject, 60);
    if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
      return Response.json({ error: "Enter a valid name, email, and password of at least 8 characters" }, { status: 400 });
    }
    if (role === "admin" && !SUBJECTS.some((s) => s.name === subject)) {
      return Response.json({ error: "Choose the subject you teach" }, { status: 400 });
    }
    const db = await getDb();
    if (await db.collection("users").findOne({ email })) return Response.json({ error: "An account with this email already exists" }, { status: 409 });
    const now = new Date();
    await db.collection<DbUser>("users").insertOne({
      name, email, passwordHash: await hashPassword(password), role, status: "pending",
      plan: role === "admin" ? "teacher" : "free", ...(role === "admin" ? { subject } : {}), createdAt: now, updatedAt: now,
    });
    // After responding (so registration stays fast): alert the platform owner, and confirm to the applicant.
    after(async () => {
      const admins = await db.collection<DbUser>("users").find({ role: "super-admin", status: "active" }, { projection: { email: 1 } }).toArray();
      await Promise.all([
        notifyNewRegistration({ name, email, role, subject: role === "admin" ? subject : undefined }, admins.map((a) => a.email)),
        notifyRegistrationReceived({ name, email, role, subject: role === "admin" ? subject : null }),
      ]);
    });
    return Response.json({ pending: true, role: role === "admin" ? "teacher" : "student" }, { status: 201 });
  } catch (error) { return apiError(error); }
}
