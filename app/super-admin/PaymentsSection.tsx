"use client";
import { motion } from "framer-motion";
import { CreditCard, Gift, LoaderCircle, Lock, Save } from "lucide-react";
import { useEffect, useState } from "react";

type Settings = { paymentRequired: boolean; freeQuestions: number };

async function fetchSettings(): Promise<Settings | null> {
  const response = await fetch("/api/admin/settings", { cache: "no-store" }).catch(() => null);
  return response?.ok ? response.json() : null;
}

/** Super admin: switch student payment on/off and choose how many questions are free. */
export default function PaymentsSection({ onToast }: { onToast: (ok: boolean, text: string) => void }) {
  const [saved, setSaved] = useState<Settings | null>(null);
  const [form, setForm] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    fetchSettings().then((s) => { if (active && s) { setSaved(s); setForm(s); } });
    return () => { active = false; };
  }, []);

  async function save(next: Settings) {
    setSaving(true);
    const response = await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) }).catch(() => null);
    const data = await response?.json().catch(() => ({}));
    setSaving(false);
    if (!response?.ok) return onToast(false, data?.error || "Could not save the payment setting.");
    setSaved(data); setForm(data);
    onToast(true, data.paymentRequired ? `Payment is ON — students get ${data.freeQuestions} free question${data.freeQuestions === 1 ? "" : "s"} per subject, then must subscribe.` : "Payment is OFF — every question and explanation is free for all students.");
  }

  if (!form || !saved) return <div className="mt-5 h-72 animate-pulse rounded-3xl bg-slate-100" />;
  const dirty = form.freeQuestions !== saved.freeQuestions;
  const on = saved.paymentRequired;

  return (
    <div className="mt-5">
      <p className="text-xs font-bold uppercase tracking-[.16em] text-royal">Monetisation</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Student payments</h1>
      <p className="mt-1 text-sm text-slate-500">Decide whether students practise for free or subscribe after a number of free questions. Changes apply immediately.</p>

      <section className="mt-6 grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 lg:grid-cols-[1fr_20rem]">
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold">Require payment</h2>
              <p className="mt-1 max-w-md text-sm text-slate-500">{on ? "ON — students without a subscription are stopped after the free questions and can't read the explanations." : "OFF — the whole question bank and every explanation is free for everyone."}</p>
            </div>
            <button role="switch" aria-checked={on} aria-label="Require payment" disabled={saving} onClick={() => save({ ...form, paymentRequired: !on })}
              className={`relative h-9 w-16 shrink-0 rounded-full transition-colors disabled:opacity-60 ${on ? "bg-royal" : "bg-slate-300"}`}>
              <motion.span layout transition={{ type: "spring", stiffness: 500, damping: 32 }} className={`absolute top-1 grid h-7 w-7 place-items-center rounded-full bg-white shadow ${on ? "right-1" : "left-1"}`}>
                {saving ? <LoaderCircle size={14} className="animate-spin text-slate-400" /> : on ? <CreditCard size={14} className="text-royal" /> : <Gift size={14} className="text-slate-500" />}
              </motion.span>
            </button>
          </div>

          <div className={`mt-6 border-t border-slate-100 pt-6 transition-opacity ${on ? "" : "pointer-events-none opacity-40"}`}>
            <label htmlFor="free-questions" className="text-sm font-bold">Free questions per subject</label>
            <p className="text-xs text-slate-500">How many questions a student can answer in each subject before paying (0 = pay from the first question).</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input id="free-questions" type="number" min={0} max={100} value={form.freeQuestions} onChange={(e) => setForm({ ...form, freeQuestions: Math.max(0, Math.min(100, Math.round(Number(e.target.value) || 0))) })}
                className="w-28 rounded-xl border border-slate-200 px-3.5 py-2.5 text-lg font-extrabold tabular-nums outline-none focus:border-royal" />
              {[5, 10, 20, 50].map((n) => (
                <button key={n} onClick={() => setForm({ ...form, freeQuestions: n })} className={`rounded-lg border px-3 py-2 text-sm font-bold ${form.freeQuestions === n ? "border-royal bg-blue-50 text-royal" : "border-slate-200 hover:border-royal"}`}>{n}</button>
              ))}
              <button disabled={!dirty || saving} onClick={() => save(form)} className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-bold text-white hover:bg-royal disabled:opacity-40"><Save size={15} /> Save</button>
            </div>
          </div>
        </div>

        {/* What students see */}
        <div className={`rounded-2xl p-5 ${on ? "bg-amber-50" : "bg-green-50"}`}>
          <p className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">What students see now</p>
          {on ? (
            <>
              <p className="mt-3 flex items-center gap-2 font-extrabold text-amber-800"><Lock size={18} /> Paid access</p>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
                <li>• First <b>{saved.freeQuestions}</b> question{saved.freeQuestions === 1 ? "" : "s"} of each subject free</li>
                <li>• Explanations for subscribers only</li>
                <li>• Monthly / yearly subscribers: unlimited</li>
              </ul>
            </>
          ) : (
            <>
              <p className="mt-3 flex items-center gap-2 font-extrabold text-green-700"><Gift size={18} /> Free for everyone</p>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
                <li>• Every question in every subject</li>
                <li>• All teacher explanations</li>
                <li>• No subscription prompts</li>
              </ul>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
