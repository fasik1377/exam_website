"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Atom, BookOpenText, Calculator, Check, Clock3, CodeXml, Eye, EyeOff, GraduationCap, LoaderCircle, Pencil, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { refreshSubjects } from "@/app/components/useSubjects";
import { GRADES, gradeRange, hasPlayground, needsStream, type Grade, type Stream } from "@/lib/subjects";

type Row = { id: string; name: string; amharic: string; streams: Stream[]; grades: Grade[]; calculator: boolean; playground: boolean; minutes: number; hidden: boolean; questions: number; teachers: number };
type Draft = { id?: string; name: string; amharic: string; streams: Stream[]; grades: Grade[]; calculator: boolean; playground: boolean; minutes: number };
const EMPTY: Draft = { name: "", amharic: "", streams: ["natural", "social"], grades: [...GRADES], calculator: false, playground: false, minutes: 1 };
const PRESETS: { label: string; grades: Grade[] }[] = [
  { label: "All grades (9–12)", grades: [...GRADES] },
  { label: "Grades 9–10", grades: ["Grade 9", "Grade 10"] },
  { label: "Grades 11–12", grades: ["Grade 11", "Grade 12"] },
];
const MINUTES = [0.5, 1, 1.5, 2, 3, 4, 5];

async function fetchRows(): Promise<{ rows?: Row[]; error?: string }> {
  const response = await fetch("/api/admin/subjects", { cache: "no-store" }).catch(() => null);
  const data = await response?.json().catch(() => ({}));
  return response?.ok ? { rows: data.subjects } : { error: data?.error || "Could not load subjects." };
}

/** Super admin: add, edit, hide and delete exam subjects. */
export default function SubjectsSection({ onToast }: { onToast: (ok: boolean, text: string) => void }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const apply = useCallback((r: { rows?: Row[]; error?: string }) => { setError(r.error ?? ""); if (r.rows) setRows(r.rows); }, []);
  const reload = useCallback(() => { refreshSubjects(); return fetchRows().then(apply); }, [apply]);
  useEffect(() => {
    let active = true;
    fetchRows().then((r) => active && apply(r));
    return () => { active = false; };
  }, [apply]);

  async function call(method: "PATCH" | "DELETE", row: Row, body?: object, done?: string) {
    setBusy(row.id);
    const response = await fetch(method === "DELETE" ? `/api/admin/subjects?id=${row.id}` : "/api/admin/subjects", { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify({ id: row.id, ...body }) : undefined }).catch(() => null);
    const data = await response?.json().catch(() => ({}));
    setBusy(null);
    onToast(Boolean(response?.ok), response?.ok ? done ?? "Saved." : data?.error || "Something went wrong.");
    if (response?.ok) reload();
  }

  const visible = rows?.filter((r) => !r.hidden).length ?? 0;
  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-royal">Curriculum</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Subjects</h1>
          <p className="mt-1 text-sm text-slate-500">{rows ? `${visible} active subject${visible === 1 ? "" : "s"}` : "Loading…"} · changes appear on sign-up, practice pages, question forms and chat rooms right away.</p>
        </div>
        <button onClick={() => setDraft({ ...EMPTY })} className="btn-shine inline-flex items-center gap-2 rounded-xl bg-navy px-5 py-3 text-sm font-bold text-white hover:bg-royal"><Plus size={17} /> Add subject</button>
      </div>
      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows === null && Array.from({ length: 6 }, (_, i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />)}
        {rows?.map((r) => (
          <motion.article key={r.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl border p-5 ${r.hidden ? "border-dashed border-slate-300 bg-slate-50" : "border-slate-200 bg-white"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-lg font-extrabold">{r.name}</p>
                <p className="font-amharic text-sm text-slate-500">{r.amharic || "—"}</p>
              </div>
              {r.hidden ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">Hidden</span> : <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-700">Active</span>}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-bold">
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-violet-700"><GraduationCap size={11} />{gradeRange(r.grades)}</span>
              {!r.grades.some(needsStream) ? null : r.streams.length > 1 ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">Both streams</span> : r.streams.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{s === "natural" ? <Atom size={11} /> : <BookOpenText size={11} />}{s === "natural" ? "Natural Science" : "Social Science"}</span>
              ))}
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-royal"><Clock3 size={11} />{r.minutes} min / question</span>
              {r.calculator && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700"><Calculator size={11} />Calculator</span>}
              {r.playground && <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2 py-0.5 text-cyan-700"><CodeXml size={11} />Code playground</span>}
            </div>
            <p className="mt-3 text-sm text-slate-500"><b className="text-navy">{r.questions}</b> question{r.questions === 1 ? "" : "s"} · <b className="text-navy">{r.teachers}</b> teacher{r.teachers === 1 ? "" : "s"}</p>
            <div className="mt-4 flex gap-1.5">
              <button onClick={() => setDraft({ id: r.id, name: r.name, amharic: r.amharic, streams: r.streams, grades: r.grades, calculator: r.calculator, playground: r.playground, minutes: r.minutes })} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold hover:border-royal"><Pencil size={13} /> Edit</button>
              <button disabled={busy === r.id} onClick={() => call("PATCH", r, { hidden: !r.hidden }, r.hidden ? `${r.name} is visible again.` : `${r.name} is hidden from students and new teachers.`)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold hover:border-royal disabled:opacity-50">
                {busy === r.id ? <LoaderCircle size={13} className="animate-spin" /> : r.hidden ? <Eye size={13} /> : <EyeOff size={13} />}{r.hidden ? "Show" : "Hide"}
              </button>
              <button disabled={busy === r.id} title={r.questions || r.teachers ? "Subjects with questions or teachers can't be deleted — hide them instead" : "Delete subject"}
                onClick={() => window.confirm(`Delete the subject "${r.name}" permanently? Its chat room will be removed too.`) && call("DELETE", r, undefined, `${r.name} deleted.`)}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 size={13} /> Delete</button>
            </div>
          </motion.article>
        ))}
      </div>

      <AnimatePresence>
        {draft && <SubjectDialog draft={draft} onClose={() => setDraft(null)} onSaved={(text) => { setDraft(null); onToast(true, text); reload(); }} />}
      </AnimatePresence>
    </div>
  );
}

function SubjectDialog({ draft, onClose, onSaved }: { draft: Draft; onClose: () => void; onSaved: (text: string) => void }) {
  const [form, setForm] = useState(draft);
  // New web subjects get the playground ticked automatically until the admin changes it.
  const [playgroundTouched, setPlaygroundTouched] = useState(Boolean(draft.id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const editing = Boolean(draft.id);

  const senior = form.grades.some(needsStream);
  function toggleGrade(g: Grade) {
    setForm((f) => ({ ...f, grades: f.grades.includes(g) ? f.grades.filter((x) => x !== g) : GRADES.filter((x) => x === g || f.grades.includes(x)) }));
  }
  function toggleStream(s: Stream) {
    setForm((f) => ({ ...f, streams: f.streams.includes(s) ? f.streams.filter((x) => x !== s) : [...f.streams, s] }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const response = await fetch("/api/admin/subjects", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }).catch(() => null);
    const data = await response?.json().catch(() => ({}));
    setSaving(false);
    if (!response?.ok) return setError(data?.error || "Could not save the subject.");
    onSaved(editing ? `${form.name} updated.` : `${form.name} added — it's now available to teachers and students.`);
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-navy/50 p-4 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <motion.form onSubmit={save} initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-extrabold">{editing ? "Edit subject" : "Add a subject"}</h2>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full hover:bg-slate-100" aria-label="Close"><X size={18} /></button>
        </div>
        {editing && <p className="mt-1 text-xs text-slate-500">Renaming also updates this subject&apos;s questions, teachers and chat room.</p>}
        <label className="mt-5 block text-sm font-semibold">Subject name
          <input required minLength={2} maxLength={60} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, ...(playgroundTouched ? {} : { playground: hasPlayground({ name: e.target.value }) }) })} placeholder="e.g. Information Technology" className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none focus:border-royal" />
        </label>
        <label className="mt-4 block text-sm font-semibold">Amharic name <span className="font-normal text-slate-400">(optional)</span>
          <input maxLength={60} value={form.amharic} onChange={(e) => setForm({ ...form, amharic: e.target.value })} placeholder="e.g. ኢንፎርሜሽን ቴክኖሎጂ" className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-amharic outline-none focus:border-royal" />
        </label>
        <p className="mt-4 text-sm font-semibold">Grade levels</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PRESETS.map((p) => {
            const on = p.grades.length === form.grades.length && p.grades.every((g) => form.grades.includes(g));
            return <button key={p.label} type="button" onClick={() => setForm({ ...form, grades: p.grades })} className={`rounded-full border px-3 py-1 text-xs font-bold ${on ? "border-royal bg-royal text-white" : "border-slate-200 text-slate-600 hover:border-royal"}`}>{p.label}</button>;
          })}
        </div>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {GRADES.map((g) => {
            const on = form.grades.includes(g);
            return (
              <button key={g} type="button" role="checkbox" aria-checked={on} onClick={() => toggleGrade(g)} className={`relative rounded-xl border-2 py-2 text-center ${on ? "border-royal bg-blue-50 text-royal" : "border-slate-200 text-slate-500"}`}>
                {on && <Check size={12} className="absolute right-1.5 top-1.5" />}
                <span className="block text-lg font-extrabold leading-5">{g.split(" ")[1]}</span><span className="text-[10px] font-bold uppercase tracking-wider">Grade</span>
              </button>
            );
          })}
        </div>
        {!form.grades.length && <p className="mt-1.5 text-xs font-semibold text-red-600">Choose at least one grade.</p>}

        {senior && <>
        <p className="mt-4 text-sm font-semibold">Stream (Grades 11–12)</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(["natural", "social"] as const).map((s) => (
            <button key={s} type="button" onClick={() => toggleStream(s)} className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-bold ${form.streams.includes(s) ? "border-royal bg-blue-50 text-royal" : "border-slate-200 text-slate-500"}`}>
              {s === "natural" ? <Atom size={16} /> : <BookOpenText size={16} />}{s === "natural" ? "Natural Science" : "Social Science"}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-slate-500">Select both for a common subject. Streams only apply in Grades 11–12.</p>
        </>}
        <label className="mt-4 block text-sm font-semibold">Exam time per question
          <select value={form.minutes} onChange={(e) => setForm({ ...form, minutes: Number(e.target.value) })} className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-2.5">
            {MINUTES.map((m) => <option key={m} value={m}>{m === 0.5 ? "30 seconds" : `${m} minute${m === 1 ? "" : "s"}`}</option>)}
          </select>
        </label>
        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3.5 hover:border-royal">
          <input type="checkbox" checked={form.calculator} onChange={(e) => setForm({ ...form, calculator: e.target.checked })} className="mt-0.5 h-4 w-4 accent-[#155EEF]" />
          <span><span className="flex items-center gap-1.5 text-sm font-bold"><Calculator size={15} /> Scientific calculator</span><span className="text-xs text-slate-500">Students can open a calculator (powers, log, trig in degrees/radians, π, science constants) while practising.</span></span>
        </label>
        <label className="mt-2 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3.5 hover:border-royal">
          <input type="checkbox" checked={form.playground} onChange={(e) => { setPlaygroundTouched(true); setForm({ ...form, playground: e.target.checked }); }} className="mt-0.5 h-4 w-4 accent-[#155EEF]" />
          <span><span className="flex items-center gap-1.5 text-sm font-bold"><CodeXml size={15} /> Code playground</span><span className="text-xs text-slate-500">Students can write HTML, CSS and JavaScript and run it right on the page (like W3Schools &ldquo;Try it yourself&rdquo;).</span></span>
        </label>
        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 py-3 text-sm font-bold hover:bg-slate-50">Cancel</button>
          <button disabled={saving || !form.grades.length || (senior && !form.streams.length)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy py-3 text-sm font-bold text-white hover:bg-royal disabled:opacity-50">
            {saving && <LoaderCircle size={16} className="animate-spin" />}{editing ? "Save changes" : "Add subject"}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
