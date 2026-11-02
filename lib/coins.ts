import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";

/**
 * Coins: earned by practising (never bought), spent in the shop.
 * - `wallets`      one document per student: { balance, earned }
 * - `coin_ledger`  every grant/spend; grants are unique per (user, reason, ref), so the same
 *                  reward can never be paid twice even if a request is repeated.
 */
export const COINS = {
  correct: 1,          // every correct answer
  comboEvery: 5,       // bonus for each 5 correct in a row …
  comboBonus: 5,       // … of this many coins
  dailyGoal: 10,       // reaching the daily goal
  challengeDone: 15,   // finishing today's challenge
  challengeCorrect: 2, // per correct challenge answer
  badge: 10,           // claiming a badge
  weekly: [0, 100, 60, 40] as const, // students of the week, by rank
};

type Wallet = { _id: ObjectId; balance: number; earned: number; updatedAt: Date };
type Ledger = { userId: ObjectId; amount: number; reason: string; ref: string; createdAt: Date };

const setup = globalThis as typeof globalThis & { coinIndexes?: Promise<unknown> };
async function col() {
  const db = await getDb();
  setup.coinIndexes ??= db.collection("coin_ledger").createIndex({ userId: 1, reason: 1, ref: 1 }, { unique: true }).catch(() => { setup.coinIndexes = undefined; });
  await setup.coinIndexes;
  return { wallets: db.collection<Wallet>("wallets"), ledger: db.collection<Ledger>("coin_ledger") };
}

/** Pays a reward once. Returns the coins granted (0 if this reward was already paid). */
export async function grant(userId: string, amount: number, reason: string, ref: string) {
  if (amount <= 0) return 0;
  const { wallets, ledger } = await col();
  const uid = new ObjectId(userId);
  try {
    await ledger.insertOne({ userId: uid, amount, reason, ref, createdAt: new Date() });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return 0;
    throw error;
  }
  await wallets.updateOne({ _id: uid }, { $inc: { balance: amount, earned: amount }, $set: { updatedAt: new Date() } }, { upsert: true });
  return amount;
}

/** Takes coins if the balance allows it (atomic). Returns the new balance, or null if there aren't enough. */
export async function spend(userId: string, amount: number, reason: string, ref: string) {
  const { wallets, ledger } = await col();
  const uid = new ObjectId(userId);
  const wallet = await wallets.findOneAndUpdate({ _id: uid, balance: { $gte: amount } }, { $inc: { balance: -amount }, $set: { updatedAt: new Date() } }, { returnDocument: "after" });
  if (!wallet) return null;
  await ledger.insertOne({ userId: uid, amount: -amount, reason, ref: `${ref}:${Date.now()}`, createdAt: new Date() });
  return wallet.balance;
}

export async function wallet(userId: string) {
  const { wallets } = await col();
  const w = await wallets.findOne({ _id: new ObjectId(userId) });
  return { balance: w?.balance ?? 0, earned: w?.earned ?? 0 };
}

/** Recent coin history for the student. */
export async function history(userId: string, limit = 12) {
  const { ledger } = await col();
  return ledger.find({ userId: new ObjectId(userId) }).sort({ createdAt: -1 }).limit(limit).toArray();
}
