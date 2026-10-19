"use client";
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
import { useReducedMotionSafe } from "@/app/components/useReducedMotionSafe";
import { CheckCircle2, ChevronRight, Flame, RotateCcw, XCircle } from "lucide-react";
import Link from "next/link";
import { useState, type PointerEvent } from "react";

const SAMPLE = [
  { subject: "Geography", grade: "Social Science", question: "Which is the largest lake in Ethiopia?", choices: ["Lake Abaya", "Lake Tana", "Lake Ziway", "Lake Hawassa"], answer: 1, tip: "Lake Tana is Ethiopia's largest lake and the source of the Blue Nile." },
  { subject: "Physics", grade: "Natural Science", question: "What is the SI unit of force?", choices: ["Joule", "Watt", "Newton", "Pascal"], answer: 2, tip: "Force is measured in newtons: 1 N = 1 kg·m/s²." },
  { subject: "History", grade: "Social Science", question: "In which year did Ethiopia win the Battle of Adwa?", choices: ["1889", "1896", "1913", "1941"], answer: 1, tip: "Ethiopia defeated the invading Italian army at Adwa on 1 March 1896." },
  { subject: "Mathematics", grade: "Both streams", question: "What is the value of x if 3x + 6 = 21?", choices: ["x = 3", "x = 5", "x = 7", "x = 9"], answer: 1, tip: "Subtract 6, then divide by 3: 3x = 15, so x = 5." },
  { subject: "Scholastic Aptitude", grade: "Both streams", question: "What number comes next: 2, 6, 12, 20, 30, ?", choices: ["36", "40", "42", "48"], answer: 2, tip: "The gaps grow by 2 each time (4, 6, 8, 10, 12), so 30 + 12 = 42." },
  { subject: "Biology", grade: "Natural Science", question: "Which organelle is called the powerhouse of the cell?", choices: ["Nucleus", "Mitochondrion", "Ribosome", "Golgi body"], answer: 1, tip: "Mitochondria release energy (ATP) through cellular respiration." },
  { subject: "English", grade: "Both streams", question: "Choose the word closest in meaning to “rapid”.", choices: ["Slow", "Quick", "Late", "Heavy"], answer: 1, tip: "“Rapid” means happening at great speed — the synonym is “quick”." },
];

const CONFETTI_COLORS = ["#F4B740", "#155EEF", "#22c55e", "#ffffff", "#ff7a59"];

/** A playable sample question card that tilts towards the cursor. */
export default function HeroQuiz() {
  const reduce = useReducedMotionSafe();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState({ correct: 0, streak: 0 });
  const [burst, setBurst] = useState(0);
  const rotateX = useSpring(useMotionValue(0), { stiffness: 150, damping: 18 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 150, damping: 18 });

  const item = SAMPLE[index];
  const done = selected !== null;
  const correct = selected === item.answer;

  function tilt(event: PointerEvent<HTMLDivElement>) {
    if (reduce || event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    rotateY.set(((event.clientX - rect.left) / rect.width - 0.5) * 12);
    rotateX.set(-((event.clientY - rect.top) / rect.height - 0.5) * 12);
  }
  function resetTilt() { rotateX.set(0); rotateY.set(0); }

  function choose(choice: number) {
    if (done) return;
    setSelected(choice);
    if (choice === item.answer) {
      setScore((s) => ({ correct: s.correct + 1, streak: s.streak + 1 }));
      setBurst((b) => b + 1);
    } else {
      setScore((s) => ({ ...s, streak: 0 }));
    }
  }
  function next() { setSelected(null); setIndex((i) => (i + 1) % SAMPLE.length); }

  return (
    <div className="relative [perspective:1200px]">
      <motion.div
        onPointerMove={tilt}
        onPointerLeave={resetTilt}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="relative mx-auto w-full max-w-md rounded-3xl border border-white/30 bg-white p-6 text-navy shadow-[0_40px_80px_-30px_rgba(0,0,0,.6)]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.16em] text-royal">Try a question</p>
            <AnimatePresence mode="wait">
              <motion.p key={item.subject} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="mt-1 font-bold">
                {item.subject} · {item.grade}
              </motion.p>
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-2">
            <motion.span key={score.streak} initial={{ scale: 0.6 }} animate={{ scale: 1 }} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${score.streak ? "bg-orange-50 text-orange-600" : "bg-slate-100 text-slate-500"}`}>
              <Flame size={13} /> {score.streak}
            </motion.span>
            <span className="rounded-full bg-navy px-2.5 py-1 text-xs font-bold text-white">{index + 1}/{SAMPLE.length}</span>
          </div>
        </div>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-royal to-gold" animate={{ width: `${((index + (done ? 1 : 0.35)) / SAMPLE.length) * 100}%` }} transition={{ type: "spring", stiffness: 80, damping: 18 }} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={index} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
            <p className="mt-5 text-lg font-bold leading-7">{item.question}</p>
            <div className="mt-4 grid gap-2.5">
              {item.choices.map((choice, i) => {
                const isAnswer = i === item.answer;
                const isPicked = i === selected;
                const state = !done ? "idle" : isAnswer ? "right" : isPicked ? "wrong" : "muted";
                const styles = {
                  idle: "border-slate-200 hover:border-royal hover:bg-blue-50/60",
                  right: "border-green-500 bg-green-50 text-green-800",
                  wrong: "border-red-400 bg-red-50 text-red-700",
                  muted: "border-slate-100 text-slate-400",
                }[state];
                return (
                  <motion.button
                    key={choice}
                    type="button"
                    onClick={() => choose(i)}
                    disabled={done}
                    whileHover={done ? undefined : { x: 4 }}
                    whileTap={done ? undefined : { scale: 0.98 }}
                    animate={state === "wrong" && !reduce ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
                    transition={{ duration: 0.4 }}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left text-sm font-semibold transition-colors ${styles}`}
                  >
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold ${state === "right" ? "bg-green-500 text-white" : state === "wrong" ? "bg-red-500 text-white" : "bg-slate-100 text-slate-600"}`}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1">{choice}</span>
                    {state === "right" && <CheckCircle2 size={18} className="text-green-600" />}
                    {state === "wrong" && <XCircle size={18} className="text-red-500" />}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {done && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className={`mt-4 rounded-xl p-3 text-sm ${correct ? "bg-green-50 text-green-900" : "bg-amber-50 text-amber-900"}`}>
                <p className="font-bold">{correct ? "Correct! Great work." : "Not quite — here's why:"}</p>
                <p className="mt-1 leading-6 opacity-90">{item.tip}</p>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-500">Score: {score.correct} correct</span>
                {index === SAMPLE.length - 1 ? (
                  <div className="flex gap-2">
                    <button type="button" onClick={next} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"><RotateCcw size={14} /> Again</button>
                    <Link href="/signup" className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-3 py-2 text-xs font-bold text-white">Practise for real <ChevronRight size={14} /></Link>
                  </div>
                ) : (
                  <button type="button" onClick={next} className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-xs font-bold text-white hover:bg-royal">Next question <ChevronRight size={14} /></button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confetti burst on a correct answer */}
        {!reduce && burst > 0 && (
          <div key={burst} className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden>
            {Array.from({ length: 22 }, (_, i) => {
              const angle = (i / 22) * Math.PI * 2;
              const distance = 120 + (i % 4) * 30;
              return (
                <motion.span
                  key={i}
                  className="absolute left-1/2 top-1/2 h-2 w-2 rounded-sm"
                  style={{ background: CONFETTI_COLORS[i % CONFETTI_COLORS.length] }}
                  initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
                  animate={{ x: Math.cos(angle) * distance, y: Math.sin(angle) * distance + 60, opacity: 0, rotate: 360, scale: 0.6 }}
                  transition={{ duration: 1.1, ease: "easeOut" }}
                />
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Floating accents around the card */}
      <motion.div aria-hidden animate={reduce ? undefined : { y: [0, -12, 0], rotate: [0, 6, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} className="pointer-events-none absolute -right-3 -top-6 grid h-14 w-14 place-items-center rounded-2xl bg-gold text-2xl shadow-xl sm:-right-8">✏️</motion.div>
      <motion.div aria-hidden animate={reduce ? undefined : { y: [0, 10, 0], rotate: [0, -8, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="pointer-events-none absolute -bottom-6 -left-3 grid h-14 w-14 place-items-center rounded-full bg-royal text-2xl shadow-xl sm:-left-8">📚</motion.div>
    </div>
  );
}
