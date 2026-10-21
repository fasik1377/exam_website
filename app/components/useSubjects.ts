"use client";
import { useEffect, useState } from "react";
import { SUBJECTS, type Subject } from "@/lib/subjects";

let cached: Subject[] | null = null;
let inflight: Promise<Subject[]> | null = null;

function load(): Promise<Subject[]> {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = fetch("/api/subjects", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { subjects: Subject[] }) => (cached = d.subjects))
      .catch(() => SUBJECTS)
      .finally(() => { inflight = null; });
  }
  return inflight;
}

/** Forget the cached list (after the super admin changes subjects). */
export function refreshSubjects() {
  cached = null;
}

/**
 * The live subject list managed by the super admin. Starts with the built-in list so pages render
 * immediately (and identically on the server), then swaps in the live list.
 */
export function useSubjects(): Subject[] {
  const [list, setList] = useState<Subject[]>(SUBJECTS);
  useEffect(() => {
    let active = true;
    load().then((subjects) => active && setList(subjects));
    return () => { active = false; };
  }, []);
  return list;
}
