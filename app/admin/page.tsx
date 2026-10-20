"use client";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Check, CheckCircle2, FileUp, ListChecks, LoaderCircle, MessageCircle, Plus, ShieldCheck, ToggleLeft, Trash2, Users, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Brand from "@/app/components/Brand";
import AccountMenu from "@/app/components/AccountMenu";
import { useSession } from "@/app/components/useSession";
import { SUBJECTS as ALL_SUBJECTS } from "@/lib/subjects";
import ImportDialog from "./ImportDialog";

type Recent = { id: string; question: string; subject: string; grade: string; unit: string };
type Summary = { questions: number; myQuestions: number; students: number; attempts: number; unreadMessages: number; recent: Recent[] };

type Loaded<T> = { data?: T; error?: string };

async function fetchSummary(): Promise<Loaded<Summary>> {
  const response = await fetch("/api/admin/summary", { cache: "no-store" }).catch(() => null);
  if (!response) return { error: "Network error — could not load the dashboard." };
  if (response.status === 401 || response.status === 403) { window.location.href = "/admin/login"; return {}; }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { error: data.error || "Could not load the dashboard." };
  return { data };
}

const initial = { type: "mcq" as "mcq" | "truefalse", subject: "Mathematics", grade: "Grade 12", unit: "Unit 1: Algebra", year: "2016 E.C.", question: "", choices: ["", "", "", ""], correctAnswer: 0, explanation: "" };
const SUBJECTS = ALL_SUBJECTS.map((s) => s.name);
const GRADES = ["Grade 9", "Grade 10", "Grade 11", "Grade 12"];

export default function TeacherDashboard() {
  const { user } = useSession();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loadError, setLoadError] = useState("");
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const apply = useCallback((result: Loaded<Summary>) => {
    setLoadError(result.error ?? "");
    if (result.data) setSummary(result.data);
  }, []);
  const load = useCallback(() => fetchSummary().then(apply), [apply]);

  useEffect(() => {
    let active = true;
    fetchSummary().then((result) => active && apply(result));
    return () => { active = false; };
  }, [apply]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const response = await fetch("/api/questions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }).catch(() => null);
    setSaving(false);
    const data = await response?.json().catch(() => ({}));
    if (!response?.ok) return setError(data?.error || "Could not publish the question.");
    const another = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("name") === "another";
    // Keep subject/grade/unit/type when adding several questions in a row.
    setForm({ ...initial, type: form.type, subject: form.subject, grade: form.grade, unit: form.unit, year: form.year, choices: form.type === "truefalse" ? ["True", "False"] : ["", "", "", ""] });
    if (!another) setOpen(false);
    setNotice(another ? "Question published — ready for the next one." : "Question published to the student exam bank.");
    window.setTimeout(() => setNotice(""), 5000);
    load();
  }

  const setType = (type: "mcq" | "truefalse") =>
    setForm({ ...form, type, choices: type === "truefalse" ? ["True", "False"] : ["", "", "", ""], correctAnswer: 0 });
  const removeChoice = (i: number) => setForm({
    ...form,
    choices: form.choices.filter((_, index) => index !== i),
    correctAnswer: form.correctAnswer === i ? 0 : form.correctAnswer > i ? form.correctAnswer - 1 : form.correctAnswer,
  });
  const setChoice = (i: number, value: string) => setForm({ ...form, choices: form.choices.map((item, index) => (index === i ? value : item)) });
  const stats = [
    { value: summary?.myQuestions, label: `My questions (of ${summary?.questions ?? "–"} total)`, icon: BookOpen, color: "bg-blue-50 text-royal" },
    { value: summary?.students, label: "Active students", icon: Users, color: "bg-amber-50 text-amber-600" },
    { value: summary?.attempts, label: "Recorded attempts", icon: CheckCircle2, color: "bg-green-50 text-green-600" },
  ];

  return (
    <main className="min-h-screen bg-[#f7f9fc] text-navy">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3">
          <Brand size="sm" subtitle="Teacher dashboard" />
          <div className="flex items-center gap-2">
            {user?.role === "super-admin" && <Link href="/super-admin" className="hidden items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-royal hover:bg-blue-50 sm:inline-flex"><ShieldCheck size={16} /> Platform admin</Link>}
            {user?.role === "admin" && (
              <Link href="/chat" className="relative inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-navy hover:bg-slate-100">
                <MessageCircle size={17} /> <span className="hidden sm:inline">Messages</span>
                {!!summary?.unreadMessages && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-[10px] font-extrabold text-navy">{summary.unreadMessages}</span>}
              </Link>
            )}
            <AccountMenu />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-9">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-royal">Welcome{user ? `, ${user.name.split(" ")[0]}` : ""} 👋</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Manage the live question bank.</h1>
            {user?.subject && <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1 text-xs font-bold text-amber-800"><BookOpen size={13} /> {user.subject} teacher</p>}
          </div>
          <div className="flex flex-wrap gap-2">
          <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={() => setImporting(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold shadow-sm hover:border-royal">
            <FileUp size={17} /> Upload questions
          </motion.button>
          <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={() => { setForm({ ...initial, subject: user?.subject || initial.subject }); setOpen(true); }} className="btn-shine inline-flex items-center gap-2 rounded-xl bg-navy px-5 py-3 text-sm font-bold text-white shadow-lg shadow-navy/15 hover:bg-royal">
            <Plus size={17} /> Add question
          </motion.button>
          </div>
        </motion.div>

        <AnimatePresence>
          {notice && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-6 overflow-hidden rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">{notice}</motion.p>}
        </AnimatePresence>
        {loadError && <p className="mt-6 rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">{loadError}</p>}

        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          {stats.map(({ value, label, icon: Icon, color }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.07 }} className="card-lift rounded-2xl border border-slate-200 bg-white p-5">
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${color}`}><Icon size={20} /></span>
              <p className="mt-4 text-3xl font-extrabold">{value ?? <span className="inline-block h-8 w-12 animate-pulse rounded bg-slate-100 align-middle" />}</p>
              <p className="text-sm text-slate-500">{label}</p>
            </motion.div>
          ))}
        </div>

        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-bold">Recently published</h2>
          <div className="mt-4 divide-y divide-slate-100">
            {summary?.recent.length ? summary.recent.map((q, i) => (
              <motion.div key={q.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="flex items-start gap-4 py-4">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gold/20 text-xs font-extrabold">{q.subject.charAt(0)}</span>
                <div>
                  <p className="font-semibold">{q.question}</p>
                  <p className="mt-1 text-xs text-slate-500">{q.subject} · {q.grade} · {q.unit}</p>
                </div>
              </motion.div>
            )) : <p className="py-10 text-center text-sm text-slate-500">{summary ? "No questions yet. Add the first question to make exams dynamic." : "Loading..."}</p>}
          </div>
        </section>
      </div>

      <AnimatePresence>
        {importing && (
          <ImportDialog
            defaultSubject={user?.subject}
            onClose={() => setImporting(false)}
            onPublished={(count) => { setImporting(false); setNotice(`${count} question${count === 1 ? "" : "s"} published from your file.`); window.setTimeout(() => setNotice(""), 6000); load(); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 overflow-y-auto bg-navy/50 p-4 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
            <motion.form initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }} onSubmit={save} className="mx-auto my-6 max-w-2xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
              <div className="flex justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.16em] text-royal">Question builder</p>
                  <h2 className="mt-2 text-2xl font-extrabold">Publish a question</h2>
                </div>
                <button type="button" onClick={() => setOpen(false)} className="h-9 w-9 rounded-full hover:bg-slate-100" aria-label="Close"><X className="mx-auto" size={20} /></button>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-bold">Subject<select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-normal">{SUBJECTS.map((s) => <option key={s}>{s}</option>)}</select></label>
                <label className="text-sm font-bold">Grade<select value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-normal">{GRADES.map((g) => <option key={g}>{g}</option>)}</select></label>
                <label className="text-sm font-bold">Unit<input required value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-normal" /></label>
                <label className="text-sm font-bold">Exam year<input required value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-normal" /></label>
              </div>
              {/* Question type */}
              <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5" role="radiogroup" aria-label="Question type">
                {([["mcq", "Multiple choice", ListChecks], ["truefalse", "True / False", ToggleLeft]] as const).map(([value, label, Icon]) => (
                  <button key={value} type="button" role="radio" aria-checked={form.type === value} onClick={() => setType(value)} className={`relative flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold ${form.type === value ? "text-navy" : "text-slate-500"}`}>
                    {form.type === value && <motion.span layoutId="question-type" className="absolute inset-0 rounded-xl bg-white shadow-sm" />}
                    <Icon size={16} className="relative" /><span className="relative">{label}</span>
                  </button>
                ))}
              </div>
              <label className="mt-4 block text-sm font-bold">{form.type === "truefalse" ? "Statement" : "Question"}<textarea required value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder={form.type === "truefalse" ? "e.g. Lake Tana is the source of the Blue Nile." : "e.g. What is the value of x if 3x + 6 = 21?"} className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 p-3 font-normal" /></label>
              {form.type === "truefalse" ? (
                <div className="mt-4">
                  <p className="text-sm font-bold">Correct answer</p>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    {["True", "False"].map((label, i) => (
                      <motion.button key={label} type="button" whileTap={{ scale: 0.97 }} onClick={() => setForm({ ...form, correctAnswer: i })} className={`flex items-center justify-center gap-2 rounded-2xl border-2 py-4 text-lg font-extrabold transition ${form.correctAnswer === i ? (i === 0 ? "border-green-500 bg-green-50 text-green-700" : "border-red-400 bg-red-50 text-red-600") : "border-slate-200 text-slate-400 hover:border-slate-300"}`}>
                        {i === 0 ? <Check size={20} /> : <X size={20} />}{label}
                      </motion.button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-4">
                  <p className="flex items-center justify-between text-sm font-bold">Choices <span className="text-xs font-semibold text-slate-400">Click a letter to mark the correct answer</span></p>
                  <div className="mt-2 grid gap-2.5">
                    <AnimatePresence initial={false}>
                      {form.choices.map((choice, i) => (
                        <motion.div key={i} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className={`flex items-center gap-2 rounded-xl border p-1.5 ${form.correctAnswer === i ? "border-green-400 bg-green-50/60" : "border-slate-200"}`}>
                          <button type="button" onClick={() => setForm({ ...form, correctAnswer: i })} aria-label={`Mark choice ${String.fromCharCode(65 + i)} correct`} className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-extrabold ${form.correctAnswer === i ? "bg-green-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                            {form.correctAnswer === i ? <Check size={16} /> : String.fromCharCode(65 + i)}
                          </button>
                          <input required value={choice} onChange={(e) => setChoice(i, e.target.value)} placeholder={`Choice ${String.fromCharCode(65 + i)}`} className="min-w-0 flex-1 bg-transparent px-1 py-1.5 outline-none" />
                          {form.choices.length > 2 && <button type="button" onClick={() => removeChoice(i)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Remove choice"><Trash2 size={15} /></button>}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                  {form.choices.length < 6 && <button type="button" onClick={() => setForm({ ...form, choices: [...form.choices, ""] })} className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-royal hover:bg-blue-50"><Plus size={14} /> Add choice</button>}
                </div>
              )}
              <label className="mt-4 block text-sm font-bold">Explanation <span className="font-normal text-slate-400">(optional)</span><textarea value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 p-3 font-normal" /></label>
              {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                <button type="submit" name="another" value="1" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3.5 font-bold hover:border-royal disabled:opacity-70">
                  <Plus size={17} /> Publish &amp; add another
                </button>
                <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-4 py-3.5 font-bold text-white hover:bg-royal disabled:opacity-70">
                  {saving ? <><LoaderCircle size={18} className="animate-spin" /> Publishing...</> : "Publish question"}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
