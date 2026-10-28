"use client";

import { CheckCircle2, ChevronRight, CircleCheckBig, ClipboardList, Clock3, Eye, Flame, GraduationCap, LayoutDashboard, Lock, MessageCircle, RotateCcw, Sparkles, Trophy, X, XCircle, Zap } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import AccountMenu from "@/app/components/AccountMenu";
import Brand from "@/app/components/Brand";
import BackButton from "@/app/components/BackButton";
import { useSubjects } from "@/app/components/useSubjects";
import { xpFor } from "@/lib/gamification";
import { hasCalculator, secondsPerQuestion } from "@/lib/subjects";
import Calculator from "./Calculator";
import RichText from "@/app/components/RichText";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

type Question = { id: string; type?: "mcq" | "truefalse"; question: string; choices: string[]; answer: number; explanation: string; teacher: string; unit: string; year: string };
type SessionUser = { name: string; role: string; plan: "free" | "monthly" | "yearly" | "teacher" };
/** One answered (or timed-out) question in this sitting. */
type Result = { choice: number; correct: boolean; timedOut: boolean; xp: number; combo: number };

/** practice: see the right answer after every question. exam: answers and explanations only at the end. */
type Mode = "practice" | "exam";
const MODE_KEY = "examMode";

/** What the server allows this viewer: with payment on, free students get only the first questions. */
type Access = { limited: boolean; total: number; freeQuestions: number };

export default function ExamPage() { return <Suspense fallback={<Loading />}><Exam /></Suspense>; }
function Loading() { return <main className="grid min-h-screen place-items-center bg-[#f7f9fc] text-sm font-bold text-slate-500">Loading questions...</main>; }

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function Exam() {
  const params = useSearchParams();
  const grade = params.get("grade") || "Grade 12";
  const subject = params.get("subject") || "Mathematics";
  const subjectList = useSubjects();
  const duration = secondsPerQuestion(subject, subjectList);
  const calculator = hasCalculator(subjectList.find((s) => s.name === subject));
  const [questions, setQuestions] = useState<Question[]>([]);
  const [access, setAccess] = useState<Access>({ limited: false, total: 0, freeQuestions: 0 });
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Record<number, Result>>({});
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(0);
  const [finished, setFinished] = useState(false);
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [mode, setMode] = useState<Mode | null>(null);
  const reveal = mode === "practice";
  const question = questions[index];
  const result = results[index];
  const requiresSubscription = access.limited;
  const total = Math.max(access.total, questions.length);
  const locked = access.limited && index >= questions.length && total > questions.length;
  const saves = user?.role === "student";
  const timeLeft = startedAt ? Math.max(0, duration - Math.floor((now - startedAt) / 1000)) : duration;
  const combo = (() => { let run = 0; for (let i = index - (result ? 0 : 1); i >= 0 && results[i]?.correct; i--) run++; return run; })();

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((data) => setUser(data.user)).catch(() => {});
    const query = new URLSearchParams({ grade, subject });
    fetch(`/api/questions?${query}`)
      .then(async (r) => { const data = await r.json(); if (!r.ok) throw new Error(data.error); setQuestions(data.questions); setAccess({ limited: Boolean(data.limited), total: data.total ?? data.questions.length, freeQuestions: data.freeQuestions ?? 0 }); })
      .catch((e) => setError(e.message || "Unable to load questions"))
      .finally(() => setLoading(false));
  }, [grade, subject]);

  /** Saves an answer (or a timeout) and records the XP it earned. */
  const record = useCallback(async (at: number, q: Question, choice: number, timedOut: boolean, run: number) => {
    const correct = !timedOut && choice === q.answer;
    const local: Result = { choice, correct, timedOut, xp: xpFor(correct, timedOut, correct ? run + 1 : 0), combo: correct ? run + 1 : 0 };
    setResults((r) => ({ ...r, [at]: local }));
    if (!saves) return;
    const response = await fetch("/api/attempts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(timedOut ? { questionId: q.id, timedOut: true } : { questionId: q.id, selectedAnswer: choice }) }).catch(() => null);
    const data = await response?.json().catch(() => null);
    if (response?.ok && typeof data?.xp === "number") setResults((r) => ({ ...r, [at]: { ...local, xp: data.xp, combo: correct ? data.combo : 0 } }));
  }, [saves]);

  // Countdown for the current question. When it reaches zero the question locks and counts as unanswered.
  useEffect(() => {
    if (!mode || !startedAt || !question || locked || result || finished) return;
    const deadline = startedAt + duration * 1000;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= deadline) { window.clearInterval(id); record(index, question, -1, true, 0); }
    }, 250);
    return () => window.clearInterval(id);
  }, [mode, startedAt, duration, question, index, locked, result, finished, record]);

  function answer(choice: number) {
    if (result || !question || timeLeft <= 0) return;
    record(index, question, choice, false, combo);
  }
  function go(to: number) {
    setIndex(to);
    if (!results[to]) { const t = Date.now(); setStartedAt(t); setNow(t); }
  }
  function next() {
    if (index < questions.length - 1) go(index + 1);
    else if (access.limited && total > questions.length) setIndex(questions.length);
    else setFinished(true);
  }
  function start(chosen: Mode) {
    try { localStorage.setItem(MODE_KEY, chosen); } catch {}
    setMode(chosen);
    setIndex(0);
    const t = Date.now(); setStartedAt(t); setNow(t);
  }
  function restart() {
    setResults({});
    setFinished(false);
    setIndex(0);
    setMode(null); // choose the mode again
  }

  // Keyboard: A–D / 1–4 to answer, Enter or → for the next question.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!mode || !question || finished || locked || showSubscribe || e.metaKey || e.ctrlKey || e.altKey) return;
      // Typing in the calculator (or any field) must not answer the question.
      if (e.target instanceof HTMLElement && (e.target.closest("input, textarea, select") || e.target.closest("#calculator-panel"))) return;
      const k = e.key.toLowerCase();
      const pick = "abcd".indexOf(k) >= 0 ? "abcd".indexOf(k) : "1234".indexOf(k);
      if (pick >= 0 && pick < question.choices.length && !result) { e.preventDefault(); answer(pick); }
      else if ((k === "enter" || k === "arrowright") && result) { e.preventDefault(); next(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (loading) return <Loading />;
  if (error) return <Message title="Questions could not be loaded" detail={error} />;
  if (!question && !locked) return <Message title="No questions published yet" detail={`A teacher can add ${grade} ${subject} questions from the teacher dashboard.`} />;

  const answered = Object.keys(results).length;
  const sessionXp = Object.values(results).reduce((sum, r) => sum + r.xp, 0);
  const selected = result ? result.choice : null;

  return <main className="min-h-screen bg-[#f7f9fc] text-navy">
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-lg">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3">
        <div className="flex items-center gap-2 sm:gap-4"><BackButton href={saves ? "/student" : "/#grades"} label={saves ? "Dashboard" : "Subjects"} /><Brand size="sm" /></div>
        <div className="flex items-center gap-2">
          {mode && (reveal || finished) && <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-extrabold text-violet-700"><Zap size={14} />{sessionXp} XP</span>}
          {mode === "exam" && !finished && <span className="hidden items-center gap-1.5 rounded-full bg-navy/5 px-3 py-1.5 text-xs font-extrabold text-navy sm:inline-flex"><ClipboardList size={14} />Exam mode</span>}
          {user ? <AccountMenu /> : <Link href="/login" className="rounded-xl bg-navy px-3.5 py-2 text-xs font-bold text-white hover:bg-royal">Sign in to save progress</Link>}
        </div>
      </div>
    </header>

    <div className={`mx-auto max-w-5xl px-5 py-8 ${calculator ? "pb-24" : ""}`}>
      {!mode && questions.length > 0 ? <ModePicker subject={subject} grade={grade} total={total} available={questions.length} seconds={duration} onStart={start} /> :
      finished ? <Summary subject={subject} grade={grade} questions={questions} results={results} total={questions.length} saves={saves} mode={mode ?? "practice"} explanations={!requiresSubscription} onRestart={restart} onSubscribe={() => setShowSubscribe(true)} /> :
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-royal">{grade} · {subject}</p>
            <h1 className="mt-2 text-2xl font-bold">{mode === "exam" ? "Exam mode" : "Practice mode"}</h1>
            <p className="mt-1 text-sm text-slate-500">Question <b className="text-navy">{Math.min(index + 1, total)}</b> of {total} · {duration >= 60 ? `${duration / 60} min` : `${duration} s`} per question</p>
            {reveal && combo >= 2 && <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-extrabold text-orange-600"><Flame size={13} />{combo} in a row!</p>}
          </div>
          {!locked && <TimerRing left={result ? (result.timedOut ? 0 : timeLeft) : timeLeft} total={duration} paused={Boolean(result)} />}
        </div>

        {/* Question navigator */}
        <div className="mt-6 flex flex-wrap gap-1.5">
          {questions.map((q, i) => {
            const r = results[i];
            const tone = !r ? "bg-slate-100 text-slate-500" : r.timedOut ? "bg-amber-400 text-navy" : !reveal ? "bg-navy text-white" : r.correct ? "bg-green-500 text-white" : "bg-red-500 text-white";
            return <button key={q.id} onClick={() => (r || i === index) && go(i)} disabled={!r && i !== index} aria-label={`Question ${i + 1}`} className={`h-7 min-w-7 rounded-lg px-1.5 text-xs font-bold transition ${tone} ${i === index ? "ring-2 ring-navy ring-offset-2" : ""} disabled:cursor-default`}>{i + 1}</button>;
          })}
          {access.limited && total > questions.length && (
            <button onClick={() => setIndex(questions.length)} disabled={!results[questions.length - 1] && questions.length > 0} title={`${total - questions.length} more questions with a subscription`} className={`inline-flex h-7 items-center gap-1 rounded-lg bg-gold/20 px-2 text-xs font-bold text-amber-800 ${locked ? "ring-2 ring-navy ring-offset-2" : ""}`}>
              <Lock size={12} />+{total - questions.length}
            </button>
          )}
        </div>

        {locked ? <div className="mt-10 rounded-2xl border border-slate-200 bg-[#f7f9fc] p-8 text-center"><Lock className="mx-auto" /><h2 className="mt-4 text-xl font-bold">{access.freeQuestions ? "Free preview complete" : "Subscription required"}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{access.freeQuestions ? `You've used the ${access.freeQuestions} free questions in ${subject}. ` : ""}Subscribe to unlock all {total} questions, every explanation and teacher support.</p><div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row"><button onClick={() => setShowSubscribe(true)} className="rounded-lg bg-navy px-4 py-3 text-sm font-bold text-white">Subscribe monthly or yearly</button>{answered > 0 && <button onClick={() => setFinished(true)} className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-bold">See my results</button>}{!user && <Link href="/signup" className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-bold">Create student account</Link>}</div></div> : <>
          <AnimatePresence mode="wait"><motion.div key={question.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
            {question.type === "truefalse" && <p className="mt-8 inline-flex rounded-full bg-gold/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-800">True or false?</p>}
            <div className={`${question.type === "truefalse" ? "mt-3" : "mt-8"} text-xl font-bold leading-8`}><RichText text={question.question} /></div>
            <div className={`mt-6 grid gap-3 ${question.type === "truefalse" ? "grid-cols-2" : ""}`}>{question.choices.map((choice, i) => {
              const isAnswer = i === question.answer;
              const state = selected === null ? "idle" : !reveal ? (selected === i ? "chosen" : "dim") : isAnswer ? "right" : selected === i ? "wrong" : "dim";
              const style = { idle: "border-slate-200 hover:-translate-y-0.5 hover:border-royal hover:bg-blue-50/50", chosen: "border-navy bg-navy/5 text-navy", right: "border-green-400 bg-green-50 text-green-800", wrong: "border-red-300 bg-red-50 text-red-700", dim: "border-slate-200 opacity-60" }[state];
              return <motion.button key={`${choice}-${i}`} disabled={selected !== null || timeLeft === 0} onClick={() => answer(i)} animate={state === "wrong" ? { x: [0, -6, 6, -4, 4, 0] } : state === "right" && selected === i ? { scale: [1, 1.03, 1] } : {}} transition={{ duration: 0.4 }} className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left text-sm font-semibold transition-colors ${style}`}>
                {question.type === "truefalse" ? <span className="block w-full py-2 text-center text-lg font-extrabold">{choice}</span> : <><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-extrabold ${state === "right" ? "bg-green-500 text-white" : state === "wrong" ? "bg-red-500 text-white" : state === "chosen" ? "bg-navy text-white" : "bg-slate-100 text-slate-600"}`}>{String.fromCharCode(65 + i)}</span><span className="min-w-0 flex-1"><RichText text={choice} compact /></span></>}
                {state === "right" && <CheckCircle2 className="shrink-0 text-green-600" size={18} />}{state === "wrong" && <XCircle className="shrink-0 text-red-500" size={18} />}{state === "chosen" && <CircleCheckBig className="shrink-0 text-navy" size={18} />}
              </motion.button>;
            })}</div>
          </motion.div></AnimatePresence>

          {result && !reveal && <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`mt-6 rounded-2xl p-4 text-sm font-semibold ${result.timedOut ? "bg-amber-50 text-amber-800" : "bg-slate-50 text-slate-600"}`}>
            {result.timedOut ? "⏰ Time is up — this one counts as unanswered." : "Answer saved."} You&apos;ll see the correct answers and explanations when you finish.
          </motion.p>}
          {result && reveal && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mt-6 rounded-2xl p-5 ${result.correct ? "bg-green-50" : result.timedOut ? "bg-amber-50" : "bg-red-50/70"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold">{result.correct ? "Correct — well done! 🎉" : result.timedOut ? "⏰ Time is up — this one counts as unanswered." : "Not quite. Review the explanation."}</p>
              <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${result.xp ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"}`}>+{result.xp} XP</span>
            </div>
            {!result.correct && <div className="mt-1 text-sm text-slate-600">Correct answer: <b><AnswerText q={question} i={question.answer} /></b></div>}
            <div className="mt-2 text-sm leading-6 text-slate-600">{requiresSubscription ? "Subscribe to view the full teacher explanation." : question.explanation ? <RichText text={question.explanation} /> : "No explanation was provided for this question."}</div>
            <button onClick={() => requiresSubscription && setShowSubscribe(true)} className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-royal hover:underline"><Sparkles size={14} />Explanation by {question.teacher}</button>
            {user && <Link href={`/chat?subject=${encodeURIComponent(subject)}`} className="ml-4 inline-flex items-center gap-1.5 text-xs font-bold text-navy hover:underline"><MessageCircle size={14} />Ask a {subject} teacher</Link>}
          </motion.div>}

          <div className="mt-7 flex items-center justify-between gap-3">
            <p className="hidden text-xs text-slate-400 sm:block">Tip: press <kbd className="rounded border px-1">A</kbd>–<kbd className="rounded border px-1">D</kbd> to answer, <kbd className="rounded border px-1">Enter</kbd> for next</p>
            <button disabled={!result} onClick={next} className="ml-auto inline-flex items-center gap-2 rounded-xl bg-navy px-5 py-3 text-sm font-bold text-white hover:bg-royal disabled:opacity-40">{index === total - 1 ? <>Finish &amp; see results <Trophy size={16} /></> : <>Next question <ChevronRight size={17} /></>}</button>
          </div>
        </>}

        <XpPop result={reveal ? result : undefined} key={`${index}-${result ? "done" : "open"}`} />
      </motion.section>}
    </div>
    {mode && !finished && calculator && <Calculator />}
    {showSubscribe && <SubscriptionDialog onClose={() => setShowSubscribe(false)} />}
  </main>;
}

/** Circular countdown; turns amber then red and pulses in the last 10 seconds. */
function TimerRing({ left, total, paused }: { left: number; total: number; paused: boolean }) {
  const r = 30, c = 2 * Math.PI * r;
  const ratio = total ? left / total : 0;
  const color = ratio > 0.5 ? "#155EEF" : ratio > 0.2 ? "#F59E0B" : "#DC2626";
  const urgent = !paused && left <= 10 && left > 0;
  return (
    <motion.div animate={urgent ? { scale: [1, 1.06, 1] } : { scale: 1 }} transition={urgent ? { duration: 1, repeat: Infinity } : {}} className="relative h-[76px] w-[76px] shrink-0" role="timer" aria-label={`${left} seconds left`}>
      <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90">
        <circle cx="38" cy="38" r={r} fill="none" stroke="#e2e8f0" strokeWidth="7" />
        <circle cx="38" cy="38" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - ratio)} style={{ transition: "stroke-dashoffset .3s linear, stroke .3s" }} />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-center leading-none">
        <span><Clock3 size={12} className="mx-auto mb-0.5" style={{ color }} /><b className="text-base tabular-nums" style={{ color }}>{clock(left)}</b></span>
      </span>
    </motion.div>
  );
}

/** Floating "+XP" (and combo bonus) right after answering. */
function XpPop({ result }: { result?: Result }) {
  return (
    <AnimatePresence>
      {result && result.xp > 0 && (
        <motion.div initial={{ opacity: 0, y: 10, scale: 0.8 }} animate={{ opacity: [0, 1, 1, 0], y: -40, scale: 1 }} transition={{ duration: 1.6 }} className="pointer-events-none absolute right-8 top-60 text-right">
          <p className="text-2xl font-extrabold text-violet-600">+{result.xp} XP</p>
          {result.combo >= 3 && result.combo % 3 === 0 && <p className="text-sm font-extrabold text-orange-500">🔥 {result.combo} in a row — bonus!</p>}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Choose how to work before the first question. */
function ModePicker({ subject, grade, total, available, seconds, onStart }: { subject: string; grade: string; total: number; available: number; seconds: number; onStart: (mode: Mode) => void }) {
  const [last] = useState<Mode | null>(() => { try { const v = localStorage.getItem(MODE_KEY); return v === "exam" || v === "practice" ? v : null; } catch { return null; } });
  const options: { mode: Mode; icon: typeof Eye; title: string; text: string; points: string[] }[] = [
    { mode: "practice", icon: Eye, title: "Practice mode", text: "See if you're right straight after each question.", points: ["Correct answer shown after every question", "Explanation right away", "XP and streak bonuses as you go"] },
    { mode: "exam", icon: GraduationCap, title: "Exam mode", text: "Work like the real national exam, then review everything.", points: ["No answers shown while you work", "Full results at the end", "Correct answers + explanations for every question"] },
  ];
  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[.16em] text-royal">{grade} · {subject}</p>
      <h1 className="mt-2 text-2xl font-extrabold">How do you want to work?</h1>
      <p className="mt-1 text-sm text-slate-500">{total} question{total === 1 ? "" : "s"}{available < total ? ` (${available} free)` : ""} · {seconds >= 60 ? `${seconds / 60} min` : `${seconds} s`} per question. The timer starts when you choose.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {options.map((o) => (
          <button key={o.mode} onClick={() => onStart(o.mode)} className={`card-lift group relative flex flex-col rounded-2xl border-2 p-5 text-left transition hover:border-royal ${last === o.mode ? "border-royal/60 bg-blue-50/40" : "border-slate-200"}`}>
            {last === o.mode && <span className="absolute right-4 top-4 rounded-full bg-royal/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-royal">Last used</span>}
            <span className={`grid h-12 w-12 place-items-center rounded-2xl ${o.mode === "exam" ? "bg-navy text-gold" : "bg-green-50 text-green-600"}`}><o.icon size={24} /></span>
            <span className="mt-4 text-lg font-extrabold">{o.title}</span>
            <span className="mt-1 text-sm text-slate-500">{o.text}</span>
            <ul className="mt-4 flex-1 space-y-1.5 text-sm text-slate-600">{o.points.map((pt) => <li key={pt} className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-royal" />{pt}</li>)}</ul>
            <span className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-bold text-white group-hover:bg-royal">Start {o.title.toLowerCase()} <ChevronRight size={16} /></span>
          </button>
        ))}
      </div>
    </motion.section>
  );
}

/** "B. choice" (or just "True"), with any code in the choice rendered. */
function AnswerText({ q, i }: { q: Question; i: number }) {
  if (q.type === "truefalse") return <>{q.choices[i]}</>;
  return <span className="min-w-0">{String.fromCharCode(65 + i)}. <RichText text={q.choices[i] ?? ""} compact /></span>;
}

/** End-of-session results, with a question-by-question review. */
function Summary({ subject, grade, questions, results: byIndex, total, saves, mode, explanations, onRestart, onSubscribe }: {
  subject: string; grade: string; questions: Question[]; results: Record<number, Result>; total: number; saves: boolean; mode: Mode; explanations: boolean; onRestart: () => void; onSubscribe: () => void;
}) {
  const results = Object.values(byIndex);
  const [filter, setFilter] = useState<"all" | "wrong">(mode === "exam" ? "all" : "wrong");
  const reviewed = questions.map((q, i) => ({ q, i, r: byIndex[i] })).filter((x) => x.r && (filter === "all" || !x.r.correct));
  const right = results.filter((r) => r.correct).length;
  const timeouts = results.filter((r) => r.timedOut).length;
  const pct = results.length ? Math.round((right / results.length) * 100) : 0;
  const xp = results.reduce((s, r) => s + r.xp, 0);
  const best = Math.max(0, ...results.map((r) => r.combo));
  const verdict = pct >= 80 ? { emoji: "🏆", text: "Outstanding! You're exam-ready in this subject." } : pct >= 60 ? { emoji: "🌟", text: "Great work — a little more practice and you'll master it." } : pct >= 40 ? { emoji: "💪", text: "Good effort! Review the explanations and try again." } : { emoji: "📚", text: "Every expert started here. Read the explanations and have another go." };
  const r = 54, c = 2 * Math.PI * r;
  return (
    <motion.section initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="relative bg-gradient-to-br from-navy via-[#12306b] to-royal p-8 text-center text-white">
        <div className="bg-grid absolute inset-0" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-gold">{grade} · {subject}</p>
          <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="mt-3 text-5xl">{verdict.emoji}</motion.p>
          <h1 className="mt-2 text-3xl font-extrabold">Session complete</h1>
          <p className="mt-1 text-white/75">{verdict.text}</p>
          <div className="relative mx-auto mt-6 h-36 w-36">
            <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
              <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="12" />
              <motion.circle cx="64" cy="64" r={r} fill="none" stroke="#F4B740" strokeWidth="12" strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - pct / 100) }} transition={{ duration: 1.2, delay: 0.3 }} />
            </svg>
            <span className="absolute inset-0 grid place-items-center"><span><b className="block text-4xl font-extrabold">{pct}%</b><span className="text-xs text-white/70">{right}/{results.length} correct</span></span></span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 p-6 sm:grid-cols-4">
        {[
          { label: "XP earned", value: `+${xp}`, tint: "text-violet-600" },
          { label: "Best streak", value: `${best} 🔥`, tint: "text-orange-600" },
          { label: "Answered", value: `${results.length}/${total}`, tint: "text-royal" },
          { label: "Timed out", value: timeouts, tint: "text-amber-600" },
        ].map((s) => <div key={s.label} className="rounded-2xl bg-slate-50 p-4 text-center"><p className={`text-2xl font-extrabold ${s.tint}`}>{s.value}</p><p className="text-xs font-semibold text-slate-500">{s.label}</p></div>)}
      </div>
      {!saves && <p className="mx-6 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Sign in with a student account to save your XP, streak and badges.</p>}

      {/* Review */}
      <div className="border-t border-slate-100 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold">Review your answers</h2>
            <p className="text-sm text-slate-500">Your answer, the correct answer{explanations ? " and the explanation" : ""} for each question.</p>
          </div>
          <div className="inline-grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-xs font-bold">
            {(["all", "wrong"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`rounded-lg px-3 py-1.5 ${filter === f ? "bg-white text-navy shadow-sm" : "text-slate-500"}`}>{f === "all" ? `All (${results.length})` : `To review (${results.length - right})`}</button>
            ))}
          </div>
        </div>
        <ol className="mt-4 grid gap-3">
          {reviewed.map(({ q, i, r }) => (
            <li key={q.id} className={`rounded-2xl border p-4 ${r.correct ? "border-green-200 bg-green-50/40" : r.timedOut ? "border-amber-200 bg-amber-50/40" : "border-red-200 bg-red-50/40"}`}>
              <div className="flex items-start gap-3">
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-extrabold text-white ${r.correct ? "bg-green-500" : r.timedOut ? "bg-amber-400" : "bg-red-500"}`}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold"><RichText text={q.question} /></div>
                  <div className="mt-2 grid gap-1 text-sm">
                    {r.timedOut ? <p className="flex items-center gap-1.5 font-semibold text-amber-700"><Clock3 size={15} /> Not answered — time ran out</p>
                      : <div className={`flex items-start gap-1.5 font-semibold ${r.correct ? "text-green-700" : "text-red-600"}`}>{r.correct ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> : <XCircle size={15} className="mt-0.5 shrink-0" />}Your answer: <AnswerText q={q} i={r.choice} /></div>}
                    {!r.correct && <div className="flex items-start gap-1.5 font-semibold text-green-700"><CheckCircle2 size={15} className="mt-0.5 shrink-0" />Correct answer: <AnswerText q={q} i={q.answer} /></div>}
                  </div>
                  {explanations
                    ? <div className="mt-2 rounded-xl bg-white/80 p-3 text-sm leading-6 text-slate-600"><b className="text-navy">Explanation:</b> {q.explanation ? <RichText text={q.explanation} /> : "No explanation was provided for this question."}</div>
                    : <button onClick={onSubscribe} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-royal hover:underline"><Lock size={12} /> Subscribe to see the teacher&apos;s explanation</button>}
                </div>
              </div>
            </li>
          ))}
          {!reviewed.length && <li className="rounded-2xl bg-green-50 p-5 text-center text-sm font-semibold text-green-700">Nothing to review — every answer was correct! 🎉</li>}
        </ol>
      </div>
      <div className="flex flex-col gap-2 p-6 pt-4 sm:flex-row">
        <button onClick={onRestart} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-bold hover:border-royal"><RotateCcw size={16} /> Try again</button>
        <Link href={saves ? "/student" : "/#grades"} className="btn-shine inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-navy py-3 text-sm font-bold text-white hover:bg-royal"><LayoutDashboard size={16} /> {saves ? "Back to my dashboard" : "Choose another subject"}</Link>
      </div>
    </motion.section>
  );
}

function SubscriptionDialog({ onClose }: { onClose: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-navy/60 px-5" role="dialog" aria-modal="true" aria-labelledby="subscription-title"><div className="relative w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl"><button onClick={onClose} className="absolute right-4 top-4 p-1" aria-label="Close subscription dialog"><X size={20} /></button><Sparkles className="text-gold" /><h2 id="subscription-title" className="mt-4 text-2xl font-bold">Unlock every question</h2><p className="mt-2 text-sm leading-6 text-slate-600">Choose a plan to continue practising and get complete teacher explanations.</p><div className="mt-6 grid gap-3 sm:grid-cols-2"><Link href="/#subscriptions" className="rounded-lg border border-slate-200 p-4 transition hover:border-royal"><p className="font-bold">Monthly</p><p className="mt-1 text-sm text-slate-500">ETB 200 / month</p></Link><Link href="/#subscriptions" className="rounded-lg border border-royal bg-blue-50 p-4"><p className="font-bold">Yearly</p><p className="mt-1 text-sm text-slate-500">ETB 1,000 / year</p></Link></div><p className="mt-5 text-xs text-slate-500">Complete checkout from the subscription section.</p></div></div>;
}

function Message({ title, detail }: { title: string; detail: string }) { return <main className="grid min-h-screen place-items-center bg-[#f7f9fc] px-5 text-center"><div><h1 className="text-2xl font-bold">{title}</h1><p className="mt-2 max-w-md text-sm leading-6 text-slate-600">{detail}</p><Link href="/#grades" className="mt-5 inline-block rounded-lg bg-navy px-4 py-3 text-sm font-bold text-white">Choose another subject</Link></div></main>; }
