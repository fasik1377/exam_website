"use client";
import { GRADES } from "@/lib/subjects";

/** Grade 9–12 picker as large buttons; grades the subject isn't taught in are disabled. */
export default function GradePills({ value, onChange, allowed = [...GRADES], label = "Grade level", subject }: {
  value: string; onChange: (grade: string) => void; allowed?: readonly string[]; label?: string; subject?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label}>
      <p className="text-sm font-bold">{label}</p>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {GRADES.map((g) => {
          const on = value === g, ok = allowed.includes(g);
          return (
            <button key={g} type="button" role="radio" aria-checked={on} disabled={!ok} onClick={() => onChange(g)}
              title={ok ? g : `${subject ?? "This subject"} isn't offered in ${g}`}
              className={`rounded-xl border-2 py-2 text-center transition ${on ? "border-royal bg-blue-50 text-royal" : ok ? "border-slate-200 text-slate-600 hover:border-slate-300" : "cursor-not-allowed border-dashed border-slate-200 text-slate-300"}`}>
              <span className="block text-lg font-extrabold leading-5">{g.split(" ")[1]}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">Grade</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
