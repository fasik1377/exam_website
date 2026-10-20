"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, BookOpen, GraduationCap, LoaderCircle, MessageCircle, Search, Send } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Brand from "@/app/components/Brand";
import { useSession } from "@/app/components/useSession";

type Conversation = { id: string; with: { id: string; name: string; role: string }; subject: string; lastMessage: string; lastMessageAt: string; unread: number };
type Teacher = { id: string; name: string; subject: string };
type Message = { id: string; mine: boolean; body: string; createdAt: string };
type Inbox = { side: "student" | "teacher"; conversations: Conversation[]; teachers: Teacher[] };

const POLL_MS = 4000;

async function fetchInbox(): Promise<Inbox | null> {
  const response = await fetch("/api/chat/conversations", { cache: "no-store" }).catch(() => null);
  return response?.ok ? response.json() : null;
}

async function fetchMessages(conversationId: string, after?: string): Promise<Message[] | null> {
  const query = new URLSearchParams({ conversationId, ...(after ? { after } : {}) });
  const response = await fetch(`/api/chat/messages?${query}`, { cache: "no-store" }).catch(() => null);
  return response?.ok ? (await response.json()).messages : null;
}

const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const day = (iso: string) => {
  const d = new Date(iso), today = new Date();
  return d.toDateString() === today.toDateString() ? clock(iso) : d.toLocaleDateString([], { day: "numeric", month: "short" });
};

export default function ChatPage() {
  return <Suspense><Chat /></Suspense>;
}

function Chat() {
  const { user, loading } = useSession();
  const subjectParam = useSearchParams().get("subject") ?? "";
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<"chats" | "teachers">(subjectParam ? "teachers" : "chats");

  const loadInbox = useCallback(() => fetchInbox().then((data) => data && setInbox(data)), []);

  useEffect(() => {
    if (loading) return;
    if (!user) { window.location.replace("/login"); return; }
    if (user.role === "super-admin") return;
    let active = true;
    const tick = () => fetchInbox().then((data) => active && data && setInbox(data));
    tick();
    const id = window.setInterval(tick, POLL_MS * 2);
    return () => { active = false; window.clearInterval(id); };
  }, [user, loading]);

  const conversations = useMemo(() => inbox?.conversations ?? [], [inbox]);
  const active = conversations.find((c) => c.id === activeId) ?? null;
  // Students see the teacher directory when they ask for it or have no chats yet.
  const showTeachers = inbox?.side === "student" && (view === "teachers" || !conversations.length);

  async function startWith(teacher: Teacher) {
    const response = await fetch("/api/chat/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teacherId: teacher.id }) });
    if (!response.ok) return;
    const { conversation } = await response.json();
    await loadInbox();
    setActiveId(conversation.id);
    setView("chats");
  }

  if (user?.role === "super-admin") {
    return <Shell back="/super-admin"><p className="m-auto max-w-sm p-8 text-center text-slate-500">Chat is between students and teachers. Sign in with a student or teacher account to use it.</p></Shell>;
  }

  return (
    <Shell back={user?.role === "admin" ? "/admin" : "/#grades"}>
      <div className="mx-auto grid h-[calc(100dvh-4.25rem)] w-full max-w-6xl md:grid-cols-[22rem_1fr] md:gap-4 md:p-4">
        {/* Left: conversations / teachers */}
        <aside className={`${active ? "hidden md:flex" : "flex"} min-h-0 flex-col overflow-hidden border-slate-200 bg-white md:rounded-3xl md:border`}>
          <div className="border-b border-slate-100 p-4">
            <h1 className="text-xl font-extrabold">{inbox?.side === "teacher" ? "Student messages" : "Ask a teacher"}</h1>
            <p className="text-xs text-slate-500">{inbox?.side === "teacher" ? "Questions from your students" : "Get help from approved subject teachers"}</p>
            {inbox?.side === "student" && (
              <div className="mt-3 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-xs font-bold">
                {(["chats", "teachers"] as const).map((v) => {
                  const on = v === "teachers" ? showTeachers : !showTeachers;
                  return (
                    <button key={v} onClick={() => setView(v)} className={`relative rounded-lg py-1.5 ${on ? "text-navy" : "text-slate-500"}`}>
                      {on && <motion.span layoutId="chat-tab" className="absolute inset-0 rounded-lg bg-white shadow-sm" />}
                      <span className="relative">{v === "chats" ? `My chats (${conversations.length})` : "Find a teacher"}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {!inbox ? <div className="grid place-items-center p-10"><LoaderCircle className="animate-spin text-slate-400" /></div>
              : showTeachers ? <TeacherDirectory teachers={inbox.teachers} initialSubject={subjectParam} onPick={startWith} existing={conversations} />
              : <ConversationList conversations={conversations} activeId={activeId} onOpen={setActiveId} side={inbox.side} />}
          </div>
        </aside>

        {/* Right: thread */}
        <section className={`${active ? "flex" : "hidden md:flex"} min-h-0 flex-col overflow-hidden bg-white md:rounded-3xl md:border md:border-slate-200`}>
          {active ? <Thread key={active.id} conversation={active} onBack={() => setActiveId(null)} onSent={loadInbox} /> : <EmptyThread side={inbox?.side} />}
        </section>
      </div>
    </Shell>
  );
}

function Shell({ back, children }: { back: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col bg-[#f3f6fb] text-navy">
      <header className="flex h-[4.25rem] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
        <Brand size="sm" />
        <Link href={back} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"><ArrowLeft size={16} /> Back</Link>
      </header>
      {children}
    </main>
  );
}

function ConversationList({ conversations, activeId, onOpen, side }: { conversations: Conversation[]; activeId: string | null; onOpen: (id: string) => void; side: "student" | "teacher" }) {
  if (!conversations.length) {
    return (
      <div className="p-8 text-center text-sm text-slate-500">
        <MessageCircle className="mx-auto mb-3 text-slate-300" size={36} />
        {side === "teacher" ? "No student has messaged you yet." : "No conversations yet — find a teacher to start one."}
      </div>
    );
  }
  return (
    <ul>
      {conversations.map((c) => (
        <li key={c.id}>
          <button onClick={() => onOpen(c.id)} className={`flex w-full items-center gap-3 border-b border-slate-50 px-4 py-3 text-left transition-colors ${activeId === c.id ? "bg-blue-50" : "hover:bg-slate-50"}`}>
            <Avatar name={c.with.name} teacher={c.with.role === "teacher"} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="truncate font-bold">{c.with.name}</span>
                <span className="shrink-0 text-[11px] text-slate-400">{c.lastMessage ? day(c.lastMessageAt) : ""}</span>
              </span>
              <span className="flex items-center justify-between gap-2">
                <span className={`truncate text-xs ${c.unread ? "font-bold text-navy" : "text-slate-500"}`}>{c.lastMessage || `${c.subject} · say hello 👋`}</span>
                {c.unread > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-royal px-1.5 text-[10px] font-bold text-white">{c.unread}</span>}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function TeacherDirectory({ teachers, initialSubject, onPick, existing }: { teachers: Teacher[]; initialSubject: string; onPick: (t: Teacher) => void; existing: Conversation[] }) {
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState(initialSubject);
  const [opening, setOpening] = useState<string | null>(null);
  const subjects = Array.from(new Set(teachers.map((t) => t.subject))).sort();
  const filtered = teachers.filter((t) => (!subject || t.subject === subject) && (t.name + t.subject).toLowerCase().includes(query.toLowerCase()));
  const grouped = filtered.reduce<Record<string, Teacher[]>>((acc, t) => ((acc[t.subject] ||= []).push(t), acc), {});

  return (
    <div className="p-3">
      <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm focus-within:border-royal">
        <Search size={15} className="text-slate-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search teachers" className="w-full outline-none" />
      </label>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {["", ...subjects].map((s) => (
          <button key={s || "all"} onClick={() => setSubject(s)} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${subject === s ? "bg-navy text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{s || "All subjects"}</button>
        ))}
      </div>
      {!filtered.length && <p className="p-6 text-center text-sm text-slate-500">No approved teachers {subject ? `for ${subject} ` : ""}yet.</p>}
      {Object.entries(grouped).map(([group, list]) => (
        <div key={group} className="mt-4">
          <p className="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{group}</p>
          <ul className="mt-1.5 grid gap-1.5">
            {list.map((t) => {
              const has = existing.some((c) => c.with.id === t.id);
              return (
                <li key={t.id}>
                  <button disabled={opening === t.id} onClick={() => { setOpening(t.id); onPick(t); }} className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 p-3 text-left transition hover:border-royal/40 hover:bg-blue-50/40">
                    <Avatar name={t.name} teacher />
                    <span className="min-w-0 flex-1"><span className="block truncate font-bold">{t.name}</span><span className="text-xs text-slate-500">{t.subject} teacher</span></span>
                    <span className="rounded-lg bg-navy px-2.5 py-1.5 text-xs font-bold text-white">{opening === t.id ? <LoaderCircle size={14} className="animate-spin" /> : has ? "Open" : "Message"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Thread({ conversation, onBack, onSent }: { conversation: Conversation; onBack: () => void; onSent: () => void }) {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const lastRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    let active = true;
    const merge = (incoming: Message[] | null) => {
      if (!active || !incoming) return;
      if (incoming.length) lastRef.current = incoming[incoming.length - 1].createdAt;
      setMessages((prev) => {
        const seen = new Set((prev ?? []).map((m) => m.id));
        return [...(prev ?? []), ...incoming.filter((m) => !seen.has(m.id))];
      });
    };
    fetchMessages(conversation.id).then(merge);
    const id = window.setInterval(() => fetchMessages(conversation.id, lastRef.current).then(merge), POLL_MS);
    return () => { active = false; window.clearInterval(id); };
  }, [conversation.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages?.length]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    setError("");
    const response = await fetch("/api/chat/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: conversation.id, body }) }).catch(() => null);
    setSending(false);
    if (!response?.ok) return setError("Message not sent — check your connection.");
    const { message } = await response.json();
    lastRef.current = message.createdAt;
    setMessages((prev) => [...(prev ?? []), message]);
    setDraft("");
    onSent();
  }

  return (
    <>
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <button onClick={onBack} className="rounded-lg p-1.5 hover:bg-slate-100 md:hidden" aria-label="Back to conversations"><ArrowLeft size={18} /></button>
        <Avatar name={conversation.with.name} teacher={conversation.with.role === "teacher"} />
        <div className="min-w-0">
          <p className="truncate font-bold">{conversation.with.name}</p>
          <p className="text-xs text-slate-500">{conversation.with.role === "teacher" ? `${conversation.subject} teacher` : `Student · ${conversation.subject}`}</p>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,#f8fafc,#fff)] px-4 py-5">
        {messages === null ? <div className="grid h-full place-items-center"><LoaderCircle className="animate-spin text-slate-400" /></div>
          : !messages.length ? <p className="mt-10 text-center text-sm text-slate-500">Say hello and ask your question 👋</p>
          : (
            <div className="grid gap-2">
              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-6 shadow-sm ${m.mine ? "justify-self-end rounded-br-md bg-navy text-white" : "justify-self-start rounded-bl-md border border-slate-100 bg-white"}`}>
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p className={`mt-0.5 text-right text-[10px] ${m.mine ? "text-white/50" : "text-slate-400"}`}>{clock(m.createdAt)}</p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="border-t border-slate-100 p-3">
        {error && <p className="mb-2 text-xs font-semibold text-red-600">{error}</p>}
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
            rows={1}
            maxLength={2000}
            placeholder="Type a message…  (Enter to send, Shift+Enter for a new line)"
            className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-royal"
          />
          <motion.button whileTap={{ scale: 0.92 }} disabled={sending || !draft.trim()} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold text-navy disabled:opacity-50" aria-label="Send">
            {sending ? <LoaderCircle size={18} className="animate-spin" /> : <Send size={18} />}
          </motion.button>
        </div>
      </form>
    </>
  );
}

function EmptyThread({ side }: { side?: "student" | "teacher" }) {
  return (
    <div className="m-auto max-w-xs p-8 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-gold/15 text-gold"><MessageCircle size={30} /></span>
      <p className="mt-4 font-bold">{side === "teacher" ? "Select a conversation" : "Choose a teacher or conversation"}</p>
      <p className="mt-1 text-sm text-slate-500">{side === "teacher" ? "Student questions appear on the left." : "Ask about a question, an explanation or your study plan."}</p>
    </div>
  );
}

function Avatar({ name, teacher }: { name: string; teacher: boolean }) {
  return (
    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-extrabold text-white ${teacher ? "bg-gradient-to-br from-orange-500 to-amber-400" : "bg-gradient-to-br from-royal to-sky-500"}`}>
      {teacher ? <BookOpen size={16} /> : <GraduationCap size={16} />}
      <span className="sr-only">{name}</span>
    </span>
  );
}
