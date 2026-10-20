"use client";
import { motion } from "framer-motion";
import { CheckCircle2, KeyRound } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import AuthShell, { Field, FormError, SubmitButton } from "@/app/components/AuthShell";
import { PortalTabs } from "@/app/components/PortalLogin";

function ResetPassword() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) return setError("The two passwords don't match.");
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) }).catch(() => null);
    const data = await response?.json().catch(() => ({}));
    setLoading(false);
    if (!response?.ok) return setError(data?.error || "Could not reset the password.");
    setDone(true);
  }

  return (
    <AuthShell eyebrow="Account recovery" title="Choose a new password." description="" points={["At least 8 characters", "Mix letters, numbers and symbols"]}>
      {done ? (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green-50 text-green-600"><CheckCircle2 size={30} /></span>
          <h2 className="mt-4 text-2xl font-extrabold">Password updated</h2>
          <p className="mt-2 text-sm text-slate-500">Sign in with your new password on your login page.</p>
          <div className="mt-6"><PortalTabs /></div>
        </motion.div>
      ) : !token ? (
        <div className="text-center">
          <h2 className="text-2xl font-extrabold">Invalid link</h2>
          <p className="mt-2 text-sm text-slate-500">This reset link is incomplete. Request a new one.</p>
          <Link href="/forgot-password" className="mt-5 inline-block rounded-xl bg-navy px-5 py-3 text-sm font-bold text-white">Request a new link</Link>
        </div>
      ) : (
        <>
          <h2 className="text-center text-3xl font-extrabold tracking-tight">New password</h2>
          <form onSubmit={submit} className="mt-6 grid gap-4">
            <Field label="New password" icon={<KeyRound size={17} />} required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
            <Field label="Confirm password" icon={<KeyRound size={17} />} required minLength={8} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Type it again" />
            <FormError message={error} />
            <SubmitButton loading={loading} loadingText="Saving...">Save new password</SubmitButton>
          </form>
          <p className="mt-6 text-center text-sm"><Link href="/forgot-password" className="font-bold text-royal hover:underline">Request a new link</Link></p>
        </>
      )}
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><ResetPassword /></Suspense>;
}
