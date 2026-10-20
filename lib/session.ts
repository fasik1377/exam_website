import { createHash } from "crypto";
import type { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import type { DbUser, PublicUser, UserRole } from "@/lib/types";

/** Shared by the proxy and the API so both always agree on who is signed in. */
export const SESSION_COOKIE = "temarinet_session";
export const LEGACY_ROLE_COOKIE = "temarinet_role";

export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

/** Why a session is no longer valid — shown on the login page. */
export type SessionEndReason = "replaced" | "expired" | "inactive" | "signed-out-everywhere";

/** Where each role lands after signing in. */
export function roleHome(role: UserRole) {
  if (role === "super-admin") return "/super-admin";
  if (role === "admin") return "/admin";
  return "/student";
}

export function toPublicUser(user: DbUser & { _id: ObjectId }): PublicUser {
  return { id: user._id.toString(), name: user.name, email: user.email, role: user.role, status: user.status, plan: user.plan, subject: user.subject };
}

type SessionRow = { expiresAt: Date; revokedAt?: Date | null; revokedReason?: SessionEndReason; user: (DbUser & { _id: ObjectId })[] };

/** The active user behind a session token, or the reason there isn't one. */
export async function lookupSession(token: string | undefined): Promise<{ user: PublicUser | null; reason?: SessionEndReason }> {
  if (!token) return { user: null };
  const db = await getDb();
  const [row] = await db.collection("sessions").aggregate<SessionRow>([
    { $match: { tokenHash: tokenHash(token) } },
    { $limit: 1 },
    { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "user" } },
  ]).toArray();
  if (!row) return { user: null };
  if (row.revokedAt) return { user: null, reason: row.revokedReason ?? "replaced" };
  if (row.expiresAt <= new Date()) return { user: null, reason: "expired" };
  const user = row.user[0];
  if (!user || user.status !== "active") return { user: null, reason: "inactive" };
  return { user: toPublicUser(user) };
}

export async function userForToken(token: string | undefined): Promise<PublicUser | null> {
  return (await lookupSession(token)).user;
}
