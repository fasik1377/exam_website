"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Coins, Gift, LoaderCircle, ShoppingBag, Sparkles, Swords, Timer, X, Zap } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { frameRing, type Gear, type ShopItem } from "@/lib/shop";

type Quest = { id: string; title: string; icon: string; reward: number; target: number; progress: number; done: boolean; claimed: boolean };
type Board = { top: { rank: number; name: string; score: number; correct: number; total: number; frame: string | null; title: string | null; me: boolean }[]; me: { rank: number; score: number } | null; players: number };
type Challenge = { available: boolean; reason?: string; size: number; resetsIn: number; run: { score: number; correct: number; total: number; coins: number; finished: boolean } | null; board: Board };
type Shop = { items: ShopItem[]; wallet: { balance: number; earned: number }; gear: Gear; history: { amount: number; reason: string; at: string }[] };

const MEDAL = ["", "🥇", "🥈", "🥉"];
const REASON: Record<string, string> = { correct: "Correct answer", combo: "Streak bonus", "daily-goal": "Daily goal", challenge: "Daily challenge", quest: "Weekly quest", badge: "Badge unlocked", "weekly-top": "Student of the week", shop: "Shop" };
const get = async <T,>(url: string): Promise<T | null> => { const r = await fetch(url, { cache: "no-store" }).catch(() => null); return r?.ok ? r.json() : null; };
const hm = (ms: number) => { const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000); return h ? `${h}h ${m}m` : `${m}m`; };

/** Avatar circle with the student's equipped frame. */
export function Avatar({ name, frame, size = "h-9 w-9 text-sm" }: { name: string; frame?: string | null; size?: string }) {
  const ring = frameRing(frame);
  return <span className={`grid shrink-0 place-items-center rounded-full bg-gold font-extrabold text-navy ${size} ${ring ? `ring-[3px] ring-offset-2 ring-offset-white ${ring}` : ""}`}>{name.charAt(0).toUpperCase()}</span>;
}

/** Coins + Daily challenge + Weekly quests + Shop, shown on the student dashboard. */
export default function Compete({ coins, onCoins }: { coins: number; onCoins: (balance: number) => void }) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [quests, setQuests] = useState<{ quests: Quest[]; endsAt: string } | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(() => Promise.all([get<Challenge>("/api/challenge"), get<{ quests: Quest[]; endsAt: string }>("/api/student/quests")]), []);
  useEffect(() => {
    let on = true;
    load().then(([c, q]) => { if (on) { setChallenge(c); setQuests(q); } });
    return () => { on = false; };
  }, [load]);
  useEffect(() => { if (!toast) return; const id = window.setTimeout(() => setToast(null), 3500); return () => window.clearTimeout(id); }, [toast]);

  async function claim(q: Quest) {
    setClaiming(q.id);
    const r = await fetch("/api/student/quests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: q.id }) }).catch(() => null);
    const data = await r?.json().catch(() => ({}));
    setClaiming(null);
    if (!r?.ok) return setToast(data?.error || "Could not claim.");
    onCoins(data.wallet.balance);
    setToast(`+${data.coins} coins — quest complete! 🎉`);
    setQuests((cur) => (cur ? { ...cur, quests: cur.quests.map((x) => (x.id === q.id ? { ...x, claimed: true } : x)) } : cur));
  }

  const run = challenge?.run;
  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-6">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold"><Swords size={19} className="text-royal" /> Compete & earn</h2>
          <p className="text-sm text-slate-500">Earn coins for every correct answer, challenge your classmates and spend coins in the shop.</p>
        </div>
        <div className="flex items-center gap-2">
          <motion.span key={coins} initial={{ scale: 1.25 }} animate={{ scale: 1 }} className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3.5 py-2 text-sm font-extrabold text-amber-700 ring-1 ring-amber-200"><Coins size={16} />{coins.toLocaleString()} coins</motion.span>
          <button type="button" onClick={() => setShopOpen(true)} className="btn-shine inline-flex items-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white hover:bg-royal"><ShoppingBag size={15} /> Shop</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2">
        {/* Daily challenge */}
        <div className="border-b border-slate-100 p-6 lg:border-b-0 lg:border-r">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[.14em] text-royal"><Zap size={13} /> Daily challenge</p>
              <p className="mt-1 text-lg font-extrabold">{challenge?.available ? `${challenge.size} questions · same for your whole class` : "Daily challenge"}</p>
            </div>
            {challenge && <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600"><Timer size={12} /> new in {hm(challenge.resetsIn)}</span>}
          </div>
          {!challenge ? <div className="mt-4 h-40 animate-pulse rounded-2xl bg-slate-100" /> : !challenge.available ? (
            <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">{challenge.reason ?? "There aren't enough questions for your grade yet — check back soon."}</p>
          ) : (
            <>
              {run?.finished ? (
                <div className="mt-4 flex items-center gap-4 rounded-2xl bg-gradient-to-r from-blue-50 to-white p-4">
                  <span className="text-3xl">{challenge.board.me && challenge.board.me.rank <= 3 ? MEDAL[challenge.board.me.rank] : "🏁"}</span>
                  <div className="text-sm"><p className="text-lg font-extrabold">{run.score} points</p><p className="text-slate-500">{run.correct}/{run.total} correct · rank #{challenge.board.me?.rank} of {challenge.board.players} · +{run.coins} coins</p></div>
                </div>
              ) : (
                <Link href="/challenge" className="btn-shine mt-4 flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-royal to-navy p-4 text-white">
                  <span><span className="block text-lg font-extrabold">{run ? "Continue today's challenge" : "Play today's challenge"}</span><span className="text-sm text-white/75">100 points per correct answer + speed bonus · one try</span></span>
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-gold text-navy"><Zap size={20} /></span>
                </Link>
              )}
              <ol className="mt-4 grid gap-1.5">
                {challenge.board.top.slice(0, 5).map((r) => (
                  <li key={r.rank} className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm ${r.me ? "bg-royal/10 ring-1 ring-royal/30" : "bg-slate-50"}`}>
                    <span className="w-6 text-center font-extrabold">{MEDAL[r.rank] || r.rank}</span>
                    <Avatar name={r.name} frame={r.frame} size="h-7 w-7 text-xs" />
                    <span className="min-w-0 flex-1 truncate font-bold">{r.name}{r.title && <span className="ml-1.5 rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">{r.title}</span>}{r.me && <span className="ml-1 text-xs text-royal">(you)</span>}</span>
                    <span className="font-extrabold tabular-nums">{r.score}</span>
                  </li>
                ))}
                {!challenge.board.top.length && <li className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">Nobody has played today yet — be the first!</li>}
              </ol>
            </>
          )}
        </div>

        {/* Weekly quests */}
        <div className="p-6">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[.14em] text-royal"><Gift size={13} /> Weekly quests</p>
          <p className="mt-1 text-lg font-extrabold">Finish quests, claim coins</p>
          {quests && <p className="text-xs text-slate-500">New quests every Saturday at 12:00 PM</p>}
          <ul className="mt-4 grid gap-2.5">
            {!quests && Array.from({ length: 3 }, (_, i) => <li key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />)}
            {quests?.quests.map((q) => (
              <li key={q.id} className={`rounded-2xl border p-3.5 ${q.claimed ? "border-green-200 bg-green-50/50" : q.done ? "border-amber-300 bg-amber-50/60" : "border-slate-200"}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{q.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{q.title}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><motion.span className={`block h-full rounded-full ${q.done ? "bg-green-500" : "bg-royal"}`} initial={{ width: 0 }} animate={{ width: `${(q.progress / q.target) * 100}%` }} /></span>
                      <span className="text-xs font-bold tabular-nums text-slate-500">{q.progress}/{q.target}</span>
                    </div>
                  </div>
                  {q.claimed ? <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700"><Check size={14} /> Claimed</span>
                    : q.done ? <button type="button" disabled={claiming === q.id} onClick={() => claim(q)} className="inline-flex items-center gap-1 rounded-xl bg-gold px-3 py-2 text-xs font-extrabold text-navy hover:brightness-95 disabled:opacity-60">{claiming === q.id ? <LoaderCircle size={13} className="animate-spin" /> : <Coins size={13} />} Claim {q.reward}</button>
                    : <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700"><Coins size={12} />{q.reward}</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <AnimatePresence>{toast && <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-navy px-4 py-2 text-sm font-bold text-white shadow-lg">{toast}</motion.p>}</AnimatePresence>
      <AnimatePresence>{shopOpen && <ShopDialog onClose={() => setShopOpen(false)} onCoins={onCoins} />}</AnimatePresence>
    </section>
  );
}

/** Spend coins on power-ups, avatar frames and titles. */
export function ShopDialog({ onClose, onCoins }: { onClose: () => void; onCoins: (balance: number) => void }) {
  const [shop, setShop] = useState<Shop | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { let on = true; get<Shop>("/api/shop").then((s) => on && setShop(s)); return () => { on = false; }; }, []);

  async function act(action: "buy" | "equip", item: ShopItem | null, kind?: "frame" | "title") {
    setBusy(item?.id ?? kind ?? "x");
    const r = await fetch("/api/shop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, item: item?.id ?? null, kind }) }).catch(() => null);
    const data = await r?.json().catch(() => ({}));
    setBusy(null);
    if (!r?.ok) return setMessage({ ok: false, text: data?.error || "Something went wrong." });
    setShop((s) => (s ? { ...s, gear: data.gear, wallet: data.balance !== undefined ? { ...s.wallet, balance: data.balance } : s.wallet } : s));
    if (data.balance !== undefined) onCoins(data.balance);
    setMessage({ ok: true, text: action === "buy" ? `${item?.name} is yours!` : item ? `${item.name} equipped.` : "Removed." });
  }

  const groups: { kind: ShopItem["kind"]; title: string; note: string }[] = [
    { kind: "powerup", title: "Power-ups", note: "Use them in Practice mode (not in Exam mode or the Daily challenge)." },
    { kind: "frame", title: "Avatar frames", note: "Shown around your avatar on leaderboards." },
    { kind: "title", title: "Titles", note: "Shown next to your name on leaderboards." },
  ];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 overflow-y-auto bg-navy/60 p-4 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ y: 30, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20 }} className="mx-auto my-6 max-w-3xl rounded-3xl bg-white p-6 shadow-2xl" role="dialog" aria-label="Shop">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-extrabold"><ShoppingBag size={22} className="text-royal" /> Shop</h2>
            <p className="text-sm text-slate-500">Coins are earned by practising — they can&apos;t be bought.</p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3.5 py-2 text-sm font-extrabold text-amber-700 ring-1 ring-amber-200"><Coins size={16} />{shop?.wallet.balance ?? "…"}</span>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full hover:bg-slate-100"><X size={19} /></button>
        </div>
        {message && <p className={`mt-3 rounded-xl p-3 text-sm font-semibold ${message.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{message.text}</p>}
        {!shop ? <div className="mt-5 h-72 animate-pulse rounded-2xl bg-slate-100" /> : groups.map((g) => (
          <div key={g.kind} className="mt-6">
            <p className="text-sm font-extrabold">{g.title} <span className="font-normal text-slate-500">· {g.note}</span></p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {shop.items.filter((i) => i.kind === g.kind).map((item) => {
                const owned = item.kind !== "powerup" && shop.gear.owned.includes(item.id);
                const equipped = (item.kind === "frame" && shop.gear.frame === item.id) || (item.kind === "title" && shop.gear.title === item.id);
                const count = item.kind === "powerup" ? shop.gear.powerups[item.id] ?? 0 : 0;
                const afford = shop.wallet.balance >= item.price;
                return (
                  <div key={item.id} className={`flex items-center gap-3 rounded-2xl border p-3 ${equipped ? "border-royal bg-blue-50/50" : "border-slate-200"}`}>
                    {item.kind === "powerup" ? <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-xl">{item.icon}</span>
                      : item.kind === "frame" ? <Avatar name="Y" frame={item.id} size="h-10 w-10 text-sm" />
                      : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600"><Sparkles size={18} /></span>}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-extrabold">{item.name}{count > 0 && <span className="ml-1.5 rounded-full bg-royal/10 px-1.5 text-[11px] text-royal">×{count}</span>}</p>
                      <p className="text-xs text-slate-500">{item.detail}</p>
                    </div>
                    {owned ? (
                      <button type="button" disabled={busy !== null} onClick={() => act("equip", equipped ? null : item, item.kind as "frame" | "title")} className={`rounded-xl px-3 py-2 text-xs font-bold ${equipped ? "bg-royal text-white" : "border border-slate-200 hover:border-royal"}`}>{equipped ? "Equipped" : "Equip"}</button>
                    ) : (
                      <button type="button" disabled={busy !== null || !afford} onClick={() => act("buy", item)} title={afford ? undefined : "Not enough coins yet"} className="inline-flex items-center gap-1 rounded-xl bg-gold px-3 py-2 text-xs font-extrabold text-navy hover:brightness-95 disabled:opacity-40">
                        {busy === item.id ? <LoaderCircle size={13} className="animate-spin" /> : <Coins size={13} />}{item.price}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {shop && shop.history.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-extrabold">Recent coins</p>
            <ul className="mt-2 grid gap-1 text-sm">{shop.history.slice(0, 6).map((h, i) => <li key={i} className="flex justify-between rounded-lg bg-slate-50 px-3 py-1.5"><span>{REASON[h.reason] ?? h.reason}</span><b className={h.amount > 0 ? "text-green-700" : "text-red-600"}>{h.amount > 0 ? "+" : ""}{h.amount}</b></li>)}</ul>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
