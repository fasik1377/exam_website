"use client";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Download, FileText, ListChecks, LoaderCircle, ToggleLeft, Trash2, UploadCloud, X } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { TEMPLATE, convertType, validate, type ParsedQuestion, type QuestionType } from "@/lib/questionParser";
import { useSubjects } from "@/app/components/useSubjects";
import GradePills from "@/app/components/GradePills";
import CodeTextarea from "@/app/components/CodeTextarea";
import ChoiceEditor from "./ChoiceEditor";
import { gradesFor } from "@/lib/subjects";

const ACCEPT = ".doc,.docx,.pdf,.txt";

type Props = { defaultSubject?: string; lockSubject?: boolean; onClose: () => void; onPublished: (count: number) => void };

/** Upload a .docx / .pdf / .txt exam paper, review the questions found in it, then publish them in one go. */
export default function ImportDialog({ defaultSubject, lockSubject = false, onClose, onPublished }: Props) {
  const SUBJECTS = useSubjects();
  const [meta, setMeta] = useState({ subject: defaultSubject || "Mathematics", grade: "Grade 12", unit: "", year: "2016 E.C." });
  const [stage, setStage] = useState<"upload" | "reading" | "review">("upload");
  const [fileName, setFileName] = useState("");
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const ready = questions.filter((q) => !q.issues.length);
  const grades = gradesFor(meta.subject, SUBJECTS);
  const grade = grades.includes(meta.grade as (typeof grades)[number]) ? meta.grade : grades[grades.length - 1];

  async function read(file: File) {
    setError("");
    if (!/\.(docx?|pdf|txt)$/i.test(file.name)) {
      setError("Upload a Word (.doc / .docx), PDF or .txt file.");
      return;
    }
    setFileName(file.name);
    setStage("reading");
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/questions/import", { method: "POST", body }).catch(() => null);
    const data = await response?.json().catch(() => ({}));
    if (!response?.ok) { setError(data?.error || "The file could not be read."); setStage("upload"); return; }
    setQuestions(data.questions);
    setWarnings(data.warnings ?? []);
    setStage("review");
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) read(file);
  }

  const setType = (index: number, type: QuestionType) =>
    setQuestions((list) => list.map((q, i) => (i === index ? convertType(q, type) : q)));
  const trueFalseCount = questions.filter((q) => q.type === "truefalse").length;

  const update = (index: number, change: Partial<ParsedQuestion>) =>
    setQuestions((list) => list.map((q, i) => (i === index ? validate({ ...q, ...change }) : q)));

  async function publish() {
    setPublishing(true);
    setError("");
    const response = await fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...meta, grade, unit: meta.unit || "General", questions: ready.map((q) => ({ type: q.type, question: q.prompt, choices: q.choices, correctAnswer: q.correctAnswer, explanation: q.explanation })) }),
    }).catch(() => null);
    const data = await response?.json().catch(() => ({}));
    setPublishing(false);
    if (!response?.ok) return setError(data?.error || "Publishing failed.");
    onPublished(data.inserted);
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([TEMPLATE], { type: "text/plain;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "question-template.txt" });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 overflow-y-auto bg-navy/50 p-4 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && stage !== "reading" && onClose()}>
      <motion.div initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }} className="mx-auto my-6 max-w-3xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-royal">Bulk upload</p>
            <h2 className="mt-1 text-2xl font-extrabold">Upload questions from a file</h2>
            <p className="mt-1 text-sm text-slate-500">Word (.doc / .docx), PDF or text files — multiple choice and true/false. You review every question before it is published.</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-slate-100" aria-label="Close"><X size={20} /></button>
        </div>

        {/* Shared details for every question in the file */}
        <div className="mt-6"><GradePills value={grade} allowed={grades} subject={meta.subject} label="Which grade are these questions for?" onChange={(g) => setMeta({ ...meta, grade: g })} /></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Select label="Subject" disabled={lockSubject} value={meta.subject} options={SUBJECTS.map((s) => s.name)} onChange={(v) => setMeta({ ...meta, subject: v })} />
          <label className="text-xs font-bold text-slate-600">Unit<input value={meta.unit} onChange={(e) => setMeta({ ...meta, unit: e.target.value })} placeholder="e.g. Unit 2: Functions" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal" /></label>
          <label className="text-xs font-bold text-slate-600">Exam year<input value={meta.year} onChange={(e) => setMeta({ ...meta, year: e.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal" /></label>
        </div>

        {error && <p className="mt-4 flex gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700"><AlertTriangle size={18} className="shrink-0" />{error}</p>}

        <AnimatePresence mode="wait">
          {stage !== "review" ? (
            <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <button
                type="button"
                disabled={stage === "reading"}
                onClick={() => input.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={`mt-5 grid w-full place-items-center rounded-3xl border-2 border-dashed px-6 py-12 text-center transition-colors ${dragging ? "border-royal bg-blue-50" : "border-slate-200 hover:border-royal/50 hover:bg-slate-50"}`}
              >
                {stage === "reading" ? (
                  <>
                    <LoaderCircle size={40} className="animate-spin text-royal" />
                    <p className="mt-4 font-bold">Reading {fileName}…</p>
                    <p className="text-sm text-slate-500">Finding questions, choices and answers</p>
                  </>
                ) : (
                  <>
                    <motion.span animate={{ y: [0, -6, 0] }} transition={{ duration: 2, repeat: Infinity }} className="grid h-16 w-16 place-items-center rounded-2xl bg-royal/10 text-royal"><UploadCloud size={32} /></motion.span>
                    <p className="mt-4 font-bold">Drop your file here or click to choose</p>
                    <p className="mt-1 text-sm text-slate-500">.doc · .docx · .pdf · .txt — up to 10 MB</p>
                  </>
                )}
              </button>
              <input ref={input} type="file" accept={ACCEPT} hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) read(f); e.target.value = ""; }} />

              <div className="mt-5 rounded-2xl bg-slate-50 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-bold">How to format your file</p>
                  <button type="button" onClick={downloadTemplate} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-royal shadow-sm ring-1 ring-slate-200 hover:ring-royal"><Download size={14} /> Download template</button>
                </div>
                <div className="mt-3 grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
                  <pre className="overflow-x-auto rounded-xl bg-white p-3 font-mono text-xs leading-5 text-navy ring-1 ring-slate-200">{`1. What is 2 + 3?\nA. 4\nB. 5\nC. 6\nD. 7\nAnswer: B\n\nPart II: True or False\n2. Every square is a rectangle.\nAnswer: True`}</pre>
                  <ul className="grid content-start gap-1.5">
                    <li>• Number each question: <b>1.</b> <b>1)</b> <b>Q1.</b></li>
                    <li>• Start choices with <b>A.</b> <b>B)</b> or <b>(c)</b> — one line or all on one line</li>
                    <li>• Give the answer with <b>Answer: B</b>, a <b>*</b> before the right choice, or an <b>Answer key</b> list at the end</li>
                    <li>• True/false: put them under a <b>True or False</b> heading, add <b>(True/False)</b>, or answer with <b>Answer: True</b> / <b>F</b></li>
                    <li>• <b>Explanation:</b> is optional</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 p-4">
                <FileText className="text-royal" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{fileName}</p>
                  <p className="text-sm text-slate-500">
                    {questions.length} found ({questions.length - trueFalseCount} multiple choice · {trueFalseCount} true/false) · <span className="font-semibold text-green-700">{ready.length} ready</span>
                    {questions.length - ready.length > 0 && <> · <span className="font-semibold text-amber-700">{questions.length - ready.length} need attention</span></>}
                  </p>
                </div>
                <button type="button" onClick={() => { setStage("upload"); setQuestions([]); setWarnings([]); }} className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-white">Choose another file</button>
              </div>
              {warnings.map((w) => <p key={w} className="mt-2 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800"><AlertTriangle size={15} className="shrink-0" />{w}</p>)}

              <ol className="mt-4 grid max-h-[55vh] gap-3 overflow-y-auto pr-1">
                {questions.map((q, i) => (
                  <li key={i} className={`rounded-2xl border p-4 ${q.issues.length ? "border-amber-300 bg-amber-50/40" : "border-slate-200"}`}>
                    <div className="flex items-start gap-2">
                      <span className="mt-2 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-navy text-[11px] font-bold text-white">{i + 1}</span>
                      <CodeTextarea className="min-w-0 flex-1 text-sm" rows={2} value={q.prompt} onChange={(prompt) => update(i, { prompt })} />
                      <button type="button" onClick={() => setQuestions((list) => list.filter((_, j) => j !== i))} className="mt-1.5 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Remove question"><Trash2 size={16} /></button>
                    </div>
                    <div className="mt-2 flex gap-1.5 pl-8">
                      {([["mcq", "Multiple choice", ListChecks], ["truefalse", "True / False", ToggleLeft]] as const).map(([value, label, Icon]) => (
                        <button key={value} type="button" onClick={() => setType(i, value)} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${q.type === value ? "bg-navy text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                          <Icon size={12} />{label}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 pl-8">
                      <ChoiceEditor compact type={q.type} name={`q${i}`} choices={q.choices} correctAnswer={q.correctAnswer} onChange={(next) => update(i, next)} />
                    </div>
                    <div className="mt-2 pl-8">
                      <input value={q.explanation} onChange={(e) => update(i, { explanation: e.target.value })} placeholder="Explanation (optional)" className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-sm" />
                      {q.issues.length > 0 && <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-amber-700"><AlertTriangle size={13} />{q.issues.join(" · ")}</p>}
                    </div>
                  </li>
                ))}
              </ol>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500">{questions.length - ready.length > 0 ? "Questions that still need attention will not be published." : "All questions are ready."}</p>
                <button type="button" disabled={!ready.length || publishing} onClick={publish} className="btn-shine inline-flex items-center gap-2 rounded-xl bg-navy px-5 py-3 text-sm font-bold text-white hover:bg-royal disabled:opacity-50">
                  {publishing ? <LoaderCircle size={17} className="animate-spin" /> : <CheckCircle2 size={17} />} Publish {ready.length} question{ready.length === 1 ? "" : "s"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

function Select({ label, value, options, onChange, disabled = false }: { label: string; value: string; options: string[]; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <label className="text-xs font-bold text-slate-600">
      {label}
      <select disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal disabled:bg-slate-50 disabled:text-slate-500">
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
}
