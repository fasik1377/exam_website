"use client";
import { AnimatePresence, motion } from "framer-motion";
import { HelpCircle, Sigma, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MathView } from "@/app/components/RichText";

/** "|" marks where the cursor goes after inserting; `show` is how the button looks. */
type Item = { tex: string; show?: string; title: string };
const GROUPS: { id: string; label: string; items: Item[] }[] = [
  { id: "basic", label: "Basic", items: [
    { tex: "\\frac{|}{}", show: "\\frac{a}{b}", title: "Fraction" }, { tex: "^{|}", show: "x^{2}", title: "Power / exponent" }, { tex: "_{|}", show: "x_{n}", title: "Subscript" },
    { tex: "\\sqrt{|}", show: "\\sqrt{x}", title: "Square root" }, { tex: "\\sqrt[|]{}", show: "\\sqrt[n]{x}", title: "n-th root" }, { tex: "\\left| | \\right|", show: "|x|", title: "Absolute value" },
    { tex: "\\left( | \\right)", show: "\\left(x\\right)", title: "Brackets that grow" }, { tex: "\\pm ", show: "\\pm", title: "Plus or minus" }, { tex: "\\times ", show: "\\times", title: "Times" },
    { tex: "\\div ", show: "\\div", title: "Divide" }, { tex: "\\cdot ", show: "\\cdot", title: "Dot" }, { tex: "\\ne ", show: "\\ne", title: "Not equal" },
    { tex: "\\approx ", show: "\\approx", title: "Approximately" }, { tex: "\\le ", show: "\\le", title: "Less than or equal" }, { tex: "\\ge ", show: "\\ge", title: "Greater than or equal" },
    { tex: "\\infty", show: "\\infty", title: "Infinity" }, { tex: "^{\\circ}", show: "30^{\\circ}", title: "Degrees" }, { tex: "\\%", show: "\\%", title: "Percent" },
  ] },
  { id: "calculus", label: "Calculus", items: [
    { tex: "\\sum_{i=1}^{n} |", show: "\\sum_{i=1}^{n}", title: "Summation" }, { tex: "\\prod_{i=1}^{n} |", show: "\\prod_{i=1}^{n}", title: "Product" },
    { tex: "\\int | \\,dx", show: "\\int f\\,dx", title: "Integral" }, { tex: "\\int_{a}^{b} | \\,dx", show: "\\int_{a}^{b}", title: "Definite integral" },
    { tex: "\\lim_{x \\to |} ", show: "\\lim_{x\\to a}", title: "Limit" }, { tex: "\\frac{d}{dx}|", show: "\\frac{d}{dx}", title: "Derivative" },
    { tex: "\\frac{dy}{dx}", show: "\\frac{dy}{dx}", title: "dy/dx" }, { tex: "f'(|)", show: "f'(x)", title: "f prime" }, { tex: "\\partial ", show: "\\partial", title: "Partial" },
    { tex: "\\Delta ", show: "\\Delta", title: "Delta (change)" }, { tex: "\\nabla ", show: "\\nabla", title: "Nabla" }, { tex: "\\iint ", show: "\\iint", title: "Double integral" },
  ] },
  { id: "functions", label: "Functions", items: [
    { tex: "\\log |", show: "\\log", title: "Log (base 10)" }, { tex: "\\log_{|}", show: "\\log_{b}x", title: "Log base b" }, { tex: "\\ln |", show: "\\ln", title: "Natural log" },
    { tex: "e^{|}", show: "e^{x}", title: "Exponential" }, { tex: "\\sin |", show: "\\sin", title: "Sine" }, { tex: "\\cos |", show: "\\cos", title: "Cosine" },
    { tex: "\\tan |", show: "\\tan", title: "Tangent" }, { tex: "\\sin^{-1} |", show: "\\sin^{-1}", title: "Inverse sine" }, { tex: "f(|)", show: "f(x)", title: "Function" },
    { tex: "f^{-1}(|)", show: "f^{-1}(x)", title: "Inverse function" }, { tex: "(f \\circ g)(|)", show: "f\\circ g", title: "Composition" }, { tex: "\\binom{|}{}", show: "\\binom{n}{r}", title: "Combination nCr" },
  ] },
  { id: "greek", label: "Greek", items: ["alpha", "beta", "gamma", "delta", "epsilon", "theta", "lambda", "mu", "pi", "rho", "sigma", "tau", "phi", "omega", "Delta", "Sigma", "Omega", "Theta"].map((g) => ({ tex: `\\${g} `, show: `\\${g}`, title: g })) },
  { id: "sets", label: "Sets & logic", items: [
    { tex: "\\in ", show: "\\in", title: "Element of" }, { tex: "\\notin ", show: "\\notin", title: "Not an element" }, { tex: "\\subset ", show: "\\subset", title: "Subset" },
    { tex: "\\subseteq ", show: "\\subseteq", title: "Subset or equal" }, { tex: "\\cup ", show: "\\cup", title: "Union" }, { tex: "\\cap ", show: "\\cap", title: "Intersection" },
    { tex: "\\emptyset", show: "\\emptyset", title: "Empty set" }, { tex: "\\mathbb{R}", show: "\\mathbb{R}", title: "Real numbers" }, { tex: "\\mathbb{N}", show: "\\mathbb{N}", title: "Natural numbers" },
    { tex: "\\mathbb{Z}", show: "\\mathbb{Z}", title: "Integers" }, { tex: "\\forall ", show: "\\forall", title: "For all" }, { tex: "\\exists ", show: "\\exists", title: "There exists" },
    { tex: "\\Rightarrow ", show: "\\Rightarrow", title: "Implies" }, { tex: "\\Leftrightarrow ", show: "\\Leftrightarrow", title: "If and only if" }, { tex: "\\{ | \\}", show: "\\{a,b\\}", title: "Set braces" },
  ] },
  { id: "geometry", label: "Geometry", items: [
    { tex: "\\angle ", show: "\\angle ABC", title: "Angle" }, { tex: "\\triangle ", show: "\\triangle ABC", title: "Triangle" }, { tex: "\\perp ", show: "\\perp", title: "Perpendicular" },
    { tex: "\\parallel ", show: "\\parallel", title: "Parallel" }, { tex: "\\overline{|}", show: "\\overline{AB}", title: "Line segment" }, { tex: "\\vec{|}", show: "\\vec{v}", title: "Vector" },
    { tex: "\\cong ", show: "\\cong", title: "Congruent" }, { tex: "\\sim ", show: "\\sim", title: "Similar" }, { tex: "\\pi r^{2}", show: "\\pi r^{2}", title: "Circle area" },
    { tex: "\\begin{pmatrix} | & \\\\ & \\end{pmatrix}", show: "\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}", title: "2×2 matrix" },
    { tex: "\\begin{cases} | \\\\ \\end{cases}", show: "\\begin{cases}x+y=1\\\\x-y=3\\end{cases}", title: "System of equations" },
  ] },
  { id: "chemistry", label: "Chemistry", items: [
    { tex: "\\ce{|}", show: "\\ce{H2O}", title: "Chemical formula (type e.g. H2SO4)" }, { tex: "\\ce{| -> }", show: "\\ce{A -> B}", title: "Reaction arrow" },
    { tex: "\\ce{| <=> }", show: "\\ce{A <=> B}", title: "Equilibrium" }, { tex: "\\ce{|^{2+}}", show: "\\ce{Cu^{2+}}", title: "Ion charge" },
    { tex: "\\ce{2H2 + O2 -> 2H2O}", show: "\\ce{2H2 + O2 -> 2H2O}", title: "Example reaction" }, { tex: "\\Delta H", show: "\\Delta H", title: "Enthalpy change" },
  ] },
  { id: "physics", label: "Physics", items: [
    { tex: "\\vec{F} = m\\vec{a}", show: "\\vec{F}=m\\vec{a}", title: "Newton's 2nd law" }, { tex: "\\text{ m/s}^{2}", show: "\\text{m/s}^{2}", title: "Unit m/s²" },
    { tex: "\\Omega", show: "\\Omega", title: "Ohm" }, { tex: "\\lambda", show: "\\lambda", title: "Wavelength" }, { tex: "\\times 10^{|}", show: "\\times10^{n}", title: "Scientific notation" },
    { tex: "\\frac{1}{2}mv^{2}", show: "\\tfrac{1}{2}mv^{2}", title: "Kinetic energy" }, { tex: "\\Delta t", show: "\\Delta t", title: "Change in time" }, { tex: "\\mu ", show: "\\mu", title: "Micro / friction" },
  ] },
];

type Field = HTMLTextAreaElement | HTMLInputElement;
let lastField: Field | null = null;
if (typeof document !== "undefined") {
  document.addEventListener("focusin", (e) => {
    const t = e.target;
    if ((t instanceof HTMLTextAreaElement || t instanceof HTMLInputElement) && t.dataset.math !== undefined) lastField = t;
  });
}

/** Is the cursor already inside $…$ or $$…$$? */
function insideMath(text: string) {
  let inline = false, display = false;
  for (const m of text.replace(/\\\$/g, "").matchAll(/\$\$|\$/g)) {
    if (m[0] === "$$" && !inline) display = !display;
    else if (m[0] === "$" && !display) inline = !inline;
  }
  return inline || display;
}

/** Puts text into a React-controlled field and fires its onChange. */
function insertInto(field: Field, snippet: string) {
  const start = field.selectionStart ?? field.value.length, end = field.selectionEnd ?? field.value.length;
  const selected = field.value.slice(start, end);
  const wrap = !insideMath(field.value.slice(0, start));
  let body = snippet;
  let caret = body.indexOf("|");
  if (caret >= 0) body = body.slice(0, caret) + selected + body.slice(caret + 1);
  else caret = body.length;
  const text = wrap ? `$${body}$` : body;
  const caretAt = start + (wrap ? 1 : 0) + caret + (snippet.includes("|") ? selected.length : 0);
  const setter = Object.getOwnPropertyDescriptor(field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, "value")!.set!;
  setter.call(field, field.value.slice(0, start) + text + field.value.slice(end));
  field.dispatchEvent(new Event("input", { bubbles: true }));
  requestAnimationFrame(() => { field.focus(); field.setSelectionRange(caretAt, caretAt); });
}

/**
 * Maths keyboard for teachers: inserts LaTeX at the cursor of the last question/choice/explanation
 * field the teacher clicked, wrapped in $…$ when needed. Students see it typeset.
 */
export default function MathToolbar() {
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState(GROUPS[0].id);
  const [help, setHelp] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);

  function pick(item: Item) {
    const field = lastField && document.contains(lastField) ? lastField : (box.current?.closest("form, [role=dialog], li")?.querySelector<Field>("[data-math]") ?? null);
    if (field) insertInto(field, item.tex);
  }

  const items = GROUPS.find((g) => g.id === group)!.items;
  return (
    <div ref={box} className="relative">
      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setOpen((o) => !o)} aria-expanded={open} title="Insert maths: fractions, powers, ∑, ∫, log, Greek letters, chemistry…"
        className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-bold ${open ? "border-royal bg-blue-50 text-royal" : "border-slate-200 hover:border-royal hover:text-royal"}`}>
        <Sigma size={14} /> Math
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} onMouseDown={(e) => e.preventDefault() /* keep the cursor in the teacher's field */}
            className="absolute right-0 z-50 mt-1.5 w-[min(92vw,26rem)] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl">
            <div className="flex items-center gap-2">
              <p className="flex-1 text-xs font-bold text-slate-500">Click where the maths should go, then pick a symbol.</p>
              <button type="button" onClick={() => setHelp((h) => !h)} title="How to write maths" className="rounded-lg p-1 text-slate-400 hover:text-royal"><HelpCircle size={16} /></button>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:text-navy"><X size={16} /></button>
            </div>
            {help && (
              <div className="mt-2 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                Maths is written between dollar signs: <code className="font-mono">$\frac{"{1}{2}"}$</code> shows <MathView tex="\frac{1}{2}" display={false} />.
                Use <code className="font-mono">$$…$$</code> for a formula on its own line. Students see it typeset; your Preview shows exactly how.
                Word equations in uploaded .docx files are converted automatically.
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-1">
              {GROUPS.map((g) => (
                <button key={g.id} type="button" onClick={() => setGroup(g.id)} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${group === g.id ? "bg-navy text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{g.label}</button>
              ))}
            </div>
            <div className="mt-2 grid max-h-64 grid-cols-4 gap-1.5 overflow-y-auto sm:grid-cols-5">
              {items.map((item) => (
                <button key={item.title} type="button" title={item.title} onClick={() => pick(item)}
                  className="grid min-h-11 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white px-1 py-1.5 text-navy hover:border-royal hover:bg-blue-50">
                  <MathView tex={item.show ?? item.tex.replace("|", "x")} display={false} />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
