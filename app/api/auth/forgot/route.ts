import { createHash, randomBytes } from "crypto";
import { after } from "next/server";
import { apiError, cleanString, readJson } from "@/lib/api";
import { getDb } from "@/lib/db";
import { notifyPasswordReset } from "@/lib/mail";
import type { DbUser } from "@/lib/types";

const GENERIC = { ok: true, message: "If an account exists for that email, we've sent a link to reset the password. It works for 1 hour." };

/** Emails a single-use password-reset link. Always answers the same way so it can't reveal which emails exist. */
export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const email = cleanString(body.email, 160).toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: "Enter a valid email address" }, { status: 400 });
    const db = await getDb();
    const user = await db.collection<DbUser>("users").findOne({ email, status: { $in: ["active", "pending"] } });
    if (!user) return Response.json(GENERIC);
    // At most 3 reset emails per account per hour.
    const recent = await db.collection("password_resets").countDocuments({ userId: user._id, createdAt: { $gt: new Date(Date.now() - 3600000) } });
    if (recent >= 3) return Response.json(GENERIC);
    const token = randomBytes(32).toString("base64url");
    await db.collection("password_resets").insertOne({
      userId: user._id, tokenHash: createHash("sha256").update(token).digest("hex"),
      createdAt: new Date(), expiresAt: new Date(Date.now() + 3600000), usedAt: null,
    });
    after(() => notifyPasswordReset({ name: user.name, email: user.email }, token));
    return Response.json(GENERIC);
  } catch (error) { return apiError(error); }
}
