import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import JSZip from "jszip";

/**
 * Word equations (OMML, "Insert → Equation") are not plain text, so text extraction drops them —
 * fractions, roots, ∑, ∫, limits … simply vanished. This converts every equation in a .docx to
 * LaTeX ($…$ inline, $$…$$ on its own line) before the document is read, so the questions keep
 * their maths and the site can typeset it.
 */

type El = Element;
const M = "http://schemas.openxmlformats.org/officeDocument/2006/math";
const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

const SYMBOLS: Record<string, string> = {
  "α": "\\alpha", "β": "\\beta", "γ": "\\gamma", "δ": "\\delta", "ε": "\\varepsilon", "ϵ": "\\epsilon", "ζ": "\\zeta", "η": "\\eta", "θ": "\\theta", "ϑ": "\\vartheta",
  "ι": "\\iota", "κ": "\\kappa", "λ": "\\lambda", "μ": "\\mu", "ν": "\\nu", "ξ": "\\xi", "π": "\\pi", "ρ": "\\rho", "σ": "\\sigma", "τ": "\\tau", "υ": "\\upsilon",
  "φ": "\\varphi", "ϕ": "\\phi", "χ": "\\chi", "ψ": "\\psi", "ω": "\\omega", "Γ": "\\Gamma", "Δ": "\\Delta", "Θ": "\\Theta", "Λ": "\\Lambda", "Ξ": "\\Xi", "Π": "\\Pi",
  "Σ": "\\Sigma", "Φ": "\\Phi", "Ψ": "\\Psi", "Ω": "\\Omega",
  "∞": "\\infty", "±": "\\pm", "∓": "\\mp", "×": "\\times", "÷": "\\div", "·": "\\cdot", "⋅": "\\cdot", "∙": "\\cdot", "∗": "*", "−": "-",
  "≤": "\\le", "≥": "\\ge", "≠": "\\ne", "≈": "\\approx", "≡": "\\equiv", "≅": "\\cong", "∼": "\\sim", "∝": "\\propto", "≪": "\\ll", "≫": "\\gg",
  "→": "\\to", "←": "\\leftarrow", "↔": "\\leftrightarrow", "⇒": "\\Rightarrow", "⇐": "\\Leftarrow", "⇔": "\\Leftrightarrow", "↦": "\\mapsto", "⇌": "\\rightleftharpoons",
  "∈": "\\in", "∉": "\\notin", "∋": "\\ni", "⊂": "\\subset", "⊃": "\\supset", "⊆": "\\subseteq", "⊇": "\\supseteq", "∪": "\\cup", "∩": "\\cap", "∅": "\\emptyset", "∖": "\\setminus",
  "∀": "\\forall", "∃": "\\exists", "¬": "\\neg", "∧": "\\wedge", "∨": "\\vee", "∂": "\\partial", "∇": "\\nabla", "∠": "\\angle", "⊥": "\\perp", "∥": "\\parallel", "△": "\\triangle",
  "°": "^{\\circ}", "′": "'", "″": "''", "…": "\\ldots", "⋯": "\\cdots", "⋮": "\\vdots", "ℝ": "\\mathbb{R}", "ℕ": "\\mathbb{N}", "ℤ": "\\mathbb{Z}", "ℚ": "\\mathbb{Q}", "ℂ": "\\mathbb{C}",
  "√": "\\surd", "∑": "\\sum", "∏": "\\prod", "∫": "\\int", "%": "\\%", "#": "\\#", "&": "\\&", "$": "\\$", "{": "\\{", "}": "\\}", "_": "\\_", "~": "\\sim", "^": "\\hat{}",
};
const NARY: Record<string, string> = { "∑": "\\sum", "∏": "\\prod", "∐": "\\coprod", "∫": "\\int", "∬": "\\iint", "∭": "\\iiint", "∮": "\\oint", "⋃": "\\bigcup", "⋂": "\\bigcap" };
const ACCENTS: Record<string, string> = { "̂": "\\hat", "̃": "\\tilde", "̄": "\\bar", "̅": "\\overline", "⃗": "\\vec", "⃑": "\\vec", "̇": "\\dot", "̈": "\\ddot", "́": "\\acute", "̀": "\\grave", "̆": "\\breve", "̌": "\\check" };
const DELIMS: Record<string, string> = { "(": "(", ")": ")", "[": "[", "]": "]", "{": "\\{", "}": "\\}", "|": "|", "‖": "\\|", "⟨": "\\langle", "⟩": "\\rangle", "〈": "\\langle", "〉": "\\rangle", "⌈": "\\lceil", "⌉": "\\rceil", "⌊": "\\lfloor", "⌋": "\\rfloor", "": "." };
const FUNCTIONS = new Set(["sin", "cos", "tan", "cot", "sec", "csc", "arcsin", "arccos", "arctan", "sinh", "cosh", "tanh", "log", "ln", "lg", "exp", "lim", "max", "min", "sup", "inf", "det", "gcd", "deg", "dim", "arg"]);

const kids = (el: El) => Array.from(el.childNodes).filter((n): n is El => n.nodeType === 1);
const child = (el: El | null | undefined, name: string) => (el ? kids(el).find((c) => c.localName === name) ?? null : null);
const attr = (el: El | null, name: string) => el?.getAttributeNS(M, name) ?? el?.getAttribute(`m:${name}`) ?? null;
/** Value of a property like <m:chr m:val="∑"/> inside <m:naryPr>. */
const prop = (el: El, pr: string, name: string) => attr(child(child(el, pr), name), "val");
const braced = (s: string) => (s.length === 1 ? s : `{${s}}`);

/** Escapes text from an equation run into LaTeX (symbols → commands, known function names → \sin …). */
function textToLatex(text: string, raw: boolean) {
  let out = "";
  for (const ch of text) {
    if (raw && ch === "&") { out += "&"; continue; } // column separator inside matrices / aligned equations
    const s = SYMBOLS[ch];
    out += s ? (s.startsWith("\\") && /[a-z]$/i.test(s) ? `${s} ` : s) : ch;
  }
  return out.replace(/(^|[^\\a-zA-Z])(arcsin|arccos|arctan|sinh|cosh|tanh|sin|cos|tan|cot|sec|csc|log|ln|exp|lim|max|min)(?![a-zA-Z])/g, (_, pre: string, fn: string) => `${pre}\\${fn} `);
}

function conv(el: El, raw = false): string {
  switch (el.localName) {
    case "r": {
      const text = kids(el).filter((c) => c.localName === "t").map((t) => t.textContent ?? "").join("");
      return textToLatex(text, raw);
    }
    case "f": {
      const num = convAll(child(el, "num"), raw), den = convAll(child(el, "den"), raw);
      const type = prop(el, "fPr", "type");
      if (type === "lin" || type === "skw") return `${braced(num)}/${braced(den)}`;
      if (type === "noBar") return `\\genfrac{}{}{0pt}{}{${num}}{${den}}`;
      return `\\frac{${num}}{${den}}`;
    }
    case "rad": {
      const deg = convAll(child(el, "deg"), raw).trim(), e = convAll(child(el, "e"), raw);
      return deg ? `\\sqrt[${deg}]{${e}}` : `\\sqrt{${e}}`;
    }
    case "sSup": return `${braced(convAll(child(el, "e"), raw))}^{${convAll(child(el, "sup"), raw)}}`;
    case "sSub": return `${braced(convAll(child(el, "e"), raw))}_{${convAll(child(el, "sub"), raw)}}`;
    case "sSubSup": return `${braced(convAll(child(el, "e"), raw))}_{${convAll(child(el, "sub"), raw)}}^{${convAll(child(el, "sup"), raw)}}`;
    case "sPre": return `{}_{${convAll(child(el, "sub"), raw)}}^{${convAll(child(el, "sup"), raw)}}${braced(convAll(child(el, "e"), raw))}`;
    case "nary": {
      const chr = prop(el, "naryPr", "chr") ?? "∫";
      const op = NARY[chr] ?? textToLatex(chr, raw);
      const sub = convAll(child(el, "sub"), raw).trim(), sup = convAll(child(el, "sup"), raw).trim();
      return `${op}${sub ? `_{${sub}}` : ""}${sup ? `^{${sup}}` : ""} ${convAll(child(el, "e"), raw)}`;
    }
    case "func": {
      let name = convAll(child(el, "fName"), raw).trim();
      const plain = name.replace(/^\\/, "").trim();
      if (FUNCTIONS.has(plain)) name = `\\${plain}`;
      else if (/^[a-zA-Z]{2,}$/.test(name)) name = `\\operatorname{${name}}`;
      return `${name} ${braced(convAll(child(el, "e"), raw))}`;
    }
    case "limLow": case "limUpp": {
      const base = convAll(child(el, "e"), raw).trim(), lim = convAll(child(el, "lim"), raw);
      const plain = base.replace(/^\\/, "").trim();
      if (FUNCTIONS.has(plain)) return `\\${plain}_{${lim}}`;
      return el.localName === "limLow" ? `\\underset{${lim}}{${base}}` : `\\overset{${lim}}{${base}}`;
    }
    case "d": {
      const beg = prop(el, "dPr", "begChr") ?? "(", end = prop(el, "dPr", "endChr") ?? ")", sep = prop(el, "dPr", "sepChr") ?? "|";
      const parts = kids(el).filter((c) => c.localName === "e").map((e) => convAll(e, raw));
      return `\\left${DELIMS[beg] ?? beg}${parts.join(sep === "|" ? " \\mid " : textToLatex(sep, raw))}\\right${DELIMS[end] ?? end}`;
    }
    case "acc": {
      const chr = prop(el, "accPr", "chr") ?? "̂";
      return `${ACCENTS[chr] ?? "\\hat"}{${convAll(child(el, "e"), raw)}}`;
    }
    case "bar": return prop(el, "barPr", "pos") === "bot" ? `\\underline{${convAll(child(el, "e"), raw)}}` : `\\overline{${convAll(child(el, "e"), raw)}}`;
    case "groupChr": {
      const chr = prop(el, "groupChrPr", "chr") ?? "⏟", pos = prop(el, "groupChrPr", "pos") ?? "bot", e = convAll(child(el, "e"), raw);
      if (chr === "⏟") return `\\underbrace{${e}}`;
      if (chr === "⏞") return `\\overbrace{${e}}`;
      return pos === "top" ? `\\overset{${textToLatex(chr, raw)}}{${e}}` : `\\underset{${textToLatex(chr, raw)}}{${e}}`;
    }
    case "borderBox": return `\\boxed{${convAll(child(el, "e"), raw)}}`;
    case "eqArr": return `\\begin{aligned}${kids(el).filter((c) => c.localName === "e").map((e) => convAll(e, true)).join(" \\\\ ")}\\end{aligned}`;
    case "m": return `\\begin{matrix}${kids(el).filter((c) => c.localName === "mr").map((row) => kids(row).filter((c) => c.localName === "e").map((e) => convAll(e, raw)).join(" & ")).join(" \\\\ ")}\\end{matrix}`;
    default:
      if (el.localName.endsWith("Pr")) return ""; // formatting properties
      return convAll(el, raw);
  }
}
function convAll(el: El | null, raw = false): string {
  return el ? kids(el).map((c) => conv(c, raw)).join("") : "";
}

/** LaTeX for one equation (<m:oMath>). */
export function ommlToLatex(oMath: El) {
  return convAll(oMath).replace(/\s+/g, " ").replace(/\s+([}^_])/g, "$1").trim();
}

/** Rewrites a .docx so every equation becomes plain text LaTeX. Returns the new file and how many were converted. */
export async function convertDocxEquations(buffer: Buffer): Promise<{ buffer: Buffer; count: number }> {
  let zip: JSZip;
  try { zip = await JSZip.loadAsync(buffer); } catch { return { buffer, count: 0 }; }
  const file = zip.file("word/document.xml");
  if (!file) return { buffer, count: 0 };
  const xml = await file.async("string");
  if (!xml.includes("oMath")) return { buffer, count: 0 };

  const doc = new DOMParser().parseFromString(xml, "text/xml");
  let count = 0;
  const textRun = (text: string) => {
    const r = doc.createElementNS(W, "w:r");
    const t = doc.createElementNS(W, "w:t");
    t.setAttribute("xml:space", "preserve");
    t.appendChild(doc.createTextNode(text));
    r.appendChild(t);
    return r;
  };
  // Display equations (own paragraph) first, then the remaining inline ones.
  for (const para of Array.from(doc.getElementsByTagNameNS(M, "oMathPara"))) {
    const latex = Array.from(para.getElementsByTagNameNS(M, "oMath")).map((m) => ommlToLatex(m as El)).filter(Boolean).join(" \\\\ ");
    para.parentNode?.replaceChild(textRun(latex ? ` $$${latex}$$ ` : ""), para);
    count++;
  }
  for (const m of Array.from(doc.getElementsByTagNameNS(M, "oMath"))) {
    const latex = ommlToLatex(m as El);
    m.parentNode?.replaceChild(textRun(latex ? ` $${latex}$ ` : ""), m);
    count++;
  }
  zip.file("word/document.xml", new XMLSerializer().serializeToString(doc));
  return { buffer: await zip.generateAsync({ type: "nodebuffer" }), count };
}

/** PDF text often carries maths in the Symbol font's private-use code points — map them back. */
const PDF_SYMBOLS: Record<string, string> = {
  "": "+", "": "−", "": "=", "": "<", "": ">", "": "(", "": ")", "": "[", "": "]", "": "{", "": "}",
  "": "α", "": "β", "": "γ", "": "δ", "": "ε", "": "θ", "": "λ", "": "μ", "": "π", "": "ρ", "": "σ", "": "τ",
  "": "φ", "": "ω", "": "Δ", "": "Σ", "": "Ω", "": "Π", "": "Φ",
  "": "±", "": "×", "": "÷", "": "·", "": "≤", "": "≥", "": "≠", "": "≈", "": "≡", "": "∞", "": "°",
  "": "∑", "": "∫", "": "∏", "": "√", "": "∂", "": "∇", "": "→", "": "←", "": "↔", "": "⇒", "": "⇔",
  "": "∈", "": "∉", "": "⊂", "": "⊆", "": "∪", "": "∩", "": "∅", "": "∀", "": "∃", "": "∠", "": "⊥", "": "′",
  "ﬁ": "fi", "ﬂ": "fl", "ﬀ": "ff", "ﬃ": "ffi", "ﬄ": "ffl",
};
export const normalizeMathText = (text: string) => text.replace(/[-ﬀ-ﬄ]/g, (c) => PDF_SYMBOLS[c] ?? c);
