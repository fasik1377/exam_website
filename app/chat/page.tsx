"use client";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, GraduationCap, Hash, LoaderCircle, MessageCircle, Search, Send, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import AccountMenu from "@/app/components/AccountMenu";
import Brand from "@/app/components/Brand";
import { dashboardFor, useSession } from "@/app/components/useSession";
import { useSubjects } from "@/app/components/useSubjects";

type Chat = {
  id: string; kind: "direct" | "room"; title: string; subtitle: string; subject: string | null;
  other: { id: string; name: string; role: string; active: boolean } | null;
  lastMessage: string; lastSenderName: string; lastMessageAt: string | null; unread: number;
};
type Message = { id: string; mine: boolean; senderId: string; senderName: string; senderRole: string; body: string; deleted: boolean; createdAt: string };
type Person = { id: string; name: string; role: "student" | "admin"; subject: string | null };
type Tab = "chats" | "rooms" | "people";

const THREAD_POLL = 3000;
const LIST_POLL = 8000;

async function fetchChats(): Promise<{ me: { id: string; role: string }; chats: Chat[] } | null> {
  const response = await fetch("/api/chat", { cache: "no-store" }).catch(() => null);
  if (response?.status === 401) { window.location.href = "/login?next=/chat"; return null; }
  return response?.ok ? response.json() : null;
}

const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const shortWhen = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso), today = new Date();
  return d.toDateString() === today.toDateString() ? clock(iso) : d.toLocaleDateString([], { day: "numeric", month: "short" });
};
const dayLabel = (iso: string) => {
  const d = new Date(iso), today = new Date(), yesterday = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });
};

export default function ChatPage() {
  return <Suspense><ChatApp /></Suspense>;
}

function ChatApp() {
  const { user, loading } = useSession();
  const params = useSearchParams();
  const subjectParam = params.get("subject") ?? "";
  const [tab, setTab] = useState<Tab>(subjectParam ? "people" : "chats");
  const [chats, setChats] = useState<Chat[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const loadChats = useCallback(() => fetchChats().then((data) => data && setChats(data.chats)), []);

  useEffect(() => {
    if (loading) return;
    if (!user) { window.location.replace("/login?next=/chat"); return; }
    let active = true;
    const tick = () => fetchChats().then((data) => active && data && setChats(data.chats));
    tick();
    const id = window.setInterval(tick, LIST_POLL);
    return () => { active = false; window.clearInterval(id); };
  }, [user, loading]);

  const active = chats?.find((c) => c.id === activeId) ?? null;
  const totals = useMemo(() => ({
    chats: (chats ?? []).filter((c) => c.kind === "direct" || c.lastMessageAt).reduce((s, c) => s + c.unread, 0),
    rooms: (chats ?? []).filter((c) => c.kind === "room").reduce((s, c) => s + c.unread, 0),
  }), [chats]);

  async function openDirect(person: Person) {
    const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: person.id }) });
    if (!response.ok) return;
    const { id } = await response.json();
    await loadChats();
    setActiveId(id);
    setTab("chats");
  }

  if (user && user.role === "super-admin") {
    return <Shell back="/super-admin"><p className="m-auto max-w-sm p-8 text-center text-slate-500">Chat is for students and teachers. Sign in with a student or teacher account to use it.</p></Shell>;
  }

  return (
    <Shell back={user ? dashboardFor(user.role) : "/"}>
      <div className="mx-auto grid h-[calc(100dvh-4.25rem)] w-full max-w-7xl md:grid-cols-[23rem_1fr] md:gap-4 md:p-4">
        <aside className={`${active ? "hidden md:flex" : "flex"} min-h-0 flex-col overflow-hidden border-slate-200 bg-white md:rounded-3xl md:border`}>
          <div className="border-b border-slate-100 p-4">
            <h1 className="text-xl font-extrabold">Messages</h1>
            <p className="text-xs text-slate-500">Chat with teachers and classmates · study rooms for every subject</p>
            <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 text-xs font-bold">
              {([["chats", "Chats", MessageCircle, totals.chats], ["rooms", "Rooms", Hash, totals.rooms], ["people", "People", Users, 0]] as const).map(([value, label, Icon, count]) => (
                <button key={value} onClick={() => setTab(value)} className={`relative flex items-center justify-center gap-1.5 rounded-lg py-2 ${tab === value ? "text-navy" : "text-slate-500"}`}>
                  {tab === value && <motion.span layoutId="chat-tab" className="absolute inset-0 rounded-lg bg-white shadow-sm" />}
                  <Icon size={14} className="relative" /><span className="relative">{label}</span>
                  {count > 0 && <span className="relative grid h-4 min-w-4 place-items-center rounded-full bg-royal px-1 text-[9px] text-white">{count}</span>}
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {!chats ? <div className="grid place-items-center p-10"><LoaderCircle className="animate-spin text-slate-400" /></div>
              : tab === "people" ? <PeopleDirectory initialSubject={subjectParam} onPick={openDirect} />
              : <ChatList chats={chats.filter((c) => (tab === "rooms" ? c.kind === "room" : c.kind === "direct" || !!c.lastMessageAt))} activeId={activeId} onOpen={setActiveId} rooms={tab === "rooms"} onFindPeople={() => setTab("people")} />}
          </div>
        </aside>

        <section className={`${active ? "flex" : "hidden md:flex"} min-h-0 flex-col overflow-hidden bg-white md:rounded-3xl md:border md:border-slate-200`}>
          {active && user ? <Thread key={active.id} chat={active} myRole={user.role} onBack={() => setActiveId(null)} onSent={loadChats} /> : <EmptyThread />}
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
        <div className="flex items-center gap-2">
          <Link href={back} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"><ArrowLeft size={16} /> <span className="hidden sm:inline">Dashboard</span></Link>
          <AccountMenu />
        </div>
      </header>
      {children}
    </main>
  );
}

function ChatList({ chats, activeId, onOpen, rooms, onFindPeople }: { chats: Chat[]; activeId: string | null; onOpen: (id: string) => void; rooms: boolean; onFindPeople: () => void }) {
  const [query, setQuery] = useState("");
  const list = chats.filter((c) => (c.title + c.subtitle).toLowerCase().includes(query.toLowerCase()));
  return (
    <div>
      <div className="p-3">
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm focus-within:border-royal">
          <Search size={15} className="text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={rooms ? "Search rooms" : "Search chats"} className="w-full outline-none" />
        </label>
      </div>
      {!list.length && (
        <div className="p-8 text-center text-sm text-slate-500">
          <MessageCircle className="mx-auto mb-3 text-slate-300" size={36} />
          {rooms ? "No rooms match your search." : <>No conversations yet.<br /><button onClick={onFindPeople} className="mt-3 font-bold text-royal hover:underline">Find a teacher or classmate</button></>}
        </div>
      )}
      <ul>
        {list.map((c) => (
          <li key={c.id}>
            <button onClick={() => onOpen(c.id)} className={`flex w-full items-center gap-3 border-b border-slate-50 px-4 py-3 text-left transition-colors ${activeId === c.id ? "bg-blue-50" : "hover:bg-slate-50"}`}>
              <ChatAvatar chat={c} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate font-bold">{c.title}</span>
                  <span className="shrink-0 text-[11px] text-slate-400">{shortWhen(c.lastMessageAt)}</span>
                </span>
                <span className="flex items-center justify-between gap-2">
                  <span className={`truncate text-xs ${c.unread ? "font-bold text-navy" : "text-slate-500"}`}>
                    {c.lastMessage ? `${c.kind === "room" && c.lastSenderName ? `${c.lastSenderName.split(" ")[0]}: ` : ""}${c.lastMessage}` : c.subtitle}
                  </span>
                  {c.unread > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-royal px-1.5 text-[10px] font-bold text-white">{c.unread}</span>}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PeopleDirectory({ initialSubject, onPick }: { initialSubject: string; onPick: (p: Person) => void }) {
  const SUBJECTS = useSubjects();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"" | "admin" | "student">(initialSubject ? "admin" : "");
  const [subject, setSubject] = useState(initialSubject);
  const [people, setPeople] = useState<Person[] | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const id = window.setTimeout(() => {
      const qs = new URLSearchParams({ ...(query ? { q: query } : {}), ...(role ? { role } : {}), ...(subject && role !== "student" ? { subject } : {}) });
      fetch(`/api/chat/people?${qs}`, { cache: "no-store" }).then((r) => r.json()).then((d) => active && setPeople(d.people ?? [])).catch(() => active && setPeople([]));
    }, 250);
    return () => { active = false; window.clearTimeout(id); };
  }, [query, role, subject]);

  return (
    <div className="p-3">
      <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm focus-within:border-royal">
        <Search size={15} className="text-slate-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name" className="w-full outline-none" />
      </label>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {([["", "Everyone"], ["admin", "Teachers"], ["student", "Students"]] as const).map(([value, label]) => (
          <button key={label} onClick={() => setRole(value)} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${role === value ? "bg-navy text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{label}</button>
        ))}
        {role !== "student" && (
          <select value={subject} onChange={(e) => setSubject(e.target.value)} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
            <option value="">Any subject</option>
            {SUBJECTS.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
          </select>
        )}
      </div>
      {people === null ? <div className="grid place-items-center p-8"><LoaderCircle className="animate-spin text-slate-400" /></div>
        : !people.length ? <p className="p-6 text-center text-sm text-slate-500">No approved members match.</p>
        : (
          <ul className="mt-3 grid gap-1.5">
            {people.map((p) => (
              <li key={p.id}>
                <button disabled={opening === p.id} onClick={() => { setOpening(p.id); onPick(p); }} className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 p-3 text-left transition hover:border-royal/40 hover:bg-blue-50/40">
                  <PersonAvatar name={p.name} teacher={p.role === "admin"} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{p.name}</span>
                    <span className="text-xs text-slate-500">{p.role === "admin" ? `${p.subject ?? "Subject"} teacher` : "Student"}</span>
                  </span>
                  <span className="rounded-lg bg-navy px-2.5 py-1.5 text-xs font-bold text-white">{opening === p.id ? <LoaderCircle size={14} className="animate-spin" /> : "Message"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}

function Thread({ chat, myRole, onBack, onSent }: { chat: Chat; myRole: string; onBack: () => void; onSent: () => void }) {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const cursor = useRef<string | undefined>(undefined);
  const room = chat.kind === "room";

  useEffect(() => {
    let active = true;
    const pull = async () => {
      const qs = new URLSearchParams(cursor.current ? { after: cursor.current } : {});
      const response = await fetch(`/api/chat/${chat.id}/messages?${qs}`, { cache: "no-store" }).catch(() => null);
      if (!active || !response?.ok) return;
      const data: { messages: Message[]; serverTime: string } = await response.json();
      cursor.current = data.serverTime;
      setMessages((prev) => {
        const map = new Map((prev ?? []).map((m) => [m.id, m]));
        for (const m of data.messages) map.set(m.id, m); // new messages and deletions
        return [...map.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      });
    };
    pull();
    const id = window.setInterval(pull, THREAD_POLL);
    return () => { active = false; window.clearInterval(id); };
  }, [chat.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages?.length]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    setError("");
    const response = await fetch(`/api/chat/${chat.id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) }).catch(() => null);
    const data = await response?.json().catch(() => ({}));
    setSending(false);
    if (!response?.ok) return setError(data?.error || "Message not sent — check your connection.");
    setMessages((prev) => [...(prev ?? []), data.message]);
    setDraft("");
    onSent();
  }

  async function remove(message: Message) {
    const response = await fetch(`/api/chat/${chat.id}/messages?messageId=${message.id}`, { method: "DELETE" }).catch(() => null);
    if (response?.ok) setMessages((prev) => (prev ?? []).map((m) => (m.id === message.id ? { ...m, deleted: true, body: "" } : m)));
  }

  return (
    <>
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <button onClick={onBack} className="rounded-lg p-1.5 hover:bg-slate-100 md:hidden" aria-label="Back to chats"><ArrowLeft size={18} /></button>
        <ChatAvatar chat={chat} />
        <div className="min-w-0">
          <p className="truncate font-bold">{chat.title}</p>
          <p className="truncate text-xs text-slate-500">{room ? `${chat.subtitle} · open to all students and teachers` : chat.subtitle}</p>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,#f8fafc,#fff)] px-4 py-5">
        {messages === null ? <div className="grid h-full place-items-center"><LoaderCircle className="animate-spin text-slate-400" /></div>
          : !messages.length ? (
            <div className="mt-10 text-center text-sm text-slate-500">
              <p className="text-3xl">{room ? "👋" : "💬"}</p>
              <p className="mt-2">{room ? "Be the first to start the discussion in this room." : "Say hello and ask your question."}</p>
            </div>
          ) : (
            <div className="grid gap-1.5">
              {messages.map((m, i) => {
                const prev = messages[i - 1];
                const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
                const grouped = prev && !newDay && prev.senderId === m.senderId && new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60000;
                const canDelete = !m.deleted && (m.mine || (room && myRole === "admin"));
                return (
                  <div key={m.id} className="grid">
                    {newDay && <p className="my-3 justify-self-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500">{dayLabel(m.createdAt)}</p>}
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`group flex max-w-[80%] items-end gap-2 ${m.mine ? "justify-self-end" : "justify-self-start"} ${grouped ? "" : "mt-2"}`}>
                      {!m.mine && room && <span className={`${grouped ? "invisible" : ""}`}><PersonAvatar name={m.senderName} teacher={m.senderRole === "admin"} small /></span>}
                      {m.mine && canDelete && <DeleteButton onClick={() => remove(m)} />}
                      <div className={`rounded-2xl px-4 py-2.5 text-sm leading-6 shadow-sm ${m.deleted ? "border border-dashed border-slate-200 bg-white italic text-slate-400" : m.mine ? "rounded-br-md bg-navy text-white" : "rounded-bl-md border border-slate-100 bg-white"}`}>
                        {!m.mine && room && !grouped && (
                          <p className="mb-0.5 flex items-center gap-1.5 text-xs font-bold">
                            {m.senderName}
                            {m.senderRole === "admin" && <span className="rounded-full bg-gold/20 px-1.5 py-px text-[9px] font-extrabold uppercase tracking-wider text-amber-800">Teacher</span>}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap break-words">{m.deleted ? "Message deleted" : m.body}</p>
                        <p className={`mt-0.5 text-right text-[10px] ${m.mine && !m.deleted ? "text-white/50" : "text-slate-400"}`}>{clock(m.createdAt)}</p>
                      </div>
                      {!m.mine && canDelete && <DeleteButton onClick={() => remove(m)} />}
                    </motion.div>
                  </div>
                );
              })}
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
            placeholder={room ? `Message ${chat.title}…` : `Message ${chat.title}…`}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-royal"
          />
          <motion.button whileTap={{ scale: 0.92 }} disabled={sending || !draft.trim()} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold text-navy disabled:opacity-50" aria-label="Send">
            {sending ? <LoaderCircle size={18} className="animate-spin" /> : <Send size={18} />}
          </motion.button>
        </div>
        <p className="mt-1.5 px-1 text-[10px] text-slate-400">Enter to send · Shift+Enter for a new line · Be kind and respectful</p>
      </form>
    </>
  );
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="mb-2 rounded-lg p-1 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100" aria-label="Delete message">
      <Trash2 size={14} />
    </button>
  );
}

function EmptyThread() {
  return (
    <div className="m-auto max-w-xs p-8 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-gold/15 text-gold"><MessageCircle size={30} /></span>
      <p className="mt-4 font-bold">Pick a chat or a study room</p>
      <p className="mt-1 text-sm text-slate-500">Message a teacher or classmate from <b>People</b>, or join a subject room to discuss with everyone.</p>
    </div>
  );
}

const ROOM_COLORS = ["from-blue-500 to-sky-400", "from-violet-500 to-fuchsia-400", "from-emerald-500 to-teal-400", "from-orange-500 to-amber-400", "from-rose-500 to-pink-400", "from-cyan-500 to-blue-400"];

function ChatAvatar({ chat }: { chat: Chat }) {
  if (chat.kind === "room") {
    const color = ROOM_COLORS[[...(chat.subject ?? "general")].reduce((s, ch) => s + ch.charCodeAt(0), 0) % ROOM_COLORS.length];
    return <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white ${color}`}><Hash size={18} /></span>;
  }
  return <PersonAvatar name={chat.title} teacher={chat.other?.role === "admin"} />;
}

function PersonAvatar({ name, teacher, small = false }: { name: string; teacher: boolean; small?: boolean }) {
  const size = small ? "h-7 w-7 text-[10px]" : "h-10 w-10 text-sm";
  return (
    <span title={name} className={`relative grid shrink-0 place-items-center rounded-full font-extrabold text-white ${size} ${teacher ? "bg-gradient-to-br from-orange-500 to-amber-400" : "bg-gradient-to-br from-royal to-sky-500"}`}>
      {name.trim().charAt(0).toUpperCase() || "?"}
      {!small && <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-white text-navy">{teacher ? <BookOpen size={9} /> : <GraduationCap size={9} />}</span>}
    </span>
  );
}
