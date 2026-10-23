"use client";
import { motion } from "framer-motion";
import { ListChecks, LoaderCircle, Save, ToggleLeft, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import GradePills from "@/app/components/GradePills";
import { useSubjects } from "@/app/components/useSubjects";
import { gradesFor } from "@/lib/subjects";
import ChoiceEditor from "./ChoiceEditor";
import type { QuestionRow } from "./QuestionsPanel";

/** Edit a published question: text, choices (add / remove), correct answer, explanation, grade, unit, year. */
export default function EditQuestionDialog({ question, subject, onClose, onSaved }: {
  question: QuestionRow; subject: string; onClose: () => void; onSaved: (text: string) => void;
}) {
  const subjects = useSubjects();
  const [form, setForm] = useState({
    type: question.type, prompt: question.prompt, choices: [...question.choices], correctAnswer: question.correctAnswer,
    explanation: question.explanation, grade: question.grade, unit: question.unit, year: question.year,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const grades = gradesFor(subject, subjects);

  function setType(type: "mcq" | "truefalse") {
    if (type === form.type) return;
    setForm(type === "truefalse"
      ? { ...form, type, choices: ["True", "False"], correctAnswer: 0 }
      : { ...form, type, choices: question.type === "mcq" ? [...question.choices] : ["", "", "", ""], correctAnswer: question.type === "mcq" ? question.correctAnswer : -1 });
  }

  const problem = !form.prompt.trim() ? "Write the question text."
    : form.choices.length < 2 || form.choices.some((c) => !c.trim()) ? "Every choice needs text (at least two choices)."
    : form.correctAnswer < 0 || form.correctAnswer >= form.choices.length ? "Mark the correct answer."
    : "";

  async function save(event: FormEvent) {
    event.preventDefault();
    if (problem) return setError(problem);
    setSaving(true);
    setError("");
    const response = await fetch("/api/questions", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: question.id, type: form.type, question: form.prompt, choices: form.choices.map((c) => c.trim()), correctAnswer: form.correctAnswer, explanation: form.explanation, grade: form.grade, unit: form.unit, year: form.year }),
    }).catch(() => null);
    const data = await response?.json().catch(() => ({}));
    setSaving(false);
    if (!response?.ok) return setError(data?.error || "Could not save the question.");
    onSaved(form.correctAnswer !== question.correctAnswer && question.answers ? "Question updated — earlier student answers were re-marked with the new correct answer." : "Question updated.");
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 overflow-y-auto bg-navy/50 p-4 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <motion.form onSubmit={save} initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }} className="mx-auto my-6 max-w-2xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-royal">{subject}</p>
            <h2 className="mt-1 text-2xl font-extrabold">Edit question</h2>
            {question.answers > 0 && <p className="mt-1 text-xs text-slate-500">Answered {question.answers}× by students. Changing the correct answer re-marks those answers.</p>}
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-slate-100" aria-label="Close"><X size={20} /></button>
        </div>

        <div className="mt-5"><GradePills value={form.grade} allowed={grades} subject={subject} label="Grade" onChange={(grade) => setForm({ ...form, grade })} /></div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold">Unit<input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-normal" /></label>
          <label className="text-sm font-bold">Exam year<input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-normal" /></label>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5" role="radiogroup" aria-label="Question type">
          {([["mcq", "Multiple choice", ListChecks], ["truefalse", "True / False", ToggleLeft]] as const).map(([value, label, Icon]) => (
            <button key={value} type="button" role="radio" aria-checked={form.type === value} onClick={() => setType(value)} className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold ${form.type === value ? "bg-white text-navy shadow-sm" : "text-slate-500"}`}>
              <Icon size={16} />{label}
            </button>
          ))}
        </div>

        <label className="mt-5 block text-sm font-bold">Question
          <textarea required value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} rows={3} className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-normal" />
        </label>
        <p className="mt-4 text-sm font-bold">{form.type === "truefalse" ? "Correct answer" : "Choices"}</p>
        <div className="mt-2"><ChoiceEditor type={form.type} name="edit" choices={form.choices} correctAnswer={form.correctAnswer} onChange={(next) => setForm({ ...form, ...next })} /></div>
        <label className="mt-5 block text-sm font-bold">Explanation <span className="font-normal text-slate-400">(optional)</span>
          <textarea value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} rows={2} className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-normal" />
        </label>

        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 py-3 text-sm font-bold hover:bg-slate-50">Cancel</button>
          <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy py-3 text-sm font-bold text-white hover:bg-royal disabled:opacity-50">
            {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />} Save changes
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
