"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Calculator as CalcIcon, Delete, FlaskConical, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CONSTANTS, evaluate, formatResult, type AngleMode } from "@/lib/calc";

type Key = { label: string; insert?: string; action?: "clear" | "back" | "equals"; tone?: "fn" | "num" | "op" | "eq" | "danger"; title?: string };

const KEYS: Key[] = [
  { label: "sin", insert: "sin(", tone: "fn" }, { label: "cos", insert: "cos(", tone: "fn" }, { label: "tan", insert: "tan(", tone: "fn" }, { label: "π", insert: "π", tone: "fn", title: "Pi (3.14159…)" }, { label: "e", insert: "e", tone: "fn", title: "Euler's number (2.71828…)" },
  { label: "sin⁻¹", insert: "asin(", tone: "fn" }, { label: "cos⁻¹", insert: "acos(", tone: "fn" }, { label: "tan⁻¹", insert: "atan(", tone: "fn" }, { label: "(", insert: "(", tone: "fn" }, { label: ")", insert: ")", tone: "fn" },
  { label: "x²", insert: "^2", tone: "fn", title: "Square" }, { label: "xʸ", insert: "^", tone: "fn", title: "Power" }, { label: "√", insert: "√(", tone: "fn", title: "Square root" }, { label: "∛", insert: "∛(", tone: "fn", title: "Cube root" }, { label: "x!", insert: "!", tone: "fn", title: "Factorial" },
  { label: "log", insert: "log(", tone: "fn", title: "Log base 10" }, { label: "ln", insert: "ln(", tone: "fn", title: "Natural log" }, { label: "10ˣ", insert: "10^", tone: "fn" }, { label: "eˣ", insert: "e^", tone: "fn" }, { label: "%", insert: "%", tone: "fn", title: "Percent (÷100)" },
  { label: "7", insert: "7", tone: "num" }, { label: "8", insert: "8", tone: "num" }, { label: "9", insert: "9", tone: "num" }, { label: "÷", insert: "÷", tone: "op" }, { label: "AC", action: "clear", tone: "danger", title: "Clear" },
  { label: "4", insert: "4", tone: "num" }, { label: "5", insert: "5", tone: "num" }, { label: "6", insert: "6", tone: "num" }, { label: "×", insert: "×", tone: "op" }, { label: "⌫", action: "back", tone: "danger", title: "Delete" },
  { label: "1", insert: "1", tone: "num" }, { label: "2", insert: "2", tone: "num" }, { label: "3", insert: "3", tone: "num" }, { label: "−", insert: "−", tone: "op" }, { label: "Ans", insert: "Ans", tone: "fn", title: "Last answer" },
  { label: "0", insert: "0", tone: "num" }, { label: ".", insert: ".", tone: "num" }, { label: "×10ˣ", insert: "E", tone: "fn", title: "Scientific notation, e.g. 6.02×10²³ = 6.02E23" }, { label: "+", insert: "+", tone: "op" }, { label: "=", action: "equals", tone: "eq" },
];
const TONE: Record<NonNullable<Key["tone"]>, string> = {
  fn: "bg-slate-100 text-navy hover:bg-slate-200 text-[13px]",
  num: "bg-white text-navy ring-1 ring-slate-200 hover:bg-slate-50 text-base",
  op: "bg-blue-50 text-royal hover:bg-blue-100 text-lg",
  eq: "bg-navy text-white hover:bg-royal text-lg",
  danger: "bg-red-50 text-red-600 hover:bg-red-100 text-sm",
};
const ANGLE_KEY = "calcAngle";

/** Floating scientific calculator with a constants sheet, for maths and science practice. */
export default function Calculator() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"calc" | "constants">("calc");
  const [expr, setExpr] = useState("");
  const [angle, setAngle] = useState<AngleMode>(() => { try { return localStorage.getItem(ANGLE_KEY) === "rad" ? "rad" : "deg"; } catch { return "deg"; } });
  const [ans, setAns] = useState(0);
  const [history, setHistory] = useState<{ expr: string; result: string }[]>([]);
  const [error, setError] = useState("");
  const [fresh, setFresh] = useState(false); // just pressed "=": the next digit starts a new expression
  const input = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);

  // Restore the caret after inserting text at it.
  useEffect(() => {
    if (caret.current === null || !input.current) return;
    input.current.setSelectionRange(caret.current, caret.current);
    caret.current = null;
  }, [expr]);

  let preview = "";
  try { if (expr.trim() && !fresh) preview = formatResult(evaluate(expr, { angle, ans })); } catch { /* incomplete expression */ }

  function insert(text: string) {
    setError("");
    const el = input.current;
    const startsNew = fresh && /^[\d.(πe√∛]|^(sin|cos|tan|asin|acos|atan|log|ln|Ans)/.test(text);
    const base = fresh ? (startsNew ? "" : "Ans") : expr;
    const at = fresh ? base.length : el?.selectionStart ?? base.length;
    const end = fresh ? base.length : el?.selectionEnd ?? base.length;
    const next = base.slice(0, at) + text + base.slice(end);
    caret.current = at + text.length;
    setFresh(false);
    setExpr(next);
    el?.focus({ preventScroll: true });
  }
  function equals() {
    if (!expr.trim()) return;
    try {
      const value = evaluate(expr, { angle, ans });
      const shown = formatResult(value);
      setHistory((h) => [{ expr, result: shown }, ...h].slice(0, 4));
      setAns(value);
      setExpr(shown === "∞" || shown === "−∞" ? "" : shown.replace("−", "-"));
      setFresh(true);
      setError("");
    } catch (e) {
      setError((e as Error).message || "Check the expression");
    }
  }
  function press(k: Key) {
    if (k.action === "clear") { setExpr(""); setError(""); setFresh(false); return; }
    if (k.action === "back") { setFresh(false); setExpr((v) => v.slice(0, -1)); setError(""); return; }
    if (k.action === "equals") return equals();
    insert(k.insert!);
  }
  function setMode(m: AngleMode) {
    setAngle(m);
    try { localStorage.setItem(ANGLE_KEY, m); } catch {}
  }

  return (
    <>
      <motion.button type="button" onClick={() => setOpen((o) => !o)} whileTap={{ scale: 0.95 }} aria-expanded={open} aria-controls="calculator-panel"
        className={`fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold shadow-xl transition ${open ? "bg-white text-navy ring-1 ring-slate-200" : "bg-navy text-white hover:bg-royal"}`}>
        {open ? <X size={18} /> : <CalcIcon size={18} />}<span>{open ? "Close" : "Calculator"}</span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div id="calculator-panel" role="dialog" aria-label="Scientific calculator" initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.97 }} transition={{ duration: 0.2 }}
            onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
            className="fixed inset-x-2 bottom-20 z-40 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-3 shadow-2xl sm:inset-x-auto sm:right-5 sm:w-[360px]">
            <div className="flex items-center justify-between gap-2">
              <div className="inline-grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-xs font-bold">
                <button type="button" onClick={() => setTab("calc")} className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 ${tab === "calc" ? "bg-white text-navy shadow-sm" : "text-slate-500"}`}><CalcIcon size={13} /> Calculator</button>
                <button type="button" onClick={() => setTab("constants")} className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 ${tab === "constants" ? "bg-white text-navy shadow-sm" : "text-slate-500"}`}><FlaskConical size={13} /> Constants</button>
              </div>
              <div className="inline-grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-[11px] font-extrabold" role="radiogroup" aria-label="Angle unit">
                {(["deg", "rad"] as const).map((m) => (
                  <button key={m} type="button" role="radio" aria-checked={angle === m} onClick={() => setMode(m)} title={m === "deg" ? "Angles in degrees" : "Angles in radians"} className={`rounded-lg px-2.5 py-1.5 uppercase ${angle === m ? "bg-navy text-white" : "text-slate-500"}`}>{m}</button>
                ))}
              </div>
            </div>

            {/* Display */}
            <div className="mt-3 rounded-2xl bg-[#0B1F3A] p-3 text-white">
              <div className="min-h-[2.25rem] space-y-0.5 text-right text-[11px] text-white/45">
                {history.slice(0, 2).reverse().map((h, i) => <p key={i} className="truncate tabular-nums">{h.expr} = <b className="text-white/70">{h.result}</b></p>)}
              </div>
              <input ref={input} value={expr} inputMode="none" spellCheck={false} autoComplete="off" aria-label="Expression"
                onChange={(e) => { setExpr(e.target.value); setFresh(false); setError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === "=") { e.preventDefault(); equals(); } }}
                placeholder="0" className="mt-1 w-full bg-transparent text-right font-mono text-2xl font-bold tracking-tight outline-none placeholder:text-white/30" />
              <p className={`mt-0.5 h-5 truncate text-right text-sm tabular-nums ${error ? "font-semibold text-red-300" : "text-gold"}`}>{error || (preview && preview !== expr ? `= ${preview}` : "")}</p>
            </div>

            {tab === "calc" ? (
              <div className="mt-3 grid grid-cols-5 gap-1.5">
                {KEYS.map((k) => (
                  <button key={k.label} type="button" title={k.title} onClick={() => press(k)} onMouseDown={(e) => e.preventDefault()}
                    className={`h-10 rounded-xl font-bold transition active:scale-95 ${TONE[k.tone ?? "num"]}`}>
                    {k.label === "⌫" ? <Delete size={16} className="mx-auto" /> : k.label}
                  </button>
                ))}
              </div>
            ) : (
              <ul className="mt-3 grid max-h-[340px] gap-1.5 overflow-y-auto pr-1">
                {CONSTANTS.map((c) => (
                  <li key={c.symbol}>
                    <button type="button" onClick={() => { insert(`(${c.value})`); setTab("calc"); }} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-left hover:border-royal hover:bg-blue-50/40">
                      <span className="grid h-9 w-11 shrink-0 place-items-center rounded-lg bg-navy font-serif text-sm font-bold italic text-gold">{c.symbol}</span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold">{c.name}</span><span className="font-mono text-xs text-slate-500">{c.value.replace("E", " × 10^")} {c.unit}</span></span>
                      <span className="text-[11px] font-bold text-royal">Insert</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-center text-[10px] text-slate-400">Type or tap · Enter = · {angle === "deg" ? "Angles in degrees" : "Angles in radians"} · Ans = last result</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
