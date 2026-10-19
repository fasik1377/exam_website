"use client";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, CheckCircle2, LoaderCircle, Plus, ShieldCheck, Users, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Brand from "@/app/components/Brand";
import LogoutButton from "@/app/components/LogoutButton";
import { useSession } from "@/app/components/useSession";
import { SUBJECTS as ALL_SUBJECTS } from "@/lib/subjects";

type Recent = { id: string; question: string; subject: string; grade: string; unit: string };
type Summary = { questions: number; students: number; attempts: number; recent: Recent[] };

type Loaded<T> = { data?: T; error?: string };

async function fetchSummary(): Promise<Loaded<Summary>> {
  const response = await fetch("/api/admin/summary", { cache: "no-store" }).catch(() => null);
  if (!response) return { error: "Network error — could not load the dashboard." };
  if (response.status === 401 || response.status === 403) { window.location.href = "/admin/login"; return {}; }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { error: data.error || "Could not load the dashboard." };
  return { data };
}

const initial = { subject: "Mathematics", grade: "Grade 12", unit: "Unit 1: Algebra", year: "2016 E.C.", question: "", choices: ["", "", "", ""], correctAnswer: 0, explanation: "" };
const SUBJECTS = ALL_SUBJECTS.map((s) => s.name);
const GRADES = ["Grade 9", "Grade 10", "Grade 11", "Grade 12"];

export default function TeacherDashboard() {
  const { user } = useSession();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loadError, setLoadError] = useState("");
  const [open, setOpen] = useState(false);
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
    setForm(initial);
    setOpen(false);
    setNotice("Question published to the student exam bank.");
    window.setTimeout(() => setNotice(""), 5000);
    load();
  }

  const setChoice = (i: number, value: string) => setForm({ ...form, choices: form.choices.map((item, index) => (index === i ? value : item)) });
  const stats = [
    { value: summary?.questions, label: "Published questions", icon: BookOpen, color: "bg-blue-50 text-royal" },
    { value: summary?.students, label: "Registered students", icon: Users, color: "bg-amber-50 text-amber-600" },
    { value: summary?.attempts, label: "Recorded attempts", icon: CheckCircle2, color: "bg-green-50 text-green-600" },
  ];

  return (
    <main className="min-h-screen bg-[#f7f9fc] text-navy">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3">
          <Brand size="sm" subtitle="Teacher dashboard" />
          <div className="flex items-center gap-2">
            {user?.role === "super-admin" && <Link href="/super-admin" className="hidden items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-royal hover:bg-blue-50 sm:inline-flex"><ShieldCheck size={16} /> Platform admin</Link>}
            {user && <span className="hidden text-sm font-semibold text-slate-500 md:inline">{user.name}</span>}
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-9">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-royal">Welcome{user ? `, ${user.name.split(" ")[0]}` : ""} 👋</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Manage the live question bank.</h1>
          </div>
          <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={() => setOpen(true)} className="btn-shine inline-flex items-center gap-2 rounded-xl bg-navy px-5 py-3 text-sm font-bold text-white shadow-lg shadow-navy/15 hover:bg-royal">
            <Plus size={17} /> Add question
          </motion.button>
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
              <label className="mt-4 block text-sm font-bold">Question<textarea required value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 p-3 font-normal" /></label>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {form.choices.map((choice, i) => (
                  <label key={i} className="text-sm font-bold">
                    <span className="flex items-center justify-between">Choice {String.fromCharCode(65 + i)}
                      <button type="button" onClick={() => setForm({ ...form, correctAnswer: i })} className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${form.correctAnswer === i ? "bg-green-100 text-green-700" : "text-slate-400 hover:bg-slate-100"}`}>{form.correctAnswer === i ? "✓ Correct" : "Mark correct"}</button>
                    </span>
                    <input required value={choice} onChange={(e) => setChoice(i, e.target.value)} className={`mt-2 w-full rounded-xl border p-3 font-normal ${form.correctAnswer === i ? "border-green-400 bg-green-50/50" : "border-slate-200"}`} />
                  </label>
                ))}
              </div>
              <label className="mt-4 block text-sm font-bold">Explanation<textarea required value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 p-3 font-normal" /></label>
              {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
              <button disabled={saving} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 py-3.5 font-bold text-white hover:bg-royal disabled:opacity-70">
                {saving ? <><LoaderCircle size={18} className="animate-spin" /> Publishing...</> : "Publish question"}
              </button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
