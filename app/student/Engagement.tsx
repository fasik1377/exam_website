"use client";
import { motion } from "framer-motion";
import { Award, Crown, Flame, Lock, Medal, Sparkles, Star, Target, Trophy, Zap, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export type Level = { level: number; title: string; xp: number; floor: number; next: number | null; progress: number };
export type Badge = { id: string; name: string; detail: string; earned: boolean; have: number; need: number };
type Board = { scope: string; players: number; top: { rank: number; name: string; xp: number; answers: number; me: boolean }[]; me: { rank: number; xp: number } | null };

const BADGE_ICON: Record<string, LucideIcon> = { first: Star, "ten-correct": Sparkles, fifty: Medal, hundred: Crown, run5: Zap, streak3: Flame, streak7: Flame, explorer: Target, accurate: Trophy, goal: Award };
const dayName = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short" });

/** Level, XP bar and today's goal ring — the top of the student dashboard. */
export function LevelCard({ level, today, goal, streak }: { level: Level; today: number; goal: number; streak: number }) {
  const done = Math.min(today / goal, 1);
  const r = 34, c = 2 * Math.PI * r;
  return (
    <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <div className="flex items-center gap-3">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gold text-2xl font-extrabold text-navy shadow-lg shadow-gold/30">{level.level}</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-gold">Level {level.level}</p>
            <p className="text-xl font-extrabold">{level.title}</p>
          </div>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/15">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-gold to-amber-300" initial={{ width: 0 }} animate={{ width: `${Math.max(level.progress * 100, 2)}%` }} transition={{ duration: 1, ease: "easeOut" }} />
        </div>
        <p className="mt-2 text-sm text-white/70">
          <b className="text-white">{level.xp.toLocaleString()} XP</b>
          {level.next ? <> · {(level.next - level.xp).toLocaleString()} XP to level {level.level + 1}</> : " · Top level reached!"}
        </p>
      </div>
      <div className="flex items-center gap-4 rounded-2xl bg-white/10 p-4">
        <div className="relative h-20 w-20">
          <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
            <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="8" />
            <motion.circle cx="40" cy="40" r={r} fill="none" stroke={done >= 1 ? "#22c55e" : "#F4B740"} strokeWidth="8" strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - done) }} transition={{ duration: 1 }} />
          </svg>
          <span className="absolute inset-0 grid place-items-center text-lg font-extrabold tabular-nums">{Math.min(today, goal)}/{goal}</span>
        </div>
        <div>
          <p className="text-sm font-bold">Daily goal</p>
          <p className="max-w-[10rem] text-xs text-white/70">{done >= 1 ? "Goal complete — amazing work! 🎉" : `${goal - today} more answer${goal - today === 1 ? "" : "s"} today`}</p>
          <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-orange-500/20 px-2 py-0.5 text-xs font-bold text-orange-200"><Flame size={12} />{streak}-day streak</p>
        </div>
      </div>
    </div>
  );
}

/** Answers per day for the last week. */
export function WeekActivity({ days, goal }: { days: { date: string; count: number; correct: number }[]; goal: number }) {
  const max = Math.max(goal, ...days.map((d) => d.count));
  return (
    <div>
      <div className="flex h-36 items-end gap-2">
        {days.map((d, i) => (
          <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5" title={`${d.count} answers, ${d.correct} correct`}>
            <span className="text-[11px] font-bold tabular-nums text-slate-500">{d.count || ""}</span>
            <div className="relative flex h-24 w-full items-end overflow-hidden rounded-lg bg-slate-100">
              <motion.div className={`w-full rounded-lg ${d.count >= goal ? "bg-green-500" : i === days.length - 1 ? "bg-royal" : "bg-[#2a78d6]/70"}`} initial={{ height: 0 }} animate={{ height: `${(d.count / max) * 100}%` }} transition={{ delay: i * 0.05, duration: 0.6 }} />
            </div>
            <span className={`text-[11px] font-bold ${i === days.length - 1 ? "text-navy" : "text-slate-400"}`}>{i === days.length - 1 ? "Today" : dayName(d.date)}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 flex items-center gap-3 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-green-500" />Goal reached</span><span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-[#2a78d6]/70" />Practised</span></p>
    </div>
  );
}

/** Earned and locked achievements with progress. */
export function Badges({ badges }: { badges: Badge[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
      {badges.map((b, i) => {
        const Icon = BADGE_ICON[b.id] ?? Award;
        return (
          <motion.div key={b.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }} title={b.detail}
            className={`relative rounded-2xl border p-3.5 text-center ${b.earned ? "border-gold/50 bg-gradient-to-b from-amber-50 to-white" : "border-slate-200 bg-slate-50"}`}>
            <span className={`mx-auto grid h-11 w-11 place-items-center rounded-full ${b.earned ? "bg-gold text-navy shadow-md shadow-gold/30" : "bg-slate-200 text-slate-400"}`}>
              {b.earned ? <Icon size={20} /> : <Lock size={16} />}
            </span>
            <p className={`mt-2 text-sm font-extrabold ${b.earned ? "" : "text-slate-500"}`}>{b.name}</p>
            <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{b.detail}</p>
            {!b.earned && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-royal" style={{ width: `${(b.have / b.need) * 100}%` }} /></div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

async function fetchBoard(): Promise<Board | null> {
  const response = await fetch("/api/student/leaderboard", { cache: "no-store" }).catch(() => null);
  return response?.ok ? response.json() : null;
}

/** This week's top students in the same grade. */
export function Leaderboard() {
  const [board, setBoard] = useState<Board | null>(null);
  useEffect(() => {
    let active = true;
    fetchBoard().then((b) => active && setBoard(b));
    return () => { active = false; };
  }, []);

  if (!board) return <div className="grid gap-2">{Array.from({ length: 5 }, (_, i) => <span key={i} className="h-11 animate-pulse rounded-xl bg-slate-100" />)}</div>;
  const medal = ["bg-gold text-navy", "bg-slate-300 text-navy", "bg-amber-700 text-white"];
  return (
    <div>
      <p className="text-xs text-slate-500">{board.scope} · last 7 days · {board.players} student{board.players === 1 ? "" : "s"}</p>
      {board.top.length ? (
        <ol className="mt-3 grid gap-1.5">
          {board.top.map((r) => (
            <li key={r.rank} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${r.me ? "bg-royal/10 ring-1 ring-royal/30" : "bg-slate-50"}`}>
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-extrabold ${medal[r.rank - 1] ?? "bg-white text-slate-500"}`}>{r.rank}</span>
              <span className="flex-1 truncate text-sm font-bold">{r.name}{r.me && <span className="ml-1.5 text-xs text-royal">(you)</span>}</span>
              <span className="text-sm font-extrabold tabular-nums">{r.xp.toLocaleString()} <span className="text-xs font-semibold text-slate-400">XP</span></span>
            </li>
          ))}
        </ol>
      ) : <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Nobody has practised this week yet. Answer a question and take first place!</p>}
      {board.me && board.me.rank > 10 && <p className="mt-3 rounded-xl bg-royal/10 px-3 py-2 text-sm font-bold text-royal">You&apos;re #{board.me.rank} with {board.me.xp} XP — keep climbing!</p>}
      {!board.me && board.top.length > 0 && <Link href="#practise" className="mt-3 block rounded-xl bg-royal/10 px-3 py-2 text-sm font-bold text-royal">Answer a question to join this week&apos;s ranking →</Link>}
    </div>
  );
}
