"use client";

import { ArrowLeft, CheckCircle2, ChevronDown, CreditCard, Lock, MessageCircle, Send, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

const questions = [
  {
    question: "What is the value of x if 3x + 6 = 21?",
    choices: ["x = 3", "x = 5", "x = 7", "x = 9"],
    answer: 1,
    explanation: "First subtract 6 from both sides: 3x = 15. Then divide both sides by 3, so x = 5.",
    teacher: "Teacher Hana, Mathematics",
  },
  {
    question: "Which graph is used to show a relationship between two variables?",
    choices: ["Bar graph", "Line graph", "Pie chart", "Pictogram"],
    answer: 1,
    explanation: "A line graph is commonly used to show how one variable changes in relation to another, especially over time.",
    teacher: "Teacher Hana, Mathematics",
  },
  {
    question: "The square root of 144 is:",
    choices: ["10", "11", "12", "14"],
    answer: 2,
    explanation: "12 multiplied by 12 equals 144, therefore the square root of 144 is 12.",
    teacher: "Teacher Hana, Mathematics",
  },
];

export default function ExamPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f7faf5]" />}>
      <ExamPageContent />
    </Suspense>
  );
}

function ExamPageContent() {
  const params = useSearchParams();
  const subject = params.get("subject") || "Mathematics";
  const grade = params.get("grade") || "Grade 12";
  const [year, setYear] = useState("2016 E.C.");
  const [topic, setTopic] = useState("All topics");
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [message, setMessage] = useState("");
  const duration = subject === "Mathematics" ? 180 : 60;
  const [timeLeft, setTimeLeft] = useState(duration);
  const question = questions[index];
  const isCorrect = selected === question.answer;
  const locked = index >= 2;
  const questionLabel = useMemo(() => `${index + 1} of ${questions.length}`, [index]);
  const timerLabel = `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, "0")}`;

  useEffect(() => {
    if (locked || timeLeft <= 0) return;
    const timer = window.setInterval(() => setTimeLeft((current) => current - 1), 1000);
    return () => window.clearInterval(timer);
  }, [locked, timeLeft]);

  return <main className="min-h-screen bg-[#f7faf5] text-[#173e2d]">
    <header className="border-b border-[#dfe9dc] bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4"><Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-[#426554]"><ArrowLeft size={18} /> Back to subjects</Link><span className="rounded-full bg-[#e8f3e6] px-3 py-1.5 text-xs font-bold text-[#287046]">Free preview: 2 questions</span></div></header>
    <div className="mx-auto grid max-w-6xl gap-7 px-5 py-8 lg:grid-cols-[1fr_310px]">
      <section><div className="rounded-2xl border border-[#dfe9dc] bg-white p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#4d8c5e]">{grade} · {subject}</p><h1 className="mt-2 text-2xl font-bold">Practice exam</h1></div><div className="text-right"><span className="block text-sm font-bold text-[#526258]">Question {questionLabel}</span><span className={`mt-1 inline-block rounded-lg px-2.5 py-1 text-sm font-bold ${timeLeft <= 15 ? "bg-red-50 text-red-700" : "bg-[#e8f3e6] text-[#287046]"}`}>{timerLabel} remaining</span></div></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-[#718277]">Exam year<select value={year} onChange={(event) => setYear(event.target.value)} className="mt-1.5 block w-full rounded-xl border border-[#dfe9dc] bg-[#fbfcf8] px-3 py-2.5 text-sm font-semibold text-[#173e2d]"><option>2016 E.C.</option><option>2015 E.C.</option><option>2014 E.C.</option></select></label><label className="text-xs font-bold text-[#718277]">Topic or unit<select value={topic} onChange={(event) => setTopic(event.target.value)} className="mt-1.5 block w-full rounded-xl border border-[#dfe9dc] bg-[#fbfcf8] px-3 py-2.5 text-sm font-semibold text-[#173e2d]"><option>All topics</option><option>Unit 1: Algebra</option><option>Unit 2: Geometry</option><option>Unit 3: Statistics</option></select></label></div><p className="mt-4 text-xs font-semibold text-[#718277]">{subject === "Mathematics" ? "Mathematics questions allow 3 minutes each." : "This subject allows 1 minute for each question."}</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e5e8df]"><div className="h-full rounded-full bg-[#4d9b62]" style={{ width: `${((index + 1) / questions.length) * 100}%` }} /></div>
        {locked ? <div className="mt-8 rounded-2xl border border-[#b9d6bd] bg-[#eef7eb] p-6 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#1e5b43] text-white"><Lock size={21} /></span><h2 className="mt-4 text-xl font-bold">Continue your practice with a plan</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#526258]">You have completed the free preview. Subscribe to unlock all questions, detailed teacher explanations, and chat support.</p><div className="mt-5 flex flex-wrap justify-center gap-3"><button className="inline-flex items-center gap-2 rounded-xl bg-[#1e5b43] px-4 py-3 text-sm font-bold text-white"><CreditCard size={17} /> Monthly · ETB 200</button><button className="inline-flex items-center gap-2 rounded-xl border border-[#8eb697] bg-white px-4 py-3 text-sm font-bold text-[#1e5b43]"><CreditCard size={17} /> Yearly · ETB 1,000</button></div></div> : <><p className="mt-8 text-xl font-bold leading-8">{question.question}</p><div className="mt-6 grid gap-3">{question.choices.map((choice, choiceIndex) => <button key={choice} disabled={selected !== null || timeLeft === 0} onClick={() => setSelected(choiceIndex)} className={`rounded-xl border p-4 text-left text-sm font-semibold transition ${selected === choiceIndex ? (isCorrect ? "border-[#4d9b62] bg-[#eaf5e9] text-[#21633e]" : "border-red-300 bg-red-50 text-red-700") : "border-[#dfe9dc] hover:border-[#89b494]"}`}>{String.fromCharCode(65 + choiceIndex)}. {choice}{selected !== null && choiceIndex === question.answer && <CheckCircle2 className="float-right text-[#2e7850]" size={18} />}</button>)}</div>{timeLeft === 0 && selected === null && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">Time is up. Move to the next question.</p>}{selected !== null && <div className="mt-6 rounded-2xl border border-[#d3e5d3] bg-[#f3f8f1] p-5"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 shrink-0 text-[#2e7850]" size={20} /><div><p className="font-bold">{isCorrect ? "Correct — well done!" : "Review the explanation"}</p><p className="mt-2 text-sm leading-6 text-[#466252]">{question.explanation}</p><p className="mt-3 text-xs font-bold text-[#4d8c5e]">Explanation added by {question.teacher}</p></div></div></div>}<div className="mt-7 flex justify-end"><button disabled={selected === null && timeLeft > 0} onClick={() => { setIndex(index + 1); setSelected(null); setTimeLeft(duration); }} className="inline-flex items-center gap-2 rounded-xl bg-[#1e5b43] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-[#a9b9ad]">Next question <ChevronDown className="-rotate-90" size={17} /></button></div></>}</div></section>
      <aside className="space-y-5"><div className="rounded-2xl bg-[#173e2d] p-5 text-white"><Sparkles className="text-[#d5e9bc]" size={21} /><h2 className="mt-4 text-lg font-bold">Need more help?</h2><p className="mt-2 text-sm leading-6 text-[#c7dbca]">Ask a subject teacher for a clearer explanation after you practise.</p><button onClick={() => setShowChat(true)} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#1e5b43]"><MessageCircle size={17} /> Chat with teacher</button></div><div className="rounded-2xl border border-[#dfe9dc] bg-white p-5"><p className="text-sm font-bold">Your practice settings</p><dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-[#718277]">Year</dt><dd className="font-semibold">{year}</dd></div><div className="flex justify-between gap-4"><dt className="text-[#718277]">Topic</dt><dd className="font-semibold">{topic}</dd></div><div className="flex justify-between gap-4"><dt className="text-[#718277]">Access</dt><dd className="font-semibold text-[#4d8c5e]">Free preview</dd></div></dl></div></aside>
    </div>
    {showChat && <div className="fixed inset-0 z-50 flex items-end justify-end bg-[#173e2d]/30 p-4 sm:p-7"><div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between bg-[#173e2d] px-5 py-4 text-white"><div><p className="font-bold">Teacher Hana</p><p className="text-xs text-[#c7dbca]">{subject} support · Online</p></div><button onClick={() => setShowChat(false)} aria-label="Close chat"><span className="text-xl">×</span></button></div><div className="h-64 space-y-3 p-4 text-sm"><div className="max-w-[85%] rounded-xl bg-[#eef6ec] p-3 text-[#426554]">Hello! Tell me which part of the question you would like explained.</div>{message && <div className="ml-auto max-w-[85%] rounded-xl bg-[#1e5b43] p-3 text-white">{message}</div>}</div><form onSubmit={(event) => { event.preventDefault(); if (message.trim()) setMessage(message.trim()); }} className="flex gap-2 border-t border-[#e1e8df] p-3"><input value={message} onChange={(event) => setMessage(event.target.value)} className="min-w-0 flex-1 rounded-xl bg-[#f3f7f1] px-3 py-2.5 text-sm outline-none" placeholder="Write your question..." /><button className="rounded-xl bg-[#1e5b43] p-2.5 text-white" aria-label="Send message"><Send size={17} /></button></form></div></div>}
  </main>;
}
