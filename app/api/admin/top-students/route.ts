import { apiError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { DEFAULT_CRITERIA, ensureWeeklyAward, getCriteria, pickCriteria, publicRow, lastAnnouncement, nextAnnouncement, rankStudents, saveCriteria, weekLabel, type Award, type TopCriteria } from "@/lib/topStudents";

/** Criteria, this week's live ranking and past winners. */
export async function GET() {
  try {
    const auth = await requireUser(["super-admin"]); if (auth.error) return auth.error;
    await ensureWeeklyAward("admin-visit");
    const saved = await getCriteria();
    const criteria = pickCriteria(saved), enabledAt = saved.enabledAt;
    const start = lastAnnouncement();
    const live = await rankStudents(start, new Date(Date.now() + 1000), criteria);
    const history = await (await getDb()).collection<Award>("weekly_awards").find().sort({ end: -1 }).limit(12).toArray();
    return Response.json({
      criteria, defaults: DEFAULT_CRITERIA, enabledAt,
      week: { start, end: nextAnnouncement(), label: weekLabel(start, nextAnnouncement()) },
      cron: Boolean(process.env.CRON_SECRET),
      live: live.slice(0, 50).map(publicRow),
      history: history.map((h) => ({ key: h._id, label: weekLabel(h.start, h.end), scope: h.scope, trigger: h.trigger, createdAt: h.createdAt, winners: h.winners })),
    });
  } catch (error) { return apiError(error); }
}

const int = (v: unknown, min: number, max: number) => { const n = Number(v); return Number.isInteger(n) && n >= min && n <= max ? n : null; };

/** Update the criteria. */
export async function PATCH(request: Request) {
  try {
    const auth = await requireUser(["super-admin"]); if (auth.error) return auth.error;
    const body = await readJson(request);
    const next: Partial<TopCriteria> = {
      accuracyWeight: int(body.accuracyWeight, 0, 100) ?? undefined, volumeWeight: int(body.volumeWeight, 0, 100) ?? undefined, consistencyWeight: int(body.consistencyWeight, 0, 100) ?? undefined,
      minAnswers: int(body.minAnswers, 0, 1000) ?? undefined, minDays: int(body.minDays, 0, 7) ?? undefined, volumeCap: int(body.volumeCap, 10, 5000) ?? undefined,
    };
    if (Object.values(next).some((v) => v === undefined)) return Response.json({ error: "Weights must be 0–100, minimum answers 0–1000, minimum days 0–7 and the answer cap 10–5000." }, { status: 400 });
    if (!next.accuracyWeight && !next.volumeWeight && !next.consistencyWeight) return Response.json({ error: "At least one weight must be above 0." }, { status: 400 });
    const criteria: TopCriteria = { ...(next as TopCriteria), scope: body.scope === "grade" ? "grade" : "overall", emailWinners: body.emailWinners !== false };
    await saveCriteria(criteria);
    return Response.json({ ok: true, criteria });
  } catch (error) { return apiError(error); }
}
