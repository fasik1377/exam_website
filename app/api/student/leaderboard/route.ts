import { ObjectId } from "mongodb";
import { apiError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { XP_EXPR } from "@/lib/gamification";

/** "Abebe Kebede" → "Abebe K." so classmates see each other without full names. */
const shortName = (name: string) => {
  const [first, ...rest] = name.trim().split(/\s+/);
  return rest.length ? `${first} ${rest[0][0].toUpperCase()}.` : first;
};

/** This week's XP ranking among active students in the same grade (top 10 plus my own position). */
export async function GET() {
  try {
    const auth = await requireUser(["student"]); if (auth.error) return auth.error;
    const db = await getDb();
    const since = new Date(Date.now() - 7 * 86400000);
    const rows = await db.collection("attempts").aggregate<{ _id: ObjectId; xp: number; answers: number; name: string }>([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: "$userId", xp: { $sum: XP_EXPR }, answers: { $sum: 1 } } },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "u", pipeline: [{ $project: { name: 1, role: 1, status: 1, grade: 1 } }] } },
      { $unwind: "$u" },
      { $match: { "u.role": "student", "u.status": "active", ...(auth.user.grade ? { "u.grade": auth.user.grade } : {}) } },
      { $project: { xp: 1, answers: 1, name: "$u.name" } },
      { $sort: { xp: -1, answers: -1 } },
      { $limit: 500 },
    ]).toArray();
    const ranked = rows.map((r, i) => ({ rank: i + 1, name: shortName(r.name), xp: r.xp, answers: r.answers, me: r._id.toString() === auth.user.id }));
    const mine = ranked.find((r) => r.me) ?? null;
    return Response.json({ scope: auth.user.grade ?? "All grades", top: ranked.slice(0, 10), me: mine, players: ranked.length });
  } catch (error) { return apiError(error); }
}
