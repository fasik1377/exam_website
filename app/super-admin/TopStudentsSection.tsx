"use client";
import { motion } from "framer-motion";
import { CalendarClock, Crown, LoaderCircle, Mail, RotateCcw, Save, Sigma, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Criteria = { accuracyWeight: number; volumeWeight: number; consistencyWeight: number; minAnswers: number; minDays: number; volumeCap: number; scope: "overall" | "grade"; emailWinners: boolean };
type Row = { userId: string; name: string; grade: string | null; answers: number; correct: number; days: number; subjects: number; accuracy: number; smoothedAccuracy: number; score: number; rank: number | null };
type Data = {
  criteria: Criteria; defaults: Criteria; cron: boolean;
  week: { start: string; end: string; label: string };
  live: Row[];
  history: { key: string; label: string; scope: string; trigger: string; createdAt: string; winners: (Row & { rank: number })[] }[];
};
const MEDAL = ["", "🥇", "🥈", "🥉"];
const pct = (x: number) => `${Math.round(x * 100)}%`;

async function fetchData(): Promise<{ data?: Data; error?: string }> {
  const response = await fetch("/api/admin/top-students", { cache: "no-store" }).catch(() => null);
  const data = await response?.json().catch(() => ({}));
  return response?.ok ? { data } : { error: data?.error || "Could not load the top students." };
}

/** Same formula as the server (lib/topStudents.ts), so the preview updates while the admin edits. */
function rescore(rows: Row[], c: Criteria) {
  const total = c.accuracyWeight + c.volumeWeight + c.consistencyWeight || 1;
  const scored = rows.map((r) => {
    const parts = {
      accuracy: (c.accuracyWeight * r.smoothedAccuracy * 100) / total,
      effort: (c.volumeWeight * (Math.min(r.answers, c.volumeCap) / c.volumeCap) * 100) / total,
      consistency: (c.consistencyWeight * (Math.min(r.days, 7) / 7) * 100) / total,
    };
    const score = Math.round((parts.accuracy + parts.effort + parts.consistency) * 10) / 10;
    return { ...r, parts, score, eligible: r.answers >= c.minAnswers && r.days >= c.minDays, rank: null as number | null };
  });
  scored.sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score || b.correct - a.correct || b.answers - a.answers);
  const counters = new Map<string, number>();
  for (const s of scored) {
    if (!s.eligible) continue;
    const g = c.scope === "grade" ? s.grade ?? "No grade" : "all";
    counters.set(g, (counters.get(g) ?? 0) + 1);
    s.rank = counters.get(g)!;
  }
  return scored;
}

/** Super admin: how the students of the week are chosen, this week's live ranking and past winners. */
export default function TopStudentsSection({ onToast }: { onToast: (ok: boolean, text: string) => void }) {
  const [data, setData] = useState<Data | null>(null);
  const [form, setForm] = useState<Criteria | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let on = true;
    fetchData().then((r) => { if (!on) return; setError(r.error ?? ""); if (r.data) { setData(r.data); setForm(r.data.criteria); } });
    return () => { on = false; };
  }, []);

  const preview = useMemo(() => (data && form ? rescore(data.live, form) : []), [data, form]);
  if (error) return <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>;
  if (!data || !form) return <div className="mt-5 h-96 animate-pulse rounded-3xl bg-slate-100" />;

  const total = form.accuracyWeight + form.volumeWeight + form.consistencyWeight || 1;
  const dirty = JSON.stringify(form) !== JSON.stringify(data.criteria);
  const set = (patch: Partial<Criteria>) => setForm({ ...form, ...patch });
  const when = new Date(data.week.end).toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Africa/Addis_Ababa" });
  const eligible = preview.filter((r) => r.eligible).length;

  async function save() {
    setSaving(true);
    const response = await fetch("/api/admin/top-students", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }).catch(() => null);
    const body = await response?.json().catch(() => ({}));
    setSaving(false);
    if (!response?.ok) return onToast(false, body?.error || "Could not save the criteria.");
    setData({ ...data!, criteria: body.criteria });
    onToast(true, "Top-scorer criteria saved. They apply from this week's announcement.");
  }

  const weights: { key: "accuracyWeight" | "volumeWeight" | "consistencyWeight"; label: string; color: string; help: string }[] = [
    { key: "accuracyWeight", label: "Accuracy", color: "#2a78d6", help: "Share of correct answers, smoothed: (correct + 2) ÷ (answers + 4)" },
    { key: "volumeWeight", label: "Effort", color: "#eb6834", help: `Answers this week ÷ ${form.volumeCap} (capped)` },
    { key: "consistencyWeight", label: "Consistency", color: "#1baf7a", help: "Days practised this week ÷ 7" },
  ];

  return (
    <div className="mt-5 grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-royal">Recognition</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Top students of the week</h1>
          <p className="mt-1 text-sm text-slate-500">Every Saturday at 12:00 PM (Addis Ababa) the top 3 are announced, shown to all students, and notified in the app{form.emailWinners ? " and by email" : ""}.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-2xl bg-navy px-4 py-2.5 text-sm font-bold text-white"><CalendarClock size={16} className="text-gold" /> Next announcement: {when}</span>
      </div>
      {!data.cron && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <b>Automatic Saturday announcement:</b> add a <code className="rounded bg-white px-1">CRON_SECRET</code> environment variable in Vercel (any long random text) so the scheduled job runs exactly at 12:00 PM. Until then the week is announced as soon as anyone opens a dashboard after Saturday 12:00 PM.
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        {/* Criteria */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="flex items-center gap-2 text-lg font-extrabold"><Sigma size={18} className="text-royal" /> Top-scorer criteria</h2>
          <p className="mt-1 text-sm text-slate-500">Weekly score = weighted mix of three measures (out of 100). Weights are shared out in proportion.</p>
          <div className="mt-5 grid gap-5">
            {weights.map((w) => (
              <div key={w.key}>
                <div className="flex items-center justify-between text-sm">
                  <label htmlFor={w.key} className="flex items-center gap-2 font-bold"><i className="h-2.5 w-2.5 rounded-full" style={{ background: w.color }} />{w.label}</label>
                  <span className="font-extrabold tabular-nums">{Math.round((form[w.key] / total) * 100)}%</span>
                </div>
                <input id={w.key} type="range" min={0} max={100} step={5} value={form[w.key]} onChange={(e) => set({ [w.key]: Number(e.target.value) })} className="mt-2 w-full" style={{ accentColor: w.color }} />
                <p className="text-xs text-slate-500">{w.help}</p>
              </div>
            ))}
            <div className="flex h-3 overflow-hidden rounded-full">{weights.map((w) => <motion.span key={w.key} animate={{ width: `${(form[w.key] / total) * 100}%` }} style={{ background: w.color }} />)}</div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { key: "minAnswers" as const, label: "Min. answers", min: 0, max: 1000, help: "to qualify" },
                { key: "minDays" as const, label: "Min. active days", min: 0, max: 7, help: "of 7" },
                { key: "volumeCap" as const, label: "Effort cap", min: 10, max: 5000, help: "answers = full effort" },
              ].map((f) => (
                <label key={f.key} className="text-sm font-bold">{f.label}
                  <input type="number" min={f.min} max={f.max} value={form[f.key]} onChange={(e) => set({ [f.key]: Math.max(f.min, Math.min(f.max, Math.round(Number(e.target.value) || 0))) })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 font-extrabold tabular-nums" />
                  <span className="text-xs font-normal text-slate-500">{f.help}</span>
                </label>
              ))}
            </div>

            <div>
              <p className="text-sm font-bold">Rank students</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {([["overall", "All together", "One top 3 for the platform"], ["grade", "By grade", "A top 3 in each grade (9–12)"]] as const).map(([v, t, d]) => (
                  <button key={v} type="button" onClick={() => set({ scope: v })} className={`rounded-xl border-2 p-3 text-left ${form.scope === v ? "border-royal bg-blue-50" : "border-slate-200"}`}>
                    <span className="flex items-center gap-1.5 text-sm font-bold">{v === "grade" ? <Users size={15} /> : <Crown size={15} />}{t}</span>
                    <span className="text-xs text-slate-500">{d}</span>
                  </button>
                ))}
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm">
              <input type="checkbox" checked={form.emailWinners} onChange={(e) => set({ emailWinners: e.target.checked })} className="h-4 w-4 accent-[#155EEF]" />
              <span><span className="flex items-center gap-1.5 font-bold"><Mail size={14} /> Email the winners</span><span className="text-xs text-slate-500">They always get an in-app congratulation; you also get a summary email.</span></span>
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setForm(data.defaults)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold hover:border-royal"><RotateCcw size={15} /> Defaults</button>
              <button type="button" disabled={!dirty || saving} onClick={save} className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-royal disabled:opacity-40">{saving ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />} Save criteria</button>
            </div>
          </div>
        </section>

        {/* Live ranking */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-extrabold">This week so far</h2>
              <p className="text-sm text-slate-500">{data.week.label} · {eligible} qualified of {preview.length} active{dirty && <b className="text-royal"> · preview with unsaved criteria</b>}</p>
            </div>
            <div className="flex gap-3 text-[11px] font-bold text-slate-500">{weights.map((w) => <span key={w.key} className="flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: w.color }} />{w.label}</span>)}</div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-wider text-slate-400"><th className="pb-2">#</th><th className="pb-2">Student</th><th className="pb-2 text-right">Answers</th><th className="pb-2 text-right">Correct</th><th className="pb-2 text-right">Days</th><th className="pb-2 pl-4">Score</th></tr></thead>
              <tbody>
                {preview.slice(0, 25).map((r) => (
                  <tr key={r.userId} className={`border-t border-slate-100 ${r.eligible ? "" : "text-slate-400"}`}>
                    <td className="py-2.5 pr-2 font-extrabold">{r.rank ? (r.rank <= 3 ? MEDAL[r.rank] : r.rank) : "–"}</td>
                    <td className="py-2.5"><span className="font-bold">{r.name}</span><span className="block text-xs text-slate-500">{r.grade ?? "No grade"}{!r.eligible && ` · needs ${Math.max(0, form.minAnswers - r.answers) ? `${Math.max(0, form.minAnswers - r.answers)} answers` : ""}${Math.max(0, form.minAnswers - r.answers) && Math.max(0, form.minDays - r.days) ? " & " : ""}${Math.max(0, form.minDays - r.days) ? `${Math.max(0, form.minDays - r.days)} days` : ""}`}</span></td>
                    <td className="py-2.5 text-right tabular-nums">{r.answers}</td>
                    <td className="py-2.5 text-right tabular-nums">{pct(r.accuracy)}</td>
                    <td className="py-2.5 text-right tabular-nums">{r.days}</td>
                    <td className="py-2.5 pl-4">
                      <div className="flex items-center gap-2">
                        <span className="flex h-2.5 w-28 overflow-hidden rounded-full bg-slate-100">
                          <span style={{ width: `${r.parts.accuracy}%`, background: "#2a78d6" }} /><span style={{ width: `${r.parts.effort}%`, background: "#eb6834" }} /><span style={{ width: `${r.parts.consistency}%`, background: "#1baf7a" }} />
                        </span>
                        <b className="tabular-nums text-navy">{r.score}</b>
                      </div>
                    </td>
                  </tr>
                ))}
                {!preview.length && <tr><td colSpan={6} className="py-8 text-center text-slate-500">No students have practised since Saturday 12:00 PM yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* History */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-extrabold">Past winners</h2>
        {data.history.length ? (
          <ul className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.history.map((h) => (
              <li key={h.key} className="rounded-2xl border border-slate-200 p-4">
                <p className="flex items-center justify-between text-sm font-extrabold">{h.label}<span className="text-[11px] font-bold text-slate-400">{h.scope === "grade" ? "by grade" : "overall"}</span></p>
                {h.winners.length ? (
                  <ol className="mt-2 grid gap-1 text-sm">{h.winners.map((w) => <li key={`${w.userId}-${w.rank}`} className="flex items-center gap-2"><span>{MEDAL[w.rank]}</span><span className="flex-1 truncate font-semibold">{w.name}</span><span className="text-xs text-slate-500">{w.grade ?? ""}</span><b className="tabular-nums">{w.score}</b></li>)}</ol>
                ) : <p className="mt-2 text-sm text-slate-500">No one qualified this week.</p>}
              </li>
            ))}
          </ul>
        ) : <p className="mt-3 text-sm text-slate-500">The first winners are announced on {when}.</p>}
      </section>
    </div>
  );
}
