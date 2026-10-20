"use client";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Clock3, GraduationCap, KeyRound, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import AuthShell, { Field, FormError, SubmitButton } from "@/app/components/AuthShell";
import { dashboardFor, useSession, type SessionUser } from "@/app/components/useSession";

export type Portal = "student" | "admin" | "super-admin";

const PORTALS: Record<Portal, {
  label: string; tab: string; path: string; home: string; icon: typeof GraduationCap;
  heading: string; intro: string; eyebrow: string; tagline: string; points: string[];
}> = {
  student: {
    label: "Student", tab: "Student", path: "/login", home: "/student", icon: GraduationCap,
    heading: "Student login", intro: "Sign in to continue your exam preparation.",
    eyebrow: "Students", tagline: "Pick up right where you left off.",
    points: ["Timed practice for every subject", "Step-by-step explanations", "Chat with teachers and classmates"],
  },
  admin: {
    label: "Teacher", tab: "Teacher", path: "/admin/login", home: "/admin", icon: BookOpen,
    heading: "Teacher login", intro: "Sign in to manage questions and help your students.",
    eyebrow: "Teachers", tagline: "Manage your question bank and answer students.",
    points: ["Add multiple-choice and true/false questions", "Upload questions from Word or PDF", "Answer students in chat"],
  },
  "super-admin": {
    label: "Platform admin", tab: "Admin", path: "/super-admin/login", home: "/super-admin", icon: ShieldCheck,
    heading: "Platform admin login", intro: "Restricted to the platform owner.",
    eyebrow: "Platform owner access", tagline: "Approve accounts and oversee the platform.",
    points: ["Approve or reject registrations", "Manage teachers and students", "Platform analytics"],
  },
};

/** Where to go after signing in: a safe "next" path inside this portal's area, or its home. */
function destination(portal: Portal) {
  const home = PORTALS[portal].home;
  const next = new URLSearchParams(window.location.search).get("next") || "";
  const area = portal === "student" ? ["/student", "/chat", "/exam"] : portal === "admin" ? ["/admin", "/chat"] : ["/super-admin"];
  return area.some((a) => next.startsWith(a)) && !next.startsWith("//") ? next : home;
}

export default function PortalLogin({ portal }: { portal: Portal }) {
  const config = PORTALS[portal];
  const { user, loading: sessionLoading, reason: sessionReason } = useSession();
  // Why the visitor was signed out: from the proxy redirect (?reason=) or the session check.
  const reason = sessionReason ?? (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("reason") : null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [rightPortal, setRightPortal] = useState<{ label: string; path: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setPending(false);
    setRightPortal(null);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, remember, role: portal }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Login failed");
        setPending(data.status === "pending");
        setRightPortal(data.portal ?? null);
        setLoading(false);
        return;
      }
      window.location.assign(destination(portal));
    } catch {
      setError("Network error — check your connection and try again.");
      setLoading(false);
    }
  }

  const Icon = config.icon;
  return (
    <AuthShell eyebrow={config.eyebrow} title={config.tagline} description="" points={config.points}>
      <PortalTabs current={portal} />

      {sessionLoading ? (
        <div className="mt-10 grid place-items-center py-10"><span className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-royal" /></div>
      ) : user ? (
        <SignedInCard user={user} />
      ) : (
        <>
          <div className="mt-6 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-royal/10 px-3 py-1 text-xs font-bold text-royal"><Icon size={14} /> {config.label} portal</span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight">{config.heading}</h2>
            <p className="mt-1.5 text-sm text-slate-500">{config.intro}</p>
          </div>
          {(reason === "replaced" || reason === "signed-out-everywhere") && (
            <p role="status" className="mt-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
              <ShieldCheck size={18} className="mt-0.5 shrink-0" />
              {reason === "replaced" ? "You were signed out because your account signed in on another device. Only one device can be signed in at a time." : "You signed out of all devices. Sign in again to continue."}
            </p>
          )}
          <form onSubmit={submit} className="mt-6 grid gap-4">
            <Field label="Email" icon={<Mail size={17} />} required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
            <Field label="Password" icon={<KeyRound size={17} />} required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" />
            <div className="flex items-center justify-between gap-3 text-sm">
              <label className="flex items-center gap-2 text-slate-600"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-royal" /> Keep me signed in <span className="text-xs text-slate-400">(14 days)</span></label>
              <Link href={`/forgot-password?portal=${portal}`} className="font-semibold text-royal hover:underline">Forgot password?</Link>
            </div>
            {pending ? (
              <motion.p role="status" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                <Clock3 size={18} className="mt-0.5 shrink-0" />{error}
              </motion.p>
            ) : <FormError message={error} />}
            {rightPortal && (
              <Link href={rightPortal.path} className="inline-flex items-center justify-center gap-2 rounded-xl border border-royal/30 bg-blue-50 px-4 py-2.5 text-sm font-bold text-royal hover:bg-blue-100">
                Go to {rightPortal.label} <ArrowRight size={15} />
              </Link>
            )}
            <SubmitButton loading={loading} loadingText="Signing in...">Sign in <LockKeyhole size={17} /></SubmitButton>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            {portal === "student" && <p>New to እውቀትNET? <Link href="/signup" className="font-bold text-royal hover:underline">Create a student account</Link></p>}
            {portal === "admin" && <p>New teacher? <Link href="/signup?role=teacher" className="font-bold text-royal hover:underline">Register as a teacher</Link></p>}
            {portal === "super-admin" && <p className="text-xs">Platform admin accounts can&apos;t be created here. They are issued by the platform owner.</p>}
            {portal !== "super-admin" && <p className="mt-2 text-xs text-slate-400">New accounts can sign in once a platform administrator approves them.</p>}
          </div>
        </>
      )}
    </AuthShell>
  );
}

/** Switch between the three login pages. */
export function PortalTabs({ current }: { current?: Portal }) {
  return (
    <nav aria-label="Choose your login" className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1 text-xs font-bold">
      {(Object.keys(PORTALS) as Portal[]).map((key) => {
        const p = PORTALS[key];
        const active = key === current;
        return (
          <Link key={key} href={p.path} aria-current={active ? "page" : undefined} className={`relative flex items-center justify-center gap-1.5 rounded-xl py-2 transition-colors ${active ? "text-navy" : "text-slate-500 hover:text-navy"}`}>
            {active && <motion.span layoutId="portal-tab" className="absolute inset-0 rounded-xl bg-white shadow-sm" />}
            <p.icon size={14} className="relative" /><span className="relative">{p.tab}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Shown on login/sign-up pages when a session already exists — never auto-forwards. */
export function SignedInCard({ user }: { user: SessionUser }) {
  const roleLabel = user.role === "super-admin" ? "platform admin" : user.role === "admin" ? "teacher" : "student";
  const [busy, setBusy] = useState(false);
  async function switchAccount() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.reload();
  }
  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
      <p className="text-sm text-slate-600">You&apos;re already signed in as</p>
      <p className="mt-1 font-extrabold">{user.name}</p>
      <p className="text-xs text-slate-500">{user.email} · {roleLabel}</p>
      <div className="mt-4 grid gap-2">
        <Link href={dashboardFor(user.role)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-4 py-3 text-sm font-bold text-white hover:bg-royal">Continue to my dashboard <ArrowRight size={15} /></Link>
        <button type="button" onClick={switchAccount} disabled={busy} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 hover:border-red-200 hover:text-red-700 disabled:opacity-60">
          {busy ? "Signing out..." : "Sign out and use another account"}
        </button>
      </div>
    </div>
  );
}
