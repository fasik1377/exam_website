"use client";
import { motion } from "framer-motion";
import { useReducedMotionSafe } from "@/app/components/useReducedMotionSafe";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import Brand from "@/app/components/Brand";

type ShellProps = { eyebrow: string; title: string; description: string; points: string[]; children: ReactNode };

/** Two-panel layout used by every sign-in and sign-up page. */
export default function AuthShell({ eyebrow, title, description, points, children }: ShellProps) {
  const reduce = useReducedMotionSafe();
  return (
    <main className="grid min-h-screen bg-[#f7f9fc] text-navy lg:grid-cols-[1fr_1.05fr]">
      <section className="relative isolate hidden overflow-hidden bg-navy p-10 text-white lg:flex lg:flex-col xl:p-14">
        <div className="blob -left-24 -top-24 -z-10 h-96 w-96 bg-royal/40" />
        <div className="blob -bottom-24 -right-16 -z-10 h-80 w-80 bg-gold/25 [animation-delay:-8s]" />
        <div className="bg-grid absolute inset-0 -z-10" />
        <Brand tone="light" subtitle="Ethiopian exam preparation" />
        <motion.div initial={reduce ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="my-auto max-w-lg py-12">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-gold">{eyebrow}</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight">{title}</h1>
          <p className="mt-5 leading-7 text-white/70">{description}</p>
          <ul className="mt-8 grid gap-3">
            {points.map((point, i) => (
              <motion.li key={point} initial={reduce ? false : { opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }} className="glass flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium">
                <CheckCircle2 size={18} className="shrink-0 text-gold" />{point}
              </motion.li>
            ))}
          </ul>
        </motion.div>
        <p className="font-amharic text-sm text-white/50">ዕውቀት ኃይል ነው — Knowledge is power.</p>
      </section>

      <section className="flex flex-col px-5 py-8 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-navy"><ArrowLeft size={17} /> Back home</Link>
          <div className="lg:hidden"><Brand size="sm" /></div>
        </div>
        <motion.div initial={reduce ? false : { opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }} className="m-auto w-full max-w-md py-10">
          {children}
        </motion.div>
      </section>
    </main>
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; icon?: ReactNode };

export function Field({ label, icon, type, ...props }: FieldProps) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <label className="block text-sm font-semibold">
      {label}
      <span className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 transition focus-within:border-royal focus-within:ring-4 focus-within:ring-royal/10">
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
    <motion.button whileHover={loading ? undefined : { y: -1 }} whileTap={loading ? undefined : { scale: 0.98 }} disabled={loading} className="btn-shine mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 py-3.5 font-bold text-white shadow-lg shadow-navy/15 transition-colors hover:bg-royal disabled:opacity-70">
      {loading ? <><LoaderCircle size={18} className="animate-spin" /> {loadingText}</> : children}
    </motion.button>
  );
}

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <motion.p role="alert" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0, x: [0, -6, 6, -3, 3, 0] }} transition={{ duration: 0.4 }} className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">
      {message}
    </motion.p>
  );
}
