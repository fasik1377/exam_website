"use client";
import { Check, Copy } from "lucide-react";
import { Fragment, useState } from "react";
import { highlight, languageLabel, segments, type TokenKind } from "@/lib/highlight";

const COLOR: Record<TokenKind, string> = {
  plain: "text-slate-100", kw: "text-[#c792ea]", str: "text-[#c3e88d]", com: "italic text-[#7f8ca3]", num: "text-[#f78c6c]",
  fn: "text-[#82aaff]", tag: "text-[#f07178]", attr: "text-[#ffcb6b]", prop: "text-[#89ddff]", punct: "text-[#89ddff]",
};

/** Inline `code` inside normal text. */
function InlineText({ text }: { text: string }) {
  const parts = text.split(/(`[^`\n]+`)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("`") && part.endsWith("`") && part.length > 2
          ? <code key={i} className="code-inline rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[0.9em] text-[#c7254e]">{part.slice(1, -1)}</code>
          : <Fragment key={i}>{part}</Fragment>,
      )}
    </>
  );
}

/** Syntax-highlighted code block with language label, line numbers and copy button. */
export function CodeBlock({ code, lang, compact = false }: { code: string; lang: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const lines = highlight(code, lang);
  async function copy(e: React.MouseEvent) {
    e.stopPropagation();
    try { await navigator.clipboard.writeText(code); setCopied(true); window.setTimeout(() => setCopied(false), 1500); } catch {}
  }
  return (
    <div className={`code-block not-italic my-2 overflow-hidden rounded-xl border border-[#1f2b44] bg-[#0d1526] text-left shadow-sm ${compact ? "text-[12.5px]" : "text-[13.5px]"}`}>
      <div className="flex items-center justify-between border-b border-[#1f2b44] bg-[#111c31] px-3 py-1.5">
        <span className="flex items-center gap-1.5">
          <i className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" /><i className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" /><i className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">{languageLabel(lang)}</span>
        </span>
        {!compact && (
          <span role="button" tabIndex={0} onClick={copy} onKeyDown={(e) => e.key === "Enter" && copy(e as unknown as React.MouseEvent)} className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold text-slate-400 hover:bg-white/10 hover:text-white">
            {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
          </span>
        )}
      </div>
      <pre className="overflow-x-auto py-2.5 font-mono leading-6"><code className="grid">
        {lines.map((line, i) => (
          <span key={i} className="flex">
            <span className="w-9 shrink-0 select-none pr-3 text-right text-[#4b5872]">{i + 1}</span>
            <span className="whitespace-pre pr-4">{line.length ? line.map((t, k) => <span key={k} className={COLOR[t.kind]}>{t.text}</span>) : " "}</span>
          </span>
        ))}
      </code></pre>
    </div>
  );
}

/**
 * Question text with ``` code blocks and `inline code`. Plain text keeps its line breaks.
 * `compact` is for answer choices (smaller blocks, no copy button).
 */
export default function RichText({ text, compact = false, className = "" }: { text: string; compact?: boolean; className?: string }) {
  const parts = segments(text);
  if (parts.length === 1 && parts[0].type === "text") return <span className={`whitespace-pre-line ${className}`}><InlineText text={parts[0].text} /></span>;
  return (
    <span className={`block ${className}`}>
      {parts.map((p, i) => p.type === "code"
        ? <CodeBlock key={i} code={p.code} lang={p.lang} compact={compact} />
        : p.text.trim() ? <span key={i} className="block whitespace-pre-line"><InlineText text={p.text.replace(/^\n+|\n+$/g, "")} /></span> : null)}
    </span>
  );
}
