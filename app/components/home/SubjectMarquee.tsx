"use client";
import { Sparkles } from "lucide-react";
import { useSubjects } from "@/app/components/useSubjects";

/** Scrolling band of subject names (English + Amharic), using the live subject list. */
export default function SubjectMarquee() {
  const subjects = useSubjects();
  const items = [...subjects.map((s) => (s.amharic ? `${s.name} · ${s.amharic}` : s.name)), "Natural Science", "Social Science"];
  return (
    <div className="overflow-hidden border-b border-slate-200 bg-white py-4" aria-hidden>
      <div className="marquee gap-10 font-amharic text-sm font-bold text-slate-400">
        {[...items, ...items].map((item, i) => (
          <span key={i} className="flex items-center gap-10 whitespace-nowrap">{item}<Sparkles size={14} className="text-gold" /></span>
        ))}
      </div>
    </div>
  );
}
