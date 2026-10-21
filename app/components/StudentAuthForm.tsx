"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Atom, BookOpen, BookOpenText, Clock3, GraduationCap, KeyRound, Mail, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import AuthShell, { Field, FormError, SubmitButton } from "@/app/components/AuthShell";
import { SignedInCard } from "@/app/components/PortalLogin";
import { useSession } from "@/app/components/useSession";
import { GRADES, STREAMS, needsStream, subjectsFor, type Stream } from "@/lib/subjects";
import { useSubjects } from "@/app/components/useSubjects";

type Role = "student" | "teacher";

/** General sign-in (every role is routed to its own dashboard) and student/teacher registration. */
export default function StudentAuthForm({ mode, initialRole = "student" }: { mode: "login" | "signup"; initialRole?: Role }) {
  const SUBJECTS = useSubjects();
  const { user } = useSession();
  const [form, setForm] = useState({ name: "", email: "", password: "", subject: "" });
  const [grade, setGrade] = useState<string>("");
  const [stream, setStream] = useState<"" | Stream>("");
  const [role, setRole] = useState<Role>(initialRole);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [pendingNotice, setPendingNotice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState<Role | null>(null);
  const signup = mode === "signup";


  async function submit(event: FormEvent) {
    event.preventDefault();
    if (signup && role === "student" && !grade) { setError("Choose your grade."); return; }
    if (signup && role === "student" && needsStream(grade) && !stream) { setError("Choose your stream: Natural Science or Social Science."); return; }
    setLoading(true);
    setError("");
    setPendingNotice(false);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signup ? { ...form, role, ...(role === "student" ? { grade, stream: needsStream(grade) ? stream : null } : {}) } : { email: form.email, password: form.password, remember }),
      });
      const data = await response.json().catch(() => ({}));
      setLoading(false);
      if (!response.ok) {
        setError(data.error || "Unable to continue. Please try again.");
        setPendingNotice(data.status === "pending");
        return;
      }
      if (signup) return setSubmitted(role);
      window.location.assign(data.redirect || "/student");
    } catch {
      setError("Network error — check your connection and try again.");
      setLoading(false);
    }
  }

  const update = (key: keyof typeof form, value: string) => setForm({ ...form, [key]: value });

  return (
    <AuthShell
      eyebrow={signup ? "Join እውቀትNET" : "Welcome back"}
      title={signup ? "Start preparing for your national exam today." : "Pick up right where you left off."}
      description="Practise real Grade 9–12 questions, get instant feedback, and learn from clear teacher explanations."
      points={["Natural & Social Science exam subjects", "Step-by-step teacher explanations", "Every account is reviewed and approved for safety"]}
    >
      <AnimatePresence mode="wait">
        {user && !submitted ? (
          <motion.div key="signed-in">
            <h2 className="text-center text-2xl font-extrabold tracking-tight">You&apos;re signed in</h2>
            <p className="mt-1 text-center text-sm text-slate-500">Sign out first to register a different account.</p>
            <SignedInCard user={user} />
          </motion.div>
        ) : submitted ? (
          <PendingApproval key="done" role={submitted} email={form.email} />
        ) : (
          <motion.div key="form" exit={{ opacity: 0, y: -10 }}>
            <h2 className="text-center text-3xl font-extrabold tracking-tight">{signup ? "Create your account" : "Welcome back"}</h2>
            <p className="mt-2 text-center text-sm leading-6 text-slate-500">
              {signup ? "Register as a student or a teacher. A platform administrator approves every new account." : "Students, teachers and administrators can all sign in here."}
            </p>

            <form onSubmit={submit} className="mt-7 grid gap-4">
              {signup && (
                <div>
                  <p className="text-sm font-semibold">I am a</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-1.5" role="radiogroup">
                    {([["student", "Student", GraduationCap], ["teacher", "Teacher", BookOpen]] as const).map(([value, label, Icon]) => (
                      <button key={value} type="button" role="radio" aria-checked={role === value} onClick={() => setRole(value)} className={`relative flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-colors ${role === value ? "text-white" : "text-slate-500 hover:text-navy"}`}>
                        {role === value && <motion.span layoutId="role-pill" className="absolute inset-0 rounded-xl bg-navy" transition={{ type: "spring", stiffness: 350, damping: 30 }} />}
                        <Icon size={16} className="relative" /><span className="relative">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {signup && <Field label="Full name" icon={<UserRound size={17} />} required minLength={2} autoComplete="name" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Abebe Kebede" />}
              <Field label="Email" icon={<Mail size={17} />} required type="email" autoComplete="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="name@example.com" />
              <AnimatePresence initial={false}>
                {signup && role === "student" && (
                  <motion.div key="grade" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <p className="text-sm font-semibold">Your grade</p>
                    <div className="mt-2 grid grid-cols-4 gap-2" role="radiogroup" aria-label="Your grade">
                      {GRADES.map((g) => (
                        <button key={g} type="button" role="radio" aria-checked={grade === g} onClick={() => { setGrade(g); if (!needsStream(g)) setStream(""); }}
                          className={`rounded-xl border-2 py-2.5 text-center transition ${grade === g ? "border-royal bg-blue-50 text-royal" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                          <span className="block text-lg font-extrabold leading-5">{g.split(" ")[1]}</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider">Grade</span>
                        </button>
                      ))}
                    </div>
                    <AnimatePresence initial={false}>
                      {needsStream(grade) && (
                        <motion.div key="stream" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                          <p className="mt-4 text-sm font-semibold">Your stream</p>
                          <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Your stream">
                            {STREAMS.map((st) => (
                              <button key={st.id} type="button" role="radio" aria-checked={stream === st.id} onClick={() => setStream(st.id)}
                                className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left transition ${stream === st.id ? "border-royal bg-blue-50 text-royal" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                                {st.id === "natural" ? <Atom size={18} /> : <BookOpenText size={18} />}
                                <span><span className="block text-sm font-bold">{st.label}</span><span className="font-amharic text-[11px] opacity-70">{st.amharic}</span></span>
                              </button>
                            ))}
                          </div>
                          {stream && <p className="mt-2 text-xs text-slate-500">Subjects: {subjectsFor(stream, SUBJECTS).map((x) => x.name).join(", ")}</p>}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {grade && !needsStream(grade) && <p className="mt-2 text-xs text-slate-500">Grades 9 and 10 practise all subjects — you&apos;ll choose a stream in Grade 11.</p>}
                  </motion.div>
                )}
                {signup && role === "teacher" && (
                  <motion.label initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="block overflow-hidden text-sm font-semibold">
                    Subject you teach <span className="font-normal text-slate-400">— students find you by subject</span>
                    <select required value={form.subject} onChange={(e) => update("subject", e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 font-normal outline-none focus:border-royal focus:ring-4 focus:ring-royal/10">
                      <option value="" disabled>Select a subject</option>
                      {SUBJECTS.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
                    </select>
                  </motion.label>
                )}
              </AnimatePresence>
              <Field label="Password" icon={<KeyRound size={17} />} required minLength={signup ? 8 : undefined} type="password" autoComplete={signup ? "new-password" : "current-password"} value={form.password} onChange={(e) => update("password", e.target.value)} placeholder={signup ? "At least 8 characters" : "Enter your password"} />
              {signup && <PasswordMeter password={form.password} />}
              {!signup && (
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-royal" /> Keep me signed in for 14 days
                </label>
              )}
              {pendingNotice ? (
                <motion.p role="status" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                  <Clock3 size={18} className="mt-0.5 shrink-0" />{error}
                </motion.p>
              ) : <FormError message={error} />}
              <SubmitButton loading={loading} loadingText={signup ? "Submitting..." : "Signing in..."}>
                {signup ? `Register as ${role}` : "Sign in"} <ArrowRight size={17} />
              </SubmitButton>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              {signup ? "Already registered?" : "New to እውቀትNET?"}{" "}
              <Link className="font-bold text-royal hover:underline" href={signup ? (role === "teacher" ? "/admin/login" : "/login") : "/signup"}>{signup ? "Sign in" : "Create an account"}</Link>
            </p>
            {!signup && (
              <p className="mt-3 text-center text-xs text-slate-400">
                Staff portals: <Link href="/admin/login" className="font-semibold hover:text-royal">Teacher</Link> · <Link href="/super-admin/login" className="font-semibold hover:text-royal">Platform admin</Link>
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}

function PendingApproval({ role, email }: { role: Role; email: string }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
      <div className="relative mx-auto grid h-24 w-24 place-items-center">
        <motion.span className="absolute inset-0 rounded-full border-4 border-gold/30 border-t-gold" animate={{ rotate: 360 }} transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }} />
        <span className="grid h-16 w-16 place-items-center rounded-full bg-gold/15 text-gold"><Clock3 size={30} /></span>
      </div>
      <h2 className="mt-6 text-2xl font-extrabold tracking-tight">Registration received!</h2>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">
        Your {role} account for <span className="font-bold text-navy">{email}</span> is now waiting for approval by the platform administrator.
      </p>
      <ol className="mx-auto mt-7 grid max-w-sm gap-3 text-left text-sm">
        {[
          { icon: <ShieldCheck size={16} />, text: "Account submitted", done: true },
          { icon: <Clock3 size={16} />, text: "Administrator reviews your registration", done: false },
          { icon: <ArrowRight size={16} />, text: role === "teacher" ? "Sign in and start publishing questions" : "Sign in and start practising", done: false },
        ].map((step, i) => (
          <motion.li key={step.text} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.12 }} className={`flex items-center gap-3 rounded-xl border p-3 ${step.done ? "border-green-200 bg-green-50 text-green-800" : "border-slate-200 bg-white text-slate-600"}`}>
            <span className={`grid h-7 w-7 place-items-center rounded-full ${step.done ? "bg-green-500 text-white" : "bg-slate-100"}`}>{step.icon}</span>{step.text}
          </motion.li>
        ))}
      </ol>
      <Link href="/" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-navy px-5 py-3 text-sm font-bold text-white hover:bg-royal">Back to home <ArrowRight size={16} /></Link>
    </motion.div>
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
