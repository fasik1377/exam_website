"use client";
import { AnimatePresence, animate, motion } from "framer-motion";
import {
  AlertTriangle, BookOpen, Check, CheckCircle2, ClipboardCheck, Clock3, GraduationCap, LayoutDashboard, LoaderCircle,
  KeyRound, Library, Mail, MessageCircle, Trash2, RefreshCw, Search, Send, ShieldCheck, Ban, Sparkles, Target, UserPlus, Users, X, type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import Brand from "@/app/components/Brand";
import AccountMenu from "@/app/components/AccountMenu";
import { useSession } from "@/app/components/useSession";
import { streamLabel } from "@/lib/subjects";
import { useSubjects } from "@/app/components/useSubjects";
import SubjectsSection from "./SubjectsSection";
import { AccuracyBars, DailyStacked, Heatmap, Meter, SERIES, STATUS, Sparkline, StackedBar, SubjectBars, TrendChart } from "./charts";

type Status = "pending" | "active" | "restricted" | "banned" | "rejected";
type Account = { id: string; name: string; email: string; role: string; plan: string; status: Status; subject: string | null; createdAt: string; owner?: boolean; grade?: string | null; stream?: "natural" | "social" | null };
type Overview = {
  usersByRoleStatus: { role: string; status: string; count: number }[];
  signups: { date: string; count: number }[];
  attempts: { date: string; count: number }[];
  messages: { date: string; count: number }[];
  questionsPerDay: { date: string; count: number }[];
  signupsByRole: { date: string; students: number; teachers: number }[];
  heatmap: { day: number; hour: number; count: number }[];
  subjectPerformance: { subject: string; total: number; correct: number }[];
  topStudents: { name: string; total: number; correct: number }[];
  approvals: { approved: number; rejected: number; avgHours: number | null };
  chat: { conversations: number; messages: number };
  attemptTotal: number; attemptCorrect: number; questionCount: number;
  questionsBySubject: { subject: string; count: number }[];
  recentQuestions: { id: string; prompt: string; subject: string; teacher: string; createdAt: string }[];
};
type Section = "overview" | "approvals" | "users" | "subjects" | "staff";

const ROLE_LABEL: Record<string, string> = { student: "Student", admin: "Teacher", "super-admin": "Platform admin" };
const STATUS_META: Record<Status, { label: string; color: string; icon: LucideIcon; pill: string }> = {
  active: { label: "Active", color: STATUS.good, icon: CheckCircle2, pill: "bg-green-50 text-green-700" },
  pending: { label: "Pending", color: STATUS.warning, icon: Clock3, pill: "bg-amber-50 text-amber-700" },
  restricted: { label: "Restricted", color: STATUS.serious, icon: AlertTriangle, pill: "bg-orange-50 text-orange-700" },
  banned: { label: "Banned", color: STATUS.critical, icon: Ban, pill: "bg-red-50 text-red-700" },
  rejected: { label: "Rejected", color: STATUS.critical, icon: X, pill: "bg-red-50 text-red-700" },
};

async function fetchJson<T>(url: string): Promise<{ data?: T; error?: string }> {
  const response = await fetch(url, { cache: "no-store" }).catch(() => null);
  if (!response) return { error: "Network error — check your connection." };
  if (response.status === 401 || response.status === 403) { window.location.href = "/super-admin/login"; return {}; }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { error: data.error || "Could not load data." };
  return { data };
}

async function fetchAll() {
  const [users, overview] = await Promise.all([fetchJson<{ users: Account[]; me: string }>("/api/admin/users"), fetchJson<Overview>("/api/admin/overview")]);
  return { users, overview };
}

const timeAgo = (iso: string) => {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const units: [number, string][] = [[86400 * 30, "mo"], [86400, "d"], [3600, "h"], [60, "min"]];
  for (const [size, unit] of units) if (s >= size) return `${Math.floor(s / size)} ${unit} ago`;
  return "just now";
};

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

export default function SuperAdminPage() {
  return <Suspense><SuperAdmin /></Suspense>;
}

const SECTIONS: Section[] = ["overview", "approvals", "users", "subjects", "staff"];

function SuperAdmin() {
  const { user } = useSession();
  const tab = useSearchParams().get("tab") as Section | null;
  const [section, setSection] = useState<Section>(tab && SECTIONS.includes(tab) ? tab : "overview");
  const [users, setUsers] = useState<Account[]>([]);
  const [me, setMe] = useState("");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string[]>([]);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const apply = useCallback((result: Awaited<ReturnType<typeof fetchAll>>) => {
    setRefreshing(false);
    setError(result.users.error || result.overview.error || "");
    if (result.users.data) { setUsers(result.users.data.users); setMe(result.users.data.me); }
    if (result.overview.data) setOverview(result.overview.data);
    setUpdatedAt(new Date());
  }, []);
  const reload = useCallback(() => { setRefreshing(true); return fetchAll().then(apply); }, [apply]);

  useEffect(() => {
    let active = true;
    fetchAll().then((result) => active && apply(result));
    // Keep the dashboard live without a manual refresh.
    const id = window.setInterval(() => fetchAll().then((result) => active && apply(result)), 60000);
    return () => { active = false; window.clearInterval(id); };
  }, [apply]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(id);
  }, [toast]);

  const pending = useMemo(() => users.filter((u) => u.status === "pending"), [users]);

  async function setStatus(ids: string[], status: Status, verb: string) {
    setBusy((b) => [...b, ...ids]);
    const response = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, status }) }).catch(() => null);
    const data = await response?.json().catch(() => ({}));
    setBusy((b) => b.filter((id) => !ids.includes(id)));
    if (!response?.ok) return setToast({ ok: false, text: data?.error || "Could not update the account." });
    setToast({ ok: true, text: `${ids.length === 1 ? "Account" : `${ids.length} accounts`} ${verb}.` });
    reload();
  }

  const [deleting, setDeleting] = useState<Account | null>(null);

  async function setPassword(account: Account) {
    const password = window.prompt(`New password for ${account.name} (at least 8 characters). They will be signed out and must use this password.`);
    if (!password) return;
    const response = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: account.id, password }) }).catch(() => null);
    const data = await response?.json().catch(() => ({}));
    setToast(response?.ok ? { ok: true, text: `Password updated for ${account.name}. Share it with them securely.` } : { ok: false, text: data?.error || "Could not update the password." });
  }

  async function setSubject(id: string, subject: string) {
    const response = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, subject }) }).catch(() => null);
    const data = await response?.json().catch(() => ({}));
    setToast(response?.ok ? { ok: true, text: `Subject set to ${subject}.` } : { ok: false, text: data?.error || "Could not update the subject." });
    reload();
  }

  const nav: { id: Section; label: string; icon: LucideIcon; badge?: number }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "approvals", label: "Approvals", icon: ClipboardCheck, badge: pending.length },
    { id: "users", label: "Users", icon: Users },
    { id: "subjects", label: "Subjects", icon: Library },
    { id: "staff", label: "Add staff", icon: UserPlus },
  ];

  return (
    <div className="min-h-screen bg-[#f3f6fb] text-navy lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col overflow-hidden bg-navy p-5 text-white lg:flex">
        <div className="blob -left-20 -top-20 h-60 w-60 bg-royal/40" />
        <div className="relative"><Brand tone="light" size="sm" subtitle="Platform admin" /></div>
        <nav className="relative mt-10 grid gap-1">
          {nav.map((item) => <NavButton key={item.id} item={item} active={section === item.id} onClick={() => setSection(item.id)} />)}
          <Link href="/admin" className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/60 hover:bg-white/5 hover:text-white"><BookOpen size={18} /> Question bank</Link>
        </nav>
        <div className="relative mt-auto">
          <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-white/40">Signed in</p>
          <AccountMenu tone="light" align="up" />
        </div>
      </aside>

      <div className="min-w-0">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 bg-navy text-white lg:hidden">
          <div className="flex items-center justify-between px-4 py-3"><Brand tone="light" size="sm" /><AccountMenu tone="light" /></div>
          <div className="flex gap-1 overflow-x-auto px-3 pb-3">
            {nav.map((item) => (
              <button key={item.id} onClick={() => setSection(item.id)} className={`relative flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${section === item.id ? "bg-white text-navy" : "text-white/70"}`}>
                <item.icon size={14} />{item.label}{!!item.badge && <span className="rounded-full bg-gold px-1.5 text-[10px] text-navy">{item.badge}</span>}
              </button>
            ))}
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-500">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
            <button onClick={reload} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold shadow-sm hover:border-royal">
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
          {error && <p className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

          <AnimatePresence mode="wait">
            <motion.div key={section} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
              {section === "overview" && <OverviewSection name={user?.name} users={users} overview={overview} pending={pending} busy={busy} onDecide={setStatus} goTo={setSection} updatedAt={updatedAt} />}
              {section === "approvals" && <ApprovalsSection pending={pending} busy={busy} onDecide={setStatus} />}
              {section === "users" && <UsersSection users={users} me={me} busy={busy} onDecide={setStatus} onSubject={setSubject} onPassword={setPassword} onDelete={setDeleting} />}
              {section === "subjects" && <SubjectsSection onToast={(ok, text) => { setToast({ ok, text }); reload(); }} />}
              {section === "staff" && <StaffSection onCreated={(text) => { setToast({ ok: true, text }); reload(); }} onError={(text) => setToast({ ok: false, text })} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {deleting && (
          <DeleteAccountDialog
            account={deleting}
            onClose={() => setDeleting(null)}
            onDeleted={(text) => { setDeleting(null); setToast({ ok: true, text }); reload(); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} className={`fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold shadow-2xl ${toast.ok ? "bg-navy text-white" : "bg-red-600 text-white"}`}>
            {toast.ok ? <CheckCircle2 size={18} className="text-gold" /> : <AlertTriangle size={18} />}{toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavButton({ item, active, onClick }: { item: { label: string; icon: LucideIcon; badge?: number }; active: boolean; onClick: () => void }) {
  const Icon = item.icon;
  return (
    <button onClick={onClick} className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ${active ? "text-navy" : "text-white/70 hover:bg-white/5 hover:text-white"}`}>
      {active && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-xl bg-white" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
      <Icon size={18} className="relative" />
      <span className="relative flex-1">{item.label}</span>
      {!!item.badge && <motion.span key={item.badge} initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="relative rounded-full bg-gold px-2 py-0.5 text-[11px] font-extrabold text-navy">{item.badge}</motion.span>}
    </button>
  );
}

/* ---------------- Overview ---------------- */

type Metric = "signups" | "attempts" | "messages" | "questionsPerDay";
const METRICS: { id: Metric; label: string; title: string }[] = [
  { id: "signups", label: "Registrations", title: "New registrations" },
  { id: "attempts", label: "Answers", title: "Practice answers" },
  { id: "messages", label: "Messages", title: "Chat messages" },
  { id: "questionsPerDay", label: "Questions", title: "Questions published" },
];

function OverviewSection({ name, users, overview, pending, busy, onDecide, goTo, updatedAt }: {
  name?: string; users: Account[]; overview: Overview | null; pending: Account[]; busy: string[];
  onDecide: (ids: string[], status: Status, verb: string) => void; goTo: (s: Section) => void; updatedAt: Date | null;
}) {
  const SUBJECTS = useSubjects();
  const [metric, setMetric] = useState<Metric>("signups");
  const count = (fn: (u: Account) => boolean) => users.filter(fn).length;
  const accuracy = overview && overview.attemptTotal ? (overview.attemptCorrect / overview.attemptTotal) * 100 : 0;
  const subjectRows = SUBJECTS.map((s) => ({ label: s.name, value: overview?.questionsBySubject.find((q) => q.subject === s.name)?.count ?? 0 })).sort((a, b) => b.value - a.value);
  const accuracyRows = (overview?.subjectPerformance ?? []).map((s) => ({ label: s.subject, total: s.total, correct: s.correct })).sort((a, b) => b.total - a.total);
  const series = overview ? overview[metric] : [];
  const seriesTotal = series.reduce((sum, d) => sum + d.count, 0);
  const spark = (rows?: { count: number }[]) => (rows ?? []).map((r) => r.count);
  const sum = (rows?: { count: number }[]) => (rows ?? []).reduce((s, r) => s + r.count, 0);
  const approvals = overview?.approvals;
  const decided = (approvals?.approved ?? 0) + (approvals?.rejected ?? 0);
  const approvalRate = decided ? ((approvals?.approved ?? 0) / decided) * 100 : 0;

  const kpis = [
    { label: "Total accounts", value: users.length, icon: Users, tint: "bg-blue-50 text-royal", spark: spark(overview?.signups), note: `+${sum(overview?.signups)} in 14 days` },
    { label: "Awaiting approval", value: pending.length, icon: Clock3, tint: "bg-amber-50 text-amber-600", highlight: pending.length > 0, note: pending.length ? "Needs your review" : "All reviewed" },
    { label: "Active students", value: count((u) => u.role === "student" && u.status === "active"), icon: GraduationCap, tint: "bg-sky-50 text-sky-600", spark: overview?.signupsByRole.map((d) => d.students), note: "New sign-ups trend" },
    { label: "Active teachers", value: count((u) => u.role === "admin" && u.status === "active"), icon: BookOpen, tint: "bg-orange-50 text-orange-600", spark: overview?.signupsByRole.map((d) => d.teachers), color: SERIES.orange, note: "New sign-ups trend" },
    { label: "Questions published", value: overview?.questionCount ?? 0, icon: Sparkles, tint: "bg-violet-50 text-violet-600", spark: spark(overview?.questionsPerDay), note: `+${sum(overview?.questionsPerDay)} in 14 days` },
    { label: "Practice answers", value: overview?.attemptTotal ?? 0, icon: Target, tint: "bg-emerald-50 text-emerald-600", spark: spark(overview?.attempts), note: `+${sum(overview?.attempts)} in 14 days` },
  ];

  return (
    <div className="mt-5 grid gap-6">
      {/* Welcome banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-[#12306b] to-royal p-6 text-white sm:p-8">
        <div className="bg-grid absolute inset-0" />
        <Orbits />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-gold">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" /></span>
              Live overview{updatedAt && <span className="font-semibold normal-case tracking-normal text-white/60">· updated {updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{greeting()}{name ? `, ${name}` : ""} 👋</h1>
            <p className="mt-3 leading-7 text-white/75">
              {pending.length
                ? <>You have <span className="font-extrabold text-gold">{pending.length} {pending.length === 1 ? "registration" : "registrations"}</span> waiting for approval.</>
                : "Every registration has been reviewed. Nice work!"}
            </p>
            {pending.length > 0 && (
              <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={() => goTo("approvals")} className="btn-shine mt-5 inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-bold text-navy shadow-lg shadow-gold/20">
                <ClipboardCheck size={17} /> Review approvals
              </motion.button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: "Accuracy", value: `${Math.round(accuracy)}%` },
              { label: "Conversations", value: overview?.chat.conversations ?? 0 },
              { label: "Messages", value: overview?.chat.messages ?? 0 },
            ].map((s) => (
              <div key={s.label} className="glass min-w-24 rounded-2xl px-4 py-3">
                <p className="text-2xl font-extrabold tabular-nums">{s.value}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* KPIs with 14-day sparklines */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-6">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={`card-lift relative overflow-hidden rounded-2xl border bg-white p-5 ${kpi.highlight ? "border-gold/60" : "border-slate-200"}`}>
            {kpi.highlight && <span className="absolute right-4 top-4 flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gold" /></span>}
            <div className="flex items-start justify-between gap-2">
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${kpi.tint}`}><kpi.icon size={20} /></span>
              {kpi.spark && kpi.spark.length > 0 && <Sparkline values={kpi.spark} color={kpi.color} />}
            </div>
            <p className="mt-4 text-3xl font-extrabold tabular-nums"><Counter value={kpi.value} /></p>
            <p className="text-sm font-semibold text-slate-600">{kpi.label}</p>
            <p className="mt-0.5 text-xs text-slate-400">{kpi.note}</p>
          </motion.div>
        ))}
      </div>

      <EmailCard />

      {/* Trend + composition */}
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel
          title={METRICS.find((m) => m.id === metric)!.title}
          subtitle={`${seriesTotal} in the last 14 days`}
          action={
            <div className="inline-flex flex-wrap rounded-xl bg-slate-100 p-1 text-xs font-bold">
              {METRICS.map((m) => (
                <button key={m.id} onClick={() => setMetric(m.id)} className={`relative rounded-lg px-3 py-1.5 ${metric === m.id ? "text-navy" : "text-slate-500"}`}>
                  {metric === m.id && <motion.span layoutId="metric-pill" className="absolute inset-0 rounded-lg bg-white shadow-sm" />}
                  <span className="relative">{m.label}</span>
                </button>
              ))}
            </div>
          }
        >
          {overview ? <TrendChart key={metric} data={series} label={METRICS.find((m) => m.id === metric)!.label} /> : <Skeleton h="h-56" />}
        </Panel>

        <Panel title="Who's on the platform" subtitle={`${users.length} accounts in total`}>
          <StackedBar parts={[
            { label: "Students", value: count((u) => u.role === "student"), color: SERIES.blue },
            { label: "Teachers", value: count((u) => u.role === "admin"), color: SERIES.orange },
            { label: "Platform admins", value: count((u) => u.role === "super-admin"), color: SERIES.aqua },
          ]} />
          <p className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-400">Account status</p>
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {(Object.keys(STATUS_META) as Status[]).map((s) => {
              const meta = STATUS_META[s];
              return (
                <li key={s} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                  <meta.icon size={15} style={{ color: meta.color }} />
                  <span className="flex-1 text-slate-600">{meta.label}</span>
                  <span className="font-bold tabular-nums">{count((u) => u.status === s)}</span>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>

      {/* Registrations by role + approval pipeline */}
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Registrations by role" subtitle="Students and teachers who signed up each day">
          {overview ? <DailyStacked data={overview.signupsByRole} keys={[{ key: "students", label: "Students", color: SERIES.blue }, { key: "teachers", label: "Teachers", color: SERIES.orange }]} /> : <Skeleton h="h-52" />}
        </Panel>
        <Panel title="Approval pipeline" subtitle="How registrations are being decided">
          <div className="flex items-end gap-2">
            <span className="text-5xl font-extrabold tabular-nums"><Counter value={Math.round(approvalRate)} /></span>
            <span className="mb-1.5 text-xl font-bold text-slate-400">%</span>
            <span className="mb-2 ml-1 text-sm text-slate-500">approval rate</span>
          </div>
          <div className="mt-4"><Meter value={approvalRate} label="Approval rate" /></div>
          <ul className="mt-5 grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Waiting", value: pending.length, meta: STATUS_META.pending },
              { label: "Approved", value: approvals?.approved ?? 0, meta: STATUS_META.active },
              { label: "Rejected", value: approvals?.rejected ?? 0, meta: STATUS_META.rejected },
            ].map((s) => (
              <li key={s.label} className="rounded-2xl bg-slate-50 p-3">
                <s.meta.icon size={16} className="mx-auto" style={{ color: s.meta.color }} />
                <p className="mt-1 text-xl font-extrabold tabular-nums">{s.value}</p>
                <p className="text-[11px] font-semibold text-slate-500">{s.label}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2.5 text-sm text-slate-600">
            <Clock3 size={15} className="text-royal" />
            {approvals?.avgHours != null ? <>Average time to decide: <b className="text-navy">{formatHours(approvals.avgHours)}</b></> : "No decisions recorded yet"}
          </p>
        </Panel>
      </div>

      {/* Practice habits + top students */}
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="When students practise" subtitle="Answers by weekday and hour · last 4 weeks">
          {overview ? <Heatmap cells={overview.heatmap} /> : <Skeleton h="h-52" />}
        </Panel>
        <Panel title="Top students" subtitle="Most answers submitted">
          {overview?.topStudents.length ? (
            <ol className="grid gap-2.5">
              {overview.topStudents.map((s, i) => {
                const pct = s.total ? Math.round((s.correct / s.total) * 100) : 0;
                return (
                  <motion.li key={s.name + i} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3">
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-extrabold ${i === 0 ? "bg-gold text-navy" : i === 1 ? "bg-slate-200 text-navy" : i === 2 ? "bg-orange-200 text-orange-900" : "bg-slate-100 text-slate-500"}`}>{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{s.name}</span>
                      <span className="text-xs text-slate-500">{s.total} answers · {pct}% correct</span>
                    </span>
                    <span className="h-1.5 w-16 overflow-hidden rounded bg-[#cde2fb]"><span className="block h-full rounded" style={{ width: `${pct}%`, background: SERIES.blue }} /></span>
                  </motion.li>
                );
              })}
            </ol>
          ) : <p className="py-8 text-center text-sm text-slate-500">No practice recorded yet.</p>}
        </Panel>
      </div>

      {/* Learning outcomes + content coverage */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Accuracy by subject" subtitle="Share of correct answers · tick marks 50%">
          {overview ? <AccuracyBars rows={accuracyRows} /> : <Skeleton h="h-52" />}
        </Panel>
        <Panel title="Questions by subject" subtitle="Published question bank coverage">
          {overview ? <SubjectBars rows={subjectRows} /> : <Skeleton h="h-52" />}
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Practice accuracy" subtitle="All answers on the platform">
          <div className="flex items-end gap-2">
            <span className="text-5xl font-extrabold tabular-nums"><Counter value={Math.round(accuracy)} /></span>
            <span className="mb-1.5 text-xl font-bold text-slate-400">%</span>
          </div>
          <div className="mt-4"><Meter value={accuracy} label="Practice accuracy" /></div>
          <p className="mt-3 flex items-center gap-2 text-sm text-slate-500"><Target size={15} className="text-royal" />{overview?.attemptCorrect ?? 0} correct of {overview?.attemptTotal ?? 0} answers</p>
        </Panel>
        <Panel title="Latest questions" subtitle="Most recently published">
          <ul className="grid gap-3">
            {overview?.recentQuestions.length ? overview.recentQuestions.slice(0, 3).map((q) => (
              <li key={q.id} className="rounded-xl border border-slate-100 p-3">
                <p className="line-clamp-2 text-sm font-semibold">{q.prompt}</p>
                <p className="mt-1 text-xs text-slate-500">{q.subject} · {q.teacher} · {timeAgo(q.createdAt)}</p>
              </li>
            )) : <li className="text-sm text-slate-500">No questions yet.</li>}
          </ul>
        </Panel>
        <Panel title="Chat activity" subtitle="Private chats and study-room messages">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-blue-50 p-4"><MessageCircle size={18} className="text-royal" /><p className="mt-2 text-3xl font-extrabold tabular-nums"><Counter value={overview?.chat.conversations ?? 0} /></p><p className="text-xs font-semibold text-slate-500">Private chats</p></div>
            <div className="rounded-2xl bg-amber-50 p-4"><Send size={18} className="text-amber-600" /><p className="mt-2 text-3xl font-extrabold tabular-nums"><Counter value={overview?.chat.messages ?? 0} /></p><p className="text-xs font-semibold text-slate-500">Messages</p></div>
          </div>
          <div className="mt-4">{overview && <Sparkline values={spark(overview.messages)} />}</div>
          <p className="mt-1 text-xs text-slate-400">Messages per day · last 14 days</p>
        </Panel>
      </div>

      <Panel title="Teachers by subject" subtitle="Approved teachers, grouped by the subject they registered with">
        <TeachersBySubject users={users} />
      </Panel>

      {/* Approval preview */}
      <Panel title="Waiting for approval" subtitle={pending.length ? `${pending.length} new ${pending.length === 1 ? "account" : "accounts"}` : "All caught up"} action={pending.length > 3 ? <button onClick={() => goTo("approvals")} className="text-sm font-bold text-royal hover:underline">View all</button> : undefined}>
        {pending.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {pending.slice(0, 3).map((u) => <ApprovalCard key={u.id} user={u} busy={busy.includes(u.id)} onDecide={onDecide} />)}
            </AnimatePresence>
          </div>
        ) : <AllCaughtUp />}
      </Panel>
    </div>
  );
}

const formatHours = (h: number) => (h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : h < 48 ? `${h.toFixed(1)} h` : `${(h / 24).toFixed(1)} days`);

function TeachersBySubject({ users }: { users: Account[] }) {
  const SUBJECTS = useSubjects();
  const teachers = users.filter((u) => u.role === "admin");
  const groups = [...SUBJECTS.map((s) => s.name), "Unassigned"].map((subject) => {
    const list = teachers.filter((t) => (t.subject || "Unassigned") === subject);
    return { subject, active: list.filter((t) => t.status === "active"), pending: list.filter((t) => t.status === "pending").length };
  }).filter((g) => g.subject !== "Unassigned" || g.active.length || g.pending);

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {groups.map((g, i) => (
        <motion.div key={g.subject} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className={`rounded-2xl border p-4 ${g.active.length ? "border-slate-200 bg-white" : "border-dashed border-slate-200 bg-slate-50/60"}`}>
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-bold">{g.subject}</p>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold tabular-nums">{g.active.length}</span>
          </div>
          <div className="mt-3 flex min-h-8 items-center">
            {g.active.length ? (
              <div className="flex -space-x-2">
                {g.active.slice(0, 5).map((t) => (
                  <span key={t.id} title={t.name} className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-orange-500 to-amber-400 text-xs font-extrabold text-white ring-2 ring-white">{t.name.charAt(0).toUpperCase()}</span>
                ))}
                {g.active.length > 5 && <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-200 text-[10px] font-bold ring-2 ring-white">+{g.active.length - 5}</span>}
              </div>
            ) : <p className="text-xs text-slate-400">No teacher yet</p>}
          </div>
          {g.pending > 0 && <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-amber-700"><Clock3 size={12} />{g.pending} waiting for approval</p>}
        </motion.div>
      ))}
    </div>
  );
}

function EmailCard() {
  const [status, setStatus] = useState<{ configured: boolean; to: string; from: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/email", { cache: "no-store" }).then((r) => r.json()).then((d) => active && setStatus(d)).catch(() => undefined);
    return () => { active = false; };
  }, []);

  async function test() {
    setSending(true);
    setResult(null);
    const response = await fetch("/api/admin/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => null);
    const data = await response?.json().catch(() => ({}));
    setSending(false);
    setResult(response?.ok ? { ok: true, text: `Test email sent to ${data.to}. Check the inbox (and spam folder).` } : { ok: false, text: data?.error || "Could not send the test email." });
  }

  return (
    <section className={`flex flex-wrap items-center gap-4 rounded-3xl border p-5 ${status?.configured ? "border-slate-200 bg-white" : "border-amber-300 bg-amber-50"}`}>
      <span className={`grid h-11 w-11 place-items-center rounded-2xl ${status?.configured ? "bg-green-50 text-green-600" : "bg-amber-100 text-amber-700"}`}><Mail size={20} /></span>
      <div className="min-w-0 flex-1">
        <p className="font-bold">Email notifications {status && (status.configured ? <span className="ml-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-700">Configured</span> : <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">Not set up</span>)}</p>
        <p className="text-sm text-slate-600">
          {status?.configured
            ? <>New registrations are emailed to <b>{status.to}</b>.</>
            : <>Add <code className="rounded bg-white px-1">SMTP_PASS</code> (a Gmail App Password) to the environment so registrations are emailed to <b>{status?.to || "you"}</b>.</>}
        </p>
        {result && <p className={`mt-1 text-sm font-semibold ${result.ok ? "text-green-700" : "text-red-700"}`}>{result.text}</p>}
      </div>
      <button onClick={test} disabled={sending} className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-bold text-white hover:bg-royal disabled:opacity-60">
        {sending ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />} Send test email
      </button>
    </section>
  );
}

/* ---------------- Approvals ---------------- */

function ApprovalsSection({ pending, busy, onDecide }: { pending: Account[]; busy: string[]; onDecide: (ids: string[], status: Status, verb: string) => void }) {
  const [filter, setFilter] = useState<"all" | "student" | "admin">("all");
  const list = pending.filter((u) => filter === "all" || u.role === filter);
  const [confirmAll, setConfirmAll] = useState(false);

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-royal">Registration requests</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Approvals</h1>
          <p className="mt-1 text-sm text-slate-500">New students and teachers can sign in only after you approve them.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-white p-1 text-xs font-bold shadow-sm ring-1 ring-slate-200">
            {([["all", "All"], ["student", "Students"], ["admin", "Teachers"]] as const).map(([value, label]) => (
              <button key={value} onClick={() => setFilter(value)} className={`relative rounded-lg px-3 py-1.5 ${filter === value ? "text-white" : "text-slate-500"}`}>
                {filter === value && <motion.span layoutId="approval-filter" className="absolute inset-0 rounded-lg bg-navy" />}
                <span className="relative">{label} ({value === "all" ? pending.length : pending.filter((u) => u.role === value).length})</span>
              </button>
            ))}
          </div>
          {list.length > 1 && (
            confirmAll ? (
              <span className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 text-xs font-bold shadow-sm ring-1 ring-slate-200">
                Approve {list.length}?
                <button onClick={() => { onDecide(list.map((u) => u.id), "active", "approved"); setConfirmAll(false); }} className="rounded-lg bg-green-600 px-2.5 py-1 text-white">Yes</button>
                <button onClick={() => setConfirmAll(false)} className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100">Cancel</button>
              </span>
            ) : (
              <button onClick={() => setConfirmAll(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-green-700"><Check size={15} /> Approve all shown</button>
            )
          )}
        </div>
      </div>
      <div className="mt-6">
        {list.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {list.map((u) => <ApprovalCard key={u.id} user={u} busy={busy.includes(u.id)} onDecide={onDecide} />)}
            </AnimatePresence>
          </div>
        ) : <div className="rounded-3xl border border-slate-200 bg-white p-10"><AllCaughtUp /></div>}
      </div>
    </div>
  );
}

function ApprovalCard({ user, busy, onDecide }: { user: Account; busy: boolean; onDecide: (ids: string[], status: Status, verb: string) => void }) {
  const teacher = user.role === "admin";
  return (
    <motion.article layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className={`absolute inset-x-0 top-0 h-1 ${teacher ? "bg-gradient-to-r from-orange-400 to-gold" : "bg-gradient-to-r from-royal to-sky-400"}`} />
      <div className="flex items-start gap-3">
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-lg font-extrabold text-white ${teacher ? "bg-gradient-to-br from-orange-500 to-amber-400" : "bg-gradient-to-br from-royal to-sky-500"}`}>{user.name.charAt(0).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{user.name}</p>
          <p className="truncate text-xs text-slate-500">{user.email}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${teacher ? "bg-orange-50 text-orange-700" : "bg-blue-50 text-royal"}`}>
              {teacher ? <BookOpen size={12} /> : <GraduationCap size={12} />}{teacher ? "Teacher" : "Student"}
            </span>
            {user.subject && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">{user.subject}</span>}
            {user.grade && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">{user.grade}{user.stream ? ` · ${streamLabel(user.stream)}` : ""}</span>}
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700"><Clock3 size={12} />{timeAgo(user.createdAt)}</span>
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button disabled={busy} onClick={() => onDecide([user.id], "active", "approved")} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-green-600 py-2.5 text-sm font-bold text-white transition hover:bg-green-700 disabled:opacity-60">
          {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />} Approve
        </button>
        <button disabled={busy} onClick={() => onDecide([user.id], "rejected", "rejected")} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-60">
          <X size={16} /> Reject
        </button>
      </div>
    </motion.article>
  );
}

function AllCaughtUp() {
  return (
    <div className="py-6 text-center">
      <motion.div initial={{ scale: 0.6, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200 }} className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green-50 text-green-600"><CheckCircle2 size={32} /></motion.div>
      <p className="mt-4 font-bold">All caught up!</p>
      <p className="mt-1 text-sm text-slate-500">New registrations will appear here for your approval.</p>
    </div>
  );
}

/* ---------------- Users ---------------- */

function UsersSection({ users, me, busy, onDecide, onSubject, onPassword, onDelete }: { users: Account[]; me: string; busy: string[]; onDecide: (ids: string[], status: Status, verb: string) => void; onSubject: (id: string, subject: string) => void; onPassword: (user: Account) => void; onDelete: (user: Account) => void }) {
  const SUBJECTS = useSubjects();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState<"all" | Status>("all");
  const filtered = users.filter((u) => (role === "all" || u.role === role) && (status === "all" || u.status === status) && (u.name + u.email + (u.subject ?? "")).toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="mt-5">
      <p className="text-xs font-bold uppercase tracking-[.16em] text-royal">Directory</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Users</h1>

      <div className="mt-5 flex flex-wrap gap-2">
        {(["all", ...Object.keys(STATUS_META)] as ("all" | Status)[]).map((s) => {
          const Icon = s === "all" ? null : STATUS_META[s].icon;
          return (
            <button key={s} onClick={() => setStatus(s)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition ${status === s ? "bg-navy text-white ring-navy" : "bg-white text-slate-600 ring-slate-200 hover:ring-royal"}`}>
              {Icon && s !== "all" && <Icon size={13} style={{ color: status === s ? undefined : STATUS_META[s].color }} />}
              {s === "all" ? "All" : STATUS_META[s].label} <span className="opacity-60">{s === "all" ? users.length : users.filter((u) => u.status === s).length}</span>
            </button>
          );
        })}
      </div>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap gap-2">
          <label className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm focus-within:border-royal">
            <Search size={16} className="text-slate-400" />
            <input placeholder="Search by name, email or subject" value={query} onChange={(e) => setQuery(e.target.value)} className="w-full min-w-40 outline-none" />
          </label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
            <option value="all">All roles</option><option value="student">Students</option><option value="admin">Teachers</option><option value="super-admin">Platform admins</option>
          </select>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
              <tr><th className="pb-3">User</th><th className="pb-3">Role</th><th className="pb-3">Joined</th><th className="pb-3">Status</th><th className="pb-3 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const meta = STATUS_META[u.status] ?? STATUS_META.active;
                const isMe = u.id === me;
                return (
                  <tr key={u.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50/70">
                    <td className="py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-navy text-xs font-bold text-white">{u.name.charAt(0).toUpperCase()}</span>
                        <div className="min-w-0"><p className="font-bold">{u.name}{isMe && <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-royal">YOU</span>}{u.owner && !isMe && <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">OWNER</span>}</p><p className="text-xs text-slate-500">{u.email}</p></div>
                      </div>
                    </td>
                    <td>
                      {ROLE_LABEL[u.role] ?? u.role}
                      {u.role === "admin" ? (
                        <select value={u.subject ?? ""} onChange={(e) => onSubject(u.id, e.target.value)} className={`mt-1 block rounded-lg border px-2 py-1 text-xs ${u.subject ? "border-slate-200 text-slate-600" : "border-amber-300 bg-amber-50 text-amber-800"}`}>
                          <option value="" disabled>Assign subject…</option>
                          {SUBJECTS.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
                        </select>
                      ) : u.subject ? <span className="block text-xs text-slate-500">{u.subject}</span> : u.grade ? <span className="block text-xs text-slate-500">{u.grade}{u.stream ? ` · ${streamLabel(u.stream)}` : ""}</span> : u.role === "student" ? <span className="block text-xs text-amber-700">Grade not set</span> : null}
                    </td>
                    <td className="text-slate-500">{u.createdAt ? timeAgo(u.createdAt) : "—"}</td>
                    <td><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${meta.pill}`}><meta.icon size={12} />{meta.label}</span></td>
                    <td className="text-right">
                      {isMe ? <span className="text-xs text-slate-400">—</span> : u.status === "pending" ? (
                        <div className="inline-flex gap-1.5">
                          <button disabled={busy.includes(u.id)} onClick={() => onDecide([u.id], "active", "approved")} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-60">Approve</button>
                          <button disabled={busy.includes(u.id)} onClick={() => onDecide([u.id], "rejected", "rejected")} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-60">Reject</button>
                          {!u.owner && <button title="Delete account" disabled={busy.includes(u.id)} onClick={() => onDelete(u)} className="rounded-lg border border-red-200 p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-60"><Trash2 size={14} /></button>}
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5">
                          <button title="Set a new password" onClick={() => onPassword(u)} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:border-royal hover:text-royal"><KeyRound size={14} /></button>
                          <select disabled={busy.includes(u.id)} value={u.status} onChange={(e) => onDecide([u.id], e.target.value as Status, "updated")} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold disabled:opacity-60">
                            <option value="active">Active</option><option value="restricted">Restricted</option><option value="banned">Banned</option>
                            {u.status === "rejected" && <option value="rejected">Rejected</option>}
                          </select>
                          {!u.owner && <button title="Delete account" disabled={busy.includes(u.id)} onClick={() => onDelete(u)} className="rounded-lg border border-red-200 p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-60"><Trash2 size={14} /></button>}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filtered.length && <p className="py-10 text-center text-sm text-slate-500">No matching accounts.</p>}
        </div>
      </section>
    </div>
  );
}

/** Confirmation for permanently deleting an account: shows what goes with it and requires typing DELETE. */
function DeleteAccountDialog({ account, onClose, onDeleted }: { account: Account; onClose: () => void; onDeleted: (text: string) => void }) {
  const [preview, setPreview] = useState<{ questions: number; attempts: number; messages: number; privateChats: number } | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [withQuestions, setWithQuestions] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/admin/users?id=${account.id}&preview=1`, { method: "DELETE" })
      .then((r) => r.json())
      .then((d) => { if (!active) return; if (d.preview) setPreview(d.preview); else setError(d.error || "Could not load account details."); })
      .catch(() => active && setError("Network error."));
    return () => { active = false; };
  }, [account.id]);

  async function remove() {
    setWorking(true);
    setError("");
    const response = await fetch(`/api/admin/users?id=${account.id}${withQuestions ? "&deleteQuestions=1" : ""}`, { method: "DELETE" }).catch(() => null);
    const data = await response?.json().catch(() => ({}));
    setWorking(false);
    if (!response?.ok) return setError(data?.error || "Could not delete the account.");
    onDeleted(`${account.name}'s account was deleted.`);
  }

  const items = preview ? [
    { label: "Private chats", value: preview.privateChats },
    { label: "Chat messages", value: preview.messages },
    { label: "Practice answers", value: preview.attempts },
  ] : [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-navy/50 p-4 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && !working && onClose()}>
      <motion.div role="alertdialog" aria-modal="true" aria-labelledby="delete-title" initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-50 text-red-600"><Trash2 size={20} /></span>
          <div className="min-w-0">
            <h2 id="delete-title" className="text-xl font-extrabold">Delete this account?</h2>
            <p className="mt-0.5 text-sm text-slate-500">This permanently removes the account and can&apos;t be undone.</p>
          </div>
        </div>
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="font-bold">{account.name}</p>
          <p className="text-sm text-slate-500">{account.email} · {ROLE_LABEL[account.role] ?? account.role}{account.subject ? ` · ${account.subject}` : ""}</p>
        </div>
        {!preview && !error && <div className="mt-4 h-20 animate-pulse rounded-2xl bg-slate-100" />}
        {preview && (
          <>
            <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-400">Also deleted</p>
            <ul className="mt-2 grid grid-cols-3 gap-2 text-center">
              {items.map((i) => <li key={i.label} className="rounded-xl bg-red-50/60 p-2"><p className="text-lg font-extrabold tabular-nums text-red-700">{i.value}</p><p className="text-[11px] font-semibold text-slate-500">{i.label}</p></li>)}
            </ul>
            {preview.questions > 0 && (
              <label className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
                <input type="checkbox" checked={withQuestions} onChange={(e) => setWithQuestions(e.target.checked)} className="mt-0.5 h-4 w-4 accent-red-600" />
                <span><b>Also delete their {preview.questions} published question{preview.questions === 1 ? "" : "s"}</b><span className="block text-xs text-amber-800">Leave unticked to keep the questions available to students.</span></span>
              </label>
            )}
          </>
        )}
        <label className="mt-4 block text-sm font-semibold">
          Type <span className="rounded bg-slate-100 px-1.5 font-mono text-red-600">DELETE</span> to confirm
          <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoFocus className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-mono outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100" />
        </label>
        {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button onClick={onClose} disabled={working} className="rounded-xl border border-slate-200 py-3 text-sm font-bold hover:bg-slate-50 disabled:opacity-60">Cancel</button>
          <button onClick={remove} disabled={working || confirmText !== "DELETE" || !preview} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-40">
            {working ? <LoaderCircle size={16} className="animate-spin" /> : <Trash2 size={16} />} Delete account
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---------------- Staff ---------------- */

function StaffSection({ onCreated, onError }: { onCreated: (text: string) => void; onError: (text: string) => void }) {
  const SUBJECTS = useSubjects();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "admin", subject: "" });
  const [loading, setLoading] = useState(false);

  async function create(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    const response = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }).catch(() => null);
    const data = await response?.json().catch(() => ({}));
    setLoading(false);
    if (!response?.ok) return onError(data?.error || "Could not create the account.");
    onCreated(`${ROLE_LABEL[form.role]} account created for ${form.email}.`);
    setForm({ name: "", email: "", password: "", role: form.role, subject: "" });
  }

  return (
    <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div className="relative overflow-hidden rounded-3xl bg-navy p-8 text-white">
        <Orbits />
        <div className="relative">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold text-navy"><ShieldCheck size={24} /></span>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight">Add a staff account</h1>
          <p className="mt-3 leading-7 text-white/70">Accounts you create here are approved automatically. Share the temporary password with the person securely — they can sign in right away.</p>
          <ul className="mt-6 grid gap-2 text-sm text-white/80">
            <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-gold" />Teachers publish questions and explanations</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-gold" />Platform admins approve users and manage access</li>
          </ul>
        </div>
      </div>
      <form onSubmit={create} className="grid content-start gap-4 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5">
          {([["admin", "Teacher", BookOpen], ["super-admin", "Platform admin", ShieldCheck]] as const).map(([value, label, Icon]) => (
            <button key={value} type="button" onClick={() => setForm({ ...form, role: value })} className={`relative flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold ${form.role === value ? "text-navy" : "text-slate-500"}`}>
              {form.role === value && <motion.span layoutId="staff-role" className="absolute inset-0 rounded-xl bg-white shadow-sm" />}
              <Icon size={16} className="relative" /><span className="relative">{label}</span>
            </button>
          ))}
        </div>
        <Input label="Full name" required minLength={2} value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Input label="Email" type="email" required value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        {form.role === "admin" && (
          <label className="text-sm font-semibold">
            Subject
            <select required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-3 font-normal outline-none focus:border-royal">
              <option value="" disabled>Select the subject they teach</option>
              {SUBJECTS.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </label>
        )}
        <Input label="Temporary password (8+ characters)" type="password" required minLength={8} value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
        <button disabled={loading} className="btn-shine mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-5 py-3.5 font-bold text-white hover:bg-royal disabled:opacity-60">
          {loading ? <LoaderCircle size={18} className="animate-spin" /> : <UserPlus size={18} />} Create account
        </button>
      </form>
    </div>
  );
}

function Input({ label, onChange, ...props }: { label: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange">) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <input {...props} onChange={(e) => onChange(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-3 font-normal outline-none focus:border-royal focus:ring-4 focus:ring-royal/10" />
    </label>
  );
}

/* ---------------- Shared bits ---------------- */

function Panel({ title, subtitle, action, className = "", children }: { title: string; subtitle?: string; action?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={`rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 ${className}`}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="font-bold">{title}</h2>{subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}</div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Skeleton({ h }: { h: string }) {
  return <div className={`${h} animate-pulse rounded-2xl bg-slate-100`} />;
}

function Counter({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const controls = animate(0, value, { duration: 1, ease: "easeOut", onUpdate: (v) => setShown(Math.round(v)) });
    return () => controls.stop();
  }, [value]);
  return <>{shown}</>;
}

/** Decorative rotating orbit rings, echoing the home page hero. */
function Orbits() {
  return (
    <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 opacity-60 sm:-right-10" aria-hidden>
      {[100, 72, 46].map((size, i) => (
        <div key={size} className="absolute left-1/2 top-1/2 rounded-full border border-white/15" style={{ width: `${size}%`, height: `${size}%`, transform: "translate(-50%, -50%)" }}>
          <div className="absolute inset-0" style={{ animation: `spin-slow ${14 + i * 8}s linear infinite` }}>
            <span className={`absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ${i === 0 ? "bg-gold" : i === 1 ? "bg-sky-300" : "bg-white"}`} />
          </div>
        </div>
      ))}
      <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/80 shadow-[0_0_40px_10px_rgba(244,183,64,.35)]" />
    </div>
  );
}
