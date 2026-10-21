import type { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { SUBJECTS, type Stream, type Subject } from "@/lib/subjects";

/** Subjects live in MongoDB so the super admin can manage them; this module is the only reader/writer. */
export type DbSubject = {
  _id?: ObjectId;
  name: string;
  amharic: string;
  streams: Stream[];
  minutes: number;
  hidden: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
};

const cache = globalThis as typeof globalThis & { subjectCache?: { at: number; list: Subject[] }; subjectSeed?: Promise<void> };
const TTL = 30_000;

/** First run: copy the built-in list into the database. */
function seed() {
  if (!cache.subjectSeed) {
    cache.subjectSeed = (async () => {
      const db = await getDb();
      await db.collection("subjects").createIndex({ name: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });
      if (await db.collection("subjects").countDocuments()) return;
      const now = new Date();
      await db.collection<DbSubject>("subjects").insertMany(SUBJECTS.map((s, i) => ({
        name: s.name, amharic: s.amharic, streams: s.streams, minutes: s.minutes ?? 1, hidden: false, order: i, createdAt: now, updatedAt: now,
      })));
    })().catch((error) => { cache.subjectSeed = undefined; throw error; });
  }
  return cache.subjectSeed;
}

const toSubject = (s: DbSubject): Subject => ({ id: s._id!.toString(), name: s.name, amharic: s.amharic, streams: s.streams, minutes: s.minutes, hidden: s.hidden });

/** All subjects (cached briefly). Pass `includeHidden` for admin views and validating existing data. */
export async function getSubjects({ includeHidden = false } = {}): Promise<Subject[]> {
  if (!cache.subjectCache || Date.now() - cache.subjectCache.at > TTL) {
    await seed();
    const rows = await (await getDb()).collection<DbSubject>("subjects").find().sort({ order: 1, name: 1 }).toArray();
    cache.subjectCache = { at: Date.now(), list: rows.map(toSubject) };
  }
  return includeHidden ? cache.subjectCache.list : cache.subjectCache.list.filter((s) => !s.hidden);
}

export function invalidateSubjects() {
  cache.subjectCache = undefined;
}

export async function findSubject(name: unknown, { includeHidden = false } = {}) {
  if (typeof name !== "string") return undefined;
  return (await getSubjects({ includeHidden })).find((s) => s.name === name);
}
