"use client";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, BookMarked, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Eraser, Flag, LayoutGrid, LoaderCircle, Maximize, PanelRightClose, PanelRightOpen, Send, ShieldAlert, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import RichText from "@/app/components/RichText";
import { xpFor } from "@/lib/gamification";

export type ExamQuestion = { id: string; type?: "mcq" | "truefalse"; question: string; choices: string[]; answer: number; explanation: string; teacher: string; unit: string; year: string };
export type ExamResult = { choice: number; correct: boolean; timedOut: boolean; skipped?: boolean; xp: number; combo: number; coins?: number };
export type ExamReport = { timeUsed: number; timeAllowed: number; violations: number; flagged: number; unanswered: number; autoSubmitted: null | "time" | "violations" };

/** Leaving the exam this many times submits it automatically. */
export const MAX_VIOLATIONS = 3;
const SHEET_KEY = "examSheetOpen";
type Saved = { ids: string; answers: (number | null)[]; flags: boolean[]; current: number; startedAt: number; deadline: number; violations: number };

const letter = (i: number) => String.fromCharCode(65 + i);
const clock = (s: number) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60; return `${h ? `${h}:${String(m).padStart(2, "0")}` : m}:${String(sec).padStart(2, "0")}`; };
const load = (key: string): Saved | null => { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; } };

/**
 * Exam mode, modelled on the national exam: one overall timer, free movement between questions,
 * an answer sheet, "clear choice" before changing an answer, flags for review, and exam rules —
 * leaving the exam (tab, window or full screen) is recorded and the 3rd time submits it.
 */
export default function NationalExam({ questions, subject, grade, candidate, secondsPerQuestion, saves, storageKey, freeNote, onSubmit, onCancel }: {
  questions: ExamQuestion[]; subject: string; grade: string; candidate: string; secondsPerQuestion: number; saves: boolean; storageKey: string; freeNote?: string;
  onSubmit: (results: Record<number, ExamResult>, report: ExamReport) => void; onCancel: () => void;
}) {
  const ids = questions.map((q) => q.id).join(",");
  const timeAllowed = questions.length * secondsPerQuestion;
  const [phase, setPhase] = useState<"rules" | "exam" | "submitting">("rules");
  const [agree, setAgree] = useState(false);
  const [resume] = useState<(Saved & { leftAtLoad: number }) | null>(() => { const s = load(storageKey); const leftAtLoad = s ? Math.ceil((s.deadline - Date.now()) / 1000) : 0; return s && s.ids === ids && leftAtLoad > 0 ? { ...s, leftAtLoad } : null; });
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const answersNow = answers;
  const [flags, setFlags] = useState<boolean[]>(() => questions.map(() => false));
  const [current, setCurrent] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(0);
  const [violations, setViolations] = useState(0);
  const [away, setAway] = useState<null | "tab" | "window" | "fullscreen">(null);
  const [review, setReview] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(() => { try { return localStorage.getItem(SHEET_KEY) !== "0"; } catch { return true; } });
  const [mobileSheet, setMobileSheet] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const warned = useRef<Set<number>>(new Set());
  const submittedRef = useRef(false);
  const awayRef = useRef(false);
  const violationsRef = useRef(0);
  const wantFullscreen = useRef(false);

  const q = questions[current];
  const left = deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : timeAllowed;
  const answeredCount = answers.filter((a) => a !== null).length;
  const flaggedCount = flags.filter(Boolean).length;
  const unanswered = questions.length - answeredCount;

  // ---------- Submit ----------
  /** Marks and saves the exam. `snapshot` is used for an exam that ran out of time while the student was away. */
  const submit = useCallback(async (reason: ExamReport["autoSubmitted"], snapshot?: Saved) => {
    if (submittedRef.current) return;
    const answers = snapshot?.answers ?? answersNow;
    const started = snapshot?.startedAt ?? startedAt;
    const flagged = snapshot ? snapshot.flags.filter(Boolean).length : flaggedCount;
    const unanswered = answers.filter((a) => a === null).length;
    if (snapshot) violationsRef.current = snapshot.violations;
    submittedRef.current = true;
    setPhase("submitting"); setReview(false); setAway(null);
    try { if (document.fullscreenElement) await document.exitFullscreen(); } catch {}
    let server: ({ correct: boolean; timedOut: boolean; xp: number; combo: number; coins: number } | null)[] | null = null;
    if (saves) {
      const r = await fetch("/api/attempts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: questions.map((qq, i) => ({ questionId: qq.id, selectedAnswer: answers[i] })) }) }).catch(() => null);
      const data = await r?.json().catch(() => null);
      if (r?.ok) server = data.results;
    }
    const results: Record<number, ExamResult> = {};
    questions.forEach((qq, i) => {
      const choice = answers[i];
      const s = server?.[i];
      const correct = s ? s.correct : choice !== null && choice === qq.answer;
      results[i] = { choice: choice ?? -1, correct, timedOut: choice === null, skipped: choice === null, xp: s?.xp ?? xpFor(correct, choice === null), combo: s?.combo ?? 0, coins: s?.coins ?? 0 };
    });
    try { localStorage.removeItem(storageKey); } catch {}
    onSubmit(results, { timeUsed: Math.min(timeAllowed, Math.round((Date.now() - started) / 1000)), timeAllowed, violations: violationsRef.current, flagged, unanswered, autoSubmitted: reason });
  }, [saves, questions, answersNow, storageKey, onSubmit, timeAllowed, startedAt, flaggedCount]);

  // An exam whose time ran out while the student was away (page closed) is submitted with the saved answers.
  const [expired] = useState<Saved | null>(() => { const s = load(storageKey); return s && s.ids === ids && s.deadline <= Date.now() ? s : null; });
  useEffect(() => { if (expired) void submit("time", expired); }, [expired, submit]);

  // ---------- Start / resume ----------
  async function enterFullscreen() {
    wantFullscreen.current = true;
    try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: "hide" }); } catch { wantFullscreen.current = false; }
  }
  function begin(from: Saved | null) {
    const t = Date.now();
    if (from) {
      setAnswers(from.answers); setFlags(from.flags); setCurrent(from.current); setStartedAt(from.startedAt); setDeadline(from.deadline); setViolations(from.violations); violationsRef.current = from.violations;
    } else {
      setStartedAt(t); setDeadline(t + timeAllowed * 1000);
    }
    setNow(t);
    setPhase("exam");
    void enterFullscreen();
  }

  // Save progress so a refresh resumes the same exam with the same clock.
  useEffect(() => {
    if (phase !== "exam") return;
    try { localStorage.setItem(storageKey, JSON.stringify({ ids, answers, flags, current, startedAt, deadline, violations } satisfies Saved)); } catch {}
  }, [phase, storageKey, ids, answers, flags, current, startedAt, deadline, violations]);

  // ---------- Clock ----------
  useEffect(() => {
    if (phase !== "exam") return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      const secs = Math.ceil((deadline - t) / 1000);
      for (const mark of [300, 60]) {
        if (secs <= mark && secs > 0 && !warned.current.has(mark) && timeAllowed > mark) {
          warned.current.add(mark);
          setWarning(mark === 300 ? "5 minutes left — check your unanswered and flagged questions." : "1 minute left!");
        }
      }
      if (t >= deadline) { window.clearInterval(id); void submit("time"); }
    }, 500);
    return () => window.clearInterval(id);
  }, [phase, deadline, submit, timeAllowed]);
  useEffect(() => { if (!warning) return; const id = window.setTimeout(() => setWarning(null), 6000); return () => window.clearTimeout(id); }, [warning]);

  // ---------- Exam rules: leaving the exam ----------
  const violation = useCallback((kind: "tab" | "window" | "fullscreen") => {
    if (awayRef.current || submittedRef.current) return;
    awayRef.current = true;
    const next = violationsRef.current + 1;
    violationsRef.current = next;
    setViolations(next);
    if (next >= MAX_VIOLATIONS) void submit("violations"); else setAway(kind);
  }, [submit]);
  useEffect(() => {
    if (phase !== "exam") return;
    const onVisibility = () => { if (document.hidden) violation("tab"); };
    const onBlur = () => window.setTimeout(() => {
      // Clicking into the calculator or code playground isn't leaving the exam.
      if (!document.hasFocus() && !(document.activeElement instanceof HTMLIFrameElement)) violation("window");
    }, 400);
    const onFullscreen = () => { if (wantFullscreen.current && !document.fullscreenElement) violation("fullscreen"); };
    const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFullscreen);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFullscreen);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [phase, violation]);
  function backToExam() { awayRef.current = false; setAway(null); if (wantFullscreen.current) void enterFullscreen(); }

  // ---------- Answering ----------
  const choose = useCallback((i: number) => setAnswers((a) => (a[current] !== null ? a : a.map((v, k) => (k === current ? i : v)))), [current]);
  const clear = useCallback(() => setAnswers((a) => a.map((v, k) => (k === current ? null : v))), [current]);
  const toggleFlag = useCallback(() => setFlags((f) => f.map((v, k) => (k === current ? !v : v))), [current]);
  const go = useCallback((i: number) => { setCurrent(Math.max(0, Math.min(questions.length - 1, i))); setMobileSheet(false); }, [questions.length]);
  function toggleSheet() { setSheetOpen((o) => { try { localStorage.setItem(SHEET_KEY, o ? "0" : "1"); } catch {} return !o; }); }

  // Keyboard: A–D choose (only when nothing is chosen), C clear, F flag, ←/→ move.
  useEffect(() => {
    if (phase !== "exam") return;
    const onKey = (e: KeyboardEvent) => {
      if (away || review || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLElement && (e.target.closest("input, textarea, select") || e.target.closest("#calculator-panel"))) return;
      const k = e.key.toLowerCase();
      const pick = "abcd".indexOf(k) >= 0 ? "abcd".indexOf(k) : "1234".indexOf(k);
      if (pick >= 0 && q && pick < q.choices.length) { e.preventDefault(); choose(pick); }
      else if (k === "c") { e.preventDefault(); clear(); }
      else if (k === "f") { e.preventDefault(); toggleFlag(); }
      else if (k === "arrowright") { e.preventDefault(); go(current + 1); }
      else if (k === "arrowleft") { e.preventDefault(); go(current - 1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, away, review, q, current, choose, clear, toggleFlag, go]);

  // ---------- Rules screen ----------
  if (phase === "rules") {
    return (
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-navy p-6 text-white sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-gold">Exam mode · national exam simulation</p>
          <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">{subject}</h1>
          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-4">
            {[["Candidate", candidate], ["Grade", grade], ["Questions", String(questions.length)], ["Time allowed", `${Math.round(timeAllowed / 60)} minutes`]].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-white/10 p-3"><p className="text-[11px] font-bold uppercase tracking-wider text-white/60">{k}</p><p className="truncate font-extrabold">{v}</p></div>
            ))}
          </div>
        </div>
        <div className="p-6 sm:p-8">
          <h2 className="text-lg font-extrabold">Exam rules — read before you start</h2>
          <ol className="mt-4 grid gap-2.5 text-sm text-slate-700">
            {[
              ["⏱️", `One clock for the whole exam (${Math.round(timeAllowed / 60)} minutes). When it reaches zero your answers are submitted automatically.`],
              ["🧭", "Move freely between questions with Next / Previous or the answer sheet on the right."],
              ["✏️", "Choose one answer per question. To change it, press “Clear choice” first, then choose again."],
              ["🚩", "Flag questions you want to come back to. Flags don't change your score."],
              ["🚫", `Stay on this page. Switching tabs, leaving the window or exiting full screen stops the exam and is recorded. The ${MAX_VIOLATIONS}rd time, your exam is submitted.`],
              ["✅", "Answers and explanations are shown only after you submit."],
            ].map(([icon, text]) => <li key={text} className="flex gap-3 rounded-xl bg-slate-50 p-3"><span className="text-lg">{icon}</span><span>{text}</span></li>)}
          </ol>
          {freeNote && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{freeNote}</p>}
          {resume && <p className="mt-4 flex items-center gap-2 rounded-xl bg-blue-50 p-3 text-sm font-semibold text-royal"><Clock3 size={16} /> You have an exam in progress with about {clock(resume.leftAtLoad)} left. Resume it to continue where you stopped.</p>}
          <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3.5 text-sm font-semibold">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="h-4 w-4 accent-[#155EEF]" /> I have read the rules and I&apos;m ready to start.
          </label>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold hover:bg-slate-50">Back</button>
            {resume && <button type="button" disabled={!agree} onClick={() => begin(resume)} className="rounded-xl border-2 border-royal px-5 py-3 text-sm font-bold text-royal disabled:opacity-40">Resume my exam</button>}
            <button type="button" disabled={!agree} onClick={() => { try { localStorage.removeItem(storageKey); } catch {} begin(null); }} className="btn-shine inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-navy px-5 py-3 text-sm font-bold text-white hover:bg-royal disabled:opacity-40">
              <Maximize size={16} /> {resume ? "Start a new exam" : "Start the exam (full screen)"}
            </button>
          </div>
        </div>
      </motion.section>
    );
  }

  if (phase === "submitting") {
    return (
      <section className="grid place-items-center rounded-3xl border border-slate-200 bg-white p-12 text-center">
        <LoaderCircle size={34} className="animate-spin text-royal" />
        <p className="mt-4 text-lg font-extrabold">Submitting your exam…</p>
        <p className="text-sm text-slate-500">Marking {questions.length} answers.</p>
      </section>
    );
  }

  // ---------- Exam ----------
  const urgent = left <= 60, low = left <= 300;
  const selected = answers[current];
  const sheet = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-extrabold"><LayoutGrid size={16} className="text-royal" /> Answer sheet</p>
        <button type="button" onClick={() => (mobileSheet ? setMobileSheet(false) : toggleSheet())} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-navy" aria-label="Hide answer sheet"><PanelRightClose size={17} /></button>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-xl bg-green-50 p-2"><b className="block text-lg text-green-700">{answeredCount}</b>answered</div>
        <div className="rounded-xl bg-slate-100 p-2"><b className="block text-lg text-slate-700">{unanswered}</b>left</div>
        <div className="rounded-xl bg-amber-50 p-2"><b className="block text-lg text-amber-700">{flaggedCount}</b>flagged</div>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><motion.div className="h-full rounded-full bg-green-500" animate={{ width: `${(answeredCount / questions.length) * 100}%` }} /></div>
      <div className="mt-4 grid max-h-[46vh] grid-cols-5 gap-1.5 overflow-y-auto pr-1">
        {questions.map((qq, i) => {
          const a = answers[i];
          return (
            <button key={qq.id} type="button" onClick={() => go(i)} aria-label={`Question ${i + 1}${a !== null ? `, answered ${letter(a)}` : ", not answered"}${flags[i] ? ", flagged" : ""}`}
              className={`relative grid h-10 place-items-center rounded-lg text-xs font-extrabold transition ${a !== null ? "bg-green-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"} ${i === current ? "ring-2 ring-navy ring-offset-2" : ""}`}>
              {i + 1}
              {a !== null && <span className="absolute bottom-0.5 right-1 text-[8px] font-bold opacity-80">{qq.type === "truefalse" ? (a === 0 ? "T" : "F") : letter(a)}</span>}
              {flags[i] && <Flag size={10} className="absolute -right-1 -top-1 fill-amber-500 text-amber-500" />}
            </button>
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-green-500" />Answered</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-slate-200" />Not answered</span>
        <span className="flex items-center gap-1.5"><Flag size={11} className="fill-amber-500 text-amber-500" />Flagged</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded ring-2 ring-navy" />Current</span>
      </div>
      <button type="button" onClick={() => setReview(true)} className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-4 py-3 text-sm font-bold text-white hover:bg-royal max-lg:mt-4"><Send size={15} /> Review &amp; submit</button>
    </div>
  );

  return (
    <div onCopy={(e) => e.preventDefault()} onCut={(e) => e.preventDefault()} onContextMenu={(e) => e.preventDefault()}>
      {/* Exam bar */}
      <div className="sticky top-[4.5rem] z-20 mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold uppercase tracking-[.14em] text-royal">{grade} · {subject} · exam</p>
          <p className="truncate text-sm font-semibold text-slate-500">{candidate} · {answeredCount}/{questions.length} answered{violations ? <span className="ml-2 font-bold text-red-600">· left exam {violations}/{MAX_VIOLATIONS}</span> : null}</p>
        </div>
        <motion.span animate={urgent ? { scale: [1, 1.06, 1] } : { scale: 1 }} transition={urgent ? { duration: 1, repeat: Infinity } : {}} role="timer" aria-label={`${left} seconds left`}
          className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 font-mono text-lg font-extrabold tabular-nums ${urgent ? "bg-red-600 text-white" : low ? "bg-amber-100 text-amber-800" : "bg-navy text-white"}`}>
          <Clock3 size={17} />{clock(left)}
        </motion.span>
        <button type="button" onClick={() => setMobileSheet(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold lg:hidden"><LayoutGrid size={15} /> Sheet</button>
        {!sheetOpen && <button type="button" onClick={toggleSheet} className="hidden items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold hover:border-royal lg:inline-flex"><PanelRightOpen size={15} /> Answer sheet</button>}
        <button type="button" onClick={() => setReview(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-3.5 py-2 text-sm font-bold text-white hover:bg-green-700"><Send size={15} /> Submit</button>
      </div>

      <AnimatePresence>
        {warning && <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4 flex items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm font-bold text-amber-800"><AlertTriangle size={17} />{warning}</motion.p>}
      </AnimatePresence>

      <div className={`grid gap-4 ${sheetOpen ? "lg:grid-cols-[minmax(0,1fr)_17rem]" : ""}`}>
        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.section key={q.id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-extrabold">Question {current + 1} <span className="font-semibold text-slate-400">of {questions.length}</span></p>
              <button type="button" onClick={toggleFlag} aria-pressed={flags[current]}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${flags[current] ? "border-amber-400 bg-amber-50 text-amber-700" : "border-slate-200 text-slate-600 hover:border-amber-400"}`}>
                <Flag size={14} className={flags[current] ? "fill-amber-500 text-amber-500" : ""} />{flags[current] ? "Flagged for review" : "Flag for review"}
              </button>
            </div>
            {(q.year || q.unit) && (
              <p className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-bold">
                {q.year && <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-royal"><CalendarDays size={12} />{q.year}</span>}
                {q.unit && <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-slate-600"><BookMarked size={12} />{q.unit}</span>}
              </p>
            )}
            {q.type === "truefalse" && <p className="mt-4 inline-flex rounded-full bg-gold/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-800">True or false?</p>}
            <div className="mt-4 select-none text-lg font-bold leading-8"><RichText text={q.question} /></div>
            <div className="mt-5 grid select-none gap-2.5" role="radiogroup" aria-label={`Answer to question ${current + 1}`}>
              {q.choices.map((choice, i) => {
                const isSel = selected === i, blocked = selected !== null && !isSel;
                return (
                  <button key={i} type="button" role="radio" aria-checked={isSel} disabled={blocked} onClick={() => choose(i)}
                    title={blocked ? "Clear your choice first to pick a different answer" : undefined}
                    className={`flex items-center gap-3 rounded-xl border-2 p-3.5 text-left text-sm font-semibold transition ${isSel ? "border-navy bg-navy/5" : blocked ? "cursor-not-allowed border-slate-100 opacity-50" : "border-slate-200 hover:border-royal hover:bg-blue-50/40"}`}>
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-xs font-extrabold ${isSel ? "border-navy bg-navy text-white" : "border-slate-300 text-slate-500"}`}>{q.type === "truefalse" ? (i === 0 ? "T" : "F") : letter(i)}</span>
                    <span className="min-w-0 flex-1">{q.type === "truefalse" ? <b className="text-base">{choice}</b> : <RichText text={choice} compact />}</span>
                    {isSel && <CheckCircle2 size={18} className="shrink-0 text-navy" />}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex min-h-8 items-center">
              {selected !== null
                ? <button type="button" onClick={clear} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-bold text-red-600 underline-offset-4 hover:bg-red-50 hover:underline"><Eraser size={15} /> Clear choice</button>
                : <span className="text-xs text-slate-400">Choose one answer. You can clear it later if you change your mind.</span>}
            </div>
            <div className="mt-5 flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
              <button type="button" disabled={current === 0} onClick={() => go(current - 1)} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold hover:border-royal disabled:opacity-40"><ChevronLeft size={16} /> Previous</button>
              <span className="hidden text-[11px] text-slate-400 sm:block">A–D choose · C clear · F flag · ←/→ move</span>
              {current < questions.length - 1
                ? <button type="button" onClick={() => go(current + 1)} className="inline-flex items-center gap-1 rounded-xl bg-navy px-4 py-2.5 text-sm font-bold text-white hover:bg-royal">Next <ChevronRight size={16} /></button>
                : <button type="button" onClick={() => setReview(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-700"><Send size={15} /> Review &amp; submit</button>}
            </div>
          </motion.section>
        </AnimatePresence>

        {/* Answer sheet (desktop) */}
        {sheetOpen && <aside className="sticky top-40 hidden h-fit max-h-[calc(100vh-11rem)] rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:block">{sheet}</aside>}
      </div>

      {/* Answer sheet (phones) */}
      <AnimatePresence>
        {mobileSheet && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-navy/50 lg:hidden" onClick={(e) => e.target === e.currentTarget && setMobileSheet(false)}>
            <motion.aside initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "tween", duration: 0.25 }} className="absolute inset-y-0 right-0 w-[19rem] max-w-[88vw] overflow-y-auto bg-white p-4 shadow-2xl">{sheet}</motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Review before submitting */}
      <AnimatePresence>
        {review && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] grid place-items-center bg-navy/60 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl" role="dialog" aria-label="Review before submitting">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-extrabold">Review before submitting</h2>
                <button type="button" onClick={() => setReview(false)} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full hover:bg-slate-100"><X size={18} /></button>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-2xl bg-green-50 p-3"><b className="block text-2xl text-green-700">{answeredCount}</b>answered</div>
                <div className="rounded-2xl bg-red-50 p-3"><b className="block text-2xl text-red-600">{unanswered}</b>not answered</div>
                <div className="rounded-2xl bg-amber-50 p-3"><b className="block text-2xl text-amber-700">{flaggedCount}</b>flagged</div>
              </div>
              {[["Not answered", answers.map((a, i) => (a === null ? i : -1)).filter((i) => i >= 0), "bg-slate-100 text-slate-700"], ["Flagged", flags.map((f, i) => (f ? i : -1)).filter((i) => i >= 0), "bg-amber-100 text-amber-800"]].map(([label, list, tone]) => (list as number[]).length > 0 && (
                <div key={label as string} className="mt-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label as string}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">{(list as number[]).map((i) => <button key={i} type="button" onClick={() => { setReview(false); go(i); }} className={`h-8 min-w-8 rounded-lg px-2 text-xs font-extrabold hover:ring-2 hover:ring-navy ${tone as string}`}>{i + 1}</button>)}</div>
                </div>
              ))}
              <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{unanswered ? `${unanswered} question${unanswered === 1 ? " is" : "s are"} not answered and will be marked wrong.` : "All questions are answered."} Time left: <b>{clock(left)}</b>. After submitting you can&apos;t change your answers.</p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setReview(false)} className="rounded-xl border border-slate-200 py-3 text-sm font-bold hover:bg-slate-50">Return to exam</button>
                <button type="button" onClick={() => void submit(null)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700"><Send size={15} /> Submit exam</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left the exam */}
      <AnimatePresence>
        {away && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] grid place-items-center bg-red-950/85 p-4 backdrop-blur" role="alertdialog" aria-label="Exam stopped">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-2xl">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-100 text-red-600"><ShieldAlert size={28} /></span>
              <h2 className="mt-4 text-2xl font-extrabold">Exam stopped</h2>
              <p className="mt-2 text-sm text-slate-600">
                {away === "fullscreen" ? "You left full screen." : away === "tab" ? "You switched to another tab or app." : "You left the exam window."} In the national exam you must stay at your desk — this has been recorded.
              </p>
              <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{violations + 1 >= MAX_VIOLATIONS ? `Last warning (${violations} of ${MAX_VIOLATIONS - 1}) — if you leave again, your exam is submitted automatically.` : `Warning ${violations} of ${MAX_VIOLATIONS - 1} — the ${MAX_VIOLATIONS}rd time you leave, your exam is submitted automatically.`}</p>
              <p className="mt-3 text-xs text-slate-500">The clock is still running: <b>{clock(left)}</b> left.</p>
              <button type="button" onClick={backToExam} autoFocus className="mt-5 w-full rounded-xl bg-navy py-3 text-sm font-bold text-white hover:bg-royal">Return to the exam</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
