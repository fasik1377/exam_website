import { createHmac, timingSafeEqual } from "crypto";
import type { UserRole } from "@/lib/types";

/**
 * A small signed cookie that tells the proxy which role the visitor has, so pages can be
 * guarded before they render. It is only a routing hint: every API still verifies the real
 * database session, so a stale or forged value can never grant data access.
 */
export const ROLE_COOKIE = "temarinet_role";
export const SESSION_COOKIE = "temarinet_session";

export type RoleClaim = { uid: string; role: UserRole; exp: number };

const secret = () => process.env.SESSION_SECRET || "development-only-secret-change-me";
const sign = (data: string) => createHmac("sha256", secret()).update(data).digest("base64url");

export function signRole(claim: RoleClaim) {
  const data = Buffer.from(JSON.stringify(claim)).toString("base64url");
  return `${data}.${sign(data)}`;
}

export function verifyRole(token: string | undefined): RoleClaim | null {
  if (!token) return null;
  const [data, signature] = token.split(".");
  if (!data || !signature) return null;
  const expected = Buffer.from(sign(data));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const claim = JSON.parse(Buffer.from(data, "base64url").toString()) as RoleClaim;
    return claim.exp > Date.now() ? claim : null;
  } catch {
    return null;
  }
}

/** Where each role lands after signing in. */
export function roleHome(role: UserRole) {
  if (role === "super-admin") return "/super-admin";
  if (role === "admin") return "/admin";
  return "/student";
}
