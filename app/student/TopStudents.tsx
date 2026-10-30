"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Crown, Info, PartyPopper, Timer, Trophy, X } from "lucide-react";
import { useEffect, useState } from "react";

type Criteria = { accuracyWeight: number; volumeWeight: number; consistencyWeight: number; minAnswers: number; minDays: number; volumeCap: number; scope: "overall" | "grade" };
type Top = {
  criteria: Criteria;
  announcement: string;
  lastWeek: { label: string; scope: string; winners: { rank: number; name: string; grade: string | null; score: number; me: boolean }[] } | null;
  thisWeek: { label: string; players: number; leaders: { rank: number; name: string; score: number; me: boolean }[]; me: { rank: number | null; score: number; answers: number; days: number; accuracy: number; eligible: boolean } };
  notifications: { id: string; title: string; body: string; rank: number }[];
};

const MEDAL = ["", "🥇", "🥈", "🥉"];
const PODIUM = [
  { rank: 2, h: "h-20", tint: "from-slate-300 to-slate-100" },
  { rank: 1, h: "h-28", tint: "from-[#F4B740] to-amber-200" },
  { rank: 3, h: "h-14", tint: "from-amber-700/70 to-amber-500/40" },
];

async function fetchTop(): Promise<Top | null> {
  const response = await fetch("/api/student/top", { cache: "no-store" }).catch(() => null);
  return response?.ok ? response.json() : null;
}

function useCountdown(target?: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 30000); return () => window.clearInterval(id); }, []);
  if (!target) return "";
  const ms = Math.max(0, new Date(target).getTime() - now);
  const d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000), m = Math.floor((ms % 3600000) / 60000);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
}

/** Congratulations banner for students who placed in the top 3. */
export function AwardBanner() {
  const [top, setTop] = useState<Top | null>(null);
  useEffect(() => { let on = true; fetchTop().then((t) => on && setTop(t)); return () => { on = false; }; }, []);
  const note = top?.notifications[0];
  async function dismiss(id: string) {
    setTop((t) => (t ? { ...t, notifications: t.notifications.filter((n) => n.id !== id) } : t));
    await fetch("/api/student/top", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }).catch(() => null);
  }
  return (
    <AnimatePresence>
      {note && (
        <motion.section key={note.id} initial={{ opacity: 0, scale: 0.96, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#F4B740] via-amber-300 to-[#F4B740] p-5 text-navy shadow-lg shadow-amber-500/20">
          {Array.from({ length: 14 }, (_, i) => (
            <motion.span key={i} aria-hidden className="absolute h-2 w-2 rounded-sm" style={{ left: `${(i * 7.3) % 100}%`, top: -10, background: ["#155EEF", "#0B1F3A", "#ffffff", "#ef4444"][i % 4] }}
              animate={{ y: [0, 160], rotate: [0, 360], opacity: [1, 0] }} transition={{ duration: 2.4 + (i % 5) * 0.3, delay: i * 0.15, repeat: Infinity, repeatDelay: 1.5 }} />
          ))}
          <div className="relative flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/70 text-3xl">{MEDAL[note.rank] ?? "🏆"}</span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[.16em]"><PartyPopper size={14} /> Congratulations!</p>
              <p className="text-xl font-extrabold">{note.title}</p>
              <p className="text-sm text-navy/75">{note.body}</p>
            </div>
            <button type="button" onClick={() => dismiss(note.id)} aria-label="Dismiss" className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-white/50"><X size={18} /></button>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}

/** "Students of the week" board: last week's podium, this week's race and how winners are chosen. */
export default function TopStudents() {
  const [top, setTop] = useState<Top | null>(null);
  const [how, setHow] = useState(false);
  useEffect(() => { let on = true; fetchTop().then((t) => on && setTop(t)); return () => { on = false; }; }, []);
  const countdown = useCountdown(top?.announcement);
  if (!top) return <section className="h-80 animate-pulse rounded-3xl bg-slate-100" />;

  const c = top.criteria, me = top.thisWeek.me;
  const winners = top.lastWeek?.winners ?? [];
  const answersLeft = Math.max(0, c.minAnswers - me.answers), daysLeft = Math.max(0, c.minDays - me.days);
  const when = new Date(top.announcement).toLocaleString("en-GB", { weekday: "long", hour: "numeric", minute: "2-digit", timeZone: "Africa/Addis_Ababa" });

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-6">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold"><Crown size={19} className="text-gold" /> Students of the week</h2>
          <p className="text-sm text-slate-500">{c.scope === "grade" ? "Top 3 in your grade" : "Top 3 on እውቀትNET"} · announced every Saturday at 12:00 PM</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-navy px-3 py-1.5 text-xs font-bold text-white"><Timer size={13} className="text-gold" /> Next: {when} · in {countdown}</span>
      </div>

      <div className="grid gap-0 lg:grid-cols-2">
        {/* Last week's podium */}
        <div className="border-b border-slate-100 p-6 lg:border-b-0 lg:border-r">
          <p className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">{top.lastWeek ? `Winners · ${top.lastWeek.label}` : "Winners"}</p>
          {winners.length ? (
            <div className="mt-4 grid grid-cols-3 items-end gap-2">
              {PODIUM.map((p) => {
                const w = winners.find((x) => x.rank === p.rank);
                return (
                  <motion.div key={p.rank} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: p.rank * 0.12 }} className="text-center">
                    {w ? <>
                      <p className="text-2xl">{MEDAL[p.rank]}</p>
                      <p className={`truncate text-sm font-extrabold ${w.me ? "text-royal" : ""}`}>{w.name}{w.me && " (you)"}</p>
                      <p className="text-[11px] text-slate-500">{w.grade ?? ""} · {w.score}</p>
                    </> : <p className="text-xs text-slate-400">—</p>}
                    <div className={`mt-2 ${p.h} rounded-t-xl bg-gradient-to-t ${p.tint} grid place-items-center text-lg font-extrabold text-navy/70`}>{p.rank}</div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">{top.lastWeek ? "No one qualified last week — this week it could be you!" : `The first students of the week will be announced on ${when}. Start practising to be one of them!`}</p>
          )}
        </div>

        {/* This week's race */}
        <div className="p-6">
          <p className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">This week so far · {top.thisWeek.label}</p>
          <div className="mt-4 flex items-center gap-4">
            <div className="relative h-20 w-20 shrink-0">
              <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90"><circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100" /><motion.circle cx="40" cy="40" r="34" fill="none" stroke="#155EEF" strokeWidth="8" strokeLinecap="round" strokeDasharray={213.6} initial={{ strokeDashoffset: 213.6 }} animate={{ strokeDashoffset: 213.6 * (1 - me.score / 100) }} transition={{ duration: 1 }} /></svg>
              <span className="absolute inset-0 grid place-items-center text-center leading-none"><span><b className="block text-lg">{me.score}</b><span className="text-[10px] text-slate-500">score</span></span></span>
            </div>
            <div className="min-w-0 text-sm">
              {me.eligible && me.rank
                ? <p className="text-lg font-extrabold">{me.rank <= 3 ? `${MEDAL[me.rank]} You're #${me.rank}!` : `You're #${me.rank} of ${top.thisWeek.players}`}</p>
                : <p className="text-lg font-extrabold">Not ranked yet</p>}
              {!me.eligible
                ? <p className="text-slate-500">To qualify: {answersLeft > 0 && <b className="text-navy">{answersLeft} more answer{answersLeft === 1 ? "" : "s"}</b>}{answersLeft > 0 && daysLeft > 0 && " and "}{daysLeft > 0 && <b className="text-navy">practise on {daysLeft} more day{daysLeft === 1 ? "" : "s"}</b>}.</p>
                : <p className="text-slate-500">{me.answers} answers · {Math.round(me.accuracy * 100)}% correct · {me.days} day{me.days === 1 ? "" : "s"}</p>}
            </div>
          </div>
          <ol className="mt-4 grid gap-1.5">
            {top.thisWeek.leaders.length ? top.thisWeek.leaders.map((l) => (
              <li key={l.rank} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${l.me ? "bg-royal/10 ring-1 ring-royal/30" : "bg-slate-50"}`}>
                <span>{MEDAL[l.rank]}</span><span className="flex-1 truncate font-bold">{l.name}{l.me && <span className="ml-1 text-xs text-royal">(you)</span>}</span><span className="font-extrabold tabular-nums">{l.score}</span>
              </li>
            )) : <li className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">No one has qualified yet this week.</li>}
          </ol>
        </div>
      </div>

      <button type="button" onClick={() => setHow((h) => !h)} aria-expanded={how} className="flex w-full items-center gap-2 border-t border-slate-100 px-6 py-3 text-left text-sm font-bold text-slate-600 hover:bg-slate-50">
        <Info size={15} className="text-royal" /> How are the winners chosen? <ChevronDown size={15} className={`ml-auto transition ${how ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {how && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="grid gap-3 px-6 pb-6 text-sm text-slate-600 sm:grid-cols-3">
              {[
                { t: "Accuracy", w: c.accuracyWeight, d: "How many of your answers are correct. A few lucky answers count less than steady accuracy over many questions." },
                { t: "Effort", w: c.volumeWeight, d: `How many questions you answer this week (counts up to ${c.volumeCap}).` },
                { t: "Consistency", w: c.consistencyWeight, d: "How many days of the week you practise. Little and often wins!" },
              ].map((x) => (
                <div key={x.t} className="rounded-2xl bg-slate-50 p-4">
                  <p className="flex items-center justify-between font-extrabold text-navy">{x.t}<span className="rounded-full bg-royal/10 px-2 py-0.5 text-xs text-royal">{x.w}%</span></p>
                  <p className="mt-1 text-xs leading-5">{x.d}</p>
                </div>
              ))}
              <p className="flex items-start gap-2 text-xs sm:col-span-3"><Trophy size={14} className="mt-0.5 shrink-0 text-gold" />To be ranked you need at least <b className="text-navy">{c.minAnswers} answers</b> on <b className="text-navy">{c.minDays} different days</b> between Saturday 12:00 PM and the next Saturday 12:00 PM. The top 3 are announced and notified every Saturday at 12:00 PM.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
