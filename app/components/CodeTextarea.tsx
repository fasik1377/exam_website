"use client";
import { Code2, Eye, EyeOff, SquareCode } from "lucide-react";
import { useRef, useState } from "react";
import RichText from "@/app/components/RichText";
import { LANGUAGES } from "@/lib/highlight";

const LANG_KEY = "codeLang";

/**
 * Textarea for question text and explanations with a small code toolbar:
 * insert a ``` code block in a chosen language, wrap a selection as `inline code`,
 * Tab indents inside code, and Preview shows exactly what students will see.
 */
export default function CodeTextarea({ value, onChange, rows = 3, placeholder, required, className = "", label }: {
  value: string; onChange: (value: string) => void; rows?: number; placeholder?: string; required?: boolean; className?: string; label?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);
  const [lang, setLang] = useState(() => { try { return localStorage.getItem(LANG_KEY) || "javascript"; } catch { return "javascript"; } });
  const hasCode = /```|`[^`]+`/.test(value);

  /** Replaces the current selection and puts the caret at `caret` (relative to the inserted text). */
  function splice(insert: string, caret: number, selectEnd?: number) {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length, end = el?.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + insert + value.slice(end));
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(start + caret, start + (selectEnd ?? caret)); });
  }
  function codeBlock() {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length, end = el?.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    const before = start > 0 && value[start - 1] !== "\n" ? "\n" : "";
    const open = `${before}\`\`\`${lang}\n`;
    const body = selected || "";
    setPreview(false);
    splice(`${open}${body}\n\`\`\`\n`, open.length, open.length + body.length);
  }
  function inlineCode() {
    const el = ref.current;
    const selected = value.slice(el?.selectionStart ?? 0, el?.selectionEnd ?? 0);
    setPreview(false);
    splice(`\`${selected || "code"}\``, 1, 1 + (selected || "code").length);
  }
  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Tab") return;
    // Tab indents only inside a code block, so keyboard users can still tab out of the field elsewhere.
    const before = value.slice(0, e.currentTarget.selectionStart);
    if (((before.match(/```/g) ?? []).length % 2) === 1) { e.preventDefault(); splice("  ", 2); }
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {label && <span className="text-sm font-bold">{label}</span>}
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <select value={lang} onChange={(e) => { setLang(e.target.value); try { localStorage.setItem(LANG_KEY, e.target.value); } catch {} }} aria-label="Code language"
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold">
            {LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
          <button type="button" onClick={codeBlock} title="Insert a code block (select code first to wrap it)" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold hover:border-royal hover:text-royal"><SquareCode size={14} /> Code block</button>
          <button type="button" onClick={inlineCode} title="Format the selection as `inline code`" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold hover:border-royal hover:text-royal"><Code2 size={14} /> Inline</button>
          <button type="button" onClick={() => setPreview((p) => !p)} aria-pressed={preview} className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-bold ${preview ? "border-royal bg-blue-50 text-royal" : "border-slate-200 hover:border-royal"}`}>{preview ? <EyeOff size={14} /> : <Eye size={14} />} Preview</button>
        </div>
      </div>
      {preview ? (
        <div className="mt-2 min-h-[5rem] rounded-xl border border-dashed border-royal/40 bg-slate-50 p-3 text-sm font-semibold">
          {value.trim() ? <RichText text={value} /> : <span className="text-slate-400">Nothing to preview yet.</span>}
        </div>
      ) : (
        <textarea ref={ref} required={required} value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown} rows={hasCode ? Math.max(rows, Math.min(18, value.split("\n").length + 1)) : rows} placeholder={placeholder} spellCheck={!hasCode}
          className={`mt-2 w-full rounded-xl border border-slate-200 p-3 font-normal ${hasCode ? "font-mono text-[13px] leading-6" : ""}`} />
      )}
      <p className="mt-1 text-[11px] text-slate-400">Code: use <b>Code block</b> (keeps indentation; Tab indents inside it) or wrap short code in `backticks`.</p>
    </div>
  );
}
