"use client";
import { motion } from "framer-motion";
import { useEffect, useRef, useState, type PointerEvent } from "react";

// Validated categorical slots (light surface) and the single sequential hue.
export const SERIES = { blue: "#2a78d6", orange: "#eb6834", aqua: "#1baf7a" };
export const STATUS = { good: "#0ca30c", warning: "#fab219", serious: "#ec835a", critical: "#d03b3b" };

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

function niceMax(value: number) {
  if (value <= 4) return 4;
  const step = Math.pow(10, Math.floor(Math.log10(value)));
  const n = value / step;
  return (n <= 2 ? 2 : n <= 5 ? 5 : 10) * step;
}

const shortDate = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** Single-series area/line trend with crosshair tooltip and a table view. */
export function TrendChart({ data, label }: { data: { date: string; count: number }[]; label: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const height = 220, pad = { top: 16, right: 12, bottom: 28, left: 32 };
  const innerW = Math.max(0, width - pad.left - pad.right), innerH = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(...data.map((d) => d.count), 0));
  const x = (i: number) => pad.left + (data.length > 1 ? (i / (data.length - 1)) * innerW : innerW / 2);
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.count).toFixed(1)}`).join(" ");
  const area = `${line} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const ticks = [0, max / 4, max / 2, (3 * max) / 4, max];

  function onMove(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left - pad.left;
    setHover(Math.max(0, Math.min(data.length - 1, Math.round((px / innerW) * (data.length - 1)))));
  }

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button type="button" onClick={() => setTable(!table)} className="rounded-lg px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-navy">{table ? "Show chart" : "View as table"}</button>
      </div>
      {table ? (
        <div className="max-h-56 overflow-auto rounded-xl border border-slate-100">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Date</th><th className="px-3 py-2 text-right">{label}</th></tr></thead>
            <tbody>{data.map((d) => <tr key={d.date} className="border-t border-slate-100"><td className="px-3 py-1.5">{shortDate(d.date)}</td><td className="px-3 py-1.5 text-right font-semibold tabular-nums">{d.count}</td></tr>)}</tbody>
          </table>
        </div>
      ) : (
        <div ref={ref} className="relative">
          {width > 0 && (
            <svg width={width} height={height} onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label={`${label} per day over the last ${data.length} days`}>
              <defs>
                <linearGradient id={`fill-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SERIES.blue} stopOpacity=".22" />
                  <stop offset="100%" stopColor={SERIES.blue} stopOpacity="0" />
                </linearGradient>
              </defs>
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeDasharray={t === 0 ? undefined : "3 4"} />
                  <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-slate-400 text-[10px] tabular-nums">{Math.round(t)}</text>
                </g>
              ))}
              {data.map((d, i) => {
                const last = i === data.length - 1;
                // Every third day, plus the final day (skipping a tick that would collide with it).
                if (!(last || (i % 3 === 0 && i <= data.length - 3))) return null;
                return <text key={d.date} x={x(i)} y={height - 8} textAnchor={last ? "end" : i === 0 ? "start" : "middle"} className="fill-slate-400 text-[10px]">{shortDate(d.date)}</text>;
              })}
              <motion.path d={area} fill={`url(#fill-${label})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} />
              <motion.path d={line} fill="none" stroke={SERIES.blue} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: "easeInOut" }} />
              {hover !== null && (
                <g>
                  <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={y(0)} stroke="#94a3b8" strokeDasharray="3 3" />
                  <circle cx={x(hover)} cy={y(data[hover].count)} r={5} fill={SERIES.blue} stroke="#fff" strokeWidth={2} />
                </g>
              )}
              <rect x={pad.left} y={pad.top} width={innerW} height={innerH} fill="transparent" />
            </svg>
          )}
          {hover !== null && width > 0 && (
            <div className="pointer-events-none absolute top-1 rounded-xl bg-navy px-3 py-2 text-xs text-white shadow-lg" style={{ left: Math.min(Math.max(x(hover) - 60, 0), width - 120), width: 120 }}>
              <p className="text-white/60">{shortDate(data[hover].date)}</p>
              <p className="font-bold">{data[hover].count} {label.toLowerCase()}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Part-to-whole bar for up to three categories, with legend and direct counts. */
export function StackedBar({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const total = parts.reduce((sum, p) => sum + p.value, 0);
  const [hover, setHover] = useState<string | null>(null);
  return (
    <div>
      <div className="flex h-4 w-full gap-0.5 overflow-hidden rounded bg-white">
        {total === 0 ? <div className="h-full w-full rounded bg-slate-100" /> : parts.filter((p) => p.value > 0).map((p) => (
          <motion.div
            key={p.label}
            initial={{ width: 0 }}
            animate={{ width: `${(p.value / total) * 100}%`, opacity: hover && hover !== p.label ? 0.45 : 1 }}
            transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
            onPointerEnter={() => setHover(p.label)}
            onPointerLeave={() => setHover(null)}
            className="h-full first:rounded-l last:rounded-r"
            style={{ background: p.color }}
            title={`${p.label}: ${p.value}`}
          />
        ))}
      </div>
      <ul className="mt-4 grid gap-2.5">
        {parts.map((p) => (
          <li key={p.label} onPointerEnter={() => setHover(p.label)} onPointerLeave={() => setHover(null)} className={`flex items-center gap-3 rounded-lg px-2 py-1 text-sm transition-colors ${hover === p.label ? "bg-slate-50" : ""}`}>
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: p.color }} />
            <span className="flex-1 text-slate-600">{p.label}</span>
            <span className="font-bold tabular-nums text-navy">{p.value}</span>
            <span className="w-10 text-right text-xs tabular-nums text-slate-400">{total ? Math.round((p.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Horizontal magnitude bars in one hue, value-labelled. */
export function SubjectBars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="grid gap-3">
      {rows.map((row, i) => (
        <li key={row.label} className="group grid grid-cols-[8.5rem_1fr_2rem] items-center gap-3 text-sm" title={`${row.label}: ${row.value} questions`}>
          <span className="truncate text-slate-600 group-hover:text-navy">{row.label}</span>
          <span className="h-2.5 rounded bg-slate-100">
            <motion.span
              className="block h-full rounded transition-[filter] group-hover:brightness-90"
              style={{ background: SERIES.blue }}
              initial={{ width: 0 }}
              whileInView={{ width: row.value ? `${Math.max(3, (row.value / max) * 100)}%` : 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: i * 0.05 }}
            />
          </span>
          <span className="text-right font-bold tabular-nums text-navy">{row.value}</span>
        </li>
      ))}
    </ul>
  );
}

/** A single ratio against 100%. */
export function Meter({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="h-3 w-full overflow-hidden rounded bg-[#cde2fb]" role="meter" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <motion.div className="h-full rounded" style={{ background: SERIES.blue }} initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 1, ease: "easeOut" }} />
      </div>
    </div>
  );
}

/** Tiny trend line for stat tiles. */
export function Sparkline({ values, color = SERIES.blue }: { values: number[]; color?: string }) {
  const w = 96, h = 30;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => [(i / Math.max(1, values.length - 1)) * w, h - 3 - (v / max) * (h - 6)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="overflow-visible">
      <path d={`${line} L${w},${h} L0,${h} Z`} fill={color} opacity={0.1} />
      <motion.path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1 }} />
      {last && <circle cx={last[0]} cy={last[1]} r={2.5} fill={color} />}
    </svg>
  );
}

type StackKey = { key: string; label: string; color: string };

/** Stacked daily bars (first key at the bottom), with legend and hover tooltip. */
export function DailyStacked({ data, keys }: { data: ({ date: string } & Record<string, number | string>)[]; keys: StackKey[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const height = 200, pad = { top: 10, right: 6, bottom: 26, left: 28 };
  const innerW = Math.max(0, width - pad.left - pad.right), innerH = height - pad.top - pad.bottom;
  const totals = data.map((d) => keys.reduce((s, k) => s + Number(d[k.key] || 0), 0));
  const max = niceMax(Math.max(0, ...totals));
  const slot = innerW / Math.max(1, data.length);
  const barW = Math.max(4, Math.min(26, slot * 0.62));
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;
  const sums = keys.map((k) => data.reduce((s, d) => s + Number(d[k.key] || 0), 0));

  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-4 text-sm">
        {keys.map((k, i) => (
          <li key={k.key} className="flex items-center gap-2 text-slate-600"><span className="h-3 w-3 rounded-sm" style={{ background: k.color }} />{k.label}<span className="font-bold tabular-nums text-navy">{sums[i]}</span></li>
        ))}
      </ul>
      <div ref={ref} className="relative">
        {width > 0 && (
          <svg width={width} height={height} onPointerLeave={() => setHover(null)} role="img" aria-label={`Daily ${keys.map((k) => k.label).join(" and ")}`}>
            {[0, max / 2, max].map((t) => (
              <g key={t}>
                <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeDasharray={t ? "3 4" : undefined} />
                <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-slate-400 text-[10px] tabular-nums">{Math.round(t)}</text>
              </g>
            ))}
            {data.map((d, i) => {
              const cx = pad.left + slot * i + slot / 2;
              const present = keys.filter((k) => Number(d[k.key] || 0) > 0);
              let base = 0;
              const last = data.length - 1;
              return (
                <g key={d.date} onPointerEnter={() => setHover(i)}>
                  <rect x={cx - slot / 2} y={pad.top} width={slot} height={innerH} fill={hover === i ? "#f1f5f9" : "transparent"} />
                  {present.map((k, pi) => {
                    const v = Number(d[k.key]);
                    const top = y(base + v), bottom = y(base);
                    base += v;
                    // 2px surface gap between stacked segments; only the top segment gets rounded ends.
                    const h = Math.max(1, bottom - top - (pi > 0 ? 2 : 0));
                    return (
                      <motion.rect key={k.key} x={cx - barW / 2} width={barW} rx={pi === present.length - 1 ? 4 : 0} fill={k.color}
                        initial={{ y: y(0), height: 0 }} animate={{ y: top, height: h }} transition={{ duration: 0.6, delay: i * 0.02 }} />
                    );
                  })}
                  {(i % 3 === 0 && i <= last - 2) || i === last ? (
                    <text x={cx} y={height - 8} textAnchor={i === last ? "end" : "middle"} className="fill-slate-400 text-[10px]">{shortDate(d.date)}</text>
                  ) : null}
                </g>
              );
            })}
          </svg>
        )}
        {hover !== null && width > 0 && (
          <div className="pointer-events-none absolute top-0 rounded-xl bg-navy px-3 py-2 text-xs text-white shadow-lg" style={{ left: Math.min(Math.max(pad.left + slot * hover + slot / 2 - 70, 0), width - 140), width: 140 }}>
            <p className="text-white/60">{shortDate(data[hover].date)}</p>
            {keys.map((k) => <p key={k.key} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: k.color }} />{k.label}: <b>{Number(data[hover][k.key] || 0)}</b></p>)}
          </div>
        )}
      </div>
    </div>
  );
}

const RAMP = ["#f1f5f9", "#b7d3f6", "#86b6ef", "#5598e7", "#2a78d6", "#1c5cab", "#104281"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
type Cell = { day: number; hour: number; count: number };

/** Weekday × hour activity grid in one sequential hue. */
export function Heatmap({ cells }: { cells: Cell[] }) {
  const [hover, setHover] = useState<Cell | null>(null);
  const grid = new Map(cells.map((c) => [`${c.day}-${c.hour}`, c.count]));
  const max = Math.max(0, ...cells.map((c) => c.count));
  const step = (v: number) => (v === 0 ? 0 : Math.min(RAMP.length - 1, 1 + Math.floor((v / max) * (RAMP.length - 1.01))));
  const busiest = cells.reduce<Cell | null>((best, c) => (!best || c.count > best.count ? c : best), null);

  return (
    <div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[560px] grid-cols-[2.5rem_repeat(24,minmax(0,1fr))] gap-[3px]" onPointerLeave={() => setHover(null)}>
          <span />
          {Array.from({ length: 24 }, (_, h) => <span key={h} className="text-center text-[9px] text-slate-400">{h % 3 === 0 ? h : ""}</span>)}
          {WEEKDAYS.map((label, d) => (
            <div key={label} className="contents">
              <span className="self-center text-[11px] font-semibold text-slate-500">{label}</span>
              {Array.from({ length: 24 }, (_, h) => {
                const count = grid.get(`${d}-${h}`) ?? 0;
                return (
                  <motion.span
                    key={h}
                    onPointerEnter={() => setHover({ day: d, hour: h, count })}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (d * 24 + h) * 0.002 }}
                    className={`aspect-square rounded-[4px] ${hover?.day === d && hover?.hour === h ? "ring-2 ring-navy" : ""}`}
                    style={{ background: RAMP[step(count)] }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <p className="min-h-4">
          {hover ? <><b className="text-navy">{WEEKDAYS[hover.day]} {String(hover.hour).padStart(2, "0")}:00</b> — {hover.count} answer{hover.count === 1 ? "" : "s"}</>
            : busiest ? <>Busiest: <b className="text-navy">{WEEKDAYS[busiest.day]} around {String(busiest.hour).padStart(2, "0")}:00</b> (Addis Ababa time)</> : "No practice in the last 4 weeks yet"}
        </p>
        <span className="flex items-center gap-1.5">Less {RAMP.map((c) => <span key={c} className="h-3 w-3 rounded-[3px]" style={{ background: c }} />)} More</span>
      </div>
    </div>
  );
}

/** Accuracy per subject: a meter per row with a 50% reference tick, labelled with % and answer count. */
export function AccuracyBars({ rows }: { rows: { label: string; total: number; correct: number }[] }) {
  if (!rows.length) return <p className="py-8 text-center text-sm text-slate-500">No answers recorded yet.</p>;
  return (
    <ul className="grid gap-3.5">
      {rows.map((r, i) => {
        const pct = r.total ? Math.round((r.correct / r.total) * 100) : 0;
        return (
          <li key={r.label} className="grid grid-cols-[8.5rem_1fr_5.5rem] items-center gap-3 text-sm" title={`${r.label}: ${r.correct} of ${r.total} correct`}>
            <span className="truncate text-slate-600">{r.label}</span>
            <span className="relative h-2.5 rounded bg-[#cde2fb]">
              <motion.span className="absolute inset-y-0 left-0 rounded" style={{ background: SERIES.blue }} initial={{ width: 0 }} whileInView={{ width: `${pct}%` }} viewport={{ once: true }} transition={{ duration: 0.8, delay: i * 0.05 }} />
              <span className="absolute -inset-y-1 left-1/2 w-px bg-slate-400/70" />
            </span>
            <span className="text-right tabular-nums"><b className="text-navy">{pct}%</b> <span className="text-xs text-slate-400">· {r.total}</span></span>
          </li>
        );
      })}
    </ul>
  );
}
