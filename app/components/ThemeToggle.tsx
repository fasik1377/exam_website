"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { THEME_KEY, type Theme } from "@/lib/theme";

const current = (): Theme => (typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? "dark" : "light");

function apply(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0a1120" : "#0B1F3A");
  try { localStorage.setItem(THEME_KEY, theme); } catch {}
  window.dispatchEvent(new CustomEvent("themechange", { detail: theme }));
}

type ViewTransitionDoc = Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };

/** Sun/moon switch. The new theme spreads out in a circle from the button (where supported). */
export default function ThemeToggle({ tone = "dark", className = "" }: { tone?: "light" | "dark"; className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const sync = () => setTheme(current());
    sync();
    window.addEventListener("themechange", sync);
    // Follow the device setting until the visitor picks a theme themselves.
    const media = matchMedia("(prefers-color-scheme: dark)");
    const onSystem = () => { try { if (!localStorage.getItem(THEME_KEY)) { document.documentElement.classList.toggle("dark", media.matches); sync(); } } catch {} };
    media.addEventListener("change", onSystem);
    return () => { window.removeEventListener("themechange", sync); media.removeEventListener("change", onSystem); };
  }, []);

  function toggle(event: React.MouseEvent<HTMLButtonElement>) {
    const next: Theme = current() === "dark" ? "light" : "dark";
    const doc = document as ViewTransitionDoc;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!doc.startViewTransition || reduce) {
      document.documentElement.classList.add("theme-fade");
      apply(next);
      window.setTimeout(() => document.documentElement.classList.remove("theme-fade"), 400);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const transition = doc.startViewTransition(() => apply(next));
    transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 650, easing: "cubic-bezier(.6,.05,.3,1)", pseudoElement: "::view-transition-new(root)" },
      );
    }).catch(() => {});
  }

  const dark = theme === "dark";
  const label = dark ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button type="button" onClick={toggle} aria-label={label} title={label}
      className={`theme-toggle relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl transition ${tone === "light" ? "text-white hover:bg-white/10" : "border border-slate-200 bg-white text-navy hover:border-royal/40"} ${className}`}>
      <AnimatePresence mode="wait" initial={false}>
        {theme && (dark ? (
          <motion.svg key="moon" viewBox="0 0 24 24" width="19" height="19" initial={{ rotate: -90, scale: 0, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} exit={{ rotate: 90, scale: 0, opacity: 0 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}>
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" fill="#F4B740" stroke="#F4B740" strokeWidth="1.5" strokeLinejoin="round" />
            <motion.circle cx="18.5" cy="4.5" r="0.9" fill="#F4B740" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 2, repeat: Infinity }} />
            <motion.circle cx="21" cy="8" r="0.6" fill="#F4B740" animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 2.4, repeat: Infinity }} />
          </motion.svg>
        ) : (
          <motion.svg key="sun" viewBox="0 0 24 24" width="20" height="20" initial={{ rotate: 90, scale: 0, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} exit={{ rotate: -90, scale: 0, opacity: 0 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}>
            <circle cx="12" cy="12" r="4.2" fill="#F4B740" />
            <motion.g animate={{ rotate: 360 }} transition={{ duration: 18, repeat: Infinity, ease: "linear" }} style={{ originX: "12px", originY: "12px" }} stroke="#F4B740" strokeWidth="2" strokeLinecap="round">
              {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
                const r = (a * Math.PI) / 180;
                return <line key={a} x1={12 + Math.cos(r) * 7} y1={12 + Math.sin(r) * 7} x2={12 + Math.cos(r) * 9.3} y2={12 + Math.sin(r) * 9.3} />;
              })}
            </motion.g>
          </motion.svg>
        ))}
      </AnimatePresence>
    </button>
  );
}
