"use client";

import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  GraduationCap,
  Menu,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";

const grades = ["Grade 9", "Grade 10", "Grade 11", "Grade 12"];
const subjects = ["Mathematics", "English", "Biology", "Chemistry", "Physics", "Civics"];

const plans = [
  { name: "Monthly", price: "ETB 200", note: "Flexible monthly access", featured: false },
  { name: "Yearly", price: "ETB 1,000", note: "Best value for exam preparation", featured: true },
];

export default function Home() {
  const [grade, setGrade] = useState("Grade 12");
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="min-h-screen overflow-hidden bg-[#fbfcf8] text-[#173e2d]">
      <header className="sticky top-0 z-30 border-b border-[#e1e8df] bg-[#fbfcf8]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <a href="#home" className="flex items-center gap-3" aria-label="Examora home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1e5b43] text-white"><GraduationCap size={22} /></span>
            <span><span className="block text-lg font-bold tracking-tight">Examora</span><span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#668071]">Ethiopia</span></span>
          </a>
          <nav className="hidden items-center gap-7 text-sm font-semibold text-[#526258] md:flex">
            <a href="#grades" className="hover:text-[#1e5b43]">Grades</a>
            <a href="#subscriptions" className="hover:text-[#1e5b43]">Plans</a>
            <a href="#support" className="hover:text-[#1e5b43]">Student support</a>
            <a href="/admin/login" className="hover:text-[#1e5b43]">Teacher portal</a>
          </nav>
          <a href="#subscriptions" className="hidden rounded-xl bg-[#1e5b43] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#174633] sm:block">Get started</a>
          <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 md:hidden" aria-label="Toggle navigation">{menuOpen ? <X /> : <Menu />}</button>
        </div>
        {menuOpen && <nav className="border-t border-[#e1e8df] px-5 py-4 md:hidden"><div className="mx-auto flex max-w-7xl flex-col gap-3 text-sm font-semibold"><a href="#grades">Grades</a><a href="#subscriptions">Plans</a><a href="#support">Student support</a><a href="/admin/login">Teacher portal</a></div></nav>}
      </header>

      <section id="home" className="relative isolate overflow-hidden bg-[#e9f2e9]">
        <div className="hero-classroom-image absolute inset-0 -z-20 bg-cover bg-center opacity-80" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#e9f2e9] via-[#e9f2e9]/92 to-[#e9f2e9]/15" />
        <div className="absolute -right-24 top-0 -z-10 h-80 w-80 rounded-full bg-[#d4e9b9] blur-3xl" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#bad3be] bg-white/70 px-3 py-2 text-xs font-bold text-[#276247]"><Sparkles size={15} /> EXAM PREPARATION FOR GRADES 9-12</p>
            <h1 className="mt-6 max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">Prepare with confidence for every exam.</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#526258]">Practise by grade and subject, learn from clear explanations, and get help from qualified teachers when you need it.</p>
            <div className="mt-8 flex flex-wrap gap-3"><a href="#grades" className="inline-flex items-center gap-2 rounded-xl bg-[#1e5b43] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/15 hover:bg-[#174633]">Start practising <ArrowRight size={17} /></a><a href="#subscriptions" className="rounded-xl border border-[#bad3be] bg-white px-5 py-3.5 text-sm font-bold text-[#305140]">View plans</a></div>
            <div className="mt-8 flex flex-wrap gap-5 text-sm font-semibold text-[#466252]"><span className="flex items-center gap-2"><CheckCircle2 size={17} className="text-[#4d9b62]" />Curriculum-focused</span><span className="flex items-center gap-2"><CheckCircle2 size={17} className="text-[#4d9b62]" />Teacher support</span><span className="flex items-center gap-2"><CheckCircle2 size={17} className="text-[#4d9b62]" />Study anywhere</span></div>
          </div>
          <div className="relative mx-auto w-full max-w-md rounded-3xl border-[6px] border-[#173e2d] bg-white p-6 shadow-2xl shadow-emerald-950/20">
            <div className="flex items-center justify-between border-b border-[#e3e9e1] pb-5"><div><p className="text-xs font-bold uppercase tracking-wider text-[#718277]">Practice exam</p><p className="mt-1 font-bold">Mathematics · Grade 12</p></div><span className="rounded-lg bg-[#e5f2e4] px-2.5 py-1.5 text-xs font-bold text-[#287046]">Question 4 / 10</span></div>
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-[#e5e8df]"><div className="h-full w-2/5 rounded-full bg-[#4d9b62]" /></div>
            <p className="mt-7 text-xl font-bold leading-8">What is the value of x if 3x + 6 = 21?</p>
            <div className="mt-6 grid gap-3">{["A. x = 3", "B. x = 5", "C. x = 7", "D. x = 9"].map((answer, index) => <button key={answer} className={`rounded-xl border p-3 text-left text-sm font-semibold ${index === 1 ? "border-[#4d9b62] bg-[#eaf5e9] text-[#21633e]" : "border-[#e0e5dd] text-[#526258]"}`}>{answer}{index === 1 && <CheckCircle2 className="float-right" size={18} />}</button>)}</div>
            <div className="mt-6 rounded-xl bg-[#f3f7f1] p-3 text-sm font-medium text-[#466252]">Correct! Continue to see the full explanation.</div>
            <div className="pointer-events-none absolute -right-8 -top-8 flex h-16 w-16 animate-[bounce_4s_ease-in-out_infinite] items-center justify-center rounded-2xl bg-[#f8d995] text-3xl shadow-lg">✏️</div>
            <div className="pointer-events-none absolute -bottom-8 -left-8 flex h-16 w-16 animate-[pulse_3s_ease-in-out_infinite] items-center justify-center rounded-full bg-[#d5e9bc] text-3xl shadow-lg">📚</div>
          </div>
        </div>
      </section>

      <section id="grades" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#4d8c5e]">Choose your class</p><h2 className="mt-3 text-3xl font-bold">What grade are you in?</h2></div><p className="max-w-sm text-sm leading-6 text-[#68766d]">Choose a grade to browse the subjects and exam practice designed for you.</p></div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{grades.map((item) => <button key={item} onClick={() => setGrade(item)} className={`rounded-2xl border p-5 text-left transition ${grade === item ? "border-[#2e7850] bg-[#1e5b43] text-white shadow-lg" : "border-[#e1e7df] bg-white hover:border-[#9fc3a5]"}`}><p className="text-xl font-bold">{item}</p><p className={`mt-2 text-sm ${grade === item ? "text-[#d8eadb]" : "text-[#718277]"}`}>{item === "Grade 12" ? "National exam preparation" : "Practice and improve"}</p><ChevronRight className="mt-7" size={20} /></button>)}</div>
        <div className="mt-6 rounded-2xl bg-[#f3f7f1] px-5 py-4 text-sm font-semibold text-[#466252]"><span className="font-bold text-[#1e5b43]">{grade}</span> selected. Pick a subject to begin your practice.</div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{subjects.map((subject, index) => <Link key={subject} href={`/exam?grade=${encodeURIComponent(grade)}&subject=${encodeURIComponent(subject)}`} className="group flex items-center gap-4 rounded-2xl border border-[#e1e7df] bg-white p-4 text-left hover:border-[#9fc3a5] hover:shadow-md"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e8f3e6] text-sm font-bold text-[#2e7850]">0{index + 1}</span><span className="flex-1 font-bold">{subject}</span><ArrowRight className="text-[#4d9b62] group-hover:translate-x-1" size={18} /></Link>)}</div>
      </section>

      <section id="subscriptions" className="border-y border-[#e1e8df] bg-[#f3f7f1]"><div className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#4d8c5e]">Simple subscription</p><h2 className="mt-3 text-3xl font-bold">Unlock your full exam preparation.</h2><p className="mt-4 leading-7 text-[#68766d]">Subscriptions give students access to practice exams, answers, explanations, performance tracking, and teacher assistance.</p></div><div className="mt-9 grid max-w-3xl gap-5 md:grid-cols-2">{plans.map((plan) => <article key={plan.name} className={`rounded-2xl border bg-white p-6 ${plan.featured ? "border-[#2e7850] shadow-xl shadow-emerald-950/10" : "border-[#e1e7df]"}`}><div className="flex items-start justify-between"><div><h3 className="text-xl font-bold">{plan.name} plan</h3><p className="mt-1 text-sm text-[#718277]">{plan.note}</p></div>{plan.featured && <span className="rounded-full bg-[#e5f2e4] px-2.5 py-1 text-xs font-bold text-[#287046]">BEST VALUE</span>}</div><p className="mt-7 text-3xl font-bold">{plan.price}</p><p className="mt-1 text-sm text-[#718277]">per {plan.name === "Monthly" ? "month" : "year"}</p><ul className="mt-6 space-y-3 text-sm text-[#526258]"><li className="flex gap-2"><CheckCircle2 size={17} className="shrink-0 text-[#4d9b62]" />All Grade 9-12 practice questions</li><li className="flex gap-2"><CheckCircle2 size={17} className="shrink-0 text-[#4d9b62]" />Answers and explanations</li><li className="flex gap-2"><CheckCircle2 size={17} className="shrink-0 text-[#4d9b62]" />Teacher chat support</li></ul><button className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1e5b43] px-4 py-3 text-sm font-bold text-white hover:bg-[#174633]">Choose {plan.name} <CreditCard size={17} /></button></article>)}</div><p className="mt-5 text-xs text-[#718277]">Payment checkout can be connected to your preferred Ethiopian payment provider when the backend is ready.</p></div></section>

      <section id="support" className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><div className="grid gap-8 rounded-3xl bg-[#173e2d] p-7 text-white lg:grid-cols-2 lg:p-10"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#b8dbba]">Student support</p><h2 className="mt-3 text-3xl font-bold">Stuck on a question? Ask a teacher.</h2><p className="mt-4 max-w-md leading-7 text-[#c7dbca]">Students can message their subject teacher for help with a question, explanation, or study plan.</p><button className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#1e5b43]"><MessageCircle size={18} /> Open student chat</button></div><div className="rounded-2xl bg-white/10 p-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d5e9bc] font-bold text-[#173e2d]">T</span><div><p className="font-bold">Teacher Hana</p><p className="text-xs text-[#b8dbba]">Mathematics support · Online</p></div></div><div className="mt-6 rounded-xl bg-white/10 p-3 text-sm">Hello! Which part of the question would you like me to explain?</div><div className="mt-3 rounded-xl bg-[#d5e9bc] p-3 text-sm text-[#173e2d]">How do I solve for x?</div><div className="mt-5 rounded-xl bg-white/10 px-4 py-3 text-sm text-[#b8dbba]">Type your question...</div></div></div></section>

      <section className="border-t border-[#e1e8df] bg-white"><div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 lg:grid-cols-2 lg:px-8"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#4d8c5e]">Teacher administration</p><h2 className="mt-3 text-3xl font-bold">Everything teachers need to support students.</h2><p className="mt-4 max-w-lg leading-7 text-[#68766d]">Teachers manage subjects, upload questions and explanations, review student progress, and respond to student chats from one secure portal.</p><a href="/admin/login" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#1e5b43] px-5 py-3 text-sm font-bold text-white">Teacher login <ArrowRight size={17} /></a></div><div className="grid gap-3 sm:grid-cols-2">{[["Subject question banks", BookOpen], ["Student support chat", MessageCircle], ["Subscription access", CreditCard], ["Secure teacher portal", ShieldCheck]].map(([title, Icon]) => { const FeatureIcon = Icon as typeof BookOpen; return <div key={title as string} className="rounded-2xl border border-[#e1e7df] bg-[#fbfcf8] p-5"><FeatureIcon className="text-[#4d8c5e]" size={22} /><p className="mt-5 font-bold">{title as string}</p></div>; })}</div></div></section>

      <footer className="bg-[#173e2d] text-white"><div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8"><div><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d5e9bc] text-[#173e2d]"><GraduationCap size={21} /></span><div><p className="text-lg font-bold">Examora Ethiopia</p><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#b8dbba]">Learn with confidence</p></div></div><p className="mt-5 max-w-sm text-sm leading-6 text-[#c7dbca]">A focused exam preparation platform for Ethiopian students in Grades 9 to 12.</p></div><div><p className="text-sm font-bold">Student learning</p><div className="mt-4 grid gap-3 text-sm text-[#c7dbca]"><a href="#grades" className="hover:text-white">Browse subjects</a><a href="#subscriptions" className="hover:text-white">Subscriptions</a><a href="#support" className="hover:text-white">Teacher support</a></div></div><div><p className="text-sm font-bold">Educators</p><div className="mt-4 grid gap-3 text-sm text-[#c7dbca]"><a href="/admin/login" className="hover:text-white">Teacher login</a><a href="/admin" className="hover:text-white">Question bank</a><a href="/super-admin/login" className="hover:text-white">Platform management</a></div></div><div><p className="text-sm font-bold">Need help?</p><p className="mt-4 text-sm leading-6 text-[#c7dbca]">Students can reach a subject teacher from any practice question.</p><a href="#support" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#d5e9bc] hover:text-white">Open support <ArrowRight size={16} /></a></div></div><div className="border-t border-white/10"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 text-xs text-[#b8dbba] sm:flex-row sm:items-center sm:justify-between lg:px-8"><span>© 2026 Examora Ethiopia. All rights reserved.</span><span>Practice · Learn · Succeed</span></div></div></footer>
    </main>
  );
}
