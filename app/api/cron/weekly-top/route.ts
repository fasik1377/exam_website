import { apiError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { ensureWeeklyAward, weekLabel } from "@/lib/topStudents";

/**
 * Announces the students of the week. Vercel Cron calls this every Saturday at 09:00 UTC
 * (12:00 in Addis Ababa) with `Authorization: Bearer <CRON_SECRET>`; the super admin may also call it.
 */
export async function GET(request: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    const fromCron = Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
    if (!fromCron) { const auth = await requireUser(["super-admin"]); if (auth.error) return auth.error; }
    const award = await ensureWeeklyAward(fromCron ? "cron" : "admin");
    if (!award) return Response.json({ ok: true, announced: false, reason: "No finished week since the feature was switched on." });
    return Response.json({ ok: true, announced: true, week: weekLabel(award.start, award.end), winners: award.winners.map((w) => ({ rank: w.rank, name: w.name, grade: w.grade, score: w.score })) });
  } catch (error) { return apiError(error); }
}
