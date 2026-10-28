"use client";
import { motion } from "framer-motion";
import { AlertTriangle, BookOpen, CheckCircle2, GraduationCap, Target, Users, XCircle } from "lucide-react";
import { Meter, Sparkline, TrendChart } from "@/app/super-admin/charts";
import { ago, pct, standing, type StudentRow } from "./ResultsPanel";
import { plainSummary } from "@/lib/highlight";

export type Overview = {
  subject: string; questions: number; myQuestions: number; students: number; activeLearners: number;
  answers: number; correct: number; perDay: { date: string; count: number }[];
  hardest: { id: string; prompt: string; grade: string; total: number; correct: number }[];
  recent: { student: string; grade: string; prompt: string; correct: boolean; createdAt: string }[];
};

/** Subject-wide picture for the teacher: activity, accuracy, who needs help, hardest questions. */
export default function TeacherOverview({ data, students, onOpenResults }: { data: Overview | null; students: StudentRow[] | null; onOpenResults: () => void }) {
  const accuracy = data ? pct(data.correct, data.answers) : 0;
  const needHelp = (students ?? []).filter((s) => standing(s).label === "Needs help").sort((a, b) => pct(a.correct, a.answers) - pct(b.correct, b.answers)).slice(0, 5);
  const tiles = [
    { label: `Students in ${data?.subject ?? "your subject"}`, value: data?.students, icon: Users, tint: "bg-blue-50 text-royal" },
    { label: "Students who practised", value: data?.activeLearners, icon: GraduationCap, tint: "bg-sky-50 text-sky-600" },
    { label: "Answers submitted", value: data?.answers, icon: Target, tint: "bg-emerald-50 text-emerald-600", spark: data?.perDay.map((d) => d.count) },
    { label: `My questions (of ${data?.questions ?? "–"})`, value: data?.myQuestions, icon: BookOpen, tint: "bg-orange-50 text-orange-600" },
  ];

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t, i) => (
          <motion.div key={t.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card-lift rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between">
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${t.tint}`}><t.icon size={20} /></span>
              {t.spark && t.spark.length > 0 && <Sparkline values={t.spark} />}
            </div>
            <p className="mt-4 text-3xl font-extrabold tabular-nums">{t.value ?? <span className="inline-block h-8 w-12 animate-pulse rounded bg-slate-100 align-middle" />}</p>
            <p className="text-sm text-slate-500">{t.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="font-bold">Practice activity</h2>
          <p className="text-sm text-slate-500">{data ? `${data.perDay.reduce((s, d) => s + d.count, 0)} ${data.subject} answers in the last 14 days` : "Loading…"}</p>
          <div className="mt-4">{data ? <TrendChart data={data.perDay} label="Answers" /> : <div className="h-56 animate-pulse rounded-2xl bg-slate-100" />}</div>
        </section>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="font-bold">Class accuracy</h2>
          <p className="text-sm text-slate-500">Share of correct answers in {data?.subject ?? "your subject"}</p>
          <div className="mt-4 flex items-end gap-2"><span className="text-5xl font-extrabold tabular-nums">{accuracy}</span><span className="mb-1.5 text-xl font-bold text-slate-400">%</span></div>
          <div className="mt-3"><Meter value={accuracy} label="Class accuracy" /></div>
          <p className="mt-2 text-sm text-slate-500">{data?.correct ?? 0} correct of {data?.answers ?? 0} answers</p>

          <p className="mt-6 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400"><AlertTriangle size={13} className="text-red-500" /> Students who need help</p>
          {needHelp.length ? (
            <ul className="mt-2 grid gap-2">
              {needHelp.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 rounded-xl bg-red-50/60 px-3 py-2 text-sm">
                  <span className="min-w-0 truncate font-semibold">{s.name} <span className="text-xs font-normal text-slate-500">· {s.grade ?? "—"}</span></span>
                  <span className="shrink-0 text-xs font-bold text-red-700">{pct(s.correct, s.answers)}% of {s.answers}</span>
                </li>
              ))}
            </ul>
          ) : <p className="mt-2 text-sm text-slate-500">No one is struggling right now (below 50% with 3+ answers).</p>}
          <button onClick={onOpenResults} className="mt-3 text-sm font-bold text-royal hover:underline">See all student results →</button>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="font-bold">Hardest questions</h2>
          <p className="text-sm text-slate-500">Lowest share of correct answers — worth explaining in class</p>
          {data?.hardest.length ? (
            <ul className="mt-4 grid gap-2.5">
              {data.hardest.map((h) => {
                const p = pct(h.correct, h.total);
                return (
                  <li key={h.id} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-slate-100 p-3 text-sm">
                    <span className="min-w-0"><span className="line-clamp-2 font-semibold">{plainSummary(h.prompt)}</span><span className="text-xs text-slate-500">{h.grade} · {h.total} answers</span></span>
                    <span className="text-right"><b className="tabular-nums">{p}%</b><span className="block text-[11px] text-slate-400">correct</span></span>
                  </li>
                );
              })}
            </ul>
          ) : <p className="mt-6 text-sm text-slate-500">Question difficulty appears once students start answering.</p>}
        </section>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="font-bold">Latest answers</h2>
          <p className="text-sm text-slate-500">Live activity from your students</p>
          {data?.recent.length ? (
            <ul className="mt-4 grid gap-2.5">
              {data.recent.map((r, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  {r.correct ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-600" /> : <XCircle size={18} className="mt-0.5 shrink-0 text-red-500" />}
                  <span className="min-w-0 flex-1"><b>{r.student}</b> <span className="text-slate-500">{r.grade && `(${r.grade})`} answered {r.correct ? "correctly" : "incorrectly"}</span><span className="block truncate text-xs text-slate-500">{r.prompt}</span></span>
                  <span className="shrink-0 text-xs text-slate-400">{ago(r.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="mt-6 text-sm text-slate-500">No answers yet.</p>}
        </section>
      </div>
    </div>
  );
}
