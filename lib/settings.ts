import { getDb } from "@/lib/db";
import type { PublicUser } from "@/lib/types";

/** Platform-wide switches the super admin controls. Stored as one document in `settings`. */
export type PlatformSettings = { paymentRequired: boolean; freeQuestions: number };
export const DEFAULT_SETTINGS: PlatformSettings = { paymentRequired: true, freeQuestions: 10 };

type SettingsDoc = PlatformSettings & { _id: string; updatedAt?: Date; updatedBy?: string };
const cache = globalThis as typeof globalThis & { platformSettings?: { at: number; value: PlatformSettings } };
const TTL = 15_000;

export async function getSettings(): Promise<PlatformSettings> {
  if (!cache.platformSettings || Date.now() - cache.platformSettings.at > TTL) {
    const doc = await (await getDb()).collection<SettingsDoc>("settings").findOne({ _id: "platform" });
    cache.platformSettings = { at: Date.now(), value: { paymentRequired: doc?.paymentRequired ?? DEFAULT_SETTINGS.paymentRequired, freeQuestions: doc?.freeQuestions ?? DEFAULT_SETTINGS.freeQuestions } };
  }
  return cache.platformSettings.value;
}

export async function saveSettings(value: PlatformSettings, by: string) {
  await (await getDb()).collection<SettingsDoc>("settings").updateOne({ _id: "platform" }, { $set: { ...value, updatedAt: new Date(), updatedBy: by } }, { upsert: true });
  cache.platformSettings = { at: Date.now(), value };
}

/** Whether this viewer may see every question and explanation. */
export const hasFullAccess = (user: PublicUser | null, settings: PlatformSettings) =>
  !settings.paymentRequired || (!!user && (user.role !== "student" || user.plan !== "free"));
