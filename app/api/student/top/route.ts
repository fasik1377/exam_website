import { ObjectId } from "mongodb";
import { apiError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { ensureWeeklyAward, getCriteria, pickCriteria, lastAnnouncement, latestAward, nextAnnouncement, rankStudents, weekLabel } from "@/lib/topStudents";

const shortName = (name: string) => { const [first, ...rest] = name.trim().split(/\s+/); return rest.length ? `${first} ${rest[0][0].toUpperCase()}.` : first; };

/** Students of the week, my standing in this week's race, and my unread award notifications. */
export async function GET() {
  try {
    const auth = await requireUser(["student"]); if (auth.error) return auth.error;
    await ensureWeeklyAward("student-visit");
    const db = await getDb();
    const criteria = pickCriteria(await getCriteria());
    const start = lastAnnouncement();
    const [award, live, notifications] = await Promise.all([
      latestAward(),
      rankStudents(start, new Date(Date.now() + 1000), criteria),
      db.collection("notifications").find({ userId: new ObjectId(auth.user.id), kind: "weekly-top", readAt: null }).sort({ createdAt: -1 }).limit(3).toArray(),
    ]);
    const mine = live.find((r) => r.userId === auth.user.id);
    const myGroup = criteria.scope === "grade" ? live.filter((r) => r.grade === (auth.user.grade ?? null)) : live;
    const winners = award ? (criteria.scope === "grade" && award.scope === "grade" ? award.winners.filter((w) => w.grade === (auth.user.grade ?? null)) : award.winners) : [];
    return Response.json({
      criteria,
      announcement: nextAnnouncement(),
      lastWeek: award ? { label: weekLabel(award.start, award.end), scope: award.scope, winners: winners.map((w) => ({ rank: w.rank, name: shortName(w.name), grade: w.grade, score: w.score, me: w.userId === auth.user.id })) } : null,
      thisWeek: {
        label: weekLabel(start, nextAnnouncement()),
        leaders: myGroup.filter((r) => r.rank !== null && r.rank <= 3).map((r) => ({ rank: r.rank, name: shortName(r.name), score: r.score, me: r.userId === auth.user.id })),
        me: mine ? { rank: mine.rank, score: mine.score, answers: mine.answers, days: mine.days, accuracy: mine.accuracy, eligible: mine.eligible } : { rank: null, score: 0, answers: 0, days: 0, accuracy: 0, eligible: false },
        players: myGroup.filter((r) => r.eligible).length,
      },
      notifications: notifications.map((n) => ({ id: n._id.toString(), title: n.title, body: n.body, rank: n.rank, createdAt: n.createdAt })),
    });
  } catch (error) { return apiError(error); }
}

/** Dismiss an award notification. */
export async function PATCH(request: Request) {
  try {
    const auth = await requireUser(["student"]); if (auth.error) return auth.error;
    const body = await readJson(request);
    const id = typeof body.id === "string" && ObjectId.isValid(body.id) ? new ObjectId(body.id) : null;
    if (!id) return Response.json({ error: "Not found" }, { status: 404 });
    await (await getDb()).collection("notifications").updateOne({ _id: id, userId: new ObjectId(auth.user.id) }, { $set: { readAt: new Date() } });
    return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}
