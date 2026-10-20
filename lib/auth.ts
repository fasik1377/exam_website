import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { ROLE_COOKIE, SESSION_COOKIE, roleHome, signRole, verifyRole } from "@/lib/roleCookie";
import type { DbUser, PublicUser, UserRole } from "@/lib/types";

const scrypt = promisify(scryptCallback);
export { SESSION_COOKIE, roleHome };
const SESSION_DAYS = 14;

const cookieOptions = (expires: Date) => ({ httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", expires });

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, key] = (stored || "").split(":");
  if (!salt || !key) return false;
  const storedBuffer = Buffer.from(key, "hex");
  const derived = (await scrypt(password, salt, storedBuffer.length)) as Buffer;
  return storedBuffer.length === derived.length && timingSafeEqual(storedBuffer, derived);
}

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: ObjectId, role: UserRole, remember = false) {
  const db = await getDb();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + (remember ? SESSION_DAYS : 1) * 86400000);
  await db.collection("sessions").insertOne({ tokenHash: tokenHash(token), userId, expiresAt, createdAt: new Date() });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, cookieOptions(expiresAt));
  store.set(ROLE_COOKIE, signRole({ uid: userId.toString(), role, exp: expiresAt.getTime() }), cookieOptions(expiresAt));
}

/** Removes a role cookie that no longer matches a live session (signed out, banned, expired). */
export async function clearRoleCookie() {
  const store = await cookies();
  if (store.get(ROLE_COOKIE)) store.delete(ROLE_COOKIE);
}

/** Re-issues the proxy's role cookie when it is missing or out of date (e.g. sessions from before it existed). */
export async function syncRoleCookie(user: PublicUser) {
  const store = await cookies();
  const claim = verifyRole(store.get(ROLE_COOKIE)?.value);
  if (claim?.uid === user.id && claim.role === user.role) return;
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  store.set(ROLE_COOKIE, signRole({ uid: user.id, role: user.role, exp: expiresAt.getTime() }), cookieOptions(expiresAt));
}

export async function deleteSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await getDb().then((db) => db.collection("sessions").deleteOne({ tokenHash: tokenHash(token) })).catch(() => undefined);
  store.delete(SESSION_COOKIE);
  store.delete(ROLE_COOKIE);
}

export function toPublicUser(user: DbUser & { _id: ObjectId }): PublicUser {
  return { id: user._id.toString(), name: user.name, email: user.email, role: user.role, status: user.status, plan: user.plan, subject: user.subject };
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const session = await db.collection("sessions").findOne({ tokenHash: tokenHash(token), expiresAt: { $gt: new Date() } });
  if (!session) return null;
  const user = await db.collection<DbUser>("users").findOne({ _id: session.userId as ObjectId });
  if (!user || user.status !== "active") return null;
  return toPublicUser(user as DbUser & { _id: ObjectId });
}

export async function requireUser(roles?: UserRole[]) {
  const user = await getCurrentUser();
  if (!user) return { error: Response.json({ error: "Authentication required" }, { status: 401 }) };
  if (roles && !roles.includes(user.role)) return { error: Response.json({ error: "You do not have permission" }, { status: 403 }) };
  return { user };
}

const globalSetup = globalThis as typeof globalThis & { temarinetSetup?: Promise<void> };

/** Creates indexes, bootstrap accounts and sample questions once per server process. */
export function ensureDatabase() {
  if (!globalSetup.temarinetSetup) {
    globalSetup.temarinetSetup = setupDatabase().catch((error) => {
      globalSetup.temarinetSetup = undefined;
      throw error;
    });
  }
  return globalSetup.temarinetSetup;
}

async function setupDatabase() {
  const db = await getDb();
  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("sessions").createIndex({ tokenHash: 1 }, { unique: true }),
    db.collection("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("questions").createIndex({ grade: 1, subject: 1, published: 1 }),
    db.collection("attempts").createIndex({ userId: 1, createdAt: -1 }),
    db.collection("login_failures").createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 }),
    db.collection("login_failures").createIndex({ email: 1, createdAt: -1 }),
    db.collection("password_resets").createIndex({ tokenHash: 1 }, { unique: true }),
    db.collection("password_resets").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);
  await bootstrapUser("super-admin", "SUPER_ADMIN");
  await bootstrapUser("admin", "ADMIN");
  await seedQuestions();
}

// Development-only fallbacks so a fresh local checkout can sign in. Production must set the env vars.
const DEV_DEFAULTS = {
  SUPER_ADMIN: { email: "superadmin@temarinet.local", password: "TemariNet#2026!", name: "TemariNet Super Admin" },
  ADMIN: { email: "teacher@temarinet.local", password: "TemariNet#Teacher2026!", name: "TemariNet Teacher" },
};

async function bootstrapUser(role: UserRole, prefix: "ADMIN" | "SUPER_ADMIN") {
  const fallback = process.env.NODE_ENV === "production" ? undefined : DEV_DEFAULTS[prefix];
  const email = (process.env[`${prefix}_EMAIL`] || fallback?.email || "").trim().toLowerCase();
  const password = process.env[`${prefix}_PASSWORD`] || fallback?.password || "";
  const name = (process.env[`${prefix}_NAME`] || fallback?.name || "").trim() || email;
  if (!email || !password) return;

  const db = await getDb();
  const existing = await db.collection<DbUser>("users").findOne({ email });
  if (!existing) {
    const now = new Date();
    await db.collection<DbUser>("users").insertOne({ name, email, passwordHash: await hashPassword(password), role, status: "active", plan: "teacher", createdAt: now, updatedAt: now });
    return;
  }
  // The environment is the source of truth for bootstrap accounts: keep the password in sync,
  // and never let the platform owner be locked out of their own account.
  const update: Partial<DbUser> = {};
  if (!(await verifyPassword(password, existing.passwordHash))) update.passwordHash = await hashPassword(password);
  if (role === "super-admin" && (existing.role !== role || existing.status !== "active")) Object.assign(update, { role, status: "active" });
  if (Object.keys(update).length) await db.collection<DbUser>("users").updateOne({ _id: existing._id }, { $set: { ...update, updatedAt: new Date() } });
}

async function seedQuestions() {
  const db = await getDb();
  if (await db.collection("questions").countDocuments()) return;
  const teacher = await db.collection<DbUser>("users").findOne({ role: "admin" });
  if (!teacher?._id) return;
  const now = new Date();
  const base = { subject: "Mathematics", grade: "Grade 12", unit: "Unit 1: Algebra", year: "2016 E.C.", teacherName: teacher.name, createdBy: teacher._id, published: true, createdAt: now, updatedAt: now };
  await db.collection("questions").insertMany([
    { ...base, prompt: "What is the value of x if 3x + 6 = 21?", choices: ["x = 3", "x = 5", "x = 7", "x = 9"], correctAnswer: 1, explanation: "Subtract 6 from both sides to get 3x = 15, then divide by 3. Therefore x = 5." },
    { ...base, prompt: "The square root of 144 is:", choices: ["10", "11", "12", "14"], correctAnswer: 2, explanation: "12 multiplied by 12 equals 144, so the square root of 144 is 12." },
    { ...base, prompt: "If 2(x + 4) = 18, what is x?", choices: ["3", "5", "7", "9"], correctAnswer: 1, explanation: "Divide both sides by 2 to get x + 4 = 9, then subtract 4. Thus x = 5." },
  ]);
}
