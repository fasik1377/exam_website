"use client";
import { useRef } from "react";
import { highlight, type TokenKind } from "@/lib/highlight";

const COLOR: Record<TokenKind, string> = {
  plain: "#e2e8f0", kw: "#c792ea", str: "#c3e88d", com: "#7f8ca3", num: "#f78c6c",
  fn: "#82aaff", tag: "#f07178", attr: "#ffcb6b", prop: "#89ddff", punct: "#89ddff",
};
const INDENT = "  ";

/**
 * Lightweight code editor: a transparent textarea over a syntax-highlighted copy of the text.
 * Tab / Shift+Tab indent, Enter keeps the indentation, Ctrl/⌘+Enter runs.
 */
export default function CodeEditor({ value, onChange, lang, onRun, label }: {
  value: string; onChange: (value: string) => void; lang: "html" | "css" | "javascript"; onRun?: () => void; label: string;
}) {
  const area = useRef<HTMLTextAreaElement>(null);
  const layer = useRef<HTMLPreElement>(null);
  const gutter = useRef<HTMLDivElement>(null);
  const lines = highlight(value, lang);

  function sync() {
    const el = area.current;
    if (!el) return;
    if (layer.current) { layer.current.scrollTop = el.scrollTop; layer.current.scrollLeft = el.scrollLeft; }
    if (gutter.current) gutter.current.scrollTop = el.scrollTop;
  }
  /** Replaces [start, end) with text and places the selection. */
  function replace(start: number, end: number, text: string, selStart: number, selEnd = selStart) {
    onChange(value.slice(0, start) + text + value.slice(end));
    requestAnimationFrame(() => { area.current?.setSelectionRange(selStart, selEnd); sync(); });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    const { selectionStart: start, selectionEnd: end } = el;
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); onRun?.(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); onRun?.(); return; }
    if (e.key === "Tab") {
      e.preventDefault();
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      if (start === end && !e.shiftKey) return replace(start, end, INDENT, start + INDENT.length);
      // Indent / outdent every selected line.
      const block = value.slice(lineStart, end);
      const changed = e.shiftKey ? block.replace(/^ {1,2}/gm, "") : block.replace(/^/gm, INDENT);
      const firstShift = e.shiftKey ? -(block.match(/^ {1,2}/)?.[0].length ?? 0) : INDENT.length;
      return replace(lineStart, end, changed, Math.max(lineStart, start + firstShift), lineStart + changed.length);
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const indent = /^[ \t]*/.exec(value.slice(lineStart, start))?.[0] ?? "";
      const before = value[start - 1], after = value[end];
      const opens = before === "{" || before === "(" || before === "[" || (lang === "html" && /<([a-z][\w-]*)[^>]*>$/i.test(value.slice(lineStart, start)) && !/<\/|\/>$|<(br|img|input|meta|link|hr)\b/i.test(value.slice(lineStart, start)));
      const closes = (before === "{" && after === "}") || (before === "(" && after === ")") || (before === "[" && after === "]") || (lang === "html" && value.slice(end).startsWith("</"));
      if (opens && closes) {
        const text = `\n${indent}${INDENT}\n${indent}`;
        return replace(start, end, text, start + indent.length + INDENT.length + 1);
      }
      const text = `\n${indent}${opens ? INDENT : ""}`;
      return replace(start, end, text, start + text.length);
    }
    // Auto-close brackets and quotes (when nothing is selected and the next char isn't a word).
    const pairs: Record<string, string> = { "{": "}", "(": ")", "[": "]", '"': '"', "'": "'", "`": "`" };
    if (pairs[e.key] && start === end && !/\w/.test(value[end] ?? "")) {
      if ((e.key === '"' || e.key === "'" || e.key === "`") && value[start] === e.key) { e.preventDefault(); return replace(start, end, "", start + 1); }
      e.preventDefault();
      return replace(start, end, e.key + pairs[e.key], start + 1);
    }
    if ((e.key === "}" || e.key === ")" || e.key === "]") && start === end && value[start] === e.key) { e.preventDefault(); return replace(start, end, "", start + 1); }
    // HTML: typing ">" after an opening tag adds the closing tag.
    if (lang === "html" && e.key === ">" && start === end) {
      const m = /<([a-zA-Z][\w-]*)(?:\s[^<>]*)?$/.exec(value.slice(0, start));
      if (m && !/^(br|img|input|meta|link|hr|area|base|col|source|wbr)$/i.test(m[1]) && value[start - 1] !== "/") {
        e.preventDefault();
        return replace(start, end, `></${m[1]}>`, start + 1);
      }
    }
  }

  return (
    <div className="relative flex h-full min-h-0 overflow-hidden bg-[#0d1526] font-mono text-[13px] leading-6">
      <div ref={gutter} aria-hidden className="w-11 shrink-0 select-none overflow-hidden border-r border-[#1f2b44] bg-[#0b1220] py-3 pr-2 text-right text-[#4b5872]">
        {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
        <div className="h-24" />
      </div>
      <div className="relative min-w-0 flex-1">
        <pre ref={layer} aria-hidden className="pointer-events-none absolute inset-0 m-0 overflow-hidden whitespace-pre p-3">
          {lines.map((line, i) => (
            <div key={i}>{line.length ? line.map((t, k) => <span key={k} style={{ color: COLOR[t.kind], fontStyle: t.kind === "com" ? "italic" : undefined }}>{t.text}</span>) : " "}</div>
          ))}
          <div className="h-24" />
        </pre>
        <textarea ref={area} value={value} aria-label={label} spellCheck={false} autoCapitalize="off" autoComplete="off" autoCorrect="off" wrap="off"
          onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown} onScroll={sync}
          className="absolute inset-0 h-full w-full resize-none overflow-auto whitespace-pre bg-transparent p-3 pb-24 text-transparent caret-white outline-none selection:bg-[#2b4a7a]" />
      </div>
    </div>
  );
}
