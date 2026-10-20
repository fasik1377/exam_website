"use client";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { LayoutDashboard, Menu, MessageCircle, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import Brand from "@/app/components/Brand";
import LogoutButton from "@/app/components/LogoutButton";
import AccountMenu from "@/app/components/AccountMenu";
import { dashboardFor, useSession } from "@/app/components/useSession";

const LINKS = [
  { href: "#grades", label: "Subjects" },
  { href: "#how", label: "How it works" },
  { href: "#subscriptions", label: "Plans" },
  { href: "#support", label: "Support" },
];

export default function SiteHeader() {
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY, scrollYProgress } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 24));

  const light = scrolled || open;
  const dashboard = user ? dashboardFor(user.role) : "/login";
  const dashboardLabel = user?.role === "super-admin" ? "Platform admin" : user?.role === "admin" ? "Teacher dashboard" : "My practice";

  return (
    <header className={`sticky top-0 z-40 transition-colors duration-300 ${light ? "border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-lg" : "bg-navy"}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3.5 lg:px-8">
        <Brand tone={light ? "dark" : "light"} href="/" />

        <nav className={`hidden items-center gap-1 text-sm font-semibold md:flex ${light ? "text-slate-600" : "text-white/75"}`}>
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className={`relative rounded-lg px-3 py-2 transition-colors ${light ? "hover:bg-slate-100 hover:text-navy" : "hover:bg-white/10 hover:text-white"}`}>{link.label}</a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          {user ? (
            <>
              {(user.role === "student" || user.role === "admin") && (
                <Link href="/chat" className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold ${light ? "text-navy hover:bg-slate-100" : "text-white hover:bg-white/10"}`}>
                  <MessageCircle size={16} /> <span className="hidden lg:inline">{user.role === "student" ? "Ask a teacher" : "Messages"}</span>
                </Link>
              )}
              <Link href={dashboard} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${light ? "text-navy hover:bg-slate-100" : "text-white hover:bg-white/10"}`}>
                <span className="grid h-7 w-7 place-items-center rounded-full bg-gold text-xs font-extrabold text-navy">{user.name.charAt(0).toUpperCase()}</span>
                <span className="hidden lg:inline">{dashboardLabel}</span>
                <LayoutDashboard size={16} className="lg:hidden" />
              </Link>
              <AccountMenu tone={light ? "dark" : "light"} />
            </>
          ) : (
            <>
              <Link href="/login" className={`rounded-xl px-3.5 py-2.5 text-sm font-bold ${light ? "text-navy hover:bg-slate-100" : "text-white hover:bg-white/10"}`}>Sign in</Link>
              <Link href="/signup" className="btn-shine rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-navy shadow-sm hover:shadow-md">Create account</Link>
            </>
          )}
        </div>

        <button onClick={() => setOpen(!open)} className={`rounded-lg p-2 md:hidden ${light ? "text-navy" : "text-white"}`} aria-label="Toggle navigation" aria-expanded={open}>
          {open ? <X /> : <Menu />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-slate-200 bg-white md:hidden">
            <div className="flex flex-col gap-1 px-5 py-4 text-sm font-semibold text-navy">
              {LINKS.map((link, i) => (
                <motion.a key={link.href} href={link.href} onClick={() => setOpen(false)} initial={{ x: -12, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.05 }} className="rounded-lg px-3 py-2.5 hover:bg-slate-50">{link.label}</motion.a>
              ))}
              <div className="my-2 h-px bg-slate-100" />
              {user ? (
                <div className="flex items-center justify-between gap-3 px-3">
                  <Link href={dashboard} className="font-bold text-royal">{dashboardLabel}</Link>
                  <LogoutButton />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/login" className="rounded-xl border border-slate-200 px-3 py-2.5 text-center font-bold">Sign in</Link>
                  <Link href="/signup" className="rounded-xl bg-navy px-3 py-2.5 text-center font-bold text-white">Create account</Link>
                </div>
              )}
              <div className="mt-2 flex gap-4 px-3 text-xs text-slate-500">
                <Link href="/admin/login">Teacher portal</Link>
                <Link href="/super-admin/login">Platform admin</Link>
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Reading progress */}
      <motion.div style={{ scaleX: scrollYProgress }} className="absolute bottom-0 left-0 h-0.5 w-full origin-left bg-gradient-to-r from-royal to-gold" />
    </header>
  );
}
