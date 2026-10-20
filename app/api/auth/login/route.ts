import { createSession, ensureDatabase, roleHome, toPublicUser, verifyPassword } from "@/lib/auth";
import { apiError, cleanString, readJson } from "@/lib/api";
import { getDb } from "@/lib/db";
import type { DbUser, UserRole } from "@/lib/types";

// Each login page accepts exactly one role.
const PORTALS: Record<UserRole, { label: string; path: string }> = {
  student: { label: "Student login", path: "/login" },
  admin: { label: "Teacher login", path: "/admin/login" },
  "super-admin": { label: "Platform admin login", path: "/super-admin/login" },
};

const STATUS_MESSAGE: Record<string, string> = {
  pending: "Your account is waiting for approval by the platform administrator. You can sign in as soon as it is approved.",
  rejected: "Your registration was not approved. Please contact the platform administrator.",
  restricted: "This account is restricted. Please contact the platform administrator.",
  banned: "This account has been banned. Please contact the platform administrator.",
};

const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;

export async function POST(request: Request) {
  try {
    await ensureDatabase();
    const body = await readJson(request);
    const email = cleanString(body.email, 160).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";
    const portal = (["student", "admin", "super-admin"] as const).find((r) => r === body.role) ?? "student";
    if (!email || !password) return Response.json({ error: "Enter your email and password" }, { status: 400 });

    const db = await getDb();
    // Brute-force protection: too many wrong passwords for one email locks it briefly.
    const since = new Date(Date.now() - LOCK_MINUTES * 60000);
    const failures = await db.collection("login_failures").countDocuments({ email, createdAt: { $gt: since } });
    if (failures >= MAX_FAILURES) {
      return Response.json({ error: `Too many failed attempts. Try again in ${LOCK_MINUTES} minutes or reset your password.` }, { status: 429 });
    }

    const user = await db.collection<DbUser>("users").findOne({ email });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      await db.collection("login_failures").insertOne({ email, createdAt: new Date() });
      const left = MAX_FAILURES - failures - 1;
      return Response.json({ error: left > 0 && left <= 2 ? `Invalid email or password. ${left} attempt${left === 1 ? "" : "s"} left before a short lock.` : "Invalid email or password" }, { status: 401 });
    }
    if (user.status !== "active") return Response.json({ error: STATUS_MESSAGE[user.status] ?? "This account cannot sign in.", status: user.status }, { status: 403 });
    if (user.role !== portal) {
      const right = PORTALS[user.role];
      return Response.json({ error: `This is the ${PORTALS[portal].label.toLowerCase()} page. Your account signs in at ${right.label}.`, portal: right }, { status: 403 });
    }
    await db.collection("login_failures").deleteMany({ email });
    await createSession(user._id!, user.role, Boolean(body.remember));
    await db.collection("users").updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
    return Response.json({ user: toPublicUser(user as DbUser & { _id: NonNullable<DbUser["_id"]> }), redirect: roleHome(user.role) });
  } catch (error) { return apiError(error); }
}
