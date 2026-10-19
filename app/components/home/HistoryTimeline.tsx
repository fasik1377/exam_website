"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Landmark } from "lucide-react";
import { useEffect, useState } from "react";

const EVENTS = [
  { year: "c. 100 AD", title: "Rise of the Aksumite Kingdom", detail: "Famous for its towering stone stelae." },
  { year: "12th–13th c.", title: "Churches of Lalibela", detail: "Eleven churches carved from solid rock." },
  { year: "1636", title: "Gondar is founded", detail: "Emperor Fasilides builds the royal city." },
  { year: "1896", title: "Victory at Adwa", detail: "Ethiopia defends its independence." },
];

/** A small history card that steps through a timeline of Ethiopian milestones. */
export default function HistoryTimeline({ reduce = false }: { reduce?: boolean }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % EVENTS.length), 3200);
    return () => window.clearInterval(id);
  }, [reduce]);

  const event = EVENTS[index];

  return (
    <div className="glass w-56 rounded-2xl p-4 text-white shadow-2xl sm:w-60">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.16em] text-gold"><Landmark size={14} /> History</span>
        <Stele />
      </div>
      <div className="relative mt-2 h-[6.5rem] overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={event.year} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.35 }}>
            <p className="font-mono text-lg font-bold text-gold">{event.year}</p>
            <p className="text-sm font-bold leading-5">{event.title}</p>
            <p className="text-xs text-white/60">{event.detail}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      {/* Timeline */}
      <div className="relative mt-3 flex items-center justify-between">
        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/20" />
        <motion.span className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-gold" animate={{ width: `${(index / (EVENTS.length - 1)) * 100}%` }} transition={{ duration: 0.5 }} />
        {EVENTS.map((e, i) => (
          <button key={e.year} type="button" onClick={() => setIndex(i)} aria-label={`${e.year}: ${e.title}`} className="relative grid h-4 w-4 place-items-center">
            <span className={`h-2.5 w-2.5 rounded-full border-2 transition-colors ${i <= index ? "border-gold bg-gold" : "border-white/40 bg-navy"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

/** Simple silhouette of an Aksum stele. */
function Stele() {
  return (
    <svg width="18" height="30" viewBox="0 0 18 30" aria-hidden className="text-gold/80">
      <path d="M4 29V5.5C4 3 6.2 1 9 1s5 2 5 4.5V29Z" fill="currentColor" opacity=".9" />
      <g fill="#0B1F3A" opacity=".55">
        <rect x="6.5" y="9" width="5" height="2" rx=".5" />
        <rect x="6.5" y="14" width="5" height="2" rx=".5" />
        <rect x="6.5" y="19" width="5" height="2" rx=".5" />
        <rect x="7.5" y="24" width="3" height="5" rx=".5" />
      </g>
      <rect x="1" y="28" width="16" height="2" rx="1" fill="currentColor" />
    </svg>
  );
}
