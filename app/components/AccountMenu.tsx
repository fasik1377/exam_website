"use client";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, ChevronDown, GraduationCap, LayoutDashboard, LoaderCircle, LogOut, MessageCircle, MonitorSmartphone, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { dashboardFor, useSession, type SessionUser } from "@/app/components/useSession";
import ThemeToggle from "@/app/components/ThemeToggle";

const ROLE: Record<SessionUser["role"], { label: string; icon: typeof GraduationCap; badge: string }> = {
  student: { label: "Student", icon: GraduationCap, badge: "bg-blue-50 text-royal" },
  admin: { label: "Teacher", icon: BookOpen, badge: "bg-orange-50 text-orange-700" },
  "super-admin": { label: "Platform admin", icon: ShieldCheck, badge: "bg-emerald-50 text-emerald-700" },
};

/** Sign out — of this browser or of every device — then go home with a full reload so nothing stale remains. */
export async function signOut(everywhere = false) {
  await fetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ everywhere }) }).catch(() => undefined);
  window.location.href = "/";
}

/** Account button with role, quick links, and sign-out — the same in every signed-in area. */
export default function AccountMenu({ tone = "dark", align = "right", themeToggle = true }: { tone?: "light" | "dark"; align?: "right" | "left" | "up"; themeToggle?: boolean }) {
  const toggle = themeToggle ? <ThemeToggle tone={tone} /> : null;
  const { user, loading } = useSession();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<"" | "here" | "everywhere">("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);

  if (loading) return <span className="flex items-center gap-2">{toggle}<span className={`h-10 w-28 animate-pulse rounded-xl ${tone === "light" ? "bg-white/10" : "bg-slate-100"}`} /></span>;
  if (!user) return <span className="flex items-center gap-2">{toggle}<Link href="/login" className={`rounded-xl px-3 py-2 text-sm font-bold ${tone === "light" ? "text-white hover:bg-white/10" : "text-navy hover:bg-slate-100"}`}>Sign in</Link></span>;

  const role = ROLE[user.role];
  // "up" (sidebar footer) spans the sidebar width so it never gets clipped.
  const placement = align === "up" ? "bottom-full mb-2 inset-x-0" : align === "left" ? "left-0 mt-2 w-72" : "right-0 mt-2 w-72";
  async function run(everywhere: boolean) {
    setBusy(everywhere ? "everywhere" : "here");
    await signOut(everywhere);
  }

  return (
    <div className={`flex items-center gap-2 ${align === "up" ? "w-full" : ""}`}>
    {toggle}
    <div ref={ref} className={`relative ${align === "up" ? "min-w-0 flex-1" : ""}`}>
      <button
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 text-left transition ${tone === "light" ? "border-white/15 text-white hover:bg-white/10" : "border-slate-200 bg-white text-navy hover:border-royal/40"}`}
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-gold text-sm font-extrabold text-navy">{user.name.charAt(0).toUpperCase()}</span>
        <span className="hidden min-w-0 sm:block">
          <span className="block max-w-36 truncate text-sm font-bold leading-4">{user.name}</span>
          <span className={`text-[11px] font-semibold ${tone === "light" ? "text-white/60" : "text-slate-500"}`}>{role.label}</span>
        </span>
        <ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div role="menu" initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.15 }}
            className={`absolute z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white text-navy shadow-2xl ${placement}`}>
            <div className="border-b border-slate-100 p-4">
              <p className="truncate font-extrabold">{user.name}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
              <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${role.badge}`}><role.icon size={12} />{role.label}{user.subject ? ` · ${user.subject}` : ""}</span>
            </div>
            <div className="grid p-1.5 text-sm font-semibold">
              <Link role="menuitem" href={dashboardFor(user.role)} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 hover:bg-slate-50"><LayoutDashboard size={16} className="text-slate-400" /> My dashboard</Link>
              {user.role !== "super-admin" && <Link role="menuitem" href="/chat" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 hover:bg-slate-50"><MessageCircle size={16} className="text-slate-400" /> Messages</Link>}
            </div>
            <div className="grid border-t border-slate-100 p-1.5 text-sm font-semibold">
              <button role="menuitem" disabled={!!busy} onClick={() => run(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-red-600 hover:bg-red-50 disabled:opacity-60">
                {busy === "here" ? <LoaderCircle size={16} className="animate-spin" /> : <LogOut size={16} />} Sign out
              </button>
              <button role="menuitem" disabled={!!busy} onClick={() => run(true)} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-slate-600 hover:bg-slate-50 disabled:opacity-60">
                {busy === "everywhere" ? <LoaderCircle size={16} className="animate-spin" /> : <MonitorSmartphone size={16} className="text-slate-400" />}
                <span>Sign out of all devices<span className="block text-[11px] font-normal text-slate-400">Ends your session on every phone and computer</span></span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </div>
  );
}
