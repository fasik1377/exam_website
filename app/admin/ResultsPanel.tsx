"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownUp, CheckCircle2, Download, LoaderCircle, MessageCircle, Search, X, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { GRADES, streamLabel } from "@/lib/subjects";
import { plainSummary } from "@/lib/highlight";

export type StudentRow = {
  id: string; name: string; email: string; grade: string | null; stream: "natural" | "social" | null; status: string;
  answers: number; correct: number; lastActive: string | null; firstActive: string | null;
};
type Detail = {
  student: { id: string; name: string; email: string; grade: string | null; stream: string | null; status: string; joined: string };
  total: number; correct: number;
  units: { unit: string; total: number; correct: number }[];
  attempts: { id: string; createdAt: string; correct: boolean; prompt: string; type: string; grade: string; unit: string; chosen: string; answer: string }[];
};

export const pct = (correct: number, total: number) => (total ? Math.round((correct / total) * 100) : 0);
/** Plain-language standing; always shown with a label, never colour alone. */
export function standing(row: { answers: number; correct: number }) {
  if (!row.answers) return { label: "Not started", tone: "bg-slate-100 text-slate-500" };
  const p = pct(row.correct, row.answers);
  if (p < 50) return row.answers >= 3 ? { label: "Needs help", tone: "bg-red-50 text-red-700" } : { label: "Getting started", tone: "bg-amber-50 text-amber-700" };
  if (p >= 80) return { label: "Excellent", tone: "bg-green-50 text-green-700" };
  return { label: "On track", tone: "bg-blue-50 text-royal" };
}
export const ago = (iso: string | null) => {
  if (!iso) return "—";
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  for (const [size, unit] of [[86400 * 30, "mo"], [86400, "d"], [3600, "h"], [60, "min"]] as const) if (s >= size) return `${Math.floor(s / size)} ${unit} ago`;
  return "just now";
};

type SortKey = "name" | "answers" | "accuracy" | "last";
type Sort = { key: SortKey; dir: 1 | -1 };

function SortButton({ k, sort, setSort, children }: { k: SortKey; sort: Sort; setSort: (update: (s: Sort) => Sort) => void; children: React.ReactNode }) {
  return (
    <button onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? (s.dir === 1 ? -1 : 1) : k === "name" ? 1 : -1 }))} className={`inline-flex items-center gap-1 uppercase ${sort.key === k ? "text-navy" : ""}`}>
      {children}<ArrowDownUp size={11} className={sort.key === k ? "text-royal" : "opacity-40"} />
    </button>
  );
}

/** Results of the students in the teacher's subject. */
export default function ResultsPanel({ subject, rows, subjectQuery }: { subject: string; rows: StudentRow[] | null; subjectQuery: string }) {
  const [query, setQuery] = useState("");
  const [grade, setGrade] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);
  const [sort, setSort] = useState<Sort>({ key: "last", dir: -1 });
  const [openId, setOpenId] = useState<string | null>(null);

  const list = useMemo(() => {
    const filtered = (rows ?? []).filter((r) => (!grade || r.grade === grade) && (!onlyActive || r.answers > 0) && (r.name + r.email).toLowerCase().includes(query.toLowerCase()));
    const value = (r: StudentRow) => sort.key === "name" ? r.name.toLowerCase() : sort.key === "answers" ? r.answers : sort.key === "accuracy" ? (r.answers ? pct(r.correct, r.answers) : -1) : r.lastActive ? new Date(r.lastActive).getTime() : 0;
    return [...filtered].sort((a, b) => (value(a) > value(b) ? 1 : value(a) < value(b) ? -1 : 0) * sort.dir);
  }, [rows, grade, onlyActive, query, sort]);

  function exportCsv() {
    const header = ["Name", "Email", "Grade", "Stream", "Answers", "Correct", "Accuracy %", "Standing", "Last active"];
    const lines = list.map((r) => [r.name, r.email, r.grade ?? "", streamLabel(r.stream), r.answers, r.correct, r.answers ? pct(r.correct, r.answers) : "", standing(r).label, r.lastActive ? new Date(r.lastActive).toISOString() : ""]);
    const csv = [header, ...lines].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    Object.assign(document.createElement("a"), { href: url, download: `${subject.toLowerCase().replace(/\s+/g, "-")}-results.csv` }).click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold">Student results · {subject}</h2>
          <p className="text-sm text-slate-500">Only students who study {subject} — and only their {subject} answers — are shown.</p>
        </div>
        <button onClick={exportCsv} disabled={!list.length} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-bold hover:border-royal disabled:opacity-50"><Download size={15} /> Export CSV</button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <label className="flex min-w-56 flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm focus-within:border-royal">
          <Search size={15} className="text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search students by name or email" className="w-full outline-none" />
        </label>
        <select value={grade} onChange={(e) => setGrade(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">All grades</option>{GRADES.map((g) => <option key={g}>{g}</option>)}</select>
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"><input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} className="accent-royal" /> Only students who practised</label>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-slate-200 text-[11px] font-bold tracking-wider text-slate-500">
            <tr>
              <th className="pb-3"><SortButton sort={sort} setSort={setSort} k="name">Student</SortButton></th>
              <th className="pb-3 uppercase">Grade</th>
              <th className="pb-3"><SortButton sort={sort} setSort={setSort} k="answers">Answers</SortButton></th>
              <th className="pb-3"><SortButton sort={sort} setSort={setSort} k="accuracy">Accuracy</SortButton></th>
              <th className="pb-3 uppercase">Standing</th>
              <th className="pb-3"><SortButton sort={sort} setSort={setSort} k="last">Last active</SortButton></th>
            </tr>
          </thead>
          <tbody>
            {rows === null && Array.from({ length: 4 }, (_, i) => <tr key={i}><td colSpan={6} className="py-2"><div className="h-10 animate-pulse rounded-xl bg-slate-100" /></td></tr>)}
            {list.map((r) => {
              const p = pct(r.correct, r.answers);
              const st = standing(r);
              return (
                <tr key={r.id} onClick={() => setOpenId(r.id)} className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-blue-50/40">
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-royal to-sky-500 text-xs font-extrabold text-white">{r.name.charAt(0).toUpperCase()}</span>
                      <div className="min-w-0"><p className="truncate font-bold">{r.name}</p><p className="truncate text-xs text-slate-500">{r.email}</p></div>
                    </div>
                  </td>
                  <td>{r.grade ?? <span className="text-amber-700">Not set</span>}{r.stream && <span className="block text-xs text-slate-500">{streamLabel(r.stream)}</span>}</td>
                  <td className="tabular-nums">{r.answers}</td>
                  <td>
                    {r.answers ? (
                      <span className="flex items-center gap-2"><span className="h-2 w-20 rounded bg-[#cde2fb]"><span className="block h-full rounded bg-[#2a78d6]" style={{ width: `${p}%` }} /></span><b className="tabular-nums">{p}%</b></span>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  <td><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${st.tone}`}>{st.label}</span></td>
                  <td className="text-slate-500">{ago(r.lastActive)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows && !list.length && <p className="py-10 text-center text-sm text-slate-500">{rows.length ? "No students match these filters." : `No approved students study ${subject} yet.`}</p>}
      </div>

      <AnimatePresence>{openId && <StudentDrawer id={openId} subjectQuery={subjectQuery} onClose={() => setOpenId(null)} />}</AnimatePresence>
    </section>
  );
}

function StudentDrawer({ id, subjectQuery, onClose }: { id: string; subjectQuery: string; onClose: () => void }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [messaging, setMessaging] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/teacher/results/${id}${subjectQuery}`, { cache: "no-store" })
      .then(async (r) => { const d = await r.json(); if (!active) return; if (r.ok) setDetail(d); else setError(d.error || "Could not load results."); })
      .catch(() => active && setError("Network error."));
    return () => { active = false; };
  }, [id, subjectQuery]);

  async function message() {
    setMessaging(true);
    const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: id }) }).catch(() => null);
    if (response?.ok) window.location.href = "/chat";
    else setMessaging(false);
  }

  const p = detail ? pct(detail.correct, detail.total) : 0;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.aside initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 34 }} className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
          {detail ? (
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-royal to-sky-500 text-lg font-extrabold text-white">{detail.student.name.charAt(0).toUpperCase()}</span>
              <div>
                <p className="text-lg font-extrabold">{detail.student.name}</p>
                <p className="text-sm text-slate-500">{detail.student.email}</p>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">{detail.student.grade ?? "Grade not set"}{detail.student.stream ? ` · ${streamLabel(detail.student.stream)}` : ""} · joined {ago(detail.student.joined)}</p>
              </div>
            </div>
          ) : <div className="h-12 w-60 animate-pulse rounded-xl bg-slate-100" />}
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-slate-100" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
          {!detail && !error && <div className="grid place-items-center py-16"><LoaderCircle className="animate-spin text-slate-400" /></div>}
          {detail && (
            <>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[{ label: "Answers", value: detail.total }, { label: "Correct", value: detail.correct }, { label: "Accuracy", value: `${p}%` }].map((s) => (
                  <div key={s.label} className="rounded-2xl bg-slate-50 p-3"><p className="text-2xl font-extrabold tabular-nums">{s.value}</p><p className="text-xs font-semibold text-slate-500">{s.label}</p></div>
                ))}
              </div>
              <button onClick={message} disabled={messaging} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy py-2.5 text-sm font-bold text-white hover:bg-royal disabled:opacity-60">
                {messaging ? <LoaderCircle size={16} className="animate-spin" /> : <MessageCircle size={16} />} Message this student
              </button>

              {detail.units.length > 0 && (
                <>
                  <p className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-400">By unit</p>
                  <ul className="mt-2 grid gap-2.5">
                    {detail.units.map((u) => {
                      const up = pct(u.correct, u.total);
                      return (
                        <li key={u.unit} className="grid grid-cols-[1fr_6rem_4.5rem] items-center gap-3 text-sm">
                          <span className="truncate text-slate-600">{u.unit}</span>
                          <span className="h-2 rounded bg-[#cde2fb]"><span className="block h-full rounded bg-[#2a78d6]" style={{ width: `${up}%` }} /></span>
                          <span className="text-right tabular-nums"><b>{up}%</b> <span className="text-xs text-slate-400">· {u.total}</span></span>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}

              <p className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-400">Answers ({detail.attempts.length})</p>
              {!detail.attempts.length && <p className="mt-3 text-sm text-slate-500">This student hasn&apos;t answered any questions in this subject yet.</p>}
              <ul className="mt-2 grid gap-2">
                {detail.attempts.map((a) => (
                  <li key={a.id} className={`rounded-2xl border p-3 ${a.correct ? "border-green-100 bg-green-50/40" : "border-red-100 bg-red-50/40"}`}>
                    <div className="flex items-start gap-2.5">
                      {a.correct ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-600" /> : <XCircle size={18} className="mt-0.5 shrink-0 text-red-500" />}
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-semibold">{plainSummary(a.prompt)}</p>
                        <p className="mt-1 text-xs text-slate-600">
                          Answered: <b className={a.correct ? "text-green-700" : "text-red-600"}>{a.chosen}</b>
                          {!a.correct && <> · Correct: <b className="text-green-700">{a.answer}</b></>}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400">{[a.grade, a.unit].filter(Boolean).join(" · ")} · {new Date(a.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </motion.aside>
    </motion.div>
  );
}
