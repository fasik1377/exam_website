/**
 * Small syntax highlighter for code in questions. Splits code into tokens with a kind
 * (keyword, string, comment, number, tag …) that the UI colours. Covers the languages
 * taught in school web/programming courses; anything else is shown as plain text.
 */
export type TokenKind = "plain" | "kw" | "str" | "com" | "num" | "fn" | "tag" | "attr" | "prop" | "punct";
export type Token = { text: string; kind: TokenKind };

export const LANGUAGES: { id: string; label: string }[] = [
  { id: "html", label: "HTML" }, { id: "css", label: "CSS" }, { id: "javascript", label: "JavaScript" }, { id: "typescript", label: "TypeScript" },
  { id: "python", label: "Python" }, { id: "java", label: "Java" }, { id: "c", label: "C" }, { id: "cpp", label: "C++" },
  { id: "csharp", label: "C#" }, { id: "php", label: "PHP" }, { id: "sql", label: "SQL" }, { id: "bash", label: "Shell" }, { id: "text", label: "Plain text" },
];
const ALIASES: Record<string, string> = { js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript", py: "python", "c++": "cpp", "c#": "csharp", cs: "csharp", sh: "bash", shell: "bash", xml: "html", htm: "html", mysql: "sql", plain: "text", txt: "text" };
export const normalizeLang = (lang: string) => { const l = lang.trim().toLowerCase(); return ALIASES[l] ?? l; };
export const languageLabel = (lang: string) => LANGUAGES.find((l) => l.id === normalizeLang(lang))?.label ?? (lang ? lang.toUpperCase() : "Code");

const words = (s: string) => new Set(s.split(" "));
const KEYWORDS: Record<string, Set<string>> = {
  javascript: words("var let const function return if else for while do switch case break continue new this class extends super import export from default async await try catch finally throw typeof instanceof in of null undefined true false delete void yield static get set"),
  python: words("def return if elif else for while in not and or is None True False class import from as try except finally raise with lambda pass break continue global nonlocal yield print len range self async await del assert"),
  java: words("public private protected static final void int long double float char boolean byte short class interface extends implements new return if else for while do switch case break continue try catch finally throw throws import package this super null true false String System abstract enum var"),
  c: words("int long double float char void short unsigned signed const static struct union enum typedef return if else for while do switch case break continue sizeof include define NULL printf scanf main"),
  cpp: words("int long double float char void bool short unsigned const static struct class public private protected virtual return if else for while do switch case break continue new delete this namespace using std include cout cin endl true false nullptr template typename auto string vector"),
  csharp: words("using namespace class public private protected static void int long double float string bool char var new return if else for foreach while do switch case break continue try catch finally throw this null true false Console"),
  php: words("echo print function return if else elseif for foreach while do switch case break continue class public private protected static new this null true false array isset empty include require as"),
  sql: words("SELECT FROM WHERE AND OR NOT INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE DROP ALTER ADD PRIMARY KEY FOREIGN REFERENCES JOIN INNER LEFT RIGHT OUTER ON GROUP BY ORDER HAVING AS DISTINCT LIMIT COUNT SUM AVG MIN MAX NULL IS IN LIKE BETWEEN INT VARCHAR TEXT DATE ASC DESC UNIQUE DEFAULT"),
  bash: words("if then else fi for do done while case esac echo cd ls mkdir rm cp mv cat grep sudo export function return in"),
};
KEYWORDS.typescript = new Set([...KEYWORDS.javascript, ...words("interface type enum implements private public protected readonly number string boolean any unknown never as")]);

type Rule = [RegExp, TokenKind];
const NUM: Rule = [/^(?:0x[\da-f]+|\d+\.?\d*(?:e[+-]?\d+)?)/i, "num"];
const STR: Rule = [/^(?:"(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?|`(?:[^`\\]|\\.)*`?)/, "str"];
const PUNCT: Rule = [/^[{}()[\];,.<>+\-*/%=!&|^~?:]/, "punct"];

function rulesFor(lang: string): Rule[] {
  switch (lang) {
    case "python": return [[/^#.*/, "com"], [/^(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$))/, "str"], STR, NUM, PUNCT];
    case "sql": return [[/^--.*/, "com"], [/^\/\*[\s\S]*?(?:\*\/|$)/, "com"], [/^'(?:[^'\n]|'')*'?/, "str"], NUM, PUNCT];
    case "bash": return [[/^#.*/, "com"], STR, [/^\$\w+/, "attr"], NUM, PUNCT];
    case "css": return [[/^\/\*[\s\S]*?(?:\*\/|$)/, "com"], STR, [/^[@.#]?[\w-]+(?=\s*\{)/, "tag"], [/^[\w-]+(?=\s*:)/, "prop"], [/^#[\da-f]{3,8}\b/i, "num"], [/^-?\d+\.?\d*(?:px|em|rem|%|vh|vw|s|ms|deg)?/, "num"], PUNCT];
    case "php": return [[/^(?:\/\/|#).*/, "com"], [/^\/\*[\s\S]*?(?:\*\/|$)/, "com"], [/^\$\w+/, "attr"], [/^<\?php|^\?>/, "tag"], STR, NUM, PUNCT];
    default: return [[/^\/\/.*/, "com"], [/^\/\*[\s\S]*?(?:\*\/|$)/, "com"], [/^#\s*(?:include|define|import)\b.*/, "kw"], STR, NUM, PUNCT];
  }
}

/** HTML: tags, attributes, values and comments; <style>/<script> contents use CSS/JS rules. */
function highlightHtml(code: string): Token[] {
  const out: Token[] = [];
  const re = /(<!--[\s\S]*?(?:-->|$))|(<\/?)([\w-]+)((?:\s+[\w:-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?>)?|([^<]+|<)/g;
  let m: RegExpExecArray | null;
  let inside: "css" | "javascript" | null = null;
  while ((m = re.exec(code))) {
    if (m[1]) { out.push({ text: m[1], kind: "com" }); continue; }
    if (m[3]) {
      out.push({ text: m[2], kind: "punct" }, { text: m[3], kind: "tag" });
      const attrs = m[4] ?? "";
      const ar = /(\s+)([\w:-]+)(?:(\s*=\s*)("[^"]*"|'[^']*'|[^\s>]+))?/g;
      let a: RegExpExecArray | null;
      while ((a = ar.exec(attrs))) {
        out.push({ text: a[1], kind: "plain" }, { text: a[2], kind: "attr" });
        if (a[3]) out.push({ text: a[3], kind: "punct" }, { text: a[4], kind: "str" });
      }
      if (m[5]) out.push({ text: m[5], kind: "punct" });
      const name = m[3].toLowerCase();
      inside = m[2] === "<" && (name === "style" || name === "script") ? (name === "style" ? "css" : "javascript") : m[2] === "</" ? null : inside;
      continue;
    }
    out.push(...(inside ? highlightCode(m[6], inside) : [{ text: m[6], kind: "plain" as TokenKind }]));
  }
  return out;
}

function highlightCode(code: string, lang: string): Token[] {
  const rules = rulesFor(lang);
  const keywords = KEYWORDS[lang] ?? KEYWORDS[lang === "css" ? "" : "javascript"];
  const out: Token[] = [];
  let i = 0;
  const push = (text: string, kind: TokenKind) => {
    const last = out[out.length - 1];
    if (last && last.kind === kind && kind === "plain") last.text += text; else out.push({ text, kind });
  };
  while (i < code.length) {
    const rest = code.slice(i);
    const ws = /^\s+/.exec(rest);
    if (ws) { push(ws[0], "plain"); i += ws[0].length; continue; }
    let matched = false;
    for (const [re, kind] of rules) {
      const m = re.exec(rest);
      if (m && m[0]) { push(m[0], kind); i += m[0].length; matched = true; break; }
    }
    if (matched) continue;
    const word = /^[A-Za-z_$][\w$]*/.exec(rest);
    if (word) {
      const w = word[0];
      const isKw = keywords?.has(lang === "sql" ? w.toUpperCase() : w);
      const isFn = !isKw && /^\s*\(/.test(rest.slice(w.length));
      push(w, isKw ? "kw" : isFn ? "fn" : "plain");
      i += w.length;
      continue;
    }
    push(rest[0], "plain");
    i++;
  }
  return out;
}

/** Tokens for a code block, split into lines (for line numbers). */
export function highlight(code: string, lang: string): Token[][] {
  const l = normalizeLang(lang);
  const tokens = l === "text" ? [{ text: code, kind: "plain" as TokenKind }] : l === "html" ? highlightHtml(code) : highlightCode(code, l);
  const lines: Token[][] = [[]];
  for (const t of tokens) {
    const parts = t.text.split("\n");
    parts.forEach((part, k) => {
      if (k > 0) lines.push([]);
      if (part) lines[lines.length - 1].push({ text: part, kind: t.kind });
    });
  }
  return lines;
}

/** Splits text into plain parts and ``` fenced code blocks. */
export type Segment = { type: "text"; text: string } | { type: "code"; lang: string; code: string };
export function segments(text: string): Segment[] {
  const out: Segment[] = [];
  const re = /```[ \t]*([\w+#.-]*)[^\n]*\n?([\s\S]*?)(?:\n?```|$)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ type: "text", text: text.slice(last, m.index) });
    out.push({ type: "code", lang: m[1] || "text", code: m[2].replace(/\n$/, "") });
    last = re.lastIndex;
    if (m[0].length === 0) re.lastIndex++;
  }
  if (last < text.length) out.push({ type: "text", text: text.slice(last) });
  return out;
}

/** Plain one-line summary of text that may contain code (for lists and previews). */
export const plainSummary = (text: string) =>
  text.replace(/```[\w+#.-]*\n?([\s\S]*?)(?:```|$)/g, (_, code: string) => ` ${code.trim().split("\n")[0]} … `).replace(/`([^`]+)`/g, "$1").replace(/\s+/g, " ").trim();
