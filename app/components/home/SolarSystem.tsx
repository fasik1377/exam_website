"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useState, type CSSProperties } from "react";

type Planet = { name: string; fact: string; orbit: number; size: number; period: number; start: number; color: string; ring?: boolean; moon?: boolean };

// orbit = diameter as % of the scene; period = seconds per revolution (scaled, not real time).
const PLANETS: Planet[] = [
  { name: "Mercury", fact: "The closest planet to the Sun.", orbit: 30, size: 7, period: 7, start: 40, color: "radial-gradient(circle at 35% 35%, #d6d3d1, #78716c)" },
  { name: "Venus", fact: "The hottest planet — about 465 °C at the surface.", orbit: 42, size: 11, period: 11, start: 200, color: "radial-gradient(circle at 35% 35%, #fde68a, #d97706)" },
  { name: "Earth", fact: "Our home. One orbit takes about 365.25 days.", orbit: 56, size: 13, period: 16, start: 120, color: "radial-gradient(circle at 35% 35%, #7dd3fc, #1d4ed8 60%, #15803d)", moon: true },
  { name: "Mars", fact: "The Red Planet, home of Olympus Mons — the tallest volcano known.", orbit: 70, size: 10, period: 24, start: 300, color: "radial-gradient(circle at 35% 35%, #fca5a5, #b91c1c)" },
  { name: "Jupiter", fact: "The largest planet — more than 1,300 Earths could fit inside.", orbit: 84, size: 22, period: 36, start: 20, color: "repeating-linear-gradient(170deg, #fcd9a8 0 3px, #d6a26a 3px 6px, #f5e6cc 6px 9px)" },
  { name: "Saturn", fact: "Famous for its bright rings of ice and rock.", orbit: 98, size: 17, period: 50, start: 250, color: "radial-gradient(circle at 35% 35%, #fef3c7, #ca8a04)", ring: true },
];

/** Animated, explorable solar system. Hover or tap a planet to pause and learn a fact. */
export default function SolarSystem({ reduce = false }: { reduce?: boolean }) {
  const [active, setActive] = useState<Planet | null>(null);
  const paused = reduce || active !== null;

  return (
    <div className="relative aspect-square w-full" onPointerLeave={() => setActive(null)}>
      {/* Orbits */}
      {PLANETS.map((planet) => (
        <div
          key={planet.name}
          className="absolute left-1/2 top-1/2 rounded-full border border-white/10"
          style={{
            width: `${planet.orbit}%`, height: `${planet.orbit}%`,
            transform: `translate(-50%, -50%) rotate(${planet.start}deg)`,
          }}
        >
          <div
            className="absolute inset-0"
            style={{ animation: `spin-slow ${planet.period}s linear infinite`, animationPlayState: paused ? "paused" : "running" } as CSSProperties}
          >
            <button
              type="button"
              aria-label={`${planet.name}: ${planet.fact}`}
              onPointerEnter={() => setActive(planet)}
              onFocus={() => setActive(planet)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(active?.name === planet.name ? null : planet)}
              className="group absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full p-2 outline-none"
            >
              <span
                className={`relative block rounded-full shadow-[0_0_12px_rgba(255,255,255,.25)] transition-transform duration-300 group-hover:scale-150 group-focus-visible:scale-150 ${active?.name === planet.name ? "scale-150 ring-2 ring-gold ring-offset-2 ring-offset-navy" : ""}`}
                style={{ width: planet.size, height: planet.size, background: planet.color }}
              >
                {planet.ring && <span className="absolute left-1/2 top-1/2 h-[40%] w-[230%] -translate-x-1/2 -translate-y-1/2 -rotate-[20deg] rounded-[50%] border-2 border-amber-200/80" />}
                {planet.moon && (
                  <span className="absolute inset-[-9px]" style={{ animation: `spin-slow 3s linear infinite`, animationPlayState: paused ? "paused" : "running" }}>
                    <span className="absolute left-1/2 top-0 h-1 w-1 -translate-x-1/2 rounded-full bg-slate-200" />
                  </span>
                )}
              </span>
            </button>
          </div>
        </div>
      ))}

      {/* Sun */}
      <div className="absolute left-1/2 top-1/2 h-[17%] w-[17%] -translate-x-1/2 -translate-y-1/2">
        <div className="absolute inset-[-45%] rounded-full bg-[conic-gradient(from_0deg,transparent,rgba(244,183,64,.25),transparent_30%,rgba(244,183,64,.2),transparent_60%,rgba(244,183,64,.25),transparent)] blur-sm" style={{ animation: reduce ? undefined : "spin-slow 18s linear infinite" }} />
        <motion.div
          className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_40%_40%,#fff7d6,#F4B740_45%,#f97316)] shadow-[0_0_40px_10px_rgba(244,183,64,.45),0_0_90px_30px_rgba(249,115,22,.2)]"
          animate={reduce ? undefined : { scale: [1, 1.06, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Fact bubble */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[-2%] flex justify-center">
        <AnimatePresence mode="wait">
          {active ? (
            <motion.div key={active.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="glass max-w-xs rounded-2xl px-4 py-2.5 text-center text-sm">
              <span className="font-bold text-gold">{active.name}</span> <span className="text-white/80">— {active.fact}</span>
            </motion.div>
          ) : (
            <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-white/50">
              🪐 Hover or tap a planet to explore
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
