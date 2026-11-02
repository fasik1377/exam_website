import { ObjectId } from "mongodb";
import { apiError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { history, spend, wallet } from "@/lib/coins";
import { getDb } from "@/lib/db";
import { EMPTY_GEAR, SHOP, shopItem, type Gear } from "@/lib/shop";

async function gearOf(userId: string): Promise<Gear> {
  const u = await (await getDb()).collection("users").findOne({ _id: new ObjectId(userId) }, { projection: { gear: 1 } });
  return { ...EMPTY_GEAR, ...(u?.gear ?? {}), powerups: { ...(u?.gear?.powerups ?? {}) } };
}

/** Catalog, coin balance, what I own and recent coin history. */
export async function GET() {
  try {
    const auth = await requireUser(["student"]); if (auth.error) return auth.error;
    const [w, gear, log] = await Promise.all([wallet(auth.user.id), gearOf(auth.user.id), history(auth.user.id)]);
    return Response.json({ items: SHOP, wallet: w, gear, history: log.map((h) => ({ amount: h.amount, reason: h.reason, at: h.createdAt })) });
  } catch (error) { return apiError(error); }
}

/**
 * { action: "buy", item }   spend coins (cosmetics once; power-ups stack)
 * { action: "use", item }   use one power-up (practice mode)
 * { action: "equip", item } wear a frame/title you own (item: null to remove)
 */
export async function POST(request: Request) {
  try {
    const auth = await requireUser(["student"]); if (auth.error) return auth.error;
    const body = await readJson(request);
    const users = (await getDb()).collection("users");
    const uid = new ObjectId(auth.user.id);
    const item = typeof body.item === "string" ? shopItem(body.item) : undefined;
    const gear = await gearOf(auth.user.id);

    if (body.action === "buy") {
      if (!item) return Response.json({ error: "Unknown item" }, { status: 404 });
      if (item.kind !== "powerup" && gear.owned.includes(item.id)) return Response.json({ error: "You already own this." }, { status: 409 });
      const balance = await spend(auth.user.id, item.price, "shop", item.id);
      if (balance === null) return Response.json({ error: "Not enough coins yet — keep practising!" }, { status: 402 });
      if (item.kind === "powerup") await users.updateOne({ _id: uid }, { $inc: { [`gear.powerups.${item.id}`]: 1 } });
      else await users.updateOne({ _id: uid }, { $addToSet: { "gear.owned": item.id }, $set: { [`gear.${item.kind}`]: item.id } });
      return Response.json({ ok: true, balance, gear: await gearOf(auth.user.id) });
    }
    if (body.action === "use") {
      if (!item || item.kind !== "powerup") return Response.json({ error: "Unknown power-up" }, { status: 404 });
      const res = await users.updateOne({ _id: uid, [`gear.powerups.${item.id}`]: { $gte: 1 } }, { $inc: { [`gear.powerups.${item.id}`]: -1 } });
      if (!res.modifiedCount) return Response.json({ error: "You don't have this power-up." }, { status: 409 });
      return Response.json({ ok: true, gear: await gearOf(auth.user.id) });
    }
    if (body.action === "equip") {
      const kind = body.kind === "title" ? "title" : "frame";
      if (body.item === null) { await users.updateOne({ _id: uid }, { $set: { [`gear.${kind}`]: null } }); return Response.json({ ok: true, gear: await gearOf(auth.user.id) }); }
      if (!item || item.kind !== kind || !gear.owned.includes(item.id)) return Response.json({ error: "You don't own this yet." }, { status: 409 });
      await users.updateOne({ _id: uid }, { $set: { [`gear.${kind}`]: item.id } });
      return Response.json({ ok: true, gear: await gearOf(auth.user.id) });
    }
    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) { return apiError(error); }
}
