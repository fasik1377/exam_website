import { createHash } from "crypto";
import { apiError, readJson } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { getDb } from "@/lib/db";

/** Sets a new password using a reset link token, then signs the account out everywhere. */
export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const token = typeof body.token === "string" ? body.token : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (password.length < 8) return Response.json({ error: "Use a password of at least 8 characters" }, { status: 400 });
    const db = await getDb();
    const reset = await db.collection("password_resets").findOneAndUpdate(
      { tokenHash: createHash("sha256").update(token).digest("hex"), usedAt: null, expiresAt: { $gt: new Date() } },
      { $set: { usedAt: new Date() } },
    );
    if (!reset) return Response.json({ error: "This reset link is invalid or has expired. Request a new one." }, { status: 400 });
    const user = await db.collection("users").findOneAndUpdate({ _id: reset.userId }, { $set: { passwordHash: await hashPassword(password), updatedAt: new Date() } });
    await db.collection("sessions").deleteMany({ userId: reset.userId });
    if (user?.email) await db.collection("login_failures").deleteMany({ email: user.email });
    return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}
