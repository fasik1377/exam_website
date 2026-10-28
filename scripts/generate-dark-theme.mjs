// Generates app/theme-dark.css: dark-mode colours for every light colour class the site uses.
// The pages are written with light Tailwind classes (bg-white, text-slate-500, border-slate-200 …);
// this maps each one to a matching dark colour under `html.dark`, including hover/focus/group-hover
// and responsive variants. Re-run after adding new colour classes:  npm run theme:dark
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "app", "theme-dark.css");

// ---- Dark palette -------------------------------------------------------------------------
const PAGE = "#0a1120";
const SURFACE = "#111a2c";
const BG_SLATE = { 50: "#152035", 100: "#1b2740", 200: "#26344f", 300: "#33445f", 400: "#4a5b78" };
const TEXT_SLATE = { 300: "#4b5c78", 400: "#7b8aa5", 500: "#94a3bd", 600: "#aebbd0", 700: "#c5d0e0", 800: "#dbe3ee", 900: "#e8eef6" };
const BORDER_SLATE = { 50: "#1b2740", 100: "#1e2b44", 200: "#26344f", 300: "#344563", 400: "#4a5b78" };
const NAVY = { text: "#e8eefb", border: "#9fb3d9", bg: "#1c3a70", ring: "#9fb3d9" };
// [500, 300] shades for tinted colours
const TINT = {
  blue: ["#3b82f6", "#93c5fd"], green: ["#22c55e", "#86efac"], red: ["#ef4444", "#fca5a5"], amber: ["#f59e0b", "#fcd34d"],
  orange: ["#f97316", "#fdba74"], emerald: ["#10b981", "#6ee7b7"], violet: ["#8b5cf6", "#c4b5fd"], sky: ["#0ea5e9", "#7dd3fc"],
  teal: ["#14b8a6", "#5eead4"], pink: ["#ec4899", "#f9a8d4"], indigo: ["#6366f1", "#a5b4fc"], yellow: ["#eab308", "#fde047"],
  cyan: ["#06b6d4", "#67e8f9"], purple: ["#a855f7", "#d8b4fe"], rose: ["#f43f5e", "#fda4af"], lime: ["#84cc16", "#bef264"],
};
const KEEP = { royal: "#155EEF", gold: "#F4B740", white: "#ffffff" };
const mix = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;
const luminance = (hex) => {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const isNeutral = (hex) => {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  return Math.max(r, g, b) - Math.min(r, g, b) < 60;
};

/** Dark colour for a utility, or null to leave it as it is. */
function darkColor(kind, color, shade, alpha) {
  const role = kind === "text" ? "text" : kind === "bg" || kind === "from" || kind === "via" || kind === "to" ? "bg" : kind === "fill" ? "bg" : "border";
  let value = null;
  if (color === "white") {
    if (role !== "bg" && role !== "border") return null; // white text stays white
    if (alpha !== null && alpha <= 30) return null; // translucent overlays on dark sections
    value = role === "bg" ? SURFACE : BORDER_SLATE[200];
  } else if (color === "slate" || color === "gray") {
    value = role === "bg" ? BG_SLATE[shade] : role === "text" ? TEXT_SLATE[shade] : BORDER_SLATE[shade];
  } else if (color === "navy") {
    if (kind === "from" || kind === "via" || kind === "to") return null; // brand gradients stay
    value = role === "text" ? NAVY.text : role === "bg" ? NAVY.bg : NAVY.border;
    if (role === "bg" && alpha !== null && alpha <= 20) value = "#e8eefb"; // faint navy tints become faint light tints
  } else if (color === "royal") {
    value = role === "text" ? "#7aa7ff" : null;
  } else if (TINT[color]) {
    const [c500, c300] = TINT[color];
    if (role === "bg") value = shade <= 50 ? mix(c500, 12) : shade <= 100 ? mix(c500, 20) : shade <= 200 ? mix(c500, 30) : null;
    else if (role === "text") value = shade >= 600 ? c300 : null;
    else value = shade <= 300 ? mix(c500, 40) : null;
  } else if (color.startsWith("#")) {
    // Only near-white, near-grey backgrounds are page/track colours; brand colours (e.g. #febc2e) stay.
    if (role === "bg" && isNeutral(color) && luminance(color) > 0.92) value = PAGE;
    else if (role === "bg" && isNeutral(color) && luminance(color) > 0.75) value = BG_SLATE[200];
    else return null;
  }
  if (!value) return null;
  return alpha !== null && alpha < 100 ? mix(value, alpha) : value;
}

const PROP = { bg: "background-color", text: "color", border: "border-color", ring: "--tw-ring-color", from: "--tw-gradient-from", via: "--tw-gradient-via", to: "--tw-gradient-to", fill: "fill", stroke: "stroke", outline: "outline-color", accent: "accent-color", divide: "border-color" };
const STATE = { hover: ":hover", focus: ":focus", "focus-within": ":focus-within", "focus-visible": ":focus-visible", active: ":active", disabled: ":disabled", checked: ":checked", placeholder: "::placeholder" };
const MEDIA = { sm: "40rem", md: "48rem", lg: "64rem", xl: "80rem" };
const esc = (s) => s.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);

// ---- Collect classes -------------------------------------------------------------------------
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== "api") walk(p); }
    else if (/\.tsx$/.test(e.name)) files.push(p);
  }
})(path.join(ROOT, "app"));
const TOKEN = /(?<![\w\-:[\]])((?:[a-z-]+:)*)(bg|text|border(?:-[trblxy])?|ring|from|via|to|fill|stroke|outline|accent|divide)-(white|black|navy|royal|(?:slate|gray|[a-z]+)-\d{2,3}|\[#[0-9a-fA-F]{3,8}\])(?:\/(\d{1,3}))?(?![\w\-[])/g;
const found = new Set();
for (const f of files) for (const m of fs.readFileSync(f, "utf8").matchAll(TOKEN)) found.add(m[0]);

const base = [], states = [], media = { sm: [], md: [], lg: [], xl: [] };
const skipped = new Set();
for (const token of [...found].sort()) {
  const m = new RegExp(`^${TOKEN.source.replace("(?<![\\w\\-:[\\]])", "").replace("(?![\\w\\-[])", "")}$`).exec(token);
  if (!m) continue;
  const variants = m[1] ? m[1].slice(0, -1).split(":") : [];
  const kind = m[2].startsWith("border") ? "border" : m[2];
  const raw = m[3].replace(/^\[|\]$/g, "");
  const [color, shadeStr] = raw.startsWith("#") ? [raw.toLowerCase(), "0"] : raw.includes("-") ? raw.split("-") : [raw, "0"];
  const isStateToken = variants.some((v) => STATE[v] || v === "group-hover");
  // Hover/focus colours that need no dark version still get a rule, so they beat the dark base colour.
  const alpha = m[4] ? Number(m[4]) : null;
  let value = darkColor(kind, color, Number(shadeStr), alpha);
  if (!value && isStateToken) {
    const keep = KEEP[color] ?? (TINT[color] && Number(shadeStr) >= 400 ? TINT[color][0] : null);
    if (keep) value = alpha !== null && alpha < 100 ? mix(keep, alpha) : keep;
  }
  if (!value) continue;
  let selector = `.${esc(token)}`;
  let mq = null, groupHover = false, isState = false;
  let unsupported = false;
  for (const v of variants) {
    if (STATE[v]) { selector += STATE[v]; isState = true; }
    else if (v === "group-hover") { groupHover = true; isState = true; }
    else if (MEDIA[v]) mq = v;
    else unsupported = true;
  }
  if (unsupported) { skipped.add(token); continue; }
  const full = `html.dark ${groupHover ? ".group:hover " : ""}${selector}`;
  const rule = kind === "divide" ? `${full} > :not(:last-child) { ${PROP[kind]}: ${value}; }` : `${full} { ${PROP[m[2].startsWith("border") ? "border" : kind]}: ${value}; }`;
  (mq ? media[mq] : isState ? states : base).push(rule);
}

const header = `/* Generated by scripts/generate-dark-theme.mjs — do not edit by hand (run: npm run theme:dark). */\n`;
const extras = `
/* ---- Hand-tuned dark-mode details ---- */
html.dark { color-scheme: dark; --background: ${PAGE}; --foreground: #e8eefb; }
html.dark body { background: ${PAGE}; }
/* Gold buttons and badges keep dark text. */
html.dark .bg-gold.text-navy, html.dark .bg-gold .text-navy, html.dark .hover\\:bg-gold:hover { color: #0B1F3A; }
html.dark .code-inline { background: #1b2740; color: #ff8fa3; }
html.dark .bg-dots { background-image: radial-gradient(rgba(232, 238, 251, 0.07) 1px, transparent 1px); }
html.dark .card-lift:hover { box-shadow: 0 22px 40px -18px rgba(0, 0, 0, 0.7); }
html.dark svg [stroke="#e2e8f0"] { stroke: #26344f; }
html.dark svg [fill="#64748b"], html.dark svg [fill="#94a3b8"] { fill: #94a3bd; }
html.dark ::selection { background: #F4B740; color: #0B1F3A; }
html.dark img[src*="logo"], html.dark .logo-mark { filter: none; }
`;
const css = header
  + base.join("\n") + "\n"
  + states.join("\n") + "\n"
  + Object.entries(media).filter(([, r]) => r.length).map(([k, r]) => `@media (min-width: ${MEDIA[k]}) {\n${r.map((x) => "  " + x).join("\n")}\n}`).join("\n")
  + extras;
fs.writeFileSync(OUT, css);
console.log(`theme-dark.css: ${base.length} base, ${states.length} state, ${Object.values(media).flat().length} responsive rules from ${files.length} files`);
if (skipped.size) console.log("variants not mapped:", [...skipped].join(" "));
