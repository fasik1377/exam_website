"use client";
import { motion } from "framer-motion";
import { ArrowLeft, MailCheck, Mail, Send } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import AuthShell, { Field, FormError, SubmitButton } from "@/app/components/AuthShell";

const LOGIN: Record<string, string> = { student: "/login", admin: "/admin/login", "super-admin": "/super-admin/login" };

function ForgotPassword() {
  const back = LOGIN[useSearchParams().get("portal") ?? ""] ?? "/login";
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/forgot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }).catch(() => null);
    const data = await response?.json().catch(() => ({}));
    setLoading(false);
    if (!response?.ok) return setError(data?.error || "Something went wrong. Please try again.");
    setSent(data.message);
  }

  return (
    <AuthShell eyebrow="Account recovery" title="We'll email you a secure link." description="" points={["Link works for 1 hour", "You'll be signed out everywhere after resetting"]}>
      {sent ? (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green-50 text-green-600"><MailCheck size={30} /></span>
          <h2 className="mt-4 text-2xl font-extrabold">Check your email</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">{sent}</p>
          <p className="mt-3 text-xs text-slate-400">No email? Check your spam folder, or ask the platform administrator to set a new password for you.</p>
          <Link href={back} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-navy px-5 py-3 text-sm font-bold text-white hover:bg-royal"><ArrowLeft size={16} /> Back to login</Link>
        </motion.div>
      ) : (
        <>
          <h2 className="text-center text-3xl font-extrabold tracking-tight">Forgot password?</h2>
          <p className="mt-1.5 text-center text-sm text-slate-500">Enter the email you registered with.</p>
          <form onSubmit={submit} className="mt-6 grid gap-4">
            <Field label="Email" icon={<Mail size={17} />} required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
            <FormError message={error} />
            <SubmitButton loading={loading} loadingText="Sending...">Send reset link <Send size={16} /></SubmitButton>
          </form>
          <p className="mt-6 text-center text-sm"><Link href={back} className="font-bold text-royal hover:underline">Back to login</Link></p>
        </>
      )}
    </AuthShell>
  );
}

export default function ForgotPasswordPage() {
  return <Suspense><ForgotPassword /></Suspense>;
}
