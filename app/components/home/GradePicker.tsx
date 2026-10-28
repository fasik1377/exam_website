"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Code2, Lock, Atom, BookOpenText, Brain, Calculator, Dna, FlaskConical, Globe2, Languages, Landmark, TrendingUp, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useSession } from "@/app/components/useSession";
import { useSubjects } from "@/app/components/useSubjects";
import { STREAMS, isCommon, needsStream, subjectsForStudent, type Stream } from "@/lib/subjects";

const GRADES = [
  { name: "Grade 9", note: "Build strong foundations" },
  { name: "Grade 10", note: "Prepare for the regional exam" },
  { name: "Grade 11", note: "Deepen your understanding" },
  { name: "Grade 12", note: "National exam preparation" },
];

const STYLE: Record<string, { icon: LucideIcon; tint: string; color: string }> = {
  English: { icon: Languages, tint: "from-violet-500/15", color: "text-violet-600 bg-violet-50" },
  Mathematics: { icon: Calculator, tint: "from-blue-500/15", color: "text-blue-600 bg-blue-50" },
  "Scholastic Aptitude": { icon: Brain, tint: "from-pink-500/15", color: "text-pink-600 bg-pink-50" },
  Physics: { icon: Atom, tint: "from-sky-500/15", color: "text-sky-600 bg-sky-50" },
  Chemistry: { icon: FlaskConical, tint: "from-orange-500/15", color: "text-orange-600 bg-orange-50" },
  Biology: { icon: Dna, tint: "from-emerald-500/15", color: "text-emerald-600 bg-emerald-50" },
  History: { icon: Landmark, tint: "from-amber-500/15", color: "text-amber-700 bg-amber-50" },
  Geography: { icon: Globe2, tint: "from-teal-500/15", color: "text-teal-600 bg-teal-50" },
  Economics: { icon: TrendingUp, tint: "from-indigo-500/15", color: "text-indigo-600 bg-indigo-50" },
};

/** Subjects added by the super admin get a neutral book icon. */
const CODE_STYLE = { icon: Code2, tint: "from-cyan-500/15", color: "text-cyan-700 bg-cyan-50" };
const styleFor = (name: string) =>
  STYLE[name] ?? (/web|program|coding|computer|software|ict|it|information tech/i.test(name) ? CODE_STYLE : { icon: BookOpenText, tint: "from-slate-500/15", color: "text-slate-600 bg-slate-100" });

const STREAM_ICON: Record<Stream, LucideIcon> = { natural: Atom, social: BookOpenText };

/** Opens on a signed-in student's own grade and stream; everyone else starts at Grade 12 · Natural. */
export default function GradePicker() {
  const { user, loading } = useSession();
  const mine = user?.role === "student" && user.grade ? user : null;
  return <Picker key={mine ? `${mine.grade}-${mine.stream}` : "default"} initialGrade={mine?.grade ?? "Grade 12"} initialStream={mine?.stream ?? "natural"} personal={!!mine} signedIn={loading || !!user} />;
}

function Picker({ initialGrade, initialStream, personal, signedIn: user }: { initialGrade: string; initialStream: Stream; personal: boolean; signedIn: boolean }) {
  const [grade, setGrade] = useState(initialGrade);
  const [stream, setStream] = useState<Stream>(initialStream);
  const withStream = needsStream(grade);
  // Grades 9–10 study every subject; Grades 11–12 follow their stream.
  const all = useSubjects();
  const subjects = subjectsForStudent(grade, stream, all);

  return (
    <div>
      <StepLabel n={1} text="Choose your grade" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="tablist" aria-label="Choose your grade">
        {GRADES.map((item, index) => {
          const active = grade === item.name;
          return (
            <motion.button
              key={item.name}
              role="tab"
              aria-selected={active}
              onClick={() => setGrade(item.name)}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.07 }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              className={`relative overflow-hidden rounded-2xl border p-5 text-left transition-colors ${active ? "border-transparent text-white" : "border-slate-200 bg-white hover:border-royal/40"}`}
            >
              {active && <motion.span layoutId="grade-active" className="absolute inset-0 bg-gradient-to-br from-navy to-royal" transition={{ type: "spring", stiffness: 300, damping: 30 }} />}
              <span className="relative z-10 flex items-start justify-between">
                <span className={`grid h-9 w-9 place-items-center rounded-xl text-sm font-extrabold ${active ? "bg-white/20 text-white" : "bg-gold text-navy"}`}>{item.name.split(" ")[1]}</span>
                <ArrowRight size={18} className={`transition-transform ${active ? "translate-x-0" : "-translate-x-1 opacity-40"}`} />
              </span>
              <span className="relative z-10 mt-6 block text-xl font-bold">{item.name}</span>
              <span className={`relative z-10 mt-1 block text-sm ${active ? "text-white/75" : "text-slate-500"}`}>{item.note}</span>
            </motion.button>
          );
        })}
      </div>

      {personal && <p className="mt-4 text-xs font-semibold text-royal">Showing your grade{withStream ? " and stream" : ""} from your profile.</p>}

      <AnimatePresence initial={false}>
      {withStream && (
      <motion.div key="stream-step" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
      <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <StepLabel n={2} text="Choose your stream (Grades 11–12)" />
        <div className="inline-grid grid-cols-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm" role="tablist" aria-label="Choose your stream">
          {STREAMS.map((item) => {
            const active = stream === item.id;
            const Icon = STREAM_ICON[item.id];
            return (
              <button key={item.id} role="tab" aria-selected={active} onClick={() => setStream(item.id)} className={`relative flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors sm:px-5 ${active ? "text-white" : "text-slate-500 hover:text-navy"}`}>
                {active && <motion.span layoutId="stream-active" className="absolute inset-0 rounded-xl bg-navy" transition={{ type: "spring", stiffness: 350, damping: 30 }} />}
                <Icon size={16} className="relative" />
                <span className="relative">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      </motion.div>
      )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.p key={grade + (withStream ? stream : "")} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border border-gold/40 bg-gold/10 px-5 py-4 text-sm font-semibold text-navy">
          <span className="text-lg">🎯</span>
          <span className="font-extrabold">{grade}</span>·
          {withStream ? (
            <>
              <span className="font-extrabold">{STREAMS.find((s) => s.id === stream)?.label}</span>
              <span className="font-amharic text-slate-500">({STREAMS.find((s) => s.id === stream)?.amharic})</span>
            </>
          ) : <span className="font-extrabold">All subjects</span>}
          — {user ? "pick a subject to start your practice exam." : "sign in or create a free student account, then pick a subject."}
        </motion.p>
      </AnimatePresence>

      <div className="mt-8"><StepLabel n={withStream ? 3 : 2} text="Pick a subject" /></div>
      <motion.div layout className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {subjects.map((subject, index) => {
            const { icon: Icon, tint, color } = styleFor(subject.name);
            const examHref = (name: string) => `/exam?grade=${encodeURIComponent(grade)}&subject=${encodeURIComponent(name)}`;
            return (
              <motion.div key={subject.name} layout initial={{ opacity: 0, scale: 0.92, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3, delay: index * 0.04 }}>
                <Link
                  href={user ? examHref(subject.name) : `/login?next=${encodeURIComponent(examHref(subject.name))}`}
                  title={user ? undefined : "Sign in to practise"}
                  className="card-lift group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5"
                >
                  <span className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tint} to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
                  <span className={`relative grid h-12 w-12 shrink-0 place-items-center rounded-xl transition-transform duration-300 group-hover:-rotate-8 group-hover:scale-110 ${color}`}><Icon size={22} /></span>
                  <span className="relative min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 font-bold">
                      {subject.name}
                      {withStream && isCommon(subject) && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Common</span>}
                    </span>
                    <span className="block font-amharic text-sm text-slate-500">{subject.amharic}</span>
                  </span>
                  <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-navy transition-all duration-300 group-hover:bg-navy group-hover:text-white">
                    {user ? <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" /> : <Lock size={15} />}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
      <p className="mt-4 text-xs text-slate-500">{withStream ? "English, Mathematics and Scholastic Aptitude are common to both streams." : "Grades 9 and 10 practise every subject. Students choose Natural or Social Science in Grade 11."}</p>
    </div>
  );
}

function StepLabel({ n, text }: { n: number; text: string }) {
  return (
    <p className="flex items-center gap-2.5 text-sm font-bold text-navy">
      <span className="grid h-6 w-6 place-items-center rounded-full bg-navy text-[11px] text-white">{n}</span>
      {text}
    </p>
  );
}
