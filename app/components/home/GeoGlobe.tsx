"use client";
import { AnimatePresence, motion, useAnimationFrame } from "framer-motion";
import { Globe2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const FACTS = [
  "Ras Dashen (4,550 m) is Ethiopia's highest peak.",
  "The Blue Nile begins at Lake Tana.",
  "The Danakil Depression lies about 125 m below sea level.",
  "The Great Rift Valley runs through Ethiopia.",
];

const ETHIOPIA = { lat: 9.1, lon: 40.5 };
const R = 40, C = 50;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Rotating wireframe globe with a pin that tracks Ethiopia's position, plus rotating geography facts. */
export default function GeoGlobe({ reduce = false }: { reduce?: boolean }) {
  const [spin, setSpin] = useState(ETHIOPIA.lon);
  const [fact, setFact] = useState(0);
  const last = useRef(0);

  useAnimationFrame((time) => {
    if (reduce || time - last.current < 33) return; // ~30 fps is plenty for a small globe
    last.current = time;
    setSpin((time / 1000) * 24 + ETHIOPIA.lon);
  });

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setFact((f) => (f + 1) % FACTS.length), 3800);
    return () => window.clearInterval(id);
  }, [reduce]);

  const rel = rad(ETHIOPIA.lon - spin);
  const pinX = C + R * Math.cos(rad(ETHIOPIA.lat)) * Math.sin(rel);
  const pinY = C - R * Math.sin(rad(ETHIOPIA.lat));
  const pinVisible = Math.cos(rel) > 0;

  return (
    <div className="glass flex w-60 items-center gap-3 rounded-2xl p-3.5 text-white shadow-2xl sm:w-64">
      <svg viewBox="0 0 100 100" className="h-20 w-20 shrink-0" aria-hidden>
        <defs>
          <radialGradient id="globe-fill" cx="35%" cy="30%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="70%" stopColor="#155EEF" />
            <stop offset="100%" stopColor="#0B1F3A" />
          </radialGradient>
        </defs>
        <circle cx={C} cy={C} r={R + 6} fill="#155EEF" opacity=".15" />
        <circle cx={C} cy={C} r={R} fill="url(#globe-fill)" />
        <g fill="none" stroke="rgba(255,255,255,.35)" strokeWidth=".8">
          {[0, 30, 60, 90, 120, 150].map((lon) => (
            <ellipse key={lon} cx={C} cy={C} rx={Math.abs(R * Math.sin(rad(lon - spin)))} ry={R} />
          ))}
          {[-60, -30, 0, 30, 60].map((lat) => {
            const y = C - R * Math.sin(rad(lat));
            const w = R * Math.cos(rad(lat));
            return <line key={lat} x1={C - w} x2={C + w} y1={y} y2={y} />;
          })}
        </g>
        {pinVisible && (
          <g>
            <circle cx={pinX} cy={pinY} r="6" fill="#F4B740" opacity=".35">
              {!reduce && <animate attributeName="r" values="3;8;3" dur="1.6s" repeatCount="indefinite" />}
            </circle>
            <circle cx={pinX} cy={pinY} r="3" fill="#F4B740" stroke="#0B1F3A" strokeWidth="1" />
          </g>
        )}
        <circle cx={C} cy={C} r={R} fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1" />
      </svg>
      <div className="min-w-0">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.16em] text-gold"><Globe2 size={14} /> Geography</p>
        <p className="mt-0.5 text-xs font-semibold text-white/80">Ethiopia · 9.1°N, 40.5°E</p>
        <div className="mt-1 h-12 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p key={fact} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-xs leading-4 text-white/65">
              {FACTS[fact]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
