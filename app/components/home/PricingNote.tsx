"use client";
import { Gift } from "lucide-react";
import { useEffect, useState } from "react";

type Settings = { paymentRequired: boolean; freeQuestions: number };

/** Pricing blurb that follows the super admin's payment setting. */
export default function PricingNote() {
  const [settings, setSettings] = useState<Settings | null>(null);
  useEffect(() => {
    let active = true;
    fetch("/api/settings").then((r) => (r.ok ? r.json() : null)).then((s) => active && s && setSettings(s)).catch(() => {});
    return () => { active = false; };
  }, []);

  if (settings && !settings.paymentRequired) {
    return (
      <>
        <p className="mt-4 max-w-md leading-7 text-slate-500">Right now every question and every teacher explanation is <b className="text-navy">free for all students</b>. Create an account and start practising today.</p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-xl bg-green-50 px-4 py-2.5 text-sm font-bold text-green-700 ring-1 ring-green-200"><Gift size={16} /> Free access is on</p>
      </>
    );
  }
  const n = settings?.freeQuestions ?? 10;
  return <p className="mt-4 max-w-md leading-7 text-slate-500">{n ? `Start free with the first ${n} question${n === 1 ? "" : "s"} of every subject.` : "Subscribe to start practising."} Subscribe to get the complete question bank, every explanation, and teacher support.</p>;
}
