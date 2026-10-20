import { ObjectId } from "mongodb";
import { apiError, cleanString } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { DbUser } from "@/lib/types";

/** Directory of approved students and teachers to start a chat with (names and subjects only — no emails). */
export async function GET(request: Request) {
  try {
    const auth = await requireUser(["student", "admin"]); if (auth.error) return auth.error;
    const url = new URL(request.url);
    const q = cleanString(url.searchParams.get("q"), 60);
    const role = url.searchParams.get("role");
    const subject = cleanString(url.searchParams.get("subject"), 60);
    const filter: Record<string, unknown> = { status: "active", _id: { $ne: new ObjectId(auth.user.id) }, role: role === "student" || role === "admin" ? role : { $in: ["student", "admin"] } };
    if (subject) filter.subject = subject;
    if (q) filter.name = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    const people = await (await getDb()).collection<DbUser>("users").find(filter, { projection: { name: 1, role: 1, subject: 1 } }).sort({ role: 1, name: 1 }).limit(100).toArray();
    return Response.json({ people: people.map((p) => ({ id: p._id!.toString(), name: p.name, role: p.role, subject: p.subject ?? null })) });
  } catch (error) { return apiError(error); }
}
