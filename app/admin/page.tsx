"use client";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, BookOpen, Check, FileUp, LayoutDashboard, ListChecks, LoaderCircle, MessageCircle, Plus, ToggleLeft, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Brand from "@/app/components/Brand";
import AccountMenu from "@/app/components/AccountMenu";
import { useSession } from "@/app/components/useSession";
import { useSubjects } from "@/app/components/useSubjects";
import GradePills from "@/app/components/GradePills";
import CodeTextarea from "@/app/components/CodeTextarea";
import { ChoiceInput } from "./ChoiceEditor";
import SourceFields from "./SourceFields";
import BackButton from "@/app/components/BackButton";
import { gradesFor } from "@/lib/subjects";
import ImportDialog from "./ImportDialog";
import QuestionsPanel, { type QuestionRow } from "./QuestionsPanel";
import ResultsPanel, { type StudentRow } from "./ResultsPanel";
import TeacherOverview, { type Overview } from "./TeacherOverview";

type Tab = "overview" | "questions" | "results";

const initial = { type: "mcq" as "mcq" | "truefalse", subject: "Mathematics", grade: "Grade 12", unit: "", year: "", question: "", choices: ["", "", "", ""], correctAnswer: 0, explanation: "" };

async function getJson<T>(url: string): Promise<{ data?: T; error?: string }> {
  const response = await fetch(url, { cache: "no-store" }).catch(() => null);
  if (!response) return { error: "Network error — check your connection." };
  if (response.status === 401) { window.location.href = "/admin/login?next=/admin"; return {}; }
  const data = await response.json().catch(() => ({}));
  return response.ok ? { data } : { error: data.error || "Could not load data." };
}

export default function TeacherDashboard() {
  const { user } = useSession();
  const isTeacher = user?.role === "admin";
  const [tab, setTab] = useState<Tab>("overview");
  const subjectList = useSubjects();
  const SUBJECTS = subjectList.map((s) => s.name);
  const [chosenSubject, setChosenSubject] = useState("Mathematics");
  // Teachers are locked to their own subject on the server; the super admin can browse any subject.
  const subjectQuery = user && !isTeacher ? `?subject=${encodeURIComponent(chosenSubject)}` : "";
  const [overview, setOverview] = useState<Overview | null>(null);
  const [students, setStudents] = useState<StudentRow[] | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [form, setForm] = useState(initial);
  // Only grades the subject is taught in; falls back to the first one when the subject changes.
  const formGrades = gradesFor(form.subject, subjectList);
  const formGrade = formGrades.includes(form.grade as (typeof formGrades)[number]) ? form.grade : formGrades[formGrades.length - 1];
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async (query: string) => Promise.all([
    getJson<Overview>(`/api/teacher/overview${query}`),
    getJson<{ students: StudentRow[] }>(`/api/teacher/results${query}`),
    getJson<{ questions: QuestionRow[] }>(`/api/teacher/questions${query}`),
    getJson<{ unreadMessages: number }>("/api/admin/summary"),
  ]), []);
  const apply = useCallback(([o, r, q, s]: Awaited<ReturnType<typeof fetchAll>>) => {
    setLoadError(o.error || r.error || q.error || "");
    if (o.data) setOverview(o.data);
    if (r.data) setStudents(r.data.students);
    if (q.data) setQuestions(q.data.questions);
    if (s.data) setUnread(s.data.unreadMessages);
  }, []);
  const load = useCallback(() => fetchAll(subjectQuery).then(apply), [fetchAll, apply, subjectQuery]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    fetchAll(subjectQuery).then((result) => active && apply(result));
    return () => { active = false; };
  }, [user, subjectQuery, fetchAll, apply]);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(id);
  }, [notice]);

  const subject = overview?.subject ?? (isTeacher ? user?.subject : chosenSubject) ?? "";
  const accuracy = overview && overview.answers ? Math.round((overview.correct / overview.answers) * 100) : 0;
  const tabs = useMemo(() => [
    { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
    { id: "questions" as const, label: "My questions", icon: BookOpen, count: questions?.filter((q) => q.mine).length },
    { id: "results" as const, label: "Student results", icon: BarChart3, count: students?.length },
  ], [questions, students]);

  function openForm() {
    setForm({ ...initial, subject: isTeacher ? user?.subject || initial.subject : chosenSubject });
    setError("");
    setOpen(true);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const response = await fetch("/api/questions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, grade: formGrade }) }).catch(() => null);
    setSaving(false);
    const data = await response?.json().catch(() => ({}));
    if (!response?.ok) return setError(data?.error || "Could not publish the question.");
    const another = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("name") === "another";
    // Keep subject/grade/unit/type when adding several questions in a row.
    setForm({ ...initial, type: form.type, subject: form.subject, grade: formGrade, unit: form.unit, year: form.year, choices: form.type === "truefalse" ? ["True", "False"] : ["", "", "", ""] });
    if (!another) setOpen(false);
    setNotice({ ok: true, text: another ? "Question published — ready for the next one." : "Question published to the student exam bank." });
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

  return (
    <main className="min-h-screen bg-[#f3f6fb] text-navy">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3">
          <Brand size="sm" subtitle={isTeacher ? "Teacher" : "Question bank"} />
          <div className="flex items-center gap-2">
            {user?.role === "super-admin" && <BackButton href="/super-admin" label="Platform admin" className="text-royal" />}
            {isTeacher && (
              <Link href="/chat" className="relative inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-navy hover:bg-slate-100">
                <MessageCircle size={17} /> <span className="hidden sm:inline">Messages</span>
                {!!unread && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-[10px] font-extrabold text-navy">{unread}</span>}
              </Link>
            )}
            <AccountMenu />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8">
        {/* Welcome banner */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-[#12306b] to-royal p-6 text-white sm:p-8">
          <div className="bg-grid absolute inset-0" />
          <div className="relative flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-gold">{isTeacher ? "Teacher dashboard" : "Question bank"}</p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Welcome{user ? `, ${user.name.split(" ")[0]}` : ""} 👋</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {isTeacher ? (
                  <span className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold"><BookOpen size={14} className="text-gold" /> {user?.subject ?? "No subject assigned"} teacher</span>
                ) : user && (
                  <label className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold">
                    Subject
                    <select value={chosenSubject} onChange={(e) => setChosenSubject(e.target.value)} className="rounded-lg bg-white/10 px-2 py-0.5 text-white outline-none [&>option]:text-navy">{SUBJECTS.map((s) => <option key={s}>{s}</option>)}</select>
                  </label>
                )}
              </div>
              <p className="mt-3 text-white/70">{overview ? `${overview.students} students study ${subject}. ${overview.activeLearners} have practised so far.` : "Loading your class…"}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={openForm} className="btn-shine inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-bold text-navy shadow-lg shadow-gold/20"><Plus size={17} /> Add question</motion.button>
                <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={() => setImporting(true)} className="glass inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold hover:bg-white/15"><FileUp size={17} /> Upload questions</motion.button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[{ label: "Accuracy", value: `${accuracy}%` }, { label: "Answers", value: overview?.answers ?? "–" }, { label: "Questions", value: overview?.questions ?? "–" }].map((s) => (
                <div key={s.label} className="glass min-w-24 rounded-2xl px-4 py-3"><p className="text-2xl font-extrabold tabular-nums">{s.value}</p><p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">{s.label}</p></div>
              ))}
            </div>
          </div>
        </motion.section>

        <AnimatePresence>
          {notice && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className={`overflow-hidden rounded-xl border p-4 text-sm font-semibold ${notice.ok ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"}`}>{notice.text}</motion.p>}
        </AnimatePresence>
        {loadError && <p className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">{loadError}</p>}

        {/* Tabs */}
        <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5" aria-label="Teacher sections">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`relative flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold ${tab === t.id ? "text-white" : "text-slate-500 hover:text-navy"}`}>
              {tab === t.id && <motion.span layoutId="teacher-tab" className="absolute inset-0 rounded-xl bg-navy" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
              <t.icon size={16} className="relative" /><span className="relative">{t.label}</span>
              {t.count !== undefined && <span className={`relative rounded-full px-1.5 text-[11px] ${tab === t.id ? "bg-white/20" : "bg-slate-100"}`}>{t.count}</span>}
            </button>
          ))}
        </nav>

        <AnimatePresence mode="wait">
          <motion.div key={tab + subjectQuery} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
            {tab === "overview" && <TeacherOverview data={overview} students={students} onOpenResults={() => setTab("results")} />}
            {tab === "questions" && <QuestionsPanel subject={subject} rows={questions} canManageAll={user?.role === "super-admin"} onAdd={openForm} onChanged={(text, ok = true) => { setNotice({ ok, text }); load(); }} />}
            {tab === "results" && <ResultsPanel subject={subject} rows={students} subjectQuery={subjectQuery} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {importing && (
          <ImportDialog
            defaultSubject={isTeacher ? user?.subject : chosenSubject}
            lockSubject={isTeacher}
            onClose={() => setImporting(false)}
            onPublished={(count) => { setImporting(false); setNotice({ ok: true, text: `${count} question${count === 1 ? "" : "s"} published from your file.` }); load(); }}
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
              <div className="mt-5"><SourceFields unit={form.unit} year={form.year} units={[...new Set((questions ?? []).map((q) => q.unit))]} onChange={(next) => setForm({ ...form, ...next })} /></div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-bold">Subject<select disabled={isTeacher} title={isTeacher ? "Teachers publish in their own subject" : undefined} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-normal">{SUBJECTS.map((s) => <option key={s}>{s}</option>)}</select></label>
                <div className="sm:col-span-2"><GradePills value={formGrade} allowed={formGrades} subject={form.subject} label="Which grade is this question for?" onChange={(grade) => setForm({ ...form, grade })} /></div>
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
              <CodeTextarea className="mt-4" required label={form.type === "truefalse" ? "Statement" : "Question"} rows={4} value={form.question} onChange={(question) => setForm({ ...form, question })} placeholder={form.type === "truefalse" ? "e.g. Lake Tana is the source of the Blue Nile." : "e.g. What is the value of x if 3x + 6 = 21?  (Use Code block for programming questions)"} />
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
                          <ChoiceInput required value={choice} onChange={(v) => setChoice(i, v)} placeholder={`Choice ${String.fromCharCode(65 + i)}`} label={`Choice ${String.fromCharCode(65 + i)}`} className="px-1 py-1.5" />
                          {form.choices.length > 2 && <button type="button" onClick={() => removeChoice(i)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Remove choice"><Trash2 size={15} /></button>}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                  {form.choices.length < 6 && <button type="button" onClick={() => setForm({ ...form, choices: [...form.choices, ""] })} className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-royal hover:bg-blue-50"><Plus size={14} /> Add choice</button>}
                </div>
              )}
              <CodeTextarea className="mt-4" label="Explanation (optional)" rows={3} value={form.explanation} onChange={(explanation) => setForm({ ...form, explanation })} />
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
