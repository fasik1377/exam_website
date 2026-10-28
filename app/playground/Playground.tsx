"use client";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, ChevronDown, Download, Maximize2, Minimize2, Play, RotateCcw, Terminal, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import CodeEditor from "./CodeEditor";
import { BLANK, EXAMPLES, buildDocument, type Project } from "./examples";

type Tab = "html" | "css" | "js";
type LogLine = { type: "log" | "info" | "warn" | "error"; text: string; at: number };
const TABS: { id: Tab; label: string; lang: "html" | "css" | "javascript"; dot: string }[] = [
  { id: "html", label: "HTML", lang: "html", dot: "bg-[#e34c26]" },
  { id: "css", label: "CSS", lang: "css", dot: "bg-[#2965f1]" },
  { id: "js", label: "JavaScript", lang: "javascript", dot: "bg-[#f7df1e]" },
];
const HANDOFF_KEY = "playground:tryit";

/** Code handed over from a "Try it" button on a question (read once). */
export function takeHandoff(): Project | null {
  try {
    const raw = localStorage.getItem(HANDOFF_KEY);
    if (!raw) return null;
    localStorage.removeItem(HANDOFF_KEY);
    return JSON.parse(raw);
  } catch { return null; }
}
export function handOff(project: Project) {
  try { localStorage.setItem(HANDOFF_KEY, JSON.stringify(project)); } catch {}
}
/** Turns a code snippet from a question into a playground project. */
export function projectFromSnippet(lang: string, code: string): Project {
  const l = lang.toLowerCase();
  if (l === "css") return { html: `<h1>Heading</h1>\n<p class="note">A paragraph to style.</p>\n<button>Button</button>`, css: code, js: "" };
  if (l === "javascript" || l === "js") return { html: `<p>Open the console below to see the output.</p>`, css: "", js: code };
  return { html: code, css: "", js: "" };
}

function load(key: string): Project | null {
  try { const raw = localStorage.getItem(key); return raw ? { ...BLANK, ...JSON.parse(raw) } : null; } catch { return null; }
}

/**
 * HTML / CSS / JavaScript playground in the style of W3Schools "Try it yourself":
 * edit on the left, see the result on the right, console output underneath.
 * Code runs in a sandboxed frame (no access to the student's account or this page).
 */
export default function Playground({ storageKey, initial, title = "Code playground", onClose }: {
  storageKey: string; initial?: Project | null; title?: string; onClose?: () => void;
}) {
  const saveKey = `playground:${storageKey}`;
  const [project, setProject] = useState<Project>(() => initial ?? load(saveKey) ?? EXAMPLES[0]);
  const [tab, setTab] = useState<Tab>(() => (initial && !initial.html && initial.js ? "js" : initial && !initial.html && initial.css ? "css" : "html"));
  const [ran, setRan] = useState<Project>(project);
  const [runId, setRunId] = useState(0);
  const [auto, setAuto] = useState(true);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [full, setFull] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const channel = useId();

  const run = useCallback(() => { setLogs([]); setRan(project); setRunId((n) => n + 1); }, [project]);

  // Auto-run shortly after typing stops; save the work as you go.
  useEffect(() => {
    try { localStorage.setItem(saveKey, JSON.stringify(project)); } catch {}
    if (!auto) return;
    const id = window.setTimeout(run, 700);
    return () => window.clearTimeout(id);
  }, [project, auto, run, saveKey]);

  // Console output from the frame.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.source !== frame.current?.contentWindow || e.data?.channel !== channel) return;
      const type = ["info", "warn", "error"].includes(e.data.type) ? e.data.type : "log";
      setLogs((l) => [...l, { type, text: (e.data.args ?? []).join(" "), at: Date.now() }].slice(-200));
      if (type === "error") setConsoleOpen(true);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [channel]);

  const doc = useMemo(() => buildDocument(ran, channel), [ran, channel]);
  const current = TABS.find((t) => t.id === tab)!;
  const errors = logs.filter((l) => l.type === "error").length;

  function setCode(value: string) { setProject((p) => ({ ...p, [tab]: value })); }
  function pick(example: Project) { setProject({ html: example.html, css: example.css, js: example.js }); setExamplesOpen(false); setTab("html"); }
  function reset() { if (window.confirm("Clear all three editors?")) setProject({ ...BLANK }); }
  function download() {
    const url = URL.createObjectURL(new Blob([buildDocument(project, "download").replace(/<script>\(function\(\)\{var send[\s\S]*?<\/script>/, "")], { type: "text/html" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "my-page.html" });
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // Esc leaves fullscreen.
  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFull(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full]);

  return (
    <div className={`flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm ${full ? "fixed inset-0 z-[70] rounded-none" : "h-[min(82vh,860px)] min-h-[560px]"}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <p className="mr-auto flex items-center gap-2 text-sm font-extrabold"><span className="grid h-7 w-7 place-items-center rounded-lg bg-navy font-mono text-[11px] text-gold">&lt;/&gt;</span>{title}</p>
        <div className="relative">
          <button type="button" onClick={() => setExamplesOpen((o) => !o)} aria-expanded={examplesOpen} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold hover:border-royal"><BookOpen size={14} /> Examples <ChevronDown size={13} /></button>
          <AnimatePresence>
            {examplesOpen && (
              <motion.ul initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute right-0 z-30 mt-1 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                {EXAMPLES.map((ex) => (
                  <li key={ex.id}><button type="button" onClick={() => pick(ex)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50"><span className="font-semibold">{ex.title}</span><span className="text-[10px] font-bold uppercase text-slate-400">{ex.level}</span></button></li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-600" title="Run automatically while you type">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="h-3.5 w-3.5 accent-[#155EEF]" /> Auto-run
        </label>
        <button type="button" onClick={reset} title="Clear the editors" className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-red-600"><RotateCcw size={15} /></button>
        <button type="button" onClick={download} title="Download as an .html file" className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-navy"><Download size={15} /></button>
        <button type="button" onClick={() => setFull((f) => !f)} title={full ? "Exit full screen (Esc)" : "Full screen"} className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-navy">{full ? <Minimize2 size={15} /> : <Maximize2 size={15} />}</button>
        <button type="button" onClick={run} title="Run (Ctrl+Enter)" className="btn-shine inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3.5 py-1.5 text-sm font-bold text-white hover:bg-green-700"><Play size={14} fill="currentColor" /> Run</button>
        {onClose && <button type="button" onClick={onClose} aria-label="Close playground" className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-navy"><X size={17} /></button>}
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-2 lg:grid-cols-2 lg:grid-rows-1">
        {/* Editors */}
        <div className="flex min-h-0 flex-col border-b border-slate-200 lg:border-b-0 lg:border-r">
          <div role="tablist" aria-label="Code" className="flex shrink-0 bg-[#0b1220]">
            {TABS.map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
                className={`relative inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition ${tab === t.id ? "bg-[#0d1526] text-white" : "text-slate-400 hover:text-white"}`}>
                <i className={`h-2 w-2 rounded-full ${t.dot}`} />{t.label}
                {project[t.id].trim() && tab !== t.id && <span className="h-1 w-1 rounded-full bg-slate-500" />}
                {tab === t.id && <motion.span layoutId={`tab-${channel}`} className="absolute inset-x-0 top-0 h-0.5 bg-gold" />}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1">
            <CodeEditor key={tab} value={project[tab]} onChange={setCode} lang={current.lang} onRun={run} label={`${current.label} code`} />
          </div>
        </div>

        {/* Result + console */}
        <div className="flex min-h-0 flex-col bg-white">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-3 py-2 text-xs font-bold text-slate-500">
            <span className="flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-green-500" /> Result</span>
            <span className="font-normal text-slate-400">Ctrl+Enter to run</span>
          </div>
          {/* allow-scripts without allow-same-origin: student code can't reach the site, cookies or storage. */}
          <iframe ref={frame} key={runId} title="Result" sandbox="allow-scripts allow-modals allow-forms allow-popups" srcDoc={doc} className="min-h-0 w-full flex-1" style={{ colorScheme: "light", backgroundColor: "#ffffff" }} />
          <div className="shrink-0 border-t border-slate-200 bg-[#0b1220] text-slate-200">
            <div className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-bold">
              <button type="button" onClick={() => setConsoleOpen((o) => !o)} className="flex flex-1 items-center gap-2 text-left">
                <Terminal size={14} /> Console
                {logs.length > 0 && <span className={`rounded-full px-1.5 text-[10px] ${errors ? "bg-red-500 text-white" : "bg-slate-700"}`}>{logs.length}</span>}
                <ChevronDown size={13} className={`transition ${consoleOpen ? "" : "rotate-180"}`} />
              </button>
              {logs.length > 0 && <button type="button" onClick={() => setLogs([])} title="Clear console" className="rounded p-1 text-slate-400 hover:text-white"><Trash2 size={13} /></button>}
            </div>
            {consoleOpen && (
              <div className="max-h-36 min-h-[3.5rem] overflow-y-auto border-t border-white/5 px-3 py-1.5 font-mono text-[12px] leading-5">
                {logs.length ? logs.map((l, i) => (
                  <p key={i} className={`whitespace-pre-wrap border-b border-white/5 py-0.5 ${l.type === "error" ? "text-red-300" : l.type === "warn" ? "text-amber-300" : "text-slate-200"}`}>
                    <span className="mr-2 select-none text-slate-500">{l.type === "error" ? "✖" : l.type === "warn" ? "⚠" : "›"}</span>{l.text}
                  </p>
                )) : <p className="py-1 text-slate-500">console.log() output and errors appear here.</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Playground that first picks up code handed over from a question's "Try it" button (browser only). */
export function PlaygroundWithHandoff(props: { storageKey: string; title?: string }) {
  const [initial] = useState(takeHandoff);
  return <Playground {...props} initial={initial} />;
}
