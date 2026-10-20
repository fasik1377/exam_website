"use client";
import { motion } from "framer-motion";
import { ArrowRight, Atom, BookOpenText, CheckCircle2, Flame, Hash, MessageCircle, Target, Trophy, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import Brand from "@/app/components/Brand";
import AccountMenu from "@/app/components/AccountMenu";
import { GRADES, STREAMS, needsStream, streamLabel, subjectsForStudent, type Stream } from "@/lib/subjects";

type Summary = {
  user: { name: string; plan: string; grade?: string | null; stream?: Stream | null };
  total: number; correct: number; week: number; streak: number; unread: number;
  subjects: { subject: string; total: number; correct: number }[];
  recent: { prompt: string; subject: string; correct: boolean; createdAt: string }[];
};


async function fetchSummary(): Promise<Summary | null> {
  const response = await fetch("/api/student/summary", { cache: "no-store" }).catch(() => null);
  if (response?.status === 401 || response?.status === 403) { window.location.href = "/login?next=/student"; return null; }
  return response?.ok ? response.json() : null;
}

/** Student home: progress, where to practise next, and quick access to chat. */
export default function StudentDashboard() {
  const [data, setData] = useState<Summary | null>(null);
  const [editing, setEditing] = useState(false);
  const grade = data?.user.grade ?? null;
  const stream = data?.user.stream ?? null;

  useEffect(() => {
    let active = true;
    fetchSummary().then((d) => active && d && setData(d));
    return () => { active = false; };
  }, []);

  const accuracy = data?.total ? Math.round((data.correct / data.total) * 100) : 0;
  const tiles = [
    { label: "Questions answered", value: data?.total ?? "–", icon: Target, tint: "bg-blue-50 text-royal" },
    { label: "Accuracy", value: data ? `${accuracy}%` : "–", icon: Trophy, tint: "bg-amber-50 text-amber-600" },
    { label: "This week", value: data?.week ?? "–", icon: CheckCircle2, tint: "bg-green-50 text-green-600" },
    { label: "Day streak", value: data ? `${data.streak} 🔥` : "–", icon: Flame, tint: "bg-orange-50 text-orange-600" },
  ];

  return (
    <main className="min-h-screen bg-[#f3f6fb] text-navy">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
          <Brand size="sm" subtitle="Student" />
          <div className="flex items-center gap-2">
            <Link href="/chat" className="relative inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold hover:bg-slate-100">
              <MessageCircle size={17} /> <span className="hidden sm:inline">Messages</span>
              {!!data?.unread && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-[10px] font-extrabold">{data.unread}</span>}
            </Link>
            <AccountMenu />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-8">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-[#12306b] to-royal p-6 text-white sm:p-8">
          <div className="bg-grid absolute inset-0" />
          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-gold">Student dashboard</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Welcome back{data ? `, ${data.user.name.split(" ")[0]}` : ""} 👋</h1>
            <p className="mt-2 max-w-xl text-white/75">{data?.streak ? `You're on a ${data.streak}-day streak — keep it going!` : "Answer a few questions today to start your streak."}</p>
            <p className="mt-1 font-amharic text-sm text-white/55">ዕውቀት ለሁሉም፣ ስኬት ለሁሉም።</p>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {tiles.map((t, i) => (
            <motion.div key={t.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="card-lift rounded-2xl border border-slate-200 bg-white p-5">
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${t.tint}`}><t.icon size={20} /></span>
              <p className="mt-4 text-3xl font-extrabold tabular-nums">{t.value}</p>
              <p className="text-sm text-slate-500">{t.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Practise — based on the student's grade and stream */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          {data && (!grade || editing) ? (
            <GradeEditor
              initialGrade={grade}
              initialStream={stream}
              required={!grade}
              onCancel={grade ? () => setEditing(false) : undefined}
              onSaved={(g, st) => { setData({ ...data, user: { ...data.user, grade: g, stream: st } }); setEditing(false); }}
            />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold">Start practising</h2>
                  <p className="text-sm text-slate-500">Questions for your grade{needsStream(grade) ? " and stream" : ""}.</p>
                </div>
                {grade && (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-royal/10 px-3 py-1.5 text-xs font-bold text-royal">
                      {grade}{needsStream(grade) && stream ? <> · {stream === "natural" ? <Atom size={13} /> : <BookOpenText size={13} />} {streamLabel(stream)}</> : " · All subjects"}
                    </span>
                    <button onClick={() => setEditing(true)} className="rounded-lg px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-navy">Edit</button>
                  </div>
                )}
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {grade && subjectsForStudent(grade, stream).map((s) => (
                  <Link key={s.name} href={`/exam?grade=${encodeURIComponent(grade)}&subject=${encodeURIComponent(s.name)}`} className="card-lift group flex items-center gap-3 rounded-2xl border border-slate-200 p-4">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-royal/10 font-extrabold text-royal">{s.name.charAt(0)}</span>
                    <span className="flex-1"><span className="block font-bold">{s.name}</span><span className="font-amharic text-xs text-slate-500">{s.amharic}</span></span>
                    <ArrowRight size={16} className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-navy" />
                  </Link>
                ))}
                {!data && Array.from({ length: 6 }, (_, i) => <span key={i} className="h-[4.5rem] animate-pulse rounded-2xl bg-slate-100" />)}
              </div>
            </>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-extrabold">My accuracy by subject</h2>
            {data?.subjects.length ? (
              <ul className="mt-5 grid gap-3.5">
                {data.subjects.map((s) => {
                  const pct = Math.round((s.correct / s.total) * 100);
                  return (
                    <li key={s.subject} className="grid grid-cols-[8rem_1fr_4.5rem] items-center gap-3 text-sm">
                      <span className="truncate text-slate-600">{s.subject}</span>
                      <span className="h-2.5 rounded bg-[#cde2fb]"><motion.span className="block h-full rounded bg-[#2a78d6]" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} /></span>
                      <span className="text-right tabular-nums"><b>{pct}%</b> <span className="text-xs text-slate-400">· {s.total}</span></span>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="mt-6 text-sm text-slate-500">Answer some questions to see how you&apos;re doing in each subject.</p>}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-extrabold">Recent answers</h2>
            {data?.recent.length ? (
              <ul className="mt-4 grid gap-2.5">
                {data.recent.map((r, i) => (
                  <li key={i} className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
                    {r.correct ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-600" /> : <XCircle size={18} className="mt-0.5 shrink-0 text-red-500" />}
                    <span className="min-w-0"><span className="line-clamp-1 text-sm font-semibold">{r.prompt}</span><span className="text-xs text-slate-500">{r.subject}</span></span>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-6 text-sm text-slate-500">Your latest answers will appear here.</p>}
          </section>
        </div>

        <section className="grid gap-4 rounded-3xl bg-navy p-6 text-white sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <h2 className="text-lg font-extrabold">Stuck on something? Ask for help.</h2>
            <p className="text-sm text-white/70">Message a teacher, chat with classmates, or join a subject study room.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/chat?subject=Mathematics" className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-navy"><MessageCircle size={16} /> Ask a teacher</Link>
            <Link href="/chat" className="glass inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold"><Hash size={16} /> Study rooms</Link>
          </div>
        </section>
      </div>
    </main>
  );
}

/** Lets a student set or change their grade and (Grades 11–12) stream. */
function GradeEditor({ initialGrade, initialStream, required, onCancel, onSaved }: {
  initialGrade: string | null; initialStream: Stream | null; required: boolean;
  onCancel?: () => void; onSaved: (grade: string, stream: Stream | null) => void;
}) {
  const [grade, setGrade] = useState(initialGrade ?? "");
  const [stream, setStream] = useState<Stream | "">(initialStream ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    const response = await fetch("/api/student/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ grade, stream: needsStream(grade) ? stream : null }) }).catch(() => null);
    const data = await response?.json().catch(() => ({}));
    setSaving(false);
    if (!response?.ok) return setError(data?.error || "Could not save.");
    onSaved(data.grade, data.stream);
  }

  return (
    <div>
      <h2 className="text-lg font-extrabold">{required ? "Tell us your grade" : "Change your grade"}</h2>
      <p className="text-sm text-slate-500">{required ? "We show questions for your grade and stream." : "Moving up a year? Update it here."}</p>
      <div className="mt-4 grid max-w-md grid-cols-4 gap-2">
        {GRADES.map((g) => (
          <button key={g} type="button" onClick={() => { setGrade(g); if (!needsStream(g)) setStream(""); }} className={`rounded-xl border-2 py-2.5 text-center ${grade === g ? "border-royal bg-blue-50 text-royal" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
            <span className="block text-lg font-extrabold leading-5">{g.split(" ")[1]}</span><span className="text-[10px] font-bold uppercase tracking-wider">Grade</span>
          </button>
        ))}
      </div>
      {needsStream(grade) && (
        <div className="mt-3 grid max-w-md grid-cols-2 gap-2">
          {STREAMS.map((st) => (
            <button key={st.id} type="button" onClick={() => setStream(st.id)} className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left text-sm font-bold ${stream === st.id ? "border-royal bg-blue-50 text-royal" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
              {st.id === "natural" ? <Atom size={16} /> : <BookOpenText size={16} />}{st.label}
            </button>
          ))}
        </div>
      )}
      {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button onClick={save} disabled={saving || !grade || (needsStream(grade) && !stream)} className="rounded-xl bg-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-royal disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
        {onCancel && <button onClick={onCancel} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold hover:bg-slate-50">Cancel</button>}
      </div>
    </div>
  );
}
