"use client";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * Goes back to the previous page on this site, or to `href` when there is none
 * (opened from a link, a bookmark or a new tab). The label hides on small screens.
 */
export default function BackButton({ href, label = "Back", tone = "dark", className = "" }: { href: string; label?: string; tone?: "light" | "dark"; className?: string }) {
  const router = useRouter();
  function back() {
    let sameSite = false;
    try { sameSite = !!document.referrer && new URL(document.referrer).origin === window.location.origin; } catch {}
    if (sameSite && window.history.length > 1) router.back();
    else router.push(href);
  }
  return (
    <button type="button" onClick={back} aria-label={label} title={label}
      className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-bold transition ${tone === "light" ? "text-white/80 hover:bg-white/10 hover:text-white" : "text-slate-600 hover:bg-slate-100 hover:text-navy"} ${className}`}>
      <ArrowLeft size={17} /><span className="hidden sm:inline">{label}</span>
    </button>
  );
}
