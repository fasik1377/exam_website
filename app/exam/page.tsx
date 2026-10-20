"use client";

import { ArrowLeft, CheckCircle2, ChevronRight, Lock, MessageCircle, Sparkles, Timer, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import AccountMenu from "@/app/components/AccountMenu";
import Brand from "@/app/components/Brand";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

type Question = { id: string; type?: "mcq" | "truefalse"; question: string; choices: string[]; answer: number; explanation: string; teacher: string; unit: string; year: string };
type SessionUser = { name: string; plan: "free" | "monthly" | "yearly" | "teacher" };

export default function ExamPage() { return <Suspense fallback={<Loading />}><Exam /></Suspense>; }
function Loading() { return <main className="grid min-h-screen place-items-center bg-[#f7f9fc] text-sm font-bold text-slate-500">Loading questions...</main>; }

function Exam() {
  const params = useSearchParams();
  const grade = params.get("grade") || "Grade 12";
  const subject = params.get("subject") || "Mathematics";
  const [questions, setQuestions] = useState<Question[]>([]);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showSubscribe, setShowSubscribe] = useState(false);
  const duration = subject === "Mathematics" ? 180 : 60;
  const [timeLeft, setTimeLeft] = useState(duration);
  const question = questions[index];
  const requiresSubscription = !user || user.plan === "free";
  const locked = Boolean(question) && requiresSubscription && index >= 10;

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((data) => setUser(data.user));
    const query = new URLSearchParams({ grade, subject });
    fetch(`/api/questions?${query}`).then(async (r) => { const data = await r.json(); if (!r.ok) throw new Error(data.error); setQuestions(data.questions); }).catch((e) => setError(e.message || "Unable to load questions")).finally(() => setLoading(false));
  }, [grade, subject]);

  useEffect(() => {
    if (locked || selected !== null || timeLeft <= 0) return;
    const timer = window.setInterval(() => setTimeLeft((value) => value - 1), 1000);
    return () => window.clearInterval(timer);
  }, [locked, selected, timeLeft]);

  async function answer(choice: number) {
    setSelected(choice);
    if (user && question) await fetch("/api/attempts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionId: question.id, selectedAnswer: choice }) });
  }
  function next() { if (index < questions.length - 1) { setIndex((value) => value + 1); setSelected(null); setTimeLeft(duration); } }

  if (loading) return <Loading />;
  if (error) return <Message title="Questions could not be loaded" detail={error} />;
  if (!question) return <Message title="No questions published yet" detail={`A teacher can add ${grade} ${subject} questions from the teacher dashboard.`} />;

  const correct = selected === question.answer;
  const timer = `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, "0")}`;

  return <main className="min-h-screen bg-[#f7f9fc] text-navy">
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-lg"><div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3"><div className="flex items-center gap-4"><Brand size="sm" /><Link href="/#grades" className="hidden items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-100 sm:inline-flex"><ArrowLeft size={16} /> Subjects</Link></div>{user ? <AccountMenu /> : <Link href="/login" className="rounded-xl bg-navy px-3.5 py-2 text-xs font-bold text-white hover:bg-royal">Sign in to save progress</Link>}</div></header>
    <div className="mx-auto max-w-5xl px-5 py-8"><motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <div className="flex flex-wrap justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-royal">{grade} · {subject}</p><h1 className="mt-2 text-2xl font-bold">Practice exam</h1></div><div className="text-right"><p className="text-sm font-bold">Question {index + 1} of {questions.length}</p><p className={`mt-1 inline-flex items-center gap-1 text-sm font-bold ${timeLeft <= 15 ? "text-red-700" : "text-slate-500"}`}><Timer size={15} />{timer}</p></div></div>
      <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100"><motion.div className="h-full rounded-full bg-gradient-to-r from-royal to-gold" animate={{ width: `${((index + 1) / questions.length) * 100}%` }} transition={{ type: "spring", stiffness: 90, damping: 20 }} /></div>
      {locked ? <div className="mt-10 rounded-lg border border-slate-200 bg-[#f7f9fc] p-8 text-center"><Lock className="mx-auto" /><h2 className="mt-4 text-xl font-bold">Free preview complete</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">Subscribe to unlock the complete question bank and teacher support.</p><div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row"><button onClick={() => setShowSubscribe(true)} className="rounded-lg bg-navy px-4 py-3 text-sm font-bold text-white">Subscribe monthly or yearly</button><Link href="/signup" className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-bold">Create student account</Link></div></div> : <>
        <AnimatePresence mode="wait"><motion.div key={question.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
        {question.type === "truefalse" && <p className="mt-9 inline-flex rounded-full bg-gold/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-800">True or false?</p>}
        <p className={`${question.type === "truefalse" ? "mt-3" : "mt-9"} text-xl font-bold leading-8`}>{question.question}</p>
        <div className={`mt-6 grid gap-3 ${question.type === "truefalse" ? "grid-cols-2" : ""}`}>{question.choices.map((choice, i) => <button key={`${choice}-${i}`} disabled={selected !== null || timeLeft === 0} onClick={() => answer(i)} className={`rounded-xl border p-4 text-left text-sm font-semibold transition-all ${selected === i ? (correct ? "border-green-400 bg-green-50 text-green-800" : "border-red-300 bg-red-50 text-red-700") : selected !== null && i === question.answer ? "border-green-400 bg-green-50" : "border-slate-200 hover:-translate-y-0.5 hover:border-royal hover:bg-blue-50/50"}`}>{question.type === "truefalse" ? <span className="block py-2 text-center text-lg font-extrabold">{choice}</span> : <>{String.fromCharCode(65 + i)}. {choice}</>}{selected !== null && i === question.answer && <CheckCircle2 className="float-right text-green-700" size={18} />}</button>)}</div>
        </motion.div></AnimatePresence>
        {timeLeft === 0 && selected === null && <p className="mt-5 rounded-lg bg-red-50 p-4 text-sm font-semibold text-red-700">Time is up. Continue to the next question.</p>}
        {selected !== null && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mt-6 rounded-2xl p-5 ${correct ? "bg-green-50" : "bg-amber-50"}`}><p className="font-bold">{correct ? "Correct. Well done." : "Review the explanation"}</p><p className="mt-2 text-sm leading-6 text-slate-600">{requiresSubscription ? "Subscribe to view the full teacher explanation." : question.explanation || "No explanation was provided for this question."}</p><button onClick={() => requiresSubscription && setShowSubscribe(true)} className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-royal hover:underline"><Sparkles size={14} />Explanation by {question.teacher}</button>{user && <Link href={`/chat?subject=${encodeURIComponent(subject)}`} className="ml-4 inline-flex items-center gap-1.5 text-xs font-bold text-navy hover:underline"><MessageCircle size={14} />Ask a {subject} teacher</Link>}</motion.div>}
        <div className="mt-7 flex justify-end"><button disabled={(selected === null && timeLeft > 0) || index === questions.length - 1} onClick={next} className="inline-flex items-center gap-2 rounded-lg bg-navy px-5 py-3 text-sm font-bold text-white disabled:opacity-40">Next question <ChevronRight size={17} /></button></div>
      </>}
    </motion.section></div>
    {showSubscribe && <SubscriptionDialog onClose={() => setShowSubscribe(false)} />}
  </main>;
}

function SubscriptionDialog({ onClose }: { onClose: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-navy/60 px-5" role="dialog" aria-modal="true" aria-labelledby="subscription-title"><div className="relative w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl"><button onClick={onClose} className="absolute right-4 top-4 p-1" aria-label="Close subscription dialog"><X size={20} /></button><Sparkles className="text-gold" /><h2 id="subscription-title" className="mt-4 text-2xl font-bold">Unlock every question</h2><p className="mt-2 text-sm leading-6 text-slate-600">Choose a plan to continue practising and get complete teacher explanations.</p><div className="mt-6 grid gap-3 sm:grid-cols-2"><Link href="/#subscriptions" className="rounded-lg border border-slate-200 p-4 transition hover:border-royal"><p className="font-bold">Monthly</p><p className="mt-1 text-sm text-slate-500">ETB 200 / month</p></Link><Link href="/#subscriptions" className="rounded-lg border border-royal bg-blue-50 p-4"><p className="font-bold">Yearly</p><p className="mt-1 text-sm text-slate-500">ETB 1,000 / year</p></Link></div><p className="mt-5 text-xs text-slate-500">Complete checkout from the subscription section.</p></div></div>;
}

function Message({ title, detail }: { title: string; detail: string }) { return <main className="grid min-h-screen place-items-center bg-[#f7f9fc] px-5 text-center"><div><h1 className="text-2xl font-bold">{title}</h1><p className="mt-2 max-w-md text-sm leading-6 text-slate-600">{detail}</p><Link href="/#grades" className="mt-5 inline-block rounded-lg bg-navy px-4 py-3 text-sm font-bold text-white">Choose another subject</Link></div></main>; }
