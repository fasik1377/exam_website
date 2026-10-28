"use client";
import { motion } from "framer-motion";
import { useReducedMotionSafe } from "@/app/components/useReducedMotionSafe";
import ThemeToggle from "@/app/components/ThemeToggle";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import KnowledgeNetwork from "@/app/components/home/KnowledgeNetwork";

type ShellProps = { eyebrow: string; title: string; description: string; points: string[]; children: ReactNode };

const CHIPS = [
  { label: "x² + 2x + 1", className: "left-[6%] top-[18%]", delay: 0 },
  { label: "E = mc²", className: "right-[7%] top-[14%]", delay: 1.2 },
  { label: "H₂O", className: "left-[10%] bottom-[20%]", delay: 0.6 },
  { label: "1896 · Adwa", className: "right-[9%] bottom-[24%]", delay: 1.8 },
  { label: "A : B :: C : ?", className: "left-[16%] top-[48%]", delay: 2.4 },
  { label: "DNA 🧬", className: "right-[14%] top-[52%]", delay: 0.9 },
];

/** Centred sign-in / sign-up layout: the logo crowns a card that floats over an animated brand scene. */
export default function AuthShell({ eyebrow, title, points, children }: ShellProps) {
  const reduce = useReducedMotionSafe();
  return (
    <main className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-navy text-navy">
      {/* Animated backdrop */}
      <div className="absolute inset-0 -z-30 bg-[radial-gradient(ellipse_at_top,#1d4ed8_0%,#12306b_35%,#0B1F3A_75%)]" />
      <div className="blob -left-32 top-10 -z-20 h-96 w-96 bg-royal/40" />
      <div className="blob -right-24 bottom-0 -z-20 h-96 w-96 bg-gold/20 [animation-delay:-8s]" />
      <div className="bg-grid absolute inset-0 -z-20" />
      <KnowledgeNetwork className="absolute inset-0 -z-10" />
      <OrbitRings />
      <div className="pointer-events-none absolute inset-0 -z-10 hidden lg:block" aria-hidden>
        {CHIPS.map((chip) => (
          <motion.span
            key={chip.label}
            className={`glass absolute rounded-xl px-3 py-1.5 font-mono text-sm font-semibold text-white/80 ${chip.className}`}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={reduce ? { opacity: 0.75, scale: 1 } : { opacity: 0.75, scale: 1, y: [0, -12, 0] }}
            transition={{ opacity: { delay: 0.4 + chip.delay / 4 }, scale: { delay: 0.4 + chip.delay / 4 }, y: { duration: 5, delay: chip.delay, repeat: Infinity, ease: "easeInOut" } }}
          >
            {chip.label}
          </motion.span>
        ))}
      </div>

      <header className="relative flex items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="glass inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-white/15"><ArrowLeft size={16} /> Back home</Link>
        <span className="flex items-center gap-3"><span className="hidden text-xs font-bold uppercase tracking-[.18em] text-gold/80 sm:block">{eyebrow}</span><ThemeToggle tone="light" className="glass" /></span>
      </header>

      <div className="relative flex flex-1 flex-col items-center justify-center px-4 pb-10 pt-16">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
          className="relative w-full max-w-md"
        >
          {/* Logo, centred on the card's top edge */}
          <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2">
            <div className="relative grid h-32 w-32 place-items-center">
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#F4B740,#155EEF,#F4B740)] opacity-80 blur-[2px]"
                animate={reduce ? undefined : { rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              />
              <motion.span aria-hidden className="absolute -inset-3 rounded-full bg-gold/25 blur-xl" animate={reduce ? undefined : { opacity: [0.5, 1, 0.5] }} transition={{ duration: 3, repeat: Infinity }} />
              <Link href="/" aria-label="እውቀትNET home" className="relative grid h-[7.4rem] w-[7.4rem] place-items-center rounded-full bg-white p-3 shadow-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/logo-trimmed.png" alt="እውቀትNET" className="h-full w-full object-contain" />
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] bg-white px-6 pb-8 pt-20 shadow-[0_40px_80px_-30px_rgba(0,0,0,.6)] ring-1 ring-white/50 sm:px-9">
            <p className="text-center text-xs font-semibold text-slate-500">{title}</p>
            <div className="mt-6">{children}</div>
          </div>
        </motion.div>

        <motion.ul initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-8 flex max-w-2xl flex-wrap justify-center gap-2">
          {points.map((point) => (
            <li key={point} className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white/85">
              <CheckCircle2 size={14} className="text-gold" />{point}
            </li>
          ))}
        </motion.ul>
        <p className="mt-5 font-amharic text-sm text-white/50">ዕውቀት ለሁሉም፣ ስኬት ለሁሉም።</p>
      </div>
    </main>
  );
}

/** Slowly rotating orbit rings behind the card. */
function OrbitRings() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[52rem] w-[52rem] -translate-x-1/2 -translate-y-1/2 opacity-50" aria-hidden>
      {[100, 76, 54].map((size, i) => (
        <div key={size} className="absolute left-1/2 top-1/2 rounded-full border border-white/10" style={{ width: `${size}%`, height: `${size}%`, transform: "translate(-50%, -50%)" }}>
          <div className="absolute inset-0" style={{ animation: `spin-slow ${40 + i * 15}s linear infinite${i % 2 ? " reverse" : ""}` }}>
            <span className={`absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${i === 0 ? "bg-gold" : i === 1 ? "bg-sky-300" : "bg-white"} shadow-[0_0_12px_4px_rgba(244,183,64,.35)]`} />
          </div>
        </div>
      ))}
    </div>
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; icon?: ReactNode };

export function Field({ label, icon, type, ...props }: FieldProps) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <label className="block text-sm font-semibold">
      {label}
      <span className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 transition focus-within:border-royal focus-within:bg-white focus-within:ring-4 focus-within:ring-royal/10">
        {icon && <span className="text-slate-400">{icon}</span>}
        <input {...props} type={isPassword && show ? "text" : type} className="w-full bg-transparent py-3 font-normal outline-none placeholder:text-slate-400" />
        {isPassword && (
          <button type="button" onClick={() => setShow(!show)} className="text-slate-400 hover:text-navy" aria-label={show ? "Hide password" : "Show password"}>
            {show ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        )}
      </span>
    </label>
  );
}

export function SubmitButton({ loading, children, loadingText }: { loading: boolean; children: ReactNode; loadingText: string }) {
  return (
    <motion.button whileHover={loading ? undefined : { y: -1 }} whileTap={loading ? undefined : { scale: 0.98 }} disabled={loading} className="btn-shine mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-navy to-royal px-4 py-3.5 font-bold text-white shadow-lg shadow-royal/25 transition hover:shadow-royal/40 disabled:opacity-70">
      {loading ? <><LoaderCircle size={18} className="animate-spin" /> {loadingText}</> : children}
    </motion.button>
  );
}

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <motion.p role="alert" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0, x: [0, -6, 6, -3, 3, 0] }} transition={{ duration: 0.4 }} className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">
      {message}
    </motion.p>
  );
}
