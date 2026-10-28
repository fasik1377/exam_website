"use client";
import { Check, Plus, Trash2, X } from "lucide-react";

/**
 * One answer choice. Grows to fit multi-line text so a choice can hold a ``` code block;
 * code (``` or `backticks`) switches to a monospaced font.
 */
export function ChoiceInput({ value, onChange, placeholder, label, required, className = "" }: { value: string; onChange: (v: string) => void; placeholder: string; label: string; required?: boolean; className?: string }) {
  const code = /```|`/.test(value);
  return (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={label} required={required} spellCheck={!code}
      rows={Math.min(12, value.split("\n").length)}
      className={`min-w-0 flex-1 resize-none bg-transparent outline-none ${code ? "font-mono text-[13px] leading-6" : ""} ${className}`} />
  );
}

export const MIN_CHOICES = 2;
export const MAX_CHOICES = 8;
const letter = (i: number) => String.fromCharCode(65 + i);

/**
 * Edit the answer options of a question: type each choice, add more (up to 8), remove extras
 * (down to 2) and mark the correct one. True/false questions show just the two buttons.
 */
export default function ChoiceEditor({ type, choices, correctAnswer, onChange, name, compact = false }: {
  type: "mcq" | "truefalse"; choices: string[]; correctAnswer: number; name: string; compact?: boolean;
  onChange: (next: { choices: string[]; correctAnswer: number }) => void;
}) {
  if (type === "truefalse") {
    return (
      <div className="grid grid-cols-2 gap-2">
        {["True", "False"].map((label, c) => (
          <button key={label} type="button" onClick={() => onChange({ choices: ["True", "False"], correctAnswer: c })}
            className={`flex items-center justify-center gap-1.5 rounded-xl border-2 py-2 text-sm font-extrabold ${correctAnswer === c ? (c === 0 ? "border-green-500 bg-green-50 text-green-700" : "border-red-400 bg-red-50 text-red-600") : "border-slate-200 bg-white text-slate-400"}`}>
            {c === 0 ? <Check size={15} /> : <X size={15} />}{label}
          </button>
        ))}
      </div>
    );
  }

  const edit = (i: number, text: string) => onChange({ choices: choices.map((v, k) => (k === i ? text : v)), correctAnswer });
  const remove = (i: number) => onChange({
    choices: choices.filter((_, k) => k !== i),
    // Keep the same choice marked correct; if the correct one is removed, the teacher picks again.
    correctAnswer: i === correctAnswer ? -1 : i < correctAnswer ? correctAnswer - 1 : correctAnswer,
  });
  const add = () => onChange({ choices: [...choices, ""], correctAnswer });

  return (
    <div>
      <div className={`grid gap-2 ${compact ? "sm:grid-cols-2" : ""}`}>
        {choices.map((choice, i) => {
          const right = correctAnswer === i;
          return (
            <div key={i} data-choice={`${name}-${i}`} className={`flex items-center gap-2 rounded-xl border bg-white px-2 py-1.5 text-sm ${right ? "border-green-400 ring-2 ring-green-100" : "border-slate-200"}`}>
              <button type="button" onClick={() => onChange({ choices, correctAnswer: i })} aria-pressed={right} title={right ? "Correct answer" : `Mark ${letter(i)} as the correct answer`}
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-extrabold ${right ? "bg-green-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-green-100 hover:text-green-700"}`}>
                {right ? <Check size={14} /> : letter(i)}
              </button>
              <ChoiceInput value={choice} onChange={(v) => edit(i, v)} placeholder={`Choice ${letter(i)}`} label={`Choice ${letter(i)}`} className={!choice.trim() ? "placeholder:text-amber-500" : ""} />
              <button type="button" disabled={choices.length <= MIN_CHOICES} onClick={() => remove(i)} title={choices.length <= MIN_CHOICES ? "A question needs at least two choices" : `Remove choice ${letter(i)}`} aria-label={`Remove choice ${letter(i)}`}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent">
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <button type="button" disabled={choices.length >= MAX_CHOICES} onClick={add}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-royal/50 px-3 py-1.5 text-xs font-bold text-royal hover:bg-blue-50 disabled:opacity-40">
          <Plus size={14} /> Add choice {choices.length < MAX_CHOICES ? letter(choices.length) : ""}
        </button>
        <span className="text-[11px] text-slate-400">Click a letter to mark the correct answer · {MIN_CHOICES}–{MAX_CHOICES} choices · `code` allowed</span>
      </div>
    </div>
  );
}
