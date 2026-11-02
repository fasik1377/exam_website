import katex from "katex";
import "katex/contrib/mhchem"; // \ce{H2O}, \ce{A + B -> C} for chemistry

/**
 * Maths in question text, written in LaTeX:
 *   inline   $\frac{1}{2}$   or  \( … \)
 *   display  $$\sum_{i=1}^{n} i$$  or  \[ … \]
 * A "$" only opens maths when followed by a non-space and closes before a non-space that isn't
 * followed by a digit, so prices like "$5 and $10" stay plain text. Write \$ for a literal dollar.
 */
export type MathPart = { type: "text"; text: string } | { type: "math"; tex: string; display: boolean };

const MATH = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|(?<![\\$])\$(?!\s)((?:\\\$|[^$\n])+?)(?<!\s)\$(?!\d)/g;

export const hasMath = (text: string) => { MATH.lastIndex = 0; return MATH.test(text); };

export function splitMath(text: string): MathPart[] {
  const out: MathPart[] = [];
  let last = 0;
  MATH.lastIndex = 0;
  for (let m = MATH.exec(text); m; m = MATH.exec(text)) {
    if (m.index > last) out.push({ type: "text", text: text.slice(last, m.index) });
    const display = m[1] !== undefined || m[2] !== undefined;
    out.push({ type: "math", tex: (m[1] ?? m[2] ?? m[3] ?? m[4]).trim(), display });
    last = MATH.lastIndex;
  }
  if (last < text.length) out.push({ type: "text", text: text.slice(last) });
  return out.map((p) => (p.type === "text" ? { ...p, text: p.text.replace(/\\\$/g, "$") } : p));
}

const cache = new Map<string, string>();
/** KaTeX HTML for a formula. Invalid input shows the source in red instead of breaking the page. */
export function renderMath(tex: string, display: boolean) {
  const key = `${display ? "D" : "I"}${tex}`;
  let html = cache.get(key);
  if (html === undefined) {
    html = katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: "ignore", trust: false, output: "htmlAndMathml", maxExpand: 500, maxSize: 20 });
    if (cache.size > 500) cache.clear();
    cache.set(key, html);
  }
  return html;
}

/** Does this formula parse? (for the teacher's live check) */
export function mathError(tex: string): string | null {
  try { katex.renderToString(tex, { throwOnError: true, strict: "ignore", trust: false }); return null; }
  catch (e) { return e instanceof Error ? e.message.replace(/^KaTeX parse error: /, "") : "Invalid formula"; }
}

const PLAIN: [RegExp, string][] = [
  [/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)"], [/\\sqrt\[([^\]]*)\]\{([^{}]*)\}/g, "$1√($2)"], [/\\sqrt\{([^{}]*)\}/g, "√($1)"],
  [/\\(?:left|right|displaystyle|limits|,|;|!)/g, ""], [/\\cdot/g, "·"], [/\\times/g, "×"], [/\\div/g, "÷"], [/\\pm/g, "±"], [/\\le(?:q)?\b/g, "≤"], [/\\ge(?:q)?\b/g, "≥"],
  [/\\ne(?:q)?\b/g, "≠"], [/\\approx/g, "≈"], [/\\infty/g, "∞"], [/\\pi/g, "π"], [/\\theta/g, "θ"], [/\\alpha/g, "α"], [/\\beta/g, "β"], [/\\Delta/g, "Δ"], [/\\sum/g, "∑"],
  [/\\int/g, "∫"], [/\\to/g, "→"], [/\\circ/g, "°"], [/\\ce\{([^{}]*)\}/g, "$1"], [/\\text\{([^{}]*)\}/g, "$1"], [/\\([a-zA-Z]+)/g, "$1"], [/[{}]/g, ""],
];
/** One-line readable version of text with maths (lists, previews, emails). */
export function mathToPlain(text: string) {
  return splitMath(text).map((p) => (p.type === "text" ? p.text : PLAIN.reduce((s, [re, to]) => s.replace(re, to), p.tex))).join("");
}
