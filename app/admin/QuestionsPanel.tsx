"use client";
import { AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ListChecks, LoaderCircle, Pencil, Search, ToggleLeft, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { GRADES } from "@/lib/subjects";
import EditQuestionDialog from "./EditQuestionDialog";
import { ago, pct } from "./ResultsPanel";
import { plainSummary } from "@/lib/highlight";

export type QuestionRow = {
  id: string; prompt: string; type: "mcq" | "truefalse"; grade: string; unit: string; year: string;
  choices: string[]; correctAnswer: number; explanation: string;
  published: boolean; teacher: string; mine: boolean; createdAt: string; answers: number; correct: number;
};

/** Questions in the teacher's subject. Teachers can hide/publish or delete their own. */
export default function QuestionsPanel({ subject, rows, canManageAll, onChanged, onAdd }: {
  subject: string; rows: QuestionRow[] | null; canManageAll: boolean; onChanged: (text: string, ok?: boolean) => void; onAdd: () => void;
}) {
  const [query, setQuery] = useState("");
  const [grade, setGrade] = useState("");
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<QuestionRow | null>(null);

  const list = useMemo(() => (rows ?? []).filter((q) => (scope === "all" || q.mine) && (!grade || q.grade === grade) && (q.prompt + q.unit).toLowerCase().includes(query.toLowerCase())), [rows, scope, grade, query]);

  async function toggle(q: QuestionRow) {
    setBusy(q.id);
    const response = await fetch("/api/questions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: q.id, published: !q.published }) }).catch(() => null);
    setBusy(null);
    onChanged(response?.ok ? (q.published ? "Question hidden from students." : "Question published to students.") : "Could not update the question.", response?.ok);
  }
  async function remove(q: QuestionRow) {
    if (!window.confirm(`Delete this question permanently?\n\n“${q.prompt.slice(0, 120)}”\n\nIts ${q.answers} recorded answer(s) will also be removed.`)) return;
    setBusy(q.id);
    const response = await fetch(`/api/questions?id=${q.id}`, { method: "DELETE" }).catch(() => null);
    setBusy(null);
    onChanged(response?.ok ? "Question deleted." : "Could not delete the question.", response?.ok);
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold">{subject} questions</h2>
          <p className="text-sm text-slate-500">See how students do on each question. Hide a question to take it out of practice without deleting it.</p>
        </div>
        <div className="inline-grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-xs font-bold">
          {(["mine", "all"] as const).map((s) => (
            <button key={s} onClick={() => setScope(s)} className={`rounded-lg px-3 py-1.5 ${scope === s ? "bg-white text-navy shadow-sm" : "text-slate-500"}`}>
              {s === "mine" ? `Mine (${(rows ?? []).filter((q) => q.mine).length})` : `All in ${subject} (${rows?.length ?? 0})`}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <label className="flex min-w-56 flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm focus-within:border-royal">
          <Search size={15} className="text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search question text or unit" className="w-full outline-none" />
        </label>
        <select value={grade} onChange={(e) => setGrade(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">All grades</option>{GRADES.map((g) => <option key={g}>{g}</option>)}</select>
      </div>

      <ul className="mt-4 grid gap-2.5">
        {rows === null && Array.from({ length: 3 }, (_, i) => <li key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}
        {list.map((q) => {
          const p = pct(q.correct, q.answers);
          const manageable = q.mine || canManageAll;
          return (
            <li key={q.id} className={`rounded-2xl border p-4 ${q.published ? "border-slate-200" : "border-dashed border-slate-300 bg-slate-50"}`}>
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{q.type === "truefalse" ? <ToggleLeft size={11} /> : <ListChecks size={11} />}{q.type === "truefalse" ? "True / False" : "Multiple choice"}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{q.grade}</span>
                    {q.unit && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{q.unit}</span>}
                    {!q.published && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">Hidden</span>}
                    {!q.mine && <span className="text-slate-400">by {q.teacher}</span>}
                  </div>
                  <p className="mt-1.5 line-clamp-2 font-semibold" title={plainSummary(q.prompt)}>{plainSummary(q.prompt)}</p>
                  <p className="mt-1 text-xs text-slate-500">{q.answers ? <>Answered {q.answers}× · <b className="text-navy">{p}% correct</b></> : "No answers yet"} · added {ago(q.createdAt)}</p>
                </div>
                {q.answers > 0 && (
                  <span className="hidden w-24 shrink-0 sm:block" title={`${p}% correct`}><span className="block h-2 rounded bg-[#cde2fb]"><span className="block h-full rounded bg-[#2a78d6]" style={{ width: `${p}%` }} /></span></span>
                )}
                {manageable && (
                  <div className="flex shrink-0 gap-1.5">
                    <button disabled={busy === q.id} onClick={() => setEditing(q)} title="Edit question" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-bold text-slate-600 hover:border-royal hover:text-royal disabled:opacity-50"><Pencil size={14} /> Edit</button>
                    <button disabled={busy === q.id} onClick={() => toggle(q)} title={q.published ? "Hide from students" : "Publish to students"} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:border-royal hover:text-royal disabled:opacity-50">
                      {busy === q.id ? <LoaderCircle size={15} className="animate-spin" /> : q.published ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                    <button disabled={busy === q.id} onClick={() => remove(q)} title="Delete question" className="rounded-lg border border-red-200 p-2 text-red-500 hover:bg-red-50 disabled:opacity-50"><Trash2 size={15} /></button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {rows && !list.length && (
        <div className="py-10 text-center text-sm text-slate-500">
          {rows.length ? "No questions match these filters." : <>No {subject} questions yet. <button onClick={onAdd} className="font-bold text-royal hover:underline">Add the first one</button></>}
        </div>
      )}
      <AnimatePresence>
        {editing && <EditQuestionDialog question={editing} subject={subject} onClose={() => setEditing(null)} onSaved={(text) => { setEditing(null); onChanged(text, true); }} />}
      </AnimatePresence>
    </section>
  );
}
