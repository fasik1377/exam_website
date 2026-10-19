"use client";
import { KeyRound, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import AuthShell, { Field, FormError, SubmitButton } from "@/app/components/AuthShell";
import { useSession } from "@/app/components/useSession";

type Props = { role: "Admin" | "Super Admin"; eyebrow: string; title: string; description: string; accent?: "teal" | "sky"; permissions: string[] };

export default function RoleLogin({ role, eyebrow, title, description, permissions }: Props) {
  const { user } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const roleValue = role === "Admin" ? "admin" : "super-admin";
  const home = role === "Admin" ? "/admin" : "/super-admin";

  // Skip the form if the current session can already use this portal.
  useEffect(() => {
    if (!user) return;
    if (user.role === "super-admin" || (role === "Admin" && user.role === "admin")) window.location.replace(home);
  }, [user, role, home]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, remember, role: roleValue }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }
      window.location.assign(home);
    } catch {
      setError("Network error — check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <AuthShell eyebrow={eyebrow} title={title} description={description} points={permissions.slice(0, 4)}>
      <span className="inline-flex items-center gap-2 rounded-full bg-royal/10 px-3 py-1 text-xs font-bold text-royal"><ShieldCheck size={14} /> Secure staff access</span>
      <h2 className="mt-4 text-3xl font-extrabold tracking-tight">{role === "Admin" ? "Teacher" : "Platform admin"} login</h2>
      <p className="mt-2 text-sm text-slate-500">Use the credentials provided by your platform administrator.</p>
      <form onSubmit={submit} className="mt-8 grid gap-4">
        <Field label="Email" icon={<Mail size={17} />} required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
        <Field label="Password" icon={<KeyRound size={17} />} required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" />
        <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-royal" /> Remember me for 14 days</label>
        <FormError message={error} />
        <SubmitButton loading={loading} loadingText="Signing in...">Continue to dashboard <LockKeyhole size={17} /></SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">Are you a student? <Link href="/login" className="font-bold text-royal hover:underline">Student sign in</Link></p>
    </AuthShell>
  );
}
