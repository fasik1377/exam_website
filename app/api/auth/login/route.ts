import { createSession, ensureDatabase, roleHome, toPublicUser, verifyPassword } from "@/lib/auth";
import { apiError, cleanString, readJson } from "@/lib/api";
import { getDb } from "@/lib/db";
import type { DbUser, UserRole } from "@/lib/types";

// Which account roles each login portal accepts. No portal = the general sign-in page, which accepts everyone.
const PORTAL_ROLES: Record<string, UserRole[]> = {
  student: ["student"],
  admin: ["admin", "super-admin"],
  "super-admin": ["super-admin"],
};

export async function POST(request: Request) {
  try {
    await ensureDatabase();
    const body = await readJson(request);
    const email = cleanString(body.email, 160).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password) return Response.json({ error: "Enter your email and password" }, { status: 400 });
    const allowedRoles = typeof body.role === "string" ? PORTAL_ROLES[body.role] : undefined;
    const user = await (await getDb()).collection<DbUser>("users").findOne({ email });
    if (!user || !(await verifyPassword(password, user.passwordHash))) return Response.json({ error: "Invalid email or password" }, { status: 401 });
    if (user.status !== "active") return Response.json({ error: `This account is ${user.status}. Please contact the platform administrator.` }, { status: 403 });
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return Response.json({ error: "This account cannot use this portal. Use the main sign-in page instead.", redirect: "/login" }, { status: 403 });
    }
    await createSession(user._id!, Boolean(body.remember));
    return Response.json({ user: toPublicUser(user as DbUser & { _id: NonNullable<DbUser["_id"]> }), redirect: roleHome(user.role) });
  } catch (error) { return apiError(error); }
}
