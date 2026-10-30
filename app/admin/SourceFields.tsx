"use client";
import { BookMarked, CalendarDays } from "lucide-react";
import { useId } from "react";

const YEARS = [...Array.from({ length: 18 }, (_, i) => `${2017 - i} E.C. national exam`), "Model exam", "Mid-term exam", "Final exam", "Teacher-made"];
const CHAPTERS = Array.from({ length: 12 }, (_, i) => `Chapter ${i + 1}`);

/**
 * Optional "where is this question from" details shown at the top of the question forms:
 * the exam year (e.g. 2015 E.C. national exam) and the chapter / unit. Both can be left empty.
 */
export default function SourceFields({ unit, year, onChange, units = [], compact = false }: {
  unit: string; year: string; onChange: (next: { unit?: string; year?: string }) => void; units?: string[]; compact?: boolean;
}) {
  const id = useId();
  const chapterList = [...new Set([...units.filter(Boolean), ...CHAPTERS])];
  const input = `mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal ${compact ? "py-2 text-sm" : "py-2.5"}`;
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-3.5">
      <p className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">Question source <span className="font-semibold normal-case tracking-normal text-slate-400">(optional)</span></p>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-bold">
          <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} className="text-royal" /> Exam year</span>
          <input value={year} onChange={(e) => onChange({ year: e.target.value })} list={`${id}-years`} maxLength={30} placeholder="e.g. 2015 E.C. national exam" className={input} />
          <datalist id={`${id}-years`}>{YEARS.map((y) => <option key={y} value={y} />)}</datalist>
        </label>
        <label className="text-sm font-bold">
          <span className="inline-flex items-center gap-1.5"><BookMarked size={14} className="text-royal" /> Chapter / unit</span>
          <input value={unit} onChange={(e) => onChange({ unit: e.target.value })} list={`${id}-chapters`} maxLength={60} placeholder="e.g. Chapter 3: Functions" className={input} />
          <datalist id={`${id}-chapters`}>{chapterList.map((c) => <option key={c} value={c} />)}</datalist>
        </label>
      </div>
    </div>
  );
}
