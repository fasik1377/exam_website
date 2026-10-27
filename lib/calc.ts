/**
 * Scientific-calculator expression evaluator (no `eval`). Supports:
 *   + − × ÷ ^ ( )   unary minus   implicit multiplication (2π, 3(4+1), 2sin(30))
 *   postfix ! (factorial) and % (÷100)   E notation (6.02E23)
 *   functions: sin cos tan asin acos atan sinh cosh tanh log (base 10) ln log2 sqrt cbrt abs exp
 *   constants: π / pi, e, Ans
 * Angles are in degrees or radians depending on `angle`.
 */
export type AngleMode = "deg" | "rad";

type Token = { t: "num"; v: number } | { t: "op"; v: string } | { t: "fn"; v: string } | { t: "lp" } | { t: "rp" } | { t: "post"; v: string };

const FUNCS = ["asin", "acos", "atan", "sinh", "cosh", "tanh", "sin", "cos", "tan", "log2", "log", "ln", "sqrt", "cbrt", "abs", "exp"];

export class CalcError extends Error {}

function tokenize(src: string, ans: number): Token[] {
  const s = src.replace(/\s+/g, "").replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/√/g, "sqrt").replace(/∛/g, "cbrt");
  const out: Token[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    const num = /^(\d+\.?\d*|\.\d+)(E[+-]?\d+)?/i.exec(s.slice(i));
    if (num && !(c === "e" || c === "E")) { out.push({ t: "num", v: parseFloat(num[0]) }); i += num[0].length; continue; }
    // "log2" is base-2 log; "log20" stays log(20).
    if (/^log2(?![\d.])/i.test(s.slice(i))) { out.push({ t: "fn", v: "log2" }); i += 4; continue; }
    const word = /^[a-zA-Zπ]+/.exec(s.slice(i));
    if (word) {
      let w = word[0];
      // Split runs like "pisin" or "2esqrt" into known names, longest first.
      while (w.length) {
        const fn = FUNCS.find((f) => w.toLowerCase().startsWith(f));
        if (fn) { out.push({ t: "fn", v: fn }); w = w.slice(fn.length); i += fn.length; continue; }
        if (w.startsWith("π")) { out.push({ t: "num", v: Math.PI }); w = w.slice(1); i += 1; continue; }
        if (w.toLowerCase().startsWith("pi")) { out.push({ t: "num", v: Math.PI }); w = w.slice(2); i += 2; continue; }
        if (w.toLowerCase().startsWith("ans")) { out.push({ t: "num", v: ans }); w = w.slice(3); i += 3; continue; }
        if (w[0] === "e") { out.push({ t: "num", v: Math.E }); w = w.slice(1); i += 1; continue; }
        throw new CalcError(`Unknown name "${w}"`);
      }
      continue;
    }
    if ("+-*/^".includes(c)) out.push({ t: "op", v: c });
    else if (c === "(") out.push({ t: "lp" });
    else if (c === ")") out.push({ t: "rp" });
    else if (c === "!" || c === "%") out.push({ t: "post", v: c });
    else throw new CalcError(`Unexpected "${c}"`);
    i++;
  }
  // Implicit multiplication: 2π, 2(…), (…)(…), 3sin(…), π e, x!(…)
  const withMul: Token[] = [];
  for (const tok of out) {
    const prev = withMul[withMul.length - 1];
    const prevEnds = prev && (prev.t === "num" || prev.t === "rp" || prev.t === "post");
    const nextStarts = tok.t === "num" || tok.t === "lp" || tok.t === "fn";
    if (prevEnds && nextStarts) withMul.push({ t: "op", v: "*" });
    withMul.push(tok);
  }
  return withMul;
}

function factorial(n: number) {
  if (n < 0 || !Number.isInteger(n)) throw new CalcError("Factorial needs a whole number ≥ 0");
  if (n > 170) return Infinity;
  let r = 1;
  for (let k = 2; k <= n; k++) r *= k;
  return r;
}

/** Recursive-descent parser: expr → term (± term)*, term → unary (×÷ unary)*, unary → −unary | power, power → postfix (^ unary)? */
export function evaluate(src: string, { angle = "deg", ans = 0 }: { angle?: AngleMode; ans?: number } = {}): number {
  if (!src.trim()) throw new CalcError("Enter an expression");
  const tokens = tokenize(src, ans);
  let pos = 0;
  const toRad = (x: number) => (angle === "deg" ? (x * Math.PI) / 180 : x);
  const fromRad = (x: number) => (angle === "deg" ? (x * 180) / Math.PI : x);
  const peek = () => tokens[pos];

  function expr(): number {
    let v = term();
    while (peek()?.t === "op" && "+-".includes((peek() as { v: string }).v)) {
      const op = (tokens[pos++] as { v: string }).v;
      const r = term();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }
  function term(): number {
    let v = unary();
    while (peek()?.t === "op" && "*/".includes((peek() as { v: string }).v)) {
      const op = (tokens[pos++] as { v: string }).v;
      const r = unary();
      if (op === "/" && r === 0) throw new CalcError("Cannot divide by zero");
      v = op === "*" ? v * r : v / r;
    }
    return v;
  }
  function unary(): number {
    const tok = peek();
    if (tok?.t === "op" && (tok.v === "-" || tok.v === "+")) { pos++; const v = unary(); return tok.v === "-" ? -v : v; }
    return power();
  }
  function power(): number {
    const base = postfix();
    if (peek()?.t === "op" && (peek() as { v: string }).v === "^") { pos++; return Math.pow(base, unary()); } // right-associative
    return base;
  }
  function postfix(): number {
    let v = primary();
    while (peek()?.t === "post") {
      const op = (tokens[pos++] as { v: string }).v;
      v = op === "!" ? factorial(v) : v / 100;
    }
    return v;
  }
  function primary(): number {
    const tok = tokens[pos++];
    if (!tok) throw new CalcError("Expression ends too early");
    if (tok.t === "num") return tok.v;
    if (tok.t === "lp") {
      const v = expr();
      if (peek()?.t === "rp") pos++; // a missing closing bracket is forgiven at the end
      else if (pos < tokens.length) throw new CalcError("Missing )");
      return v;
    }
    if (tok.t === "fn") {
      const arg = peek()?.t === "lp" ? primary() : postfix();
      switch (tok.v) {
        case "sin": return clean(Math.sin(toRad(arg)));
        case "cos": return clean(Math.cos(toRad(arg)));
        case "tan": {
          const c = Math.cos(toRad(arg));
          if (Math.abs(c) < 1e-12) throw new CalcError("tan is undefined here");
          return clean(Math.tan(toRad(arg)));
        }
        case "asin": if (arg < -1 || arg > 1) throw new CalcError("asin needs a value from −1 to 1"); return fromRad(Math.asin(arg));
        case "acos": if (arg < -1 || arg > 1) throw new CalcError("acos needs a value from −1 to 1"); return fromRad(Math.acos(arg));
        case "atan": return fromRad(Math.atan(arg));
        case "sinh": return Math.sinh(arg);
        case "cosh": return Math.cosh(arg);
        case "tanh": return Math.tanh(arg);
        case "log": if (arg <= 0) throw new CalcError("log needs a positive number"); return Math.log10(arg);
        case "log2": if (arg <= 0) throw new CalcError("log₂ needs a positive number"); return Math.log2(arg);
        case "ln": if (arg <= 0) throw new CalcError("ln needs a positive number"); return Math.log(arg);
        case "sqrt": if (arg < 0) throw new CalcError("√ of a negative number"); return Math.sqrt(arg);
        case "cbrt": return Math.cbrt(arg);
        case "abs": return Math.abs(arg);
        case "exp": return Math.exp(arg);
      }
    }
    throw new CalcError("Check the expression");
  }

  const value = expr();
  if (pos < tokens.length) throw new CalcError(tokens[pos].t === "rp" ? "Too many )" : "Check the expression");
  if (Number.isNaN(value)) throw new CalcError("Not a number");
  return value;
}

/** Removes floating-point noise such as sin(180°) = 1.2e-16. */
const clean = (x: number) => (Math.abs(x) < 1e-12 ? 0 : x);

/** Display format: up to 10 significant digits, scientific notation for very large/small values. */
export function formatResult(x: number) {
  if (!Number.isFinite(x)) return x > 0 ? "∞" : x < 0 ? "−∞" : "Error";
  if (x === 0) return "0";
  const abs = Math.abs(x);
  if (abs >= 1e12 || abs < 1e-6) return x.toExponential(6).replace(/\.?0+e/, "e").replace("e+", "E").replace("e-", "E-");
  return String(Number(x.toPrecision(10)));
}

/** Physical and chemical constants for science subjects. */
export const CONSTANTS: { symbol: string; name: string; value: string; unit: string }[] = [
  { symbol: "g", name: "Acceleration due to gravity", value: "9.8", unit: "m/s²" },
  { symbol: "c", name: "Speed of light", value: "3E8", unit: "m/s" },
  { symbol: "G", name: "Gravitational constant", value: "6.674E-11", unit: "N·m²/kg²" },
  { symbol: "h", name: "Planck constant", value: "6.626E-34", unit: "J·s" },
  { symbol: "e⁻", name: "Elementary charge", value: "1.602E-19", unit: "C" },
  { symbol: "mₑ", name: "Electron mass", value: "9.109E-31", unit: "kg" },
  { symbol: "k", name: "Coulomb constant", value: "8.99E9", unit: "N·m²/C²" },
  { symbol: "Nₐ", name: "Avogadro's number", value: "6.022E23", unit: "mol⁻¹" },
  { symbol: "R", name: "Gas constant", value: "8.314", unit: "J/(mol·K)" },
  { symbol: "k_B", name: "Boltzmann constant", value: "1.381E-23", unit: "J/K" },
  { symbol: "Vₘ", name: "Molar volume at STP", value: "22.4", unit: "L/mol" },
  { symbol: "F", name: "Faraday constant", value: "96485", unit: "C/mol" },
];
