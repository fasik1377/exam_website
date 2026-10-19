import { ArrowRight, BookOpen, CheckCircle2, CreditCard, Lightbulb, MessageCircle, MousePointerClick, ShieldCheck, Sparkles, Target, Trophy } from "lucide-react";
import Link from "next/link";
import Brand from "@/app/components/Brand";
import Reveal from "@/app/components/Reveal";
import GradePicker from "@/app/components/home/GradePicker";
import Hero from "@/app/components/home/Hero";
import SiteHeader from "@/app/components/home/SiteHeader";
import HeroQuiz from "@/app/components/home/HeroQuiz";
import SupportChat from "@/app/components/home/SupportChat";
import { SUBJECTS } from "@/lib/subjects";

const MARQUEE = [...SUBJECTS.map((s) => `${s.name} · ${s.amharic}`), "Natural Science", "Social Science"];

const STEPS = [
  { icon: MousePointerClick, title: "Choose grade, stream & subject", text: "Pick your grade, then Natural or Social Science, then any subject aligned with the Ethiopian curriculum." },
  { icon: Target, title: "Answer timed questions", text: "Practise under exam conditions with a countdown timer and instant right-or-wrong feedback." },
  { icon: Lightbulb, title: "Learn from explanations", text: "Every question comes with a teacher's step-by-step explanation so you understand, not memorise." },
  { icon: Trophy, title: "Track your progress", text: "Your attempts are saved to your account so you can see how far you have come." },
];

const PLANS = [
  { name: "Monthly", price: "200", period: "month", note: "Flexible monthly access", featured: false },
  { name: "Yearly", price: "1,000", period: "year", note: "Best value — save over 55%", featured: true },
];

const PLAN_FEATURES = ["All Grade 9–12 practice questions", "Full answers and explanations", "Progress tracking", "Teacher chat support"];

const TEACHER_FEATURES = [
  { title: "Subject question banks", icon: BookOpen },
  { title: "Student support chat", icon: MessageCircle },
  { title: "Subscription access", icon: CreditCard },
  { title: "Secure teacher portal", icon: ShieldCheck },
];

function SectionLabel({ children, tone = "dark" }: { children: React.ReactNode; tone?: "dark" | "light" }) {
  return (
    <p className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] ${tone === "light" ? "text-gold" : "text-royal"}`}>
      <span className={`h-px w-6 ${tone === "light" ? "bg-gold" : "bg-royal"}`} />
      {children}
    </p>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-clip bg-[#f7f9fc] text-navy">
      <SiteHeader />
      <Hero />

      {/* Subject marquee */}
      <div className="overflow-hidden border-b border-slate-200 bg-white py-4" aria-hidden>
        <div className="marquee gap-10 font-amharic text-sm font-bold text-slate-400">
          {[...MARQUEE, ...MARQUEE].map((item, i) => (
            <span key={i} className="flex items-center gap-10 whitespace-nowrap">{item}<Sparkles size={14} className="text-gold" /></span>
          ))}
        </div>
      </div>

      {/* Try a question */}
      <section id="try" className="relative overflow-hidden bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-5 py-20 lg:grid-cols-[.9fr_1.1fr] lg:px-8 lg:py-24">
          <Reveal className="min-w-0">
            <SectionLabel>Try it now — no account needed</SectionLabel>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Answer a question from every subject.</h2>
            <p className="mt-4 max-w-md leading-7 text-slate-500">From Geography and History to Physics and Scholastic Aptitude — test yourself, build a streak, and see the explanation behind every answer.</p>
            <ul className="mt-6 grid gap-3 text-sm font-semibold text-slate-600">
              {["Instant right-or-wrong feedback", "A short explanation for every answer", "Questions from both Natural and Social Science"].map((t) => (
                <li key={t} className="flex items-center gap-2"><CheckCircle2 size={17} className="text-royal" />{t}</li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.1} className="min-w-0">
            <div className="relative rounded-[2rem] bg-gradient-to-br from-navy to-royal px-5 py-12 sm:px-12">
              <div className="bg-grid absolute inset-0 rounded-[2rem]" />
              <HeroQuiz />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Grades & subjects */}
      <section id="grades" className="relative">
        <div className="bg-dots pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,#000,transparent_70%)]" />
        <div className="relative mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
          <Reveal className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <SectionLabel>Choose your class</SectionLabel>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">What grade are you in?</h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-slate-500">Select your grade and stream, then a subject, to open a timed practice exam built for you.</p>
          </Reveal>
          <GradePicker />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
          <Reveal className="mx-auto max-w-2xl text-center">
            <SectionLabel>How it works</SectionLabel>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">From first question to exam day.</h2>
            <p className="mt-4 leading-7 text-slate-500">A simple routine that turns daily practice into real confidence.</p>
          </Reveal>
          <div className="relative mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="pointer-events-none absolute left-[12%] right-[12%] top-8 hidden h-0.5 bg-gradient-to-r from-royal/0 via-royal/30 to-gold/0 lg:block" />
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <Reveal key={step.title} delay={i * 0.12} className="relative text-center">
                  <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-navy text-gold shadow-lg shadow-navy/20 transition-transform duration-300 hover:-translate-y-1 hover:rotate-6">
                    <Icon size={26} />
                    <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-gold text-xs font-extrabold text-navy">{i + 1}</span>
                  </div>
                  <h3 className="mt-5 font-bold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{step.text}</p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Subscriptions */}
      <section id="subscriptions" className="relative overflow-hidden">
        <div className="blob -right-32 -top-32 h-96 w-96 bg-gold/15" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:px-8 lg:py-24">
          <Reveal>
            <SectionLabel>Simple subscription</SectionLabel>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Unlock your full exam preparation.</h2>
            <p className="mt-4 max-w-md leading-7 text-slate-500">Start free with the first 10 questions of every subject. Subscribe to get the complete question bank, every explanation, and teacher support.</p>
            <p className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200">
              <ShieldCheck size={16} className="text-royal" /> Online checkout with Ethiopian payment providers is coming soon.
            </p>
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-2">
            {PLANS.map((plan, i) => (
              <Reveal key={plan.name} delay={i * 0.12}>
                <article className={`card-lift relative h-full rounded-3xl p-[1.5px] ${plan.featured ? "bg-gradient-to-br from-gold via-royal to-navy" : "bg-slate-200"}`}>
                  <div className={`flex h-full flex-col rounded-[calc(1.5rem-1.5px)] p-6 ${plan.featured ? "bg-navy text-white" : "bg-white"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-bold">{plan.name}</h3>
                        <p className={`mt-1 text-sm ${plan.featured ? "text-white/60" : "text-slate-500"}`}>{plan.note}</p>
                      </div>
                      {plan.featured && <span className="rounded-full bg-gold px-2.5 py-1 text-[10px] font-extrabold tracking-wider text-navy">BEST VALUE</span>}
                    </div>
                    <p className="mt-7 flex items-baseline gap-1.5"><span className={`text-sm font-bold ${plan.featured ? "text-white/60" : "text-slate-400"}`}>ETB</span><span className="text-4xl font-extrabold">{plan.price}</span><span className={`text-sm ${plan.featured ? "text-white/60" : "text-slate-500"}`}>/ {plan.period}</span></p>
                    <ul className={`mt-6 flex-1 space-y-3 text-sm ${plan.featured ? "text-white/80" : "text-slate-600"}`}>
                      {PLAN_FEATURES.map((feature) => <li key={feature} className="flex gap-2"><CheckCircle2 size={17} className={`shrink-0 ${plan.featured ? "text-gold" : "text-royal"}`} />{feature}</li>)}
                    </ul>
                    <Link href={`/signup?plan=${plan.name.toLowerCase()}`} className={`btn-shine mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${plan.featured ? "bg-gold text-navy" : "bg-navy text-white hover:bg-royal"}`}>
                      Choose {plan.name} <CreditCard size={17} />
                    </Link>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Student support */}
      <section id="support" className="mx-auto max-w-7xl px-5 pb-20 lg:px-8 lg:pb-24">
        <Reveal>
          <div className="relative grid gap-10 overflow-hidden rounded-[2rem] bg-navy p-7 text-white lg:grid-cols-2 lg:items-center lg:p-12">
            <div className="blob -left-20 -top-20 h-72 w-72 bg-royal/40" />
            <div className="relative">
              <SectionLabel tone="light">Student support</SectionLabel>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Stuck on a question? Ask a teacher.</h2>
              <p className="mt-4 max-w-md leading-7 text-white/70">Message a subject teacher for help with a question, an explanation, or a study plan — and get answers in plain language.</p>
              <Link href="/signup" className="btn-shine mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-navy"><MessageCircle size={18} /> Join to chat with teachers</Link>
            </div>
            <div className="relative"><SupportChat /></div>
          </div>
        </Reveal>
      </section>

      {/* Teachers */}
      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 lg:grid-cols-2 lg:items-center lg:px-8">
          <Reveal>
            <SectionLabel>For teachers & schools</SectionLabel>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Everything teachers need to support students.</h2>
            <p className="mt-4 max-w-lg leading-7 text-slate-500">Publish questions with answers and explanations, review student activity, and respond to students — all from one secure portal.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/admin/login" className="btn-shine inline-flex items-center gap-2 rounded-xl bg-navy px-5 py-3 text-sm font-bold text-white hover:bg-royal">Teacher login <ArrowRight size={17} /></Link>
              <Link href="/super-admin/login" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold hover:border-royal">Platform admin</Link>
            </div>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2">
            {TEACHER_FEATURES.map(({ title, icon: Icon }, i) => (
              <Reveal key={title} delay={i * 0.08}>
                <div className="card-lift group h-full rounded-2xl border border-slate-200 bg-[#f7f9fc] p-6">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-royal shadow-sm transition-colors group-hover:bg-royal group-hover:text-white"><Icon size={22} /></span>
                  <p className="mt-5 font-bold">{title}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-navy text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
          <div>
            <Brand tone="light" subtitle="Learn with confidence" />
            <p className="mt-5 max-w-sm text-sm leading-6 text-white/60">A focused exam preparation platform for Ethiopian students in Grades 9 to 12.</p>
          </div>
          <div>
            <p className="text-sm font-bold">Student learning</p>
            <div className="mt-4 grid gap-3 text-sm text-white/60">
              <a href="#grades" className="hover:text-gold">Browse subjects</a>
              <a href="#subscriptions" className="hover:text-gold">Subscriptions</a>
              <a href="#support" className="hover:text-gold">Teacher support</a>
            </div>
          </div>
          <div>
            <p className="text-sm font-bold">Educators</p>
            <div className="mt-4 grid gap-3 text-sm text-white/60">
              <Link href="/admin/login" className="hover:text-gold">Teacher login</Link>
              <Link href="/admin" className="hover:text-gold">Question bank</Link>
              <Link href="/super-admin/login" className="hover:text-gold">Platform management</Link>
            </div>
          </div>
          <div>
            <p className="text-sm font-bold">Your account</p>
            <div className="mt-4 grid gap-3 text-sm text-white/60">
              <Link href="/login" className="hover:text-gold">Sign in</Link>
              <Link href="/signup" className="hover:text-gold">Create account</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between lg:px-8">
            <span>© {new Date().getFullYear()} እውቀትNET. All rights reserved.</span>
            <span>Developed by <a href="https://fasik1377.github.io/fasika-abera/" target="_blank" rel="noreferrer" className="font-bold text-gold hover:text-white">Fasika Abera</a></span>
          </div>
        </div>
      </footer>
    </main>
  );
}
