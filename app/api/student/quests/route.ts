import { apiError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { grant, wallet } from "@/lib/coins";
import { weeklyQuests } from "@/lib/quests";

/** This week's 3 quests with progress. */
export async function GET() {
  try {
    const auth = await requireUser(["student"]); if (auth.error) return auth.error;
    return Response.json(await weeklyQuests(auth.user.id));
  } catch (error) { return apiError(error); }
}

/** Claim the coins for a finished quest (paid once). */
export async function POST(request: Request) {
  try {
    const auth = await requireUser(["student"]); if (auth.error) return auth.error;
    const body = await readJson(request);
    const data = await weeklyQuests(auth.user.id);
    const quest = data.quests.find((q) => q.id === body.id);
    if (!quest) return Response.json({ error: "That quest isn't one of yours this week." }, { status: 404 });
    if (!quest.done) return Response.json({ error: "Finish the quest first." }, { status: 409 });
    const coins = await grant(auth.user.id, quest.reward, "quest", `${data.week}:${quest.id}`);
    if (!coins) return Response.json({ error: "Already claimed." }, { status: 409 });
    return Response.json({ ok: true, coins, wallet: await wallet(auth.user.id) });
  } catch (error) { return apiError(error); }
}
