import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { LEGACY_ROLE_COOKIE, SESSION_COOKIE, lookupSession, roleHome, tokenHash, toPublicUser, type SessionEndReason } from "@/lib/session";
import type { DbUser, PublicUser, UserRole } from "@/lib/types";

const scrypt = promisify(scryptCallback);
export { SESSION_COOKIE, roleHome, toPublicUser };
const REMEMBER_DAYS = 14;
const SHORT_SESSION_HOURS = 12;

const baseCookie = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, key] = (stored || "").split(":");
  if (!salt || !key || !password) return false;
  const storedBuffer = Buffer.from(key, "hex");
  const derived = (await scrypt(password, salt, storedBuffer.length)) as Buffer;
  return storedBuffer.length === derived.length && timingSafeEqual(storedBuffer, derived);
}

/**
 * Starts a session. "Keep me signed in" → 14-day cookie; otherwise a browser-session cookie
 * (gone when the browser closes) backed by a 12-hour server session.
 */
export async function createSession(userId: ObjectId, remember = false) {
  const db = await getDb();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + (remember ? REMEMBER_DAYS * 24 : SHORT_SESSION_HOURS) * 3600000);
  const now = new Date();
  const created = await db.collection("sessions").insertOne({ tokenHash: tokenHash(token), userId, expiresAt, createdAt: now, revokedAt: null });
  // One active login per account: signing in here signs out every other device.
  // Revoked sessions are kept for a day so the other device can be told why it was signed out.
  await db.collection("sessions").updateMany(
    { userId, _id: { $ne: created.insertedId }, revokedAt: null },
    { $set: { revokedAt: now, revokedReason: "replaced", expiresAt: new Date(now.getTime() + 86400000) } },
  );
  const store = await cookies();
  store.set(SESSION_COOKIE, token, remember ? { ...baseCookie, expires: expiresAt } : baseCookie);
  store.delete({ name: LEGACY_ROLE_COOKIE, ...baseCookie });
}

/** Signs out this browser — or, with `everywhere`, every device the account is signed in on. */
export async function deleteSession(everywhere = false) {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await getDb().then(async (db) => {
      const session = await db.collection("sessions").findOne({ tokenHash: tokenHash(token) });
      await db.collection("sessions").deleteOne({ tokenHash: tokenHash(token) });
      if (everywhere && session) {
        await db.collection("sessions").updateMany(
          { userId: session.userId, revokedAt: null },
          { $set: { revokedAt: new Date(), revokedReason: "signed-out-everywhere", expiresAt: new Date(Date.now() + 86400000) } },
        );
      }
    }).catch(() => undefined);
  }
  // Delete with the same attributes the cookies were created with, so every browser removes them.
  store.delete({ name: SESSION_COOKIE, ...baseCookie });
  store.delete({ name: LEGACY_ROLE_COOKIE, ...baseCookie });
}

/** Current user plus, when signed out, the reason (e.g. signed in on another device). */
export async function getSessionState(): Promise<{ user: PublicUser | null; reason?: SessionEndReason }> {
  return lookupSession((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  return (await lookupSession((await cookies()).get(SESSION_COOKIE)?.value)).user;
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
  await bootstrapSuperAdmin();
}

/**
 * The platform owner's account comes only from SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD.
 * Teachers and students register themselves and are approved by the super admin.
 */
async function bootstrapSuperAdmin() {
  const email = (process.env.SUPER_ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD || "";
  const name = (process.env.SUPER_ADMIN_NAME || "").trim() || "Platform Administrator";
  if (!email || !password) return;

  const db = await getDb();
  const existing = await db.collection<DbUser>("users").findOne({ email });
  if (!existing) {
    const now = new Date();
    await db.collection<DbUser>("users").insertOne({ name, email, passwordHash: await hashPassword(password), role: "super-admin", status: "active", plan: "teacher", createdAt: now, updatedAt: now });
    return;
  }
  // The environment is the source of truth: keep the password in sync and never lock the owner out.
  const update: Partial<DbUser> = {};
  if (!(await verifyPassword(password, existing.passwordHash))) update.passwordHash = await hashPassword(password);
  if (existing.role !== "super-admin" || existing.status !== "active") Object.assign(update, { role: "super-admin", status: "active" });
  if (Object.keys(update).length) await db.collection<DbUser>("users").updateOne({ _id: existing._id }, { $set: { ...update, updatedAt: new Date() } });
}
