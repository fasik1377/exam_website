"use client";
import { ArrowRight, KeyRound, Mail, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import AuthShell, { Field, FormError, SubmitButton } from "@/app/components/AuthShell";
import { dashboardFor, useSession } from "@/app/components/useSession";

/** General sign-in (students, teachers and admins — each is routed to their own dashboard) and student sign-up. */
export default function StudentAuthForm({ mode }: { mode: "login" | "signup" }) {
  const { user } = useSession();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const signup = mode === "signup";

  // Already signed in? Send them straight to where they belong.
  useEffect(() => {
    if (user) window.location.replace(dashboardFor(user.role));
  }, [user]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signup ? form : { email: form.email, password: form.password, remember }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Unable to continue. Please try again.");
        setLoading(false);
        return;
      }
      window.location.assign(data.redirect || "/#grades");
    } catch {
      setError("Network error — check your connection and try again.");
      setLoading(false);
    }
  }

  const update = (key: keyof typeof form, value: string) => setForm({ ...form, [key]: value });

  return (
    <AuthShell
      eyebrow={signup ? "Join for free" : "Welcome back"}
      title={signup ? "Start preparing for your national exam today." : "Pick up right where you left off."}
      description="Practise with real Grade 9–12 questions, get instant feedback, and learn from clear teacher explanations."
      points={["Natural & Social Science exam subjects", "Step-by-step teacher explanations", "Your progress saved to your account"]}
    >
      <h2 className="text-3xl font-extrabold tracking-tight">{signup ? "Create your account" : "Sign in"}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        {signup ? "It takes less than a minute. No payment needed to start." : "Students, teachers and administrators can all sign in here."}
      </p>

      <form onSubmit={submit} className="mt-8 grid gap-4">
        {signup && <Field label="Full name" icon={<UserRound size={17} />} required minLength={2} autoComplete="name" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Abebe Kebede" />}
        <Field label="Email" icon={<Mail size={17} />} required type="email" autoComplete="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="name@example.com" />
        <Field label="Password" icon={<KeyRound size={17} />} required minLength={signup ? 8 : undefined} type="password" autoComplete={signup ? "new-password" : "current-password"} value={form.password} onChange={(e) => update("password", e.target.value)} placeholder={signup ? "At least 8 characters" : "Enter your password"} />
        {signup && <PasswordMeter password={form.password} />}
        {!signup && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-royal" /> Keep me signed in for 14 days
          </label>
        )}
        <FormError message={error} />
        <SubmitButton loading={loading} loadingText={signup ? "Creating account..." : "Signing in..."}>
          {signup ? "Create account" : "Sign in"} <ArrowRight size={17} />
        </SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        {signup ? "Already registered?" : "New to እውቀትNET?"}{" "}
        <Link className="font-bold text-royal hover:underline" href={signup ? "/login" : "/signup"}>{signup ? "Sign in" : "Create a free account"}</Link>
      </p>
      {!signup && (
        <p className="mt-3 text-center text-xs text-slate-400">
          Staff portals: <Link href="/admin/login" className="font-semibold hover:text-royal">Teacher</Link> · <Link href="/super-admin/login" className="font-semibold hover:text-royal">Platform admin</Link>
        </p>
      )}
    </AuthShell>
  );
}

function PasswordMeter({ password }: { password: string }) {
  const score = [password.length >= 8, /[A-Z]/.test(password) && /[a-z]/.test(password), /\d/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length;
  const labels = ["Too short", "Weak", "Fair", "Good", "Strong"];
  const colors = ["bg-slate-200", "bg-red-400", "bg-amber-400", "bg-blue-500", "bg-green-500"];
  if (!password) return null;
  return (
    <div className="-mt-1">
      <div className="grid grid-cols-4 gap-1.5">
        {[0, 1, 2, 3].map((i) => <span key={i} className={`h-1.5 rounded-full transition-colors duration-300 ${i < score ? colors[score] : "bg-slate-200"}`} />)}
      </div>
      <p className="mt-1.5 text-xs font-semibold text-slate-500">Password strength: {labels[password.length < 8 ? 0 : score]}</p>
    </div>
  );
}
