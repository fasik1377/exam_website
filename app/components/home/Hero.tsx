"use client";
import { animate, motion, useInView, useMotionValue, useSpring, useTransform, type MotionValue } from "framer-motion";
import { useReducedMotionSafe } from "@/app/components/useReducedMotionSafe";
import { ArrowRight, Atom, BookOpenText, CheckCircle2, PlayCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { SUBJECTS } from "@/lib/subjects";
import GeoGlobe from "./GeoGlobe";
import HistoryTimeline from "./HistoryTimeline";
import KnowledgeNetwork from "./KnowledgeNetwork";
import SolarSystem from "./SolarSystem";

// Floating subject chips; depth controls how strongly each follows the cursor.
const CHIPS = [
  { label: "x² + 2x + 1", className: "left-[48%] top-[16%]", depth: 28 },
  { label: "E = mc²", className: "left-[36%] top-[5%]", depth: -22 },
  { label: "1896 · Adwa", className: "left-[2%] bottom-[17%]", depth: -30 },
  { label: "A : B :: C : ?", className: "left-[42%] bottom-[24%]", depth: 20 },
  { label: "H₂O", className: "right-[3%] top-[6%]", depth: 34 },
];

const STATS = [
  { value: 4, label: "Grades (9–12)" },
  { value: 2, label: "Streams" },
  { value: SUBJECTS.length, label: "Exam subjects" },
  { value: 10, label: "Free questions per subject" },
];

const NATURAL = SUBJECTS.filter((s) => s.streams.length === 1 && s.streams[0] === "natural").map((s) => s.name);
const SOCIAL = SUBJECTS.filter((s) => s.streams.length === 1 && s.streams[0] === "social").map((s) => s.name);
const COMMON = SUBJECTS.filter((s) => s.streams.length > 1).map((s) => s.name);

export default function Hero() {
  const reduce = useReducedMotionSafe();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 20 });
  const sy = useSpring(my, { stiffness: 60, damping: 20 });

  function onMove(event: React.PointerEvent<HTMLElement>) {
    if (reduce || event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    mx.set((event.clientX - rect.left) / rect.width - 0.5);
    my.set((event.clientY - rect.top) / rect.height - 0.5);
  }

  const container = { hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } } };
  const itemUp = { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.2, 0.8, 0.2, 1] as const } } };

  return (
    <section id="home" onPointerMove={onMove} className="relative isolate overflow-hidden bg-navy text-white">
      {/* Layered animated background */}
      <div className="absolute inset-0 -z-30 bg-[radial-gradient(ellipse_at_top_left,#16376b_0%,#0B1F3A_55%)]" />
      <div className="blob -left-32 -top-24 -z-20 h-104 w-104 bg-royal/35" />
      <div className="blob -bottom-40 -right-24 -z-20 h-96 w-96 bg-gold/20 [animation-delay:-6s]" />
      <div className="bg-grid absolute inset-0 -z-20" />
      <KnowledgeNetwork className="absolute inset-0 -z-10" />

      <div className="pointer-events-none absolute inset-0 -z-10 hidden lg:block" aria-hidden>
        {CHIPS.map((chip, i) => <Chip key={chip.label} {...chip} index={i} x={sx} y={sy} reduce={reduce} />)}
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-5 pb-16 pt-12 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:pb-20 lg:pt-16">
        <motion.div className="min-w-0" variants={container} initial={reduce ? false : "hidden"} animate="show">
          <motion.p variants={itemUp} className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-[.16em] text-gold">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-gold" /></span>
            Grades 9–12 · Natural &amp; Social Science
          </motion.p>

          <motion.h1 variants={itemUp} className="mt-6 max-w-2xl text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.5rem]">
            Learn <span className="text-gradient-gold">every subject.</span>
            <br />
            Walk into your <span className="relative whitespace-nowrap">national exam<Underline /></span> ready.
          </motion.h1>

          <motion.p variants={itemUp} className="mt-5 font-amharic text-lg font-bold text-gold/90">ዕውቀት ለሁሉም፣ ስኬት ለሁሉም።</motion.p>

          <motion.p variants={itemUp} className="mt-3 max-w-xl text-lg leading-8 text-white/75">
            Practise real exam questions for every Natural and Social Science subject — with instant feedback and clear teacher explanations.
          </motion.p>

          <motion.div variants={itemUp} className="mt-6 grid max-w-xl gap-2.5 text-sm">
            <StreamRow icon={<Atom size={15} />} label="Natural Science" subjects={NATURAL} reduce={reduce} delay={0.9} />
            <StreamRow icon={<BookOpenText size={15} />} label="Social Science" subjects={SOCIAL} reduce={reduce} delay={1.2} />
            <StreamRow icon={<CheckCircle2 size={15} />} label="Both streams" subjects={COMMON} reduce={reduce} delay={1.5} muted />
          </motion.div>

          <motion.div variants={itemUp} className="mt-8 flex flex-wrap gap-3">
            <motion.a whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} href="#grades" className="btn-shine inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-3.5 text-sm font-bold text-navy shadow-lg shadow-gold/25">
              Start practising <ArrowRight size={17} />
            </motion.a>
            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
              <Link href="/signup" className="glass inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold text-white hover:bg-white/15">
                <PlayCircle size={17} /> Create free account
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Learning universe: solar system (science), timeline (history), globe (geography) */}
        <motion.div className="min-w-0" initial={reduce ? false : { opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, delay: 0.3, ease: [0.2, 0.8, 0.2, 1] }}>
          <div className="relative mx-auto w-full max-w-[34rem]">
            <Parallax x={sx} y={sy} depth={-14}>
              <div className="mx-auto w-[88%] sm:w-[80%]"><SolarSystem reduce={reduce} /></div>
            </Parallax>
            <div className="mt-6 flex flex-col items-center gap-3 sm:mt-0 sm:block">
              <Parallax x={sx} y={sy} depth={26} className="sm:absolute sm:-left-4 sm:top-0">
                <Floating reduce={reduce} delay={0}><HistoryTimeline reduce={reduce} /></Floating>
              </Parallax>
              <Parallax x={sx} y={sy} depth={34} className="sm:absolute sm:-right-2 sm:bottom-[8%]">
                <Floating reduce={reduce} delay={1.5}><GeoGlobe reduce={reduce} /></Floating>
              </Parallax>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="relative border-t border-white/10 bg-white/3">
        <dl className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-5 py-8 sm:grid-cols-4 lg:px-8">
          {STATS.map((stat, i) => (
            <motion.div key={stat.label} className="flex flex-col-reverse" initial={reduce ? false : { opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
              <dt className="mt-1 text-xs font-semibold uppercase tracking-wider text-white/55">{stat.label}</dt>
              <dd className="text-3xl font-extrabold text-white"><CountUp to={stat.value} /></dd>
            </motion.div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function StreamRow({ icon, label, subjects, reduce, delay, muted = false }: { icon: ReactNode; label: string; subjects: string[]; reduce: boolean; delay: number; muted?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`inline-flex w-36 shrink-0 items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${muted ? "text-white/50" : "text-gold"}`}>{icon}{label}</span>
      {subjects.map((name, i) => (
        <motion.span
          key={name}
          initial={reduce ? false : { opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: delay + i * 0.08, type: "spring", stiffness: 300, damping: 18 }}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${muted ? "bg-white/5 text-white/70 ring-1 ring-white/10" : "bg-white/10 text-white ring-1 ring-white/15"}`}
        >
          {name}
        </motion.span>
      ))}
    </div>
  );
}

function Parallax({ x, y, depth, className, children }: { x: MotionValue<number>; y: MotionValue<number>; depth: number; className?: string; children: ReactNode }) {
  const tx = useTransform(x, (v) => v * depth);
  const ty = useTransform(y, (v) => v * depth);
  return <motion.div style={{ x: tx, y: ty }} className={className}>{children}</motion.div>;
}

function Floating({ reduce, delay, children }: { reduce: boolean; delay: number; children: ReactNode }) {
  return (
    <motion.div animate={reduce ? undefined : { y: [0, -8, 0] }} transition={{ duration: 5, delay, repeat: Infinity, ease: "easeInOut" }}>
      {children}
    </motion.div>
  );
}

function Chip({ label, className, depth, index, x, y, reduce }: (typeof CHIPS)[number] & { index: number; x: MotionValue<number>; y: MotionValue<number>; reduce: boolean }) {
  const tx = useTransform(x, (v) => v * depth * 2);
  const ty = useTransform(y, (v) => v * depth * 2);
  return (
    <motion.div style={{ x: tx, y: ty }} className={`absolute ${className}`}>
      <motion.span
        initial={{ opacity: 0, scale: 0.6 }}
        animate={reduce ? { opacity: 0.7, scale: 1 } : { opacity: 0.7, scale: 1, y: [0, -10, 0] }}
        transition={{ opacity: { delay: 0.6 + index * 0.1 }, scale: { delay: 0.6 + index * 0.1 }, y: { duration: 4 + index, repeat: Infinity, ease: "easeInOut" } }}
        className="glass block rounded-xl px-3 py-1.5 font-mono text-sm font-semibold text-white/85 shadow-lg"
      >
        {label}
      </motion.span>
    </motion.div>
  );
}

function Underline() {
  return (
    <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" fill="none" aria-hidden preserveAspectRatio="none">
      <motion.path d="M2 9C40 3 120 1 198 7" stroke="#F4B740" strokeWidth="4" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: 0.9, ease: "easeInOut" }} />
    </svg>
  );
}

function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotionSafe();
  const [value, setValue] = useState(to);
  useEffect(() => {
    if (!inView || reduce) return;
    const controls = animate(0, to, { duration: 1.4, ease: "easeOut", onUpdate: (v) => setValue(Math.round(v)) });
    return () => controls.stop();
  }, [inView, reduce, to]);
  return <span ref={ref}>{reduce ? to : value}</span>;
}
