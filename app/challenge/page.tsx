"use client";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Coins, LoaderCircle, Timer, Trophy, XCircle, Zap } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import AccountMenu from "@/app/components/AccountMenu";
import BackButton from "@/app/components/BackButton";
import Brand from "@/app/components/Brand";
import RichText from "@/app/components/RichText";
import { Avatar } from "@/app/student/Compete";

type Q = { index: number; total: number; subject: string; type: "mcq" | "truefalse"; question: string; choices: string[]; limit: number; left: number; unit: string; year: string };
type RunSummary = { score: number; correct: number; total: number; coins: number; finished: boolean; answers: { correct: boolean; timedOut: boolean; points: number }[] };
type Board = { top: { rank: number; name: string; score: number; correct: number; total: number; frame: string | null; title: string | null; me: boolean }[]; me: { rank: number; score: number } | null; players: number };
type State = { available: boolean; reason?: string; size: number; resetsIn: number; grade: string; run: RunSummary | null; question: Q | null; board: Board };
type Feedback = { choice: number; correct: boolean; timedOut: boolean; points: number; correctAnswer: number; explanation: string };

const MEDAL = ["", "🥇", "🥈", "🥉"];
const letter = (i: number) => String.fromCharCode(65 + i);

export default function ChallengePage() {
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState<Q | null>(null);
  const [run, setRun] = useState<RunSummary | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(0);
  const pending = useRef<{ next: Q | null; run: RunSummary; board: Board | null } | null>(null);

  const apply = useCallback((s: State) => { setState(s); setRun(s.run); if (s.question) { setQ(s.question); const t = Date.now(); setNow(t); setDeadline(t + s.question.left * 1000); } }, []);
  useEffect(() => {
    let on = true;
    fetch("/api/challenge", { cache: "no-store" }).then((r) => r.json()).then((s) => on && apply(s)).catch(() => on && setError("Could not load today's challenge."));
    return () => { on = false; };
  }, [apply]);

  const submit = useCallback(async (choice: number) => {
    if (!q || busy || feedback) return;
    setBusy(true);
    const r = await fetch("/api/challenge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "answer", index: q.index, choice }) }).catch(() => null);
    const data = await r?.json().catch(() => ({}));
    setBusy(false);
    if (!r?.ok) { setError(data?.error || "Could not send your answer."); return; }
    setFeedback({ choice, correct: data.correct, timedOut: data.timedOut, points: data.points, correctAnswer: data.correctAnswer, explanation: data.explanation });
    setRun(data.run);
    pending.current = { next: data.next, run: data.run, board: data.board };
  }, [q, busy, feedback]);

  // Countdown; running out submits "no answer".
  useEffect(() => {
    if (!q || feedback || !deadline) return;
    const id = window.setInterval(() => { const t = Date.now(); setNow(t); if (t >= deadline) { window.clearInterval(id); submit(-1); } }, 200);
    return () => window.clearInterval(id);
  }, [q, feedback, deadline, submit]);

  function next() {
    const p = pending.current;
    if (!p) return;
    pending.current = null;
    setFeedback(null);
    if (p.next) { setQ(p.next); const t = Date.now(); setNow(t); setDeadline(t + p.next.left * 1000); }
    else { setQ(null); setState((s) => (s ? { ...s, run: p.run, board: p.board ?? s.board } : s)); }
  }
  // Keyboard: A–D to answer, Enter for next
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!q) return;
      const k = e.key.toLowerCase();
      if (feedback && (k === "enter" || k === "arrowright")) { e.preventDefault(); next(); return; }
      const i = "abcd".indexOf(k) >= 0 ? "abcd".indexOf(k) : "1234".indexOf(k);
      if (!feedback && i >= 0 && i < q.choices.length) { e.preventDefault(); submit(i); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function start() {
    setBusy(true); setError("");
    const r = await fetch("/api/challenge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start" }) }).catch(() => null);
    const data = await r?.json().catch(() => ({}));
    setBusy(false);
    if (!r?.ok) return setError(data?.error || "Could not start the challenge.");
    setRun(data.run);
    if (data.question) { setQ(data.question); const t = Date.now(); setNow(t); setDeadline(t + data.question.left * 1000); }
  }

  const left = q ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0;
  const ratio = q ? Math.max(0, (deadline - now) / (q.limit * 1000)) : 0;

  return (
    <main className="min-h-screen bg-[#f3f6fb] text-navy">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-lg">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-2 sm:gap-4"><BackButton href="/student" label="Dashboard" /><Brand size="sm" subtitle="Daily challenge" /></div>
          <div className="flex items-center gap-2">
            {run && <span className="inline-flex items-center gap-1.5 rounded-full bg-royal/10 px-3 py-1.5 text-xs font-extrabold text-royal"><Zap size={14} />{run.score} pts</span>}
            <AccountMenu />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5 py-8">
        {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
        {!state ? <div className="h-80 animate-pulse rounded-3xl bg-slate-100" /> : !state.available ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-4xl">⚡</p>
            <h1 className="mt-3 text-2xl font-extrabold">Daily challenge</h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{state.reason ?? "There aren't enough questions for your grade yet. Your teachers are adding more — check back soon!"}</p>
            <Link href="/student" className="mt-5 inline-block rounded-xl bg-navy px-5 py-3 text-sm font-bold text-white">Back to dashboard</Link>
          </section>
        ) : q ? (
          /* Playing */
          <motion.section key={q.index} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[.16em] text-royal">Question {q.index + 1} of {q.total} · {q.subject}</p>
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-extrabold tabular-nums ${left <= 10 ? "bg-red-50 text-red-600" : "bg-slate-100 text-navy"}`}><Timer size={14} />{Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</span>
            </div>
            <div className="mt-3 flex gap-1.5">{Array.from({ length: q.total }, (_, i) => {
              const a = run?.answers[i];
              return <span key={i} className={`h-2 flex-1 rounded-full ${a ? (a.correct ? "bg-green-500" : "bg-red-400") : i === q.index ? "bg-royal" : "bg-slate-200"}`} />;
            })}</div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full transition-[width] duration-200 ${ratio < 0.25 ? "bg-red-500" : "bg-gold"}`} style={{ width: `${(feedback ? 0 : ratio) * 100}%` }} /></div>
            <div className="mt-6 text-xl font-bold leading-8"><RichText text={q.question} /></div>
            <div className={`mt-6 grid gap-3 ${q.type === "truefalse" ? "grid-cols-2" : ""}`}>
              {q.choices.map((choice, i) => {
                const isRight = feedback && i === feedback.correctAnswer, isWrongPick = feedback && i === feedback.choice && !feedback.correct;
                return (
                  <button key={i} type="button" disabled={!!feedback || busy} onClick={() => submit(i)}
                    className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left text-sm font-semibold transition ${isRight ? "border-green-400 bg-green-50" : isWrongPick ? "border-red-300 bg-red-50" : feedback ? "border-slate-200 opacity-60" : "border-slate-200 hover:-translate-y-0.5 hover:border-royal hover:bg-blue-50/50"}`}>
                    {q.type === "truefalse" ? <span className="block w-full py-2 text-center text-lg font-extrabold">{choice}</span>
                      : <><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-extrabold ${isRight ? "bg-green-500 text-white" : isWrongPick ? "bg-red-500 text-white" : "bg-slate-100 text-slate-600"}`}>{letter(i)}</span><span className="min-w-0 flex-1"><RichText text={choice} compact /></span></>}
                    {isRight && <CheckCircle2 size={18} className="shrink-0 text-green-600" />}{isWrongPick && <XCircle size={18} className="shrink-0 text-red-500" />}
                  </button>
                );
              })}
            </div>
            <AnimatePresence>
              {feedback && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`mt-6 flex flex-wrap items-center gap-3 rounded-2xl p-4 ${feedback.correct ? "bg-green-50" : "bg-amber-50"}`}>
                  <p className="flex-1 font-bold">{feedback.correct ? `Correct! +${feedback.points} points ${feedback.points >= 140 ? "⚡ lightning fast!" : ""}` : feedback.timedOut ? "⏰ Time's up — 0 points" : "Not this time — 0 points"}</p>
                  <button type="button" onClick={next} autoFocus className="rounded-xl bg-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-royal">{q.index + 1 < q.total ? "Next question →" : "See my result 🏁"}</button>
                </motion.div>
              )}
            </AnimatePresence>
            {busy && <p className="mt-4 flex items-center gap-2 text-sm text-slate-500"><LoaderCircle size={15} className="animate-spin" /> Checking…</p>}
          </motion.section>
        ) : run?.finished ? (
          /* Finished */
          <motion.section initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
            <div className="relative bg-gradient-to-br from-navy via-[#12306b] to-royal p-8 text-center text-white">
              <p className="text-5xl">{state.board.me && state.board.me.rank <= 3 ? MEDAL[state.board.me.rank] : "🏁"}</p>
              <h1 className="mt-2 text-3xl font-extrabold">{run.score} points</h1>
              <p className="mt-1 text-white/75">{run.correct} of {run.total} correct{state.board.me ? ` · you're #${state.board.me.rank} of ${state.board.players} in ${state.grade} today` : ""}</p>
              <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-1.5 text-sm font-extrabold text-navy"><Coins size={16} /> +{run.coins} coins</p>
            </div>
            <Leaderboard board={state.board} />
            <p className="px-6 pb-6 text-center text-sm text-slate-500">A new challenge starts at midnight. Come back tomorrow to defend your rank!</p>
          </motion.section>
        ) : (
          /* Intro */
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
            <div className="bg-gradient-to-br from-royal to-navy p-8 text-white">
              <p className="text-xs font-bold uppercase tracking-[.16em] text-gold">{state.grade} · today</p>
              <h1 className="mt-2 text-3xl font-extrabold">⚡ Daily challenge</h1>
              <p className="mt-2 max-w-xl text-white/80">The same {state.size} questions for everyone in your class today. One try only — answer fast for bonus points!</p>
              <ul className="mt-5 grid gap-2 text-sm sm:grid-cols-3">
                {[["🎯", "100 points", "per correct answer"], ["⚡", "+50 speed bonus", "the faster, the more"], ["🪙", "Coins", "15 + 2 per correct answer"]].map(([icon, t, d]) => (
                  <li key={t} className="rounded-2xl bg-white/10 p-3"><span className="text-xl">{icon}</span><b className="block">{t}</b><span className="text-white/70">{d}</span></li>
                ))}
              </ul>
              <button type="button" disabled={busy} onClick={start} className="btn-shine mt-6 inline-flex items-center gap-2 rounded-2xl bg-gold px-6 py-3.5 text-base font-extrabold text-navy hover:brightness-95 disabled:opacity-60">{busy ? <LoaderCircle size={18} className="animate-spin" /> : <Zap size={18} />} Start the challenge</button>
              <p className="mt-2 text-xs text-white/60">The timer starts as soon as you press start. Power-ups can&apos;t be used here — it&apos;s a fair fight.</p>
            </div>
            <Leaderboard board={state.board} />
          </section>
        )}
      </div>
    </main>
  );
}

function Leaderboard({ board }: { board: Board }) {
  return (
    <div className="p-6">
      <p className="flex items-center gap-2 text-sm font-extrabold"><Trophy size={16} className="text-gold" /> Today&apos;s leaderboard <span className="font-normal text-slate-500">· {board.players} played</span></p>
      <ol className="mt-3 grid gap-1.5">
        {board.top.map((r) => (
          <li key={r.rank} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${r.me ? "bg-royal/10 ring-1 ring-royal/30" : "bg-slate-50"}`}>
            <span className="w-7 text-center font-extrabold">{MEDAL[r.rank] || r.rank}</span>
            <Avatar name={r.name} frame={r.frame} size="h-8 w-8 text-xs" />
            <span className="min-w-0 flex-1 truncate font-bold">{r.name}{r.title && <span className="ml-1.5 rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">{r.title}</span>}{r.me && <span className="ml-1 text-xs text-royal">(you)</span>}</span>
            <span className="text-xs text-slate-500">{r.correct}/{r.total}</span>
            <span className="w-12 text-right font-extrabold tabular-nums">{r.score}</span>
          </li>
        ))}
        {!board.top.length && <li className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">No one has finished yet — set the score to beat!</li>}
      </ol>
    </div>
  );
}
