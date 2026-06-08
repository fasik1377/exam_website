"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

type RoleLoginProps = {
  role: "Admin" | "Super Admin";
  eyebrow: string;
  title: string;
  description: string;
  accent: "teal" | "sky";
  permissions: string[];
};

const accentStyles = {
  teal: {
    button: "bg-teal-600 hover:bg-teal-700",
    icon: "bg-teal-50 text-teal-700",
    ring: "ring-teal-100",
    text: "text-teal-700",
  },
  sky: {
    button: "bg-sky-600 hover:bg-sky-700",
    icon: "bg-sky-50 text-sky-700",
    ring: "ring-sky-100",
    text: "text-sky-700",
  },
};

export default function RoleLogin({
  role,
  eyebrow,
  title,
  description,
  accent,
  permissions,
}: RoleLoginProps) {
  const styles = accentStyles[accent];

  return (
    <main className="min-h-screen bg-[#f7fbff] text-slate-900">
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ y: [0, -18, 0], rotate: [0, 2, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-8 top-24 h-40 w-40 rounded-full bg-sky-100/70 blur-2xl"
        />
        <motion.div
          animate={{ y: [0, 22, 0], rotate: [0, -3, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-20 right-10 h-48 w-48 rounded-full bg-teal-100/80 blur-2xl"
        />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-5 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-sky-700"
          >
            <ArrowLeft size={17} />
            Back to home
          </Link>

          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
            <ShieldCheck size={16} className={styles.text} />
            {eyebrow}
          </div>

          <h1 className="mt-5 max-w-xl text-3xl font-semibold leading-tight tracking-tight text-slate-950 md:text-4xl">
            {title}
          </h1>
          <p className="mt-5 max-w-xl leading-8 text-slate-600">
            {description}
          </p>

          <div className="mt-8 grid gap-3">
            {permissions.map((permission) => (
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
                key={permission}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <CheckCircle2 className={styles.text} size={20} />
                <span className="text-sm font-medium text-slate-700">
                  {permission}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-sky-100/70 ring-8 ${styles.ring} sm:p-8`}
        >
          <div className="flex items-center gap-3">
            <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${styles.icon}`}>
              {role === "Admin" ? <GraduationCap size={24} /> : <LockKeyhole size={23} />}
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-500">
                Secure portal
              </p>
              <h2 className="text-xl font-semibold text-slate-950">
                {role} Login
              </h2>
            </div>
          </div>

          <form className="mt-8 space-y-5">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Email address
              </span>
              <span className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-[#f8fbff] px-4 py-3 focus-within:border-sky-300">
                <Mail size={18} className="text-slate-400" />
                <input
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                  type="email"
                  placeholder={
                    role === "Admin"
                      ? "teacher@example.com"
                      : "superadmin@example.com"
                  }
                />
              </span>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Password
              </span>
              <span className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-[#f8fbff] px-4 py-3 focus-within:border-sky-300">
                <KeyRound size={18} className="text-slate-400" />
                <input
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                  type="password"
                  placeholder="Enter your password"
                />
              </span>
            </label>

            <div className="flex items-center justify-between gap-4 text-sm">
              <label className="flex items-center gap-2 font-medium text-slate-600">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-sky-600"
                />
                Remember me
              </label>
              <a href="#" className={`font-semibold ${styles.text}`}>
                Forgot password?
              </a>
            </div>

            <button
              type="button"
              className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition ${styles.button}`}
            >
              Continue to Dashboard
              <LockKeyhole size={17} />
            </button>
          </form>

          <div className="mt-6 rounded-xl border border-slate-200 bg-[#f8fbff] p-4">
            <div className="flex gap-3">
              <BookOpen className={styles.text} size={20} />
              <p className="text-sm leading-6 text-slate-600">
                Login validation and dashboard navigation are ready for backend
                connection when authentication is added.
              </p>
            </div>
          </div>
        </motion.section>
      </div>
    </main>
  );
}
