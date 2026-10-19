"use client";
import { motion } from "framer-motion";
import { BookOpen, GraduationCap, LoaderCircle, RefreshCw, Search, ShieldCheck, UserCheck, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Brand from "@/app/components/Brand";
import LogoutButton from "@/app/components/LogoutButton";

type Account = { id: string; name: string; email: string; role: string; plan: string; status: "active" | "restricted" | "banned" };

const ROLE_LABEL: Record<string, string> = { student: "Student", admin: "Teacher", "super-admin": "Platform admin" };
const STATUS_STYLE: Record<Account["status"], string> = { active: "bg-green-50 text-green-700", restricted: "bg-amber-50 text-amber-700", banned: "bg-red-50 text-red-700" };

type Directory = { users?: Account[]; me?: string; error?: string };

async function fetchDirectory(): Promise<Directory> {
  const response = await fetch("/api/admin/users", { cache: "no-store" }).catch(() => null);
  if (!response) return { error: "Network error — could not load accounts." };
  if (response.status === 401 || response.status === 403) { window.location.href = "/super-admin/login"; return {}; }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { error: data.error || "Could not load accounts." };
  return { users: data.users, me: data.me };
}

export default function SuperAdmin() {
  const [users, setUsers] = useState<Account[]>([]);
  const [me, setMe] = useState("");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "admin" });
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const apply = useCallback((result: Directory) => {
    setRefreshing(false);
    if (result.error) setMessage({ ok: false, text: result.error });
    if (result.users) { setUsers(result.users); setMe(result.me ?? ""); }
  }, []);
  const load = useCallback(() => { setRefreshing(true); return fetchDirectory().then(apply); }, [apply]);

  useEffect(() => {
    let active = true;
    fetchDirectory().then((result) => active && apply(result));
    return () => { active = false; };
  }, [apply]);

  const filtered = useMemo(
    () => users.filter((u) => (roleFilter === "all" || u.role === roleFilter) && (u.name + u.email + u.role).toLowerCase().includes(query.toLowerCase())),
    [users, query, roleFilter],
  );
  const stats = [
    { value: users.length, label: "Total accounts", icon: Users, color: "bg-blue-50 text-royal" },
    { value: users.filter((u) => u.role === "admin").length, label: "Teachers", icon: BookOpen, color: "bg-violet-50 text-violet-600" },
    { value: users.filter((u) => u.role === "student").length, label: "Students", icon: GraduationCap, color: "bg-amber-50 text-amber-600" },
    { value: users.filter((u) => u.status === "active").length, label: "Active accounts", icon: UserCheck, color: "bg-green-50 text-green-600" },
  ];

  async function create(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    const response = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }).catch(() => null);
    const data = await response?.json().catch(() => ({}));
    setLoading(false);
    if (!response?.ok) return setMessage({ ok: false, text: data?.error || "Could not create the account." });
    setMessage({ ok: true, text: `${ROLE_LABEL[form.role]} account created for ${form.email}. Share the password with them securely.` });
    setForm({ name: "", email: "", password: "", role: form.role });
    load();
  }

  async function update(id: string, status: Account["status"]) {
    setUsers((list) => list.map((u) => (u.id === id ? { ...u, status } : u)));
    const response = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) }).catch(() => null);
    if (!response?.ok) {
      const data = await response?.json().catch(() => ({}));
      setMessage({ ok: false, text: data?.error || "Could not update the account." });
    }
    load();
  }

  return (
    <main className="min-h-screen bg-[#f7f9fc] text-navy">
      <header className="sticky top-0 z-30 bg-navy text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3">
          <Brand tone="light" size="sm" subtitle="Platform administration" />
          <div className="flex items-center gap-2">
            <Link href="/admin" className="hidden items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-white/80 hover:bg-white/10 sm:inline-flex"><BookOpen size={16} /> Question bank</Link>
            <LogoutButton tone="light" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-9">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[.16em] text-royal"><ShieldCheck size={14} /> Platform oversight</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Administration center</h1>
          </div>
          <button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold hover:border-royal">
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /> Refresh
          </button>
        </motion.div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(({ value, label, icon: Icon, color }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.06 }} className="card-lift rounded-2xl border border-slate-200 bg-white p-5">
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${color}`}><Icon size={20} /></span>
              <p className="mt-4 text-3xl font-extrabold">{value}</p>
              <p className="text-sm text-slate-500">{label}</p>
            </motion.div>
          ))}
        </div>

        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2"><UserPlus size={20} className="text-royal" /><h2 className="font-bold">Add staff account</h2></div>
          <p className="mt-1 text-sm text-slate-500">Create credentials for a teacher or another platform administrator.</p>
          <form onSubmit={create} className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_.8fr_auto]">
            <input required minLength={2} placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl border border-slate-200 p-3 outline-none focus:border-royal" />
            <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-xl border border-slate-200 p-3 outline-none focus:border-royal" />
            <input required minLength={8} type="password" placeholder="Temporary password (8+)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="rounded-xl border border-slate-200 p-3 outline-none focus:border-royal" />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="rounded-xl border border-slate-200 p-3">
              <option value="admin">Teacher</option>
              <option value="super-admin">Platform admin</option>
            </select>
            <button disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-5 py-3 font-bold text-white hover:bg-royal disabled:opacity-60">
              {loading ? <LoaderCircle size={18} className="animate-spin" /> : <UserPlus size={18} />} Create
            </button>
          </form>
          {message && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`mt-4 rounded-xl p-3 text-sm font-semibold ${message.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>{message.text}</motion.p>}
        </section>

        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2"><Users size={20} className="text-royal" /><h2 className="font-bold">User directory</h2></div>
            <div className="flex flex-wrap gap-2">
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <option value="all">All roles</option>
                <option value="student">Students</option>
                <option value="admin">Teachers</option>
                <option value="super-admin">Platform admins</option>
              </select>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm focus-within:border-royal">
                <Search size={16} className="text-slate-400" />
                <input placeholder="Search users" value={query} onChange={(e) => setQuery(e.target.value)} className="w-44 outline-none" />
              </label>
            </div>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <tr><th className="pb-3">User</th><th className="pb-3">Role</th><th className="pb-3">Plan</th><th className="pb-3">Status</th><th className="pb-3">Access</th></tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50/70">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-navy text-xs font-bold text-white">{u.name.charAt(0).toUpperCase()}</span>
                        <div><p className="font-bold">{u.name}{u.id === me && <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-royal">YOU</span>}</p><p className="text-xs text-slate-500">{u.email}</p></div>
                      </div>
                    </td>
                    <td>{ROLE_LABEL[u.role] ?? u.role}</td>
                    <td className="capitalize">{u.plan}</td>
                    <td><span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${STATUS_STYLE[u.status]}`}>{u.status}</span></td>
                    <td>
                      <select disabled={u.id === me} value={u.status} onChange={(e) => update(u.id, e.target.value as Account["status"])} className="rounded-xl border border-slate-200 px-3 py-2 disabled:opacity-50">
                        <option value="active">Active</option>
                        <option value="restricted">Restricted</option>
                        <option value="banned">Banned</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && <p className="py-10 text-center text-sm text-slate-500">No matching accounts.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
