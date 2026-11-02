/** What students can spend coins on. Prices are in coins. */
export type ShopItem =
  | { id: string; kind: "powerup"; name: string; detail: string; price: number; icon: string }
  | { id: string; kind: "frame"; name: string; detail: string; price: number; ring: string }
  | { id: string; kind: "title"; name: string; detail: string; price: number };

export const SHOP: ShopItem[] = [
  { id: "fifty", kind: "powerup", name: "50 / 50", detail: "Removes two wrong answers from a practice question.", price: 15, icon: "✂️" },
  { id: "time", kind: "powerup", name: "+30 seconds", detail: "Adds 30 seconds to the timer of a practice question.", price: 10, icon: "⏱️" },
  { id: "frame-gold", kind: "frame", name: "Gold frame", detail: "A shining gold ring around your avatar.", price: 60, ring: "ring-[#F4B740]" },
  { id: "frame-emerald", kind: "frame", name: "Emerald frame", detail: "Calm green — for steady learners.", price: 80, ring: "ring-emerald-500" },
  { id: "frame-fire", kind: "frame", name: "Fire frame", detail: "Red-hot, for students on a streak.", price: 120, ring: "ring-orange-500" },
  { id: "frame-galaxy", kind: "frame", name: "Galaxy frame", detail: "Deep purple — out of this world.", price: 200, ring: "ring-violet-500" },
  { id: "title-bookworm", kind: "title", name: "Bookworm", detail: "Shown next to your name on leaderboards.", price: 50 },
  { id: "title-math-wizard", kind: "title", name: "Math Wizard", detail: "Shown next to your name on leaderboards.", price: 80 },
  { id: "title-science-star", kind: "title", name: "Science Star", detail: "Shown next to your name on leaderboards.", price: 80 },
  { id: "title-code-ninja", kind: "title", name: "Code Ninja", detail: "Shown next to your name on leaderboards.", price: 80 },
  { id: "title-history-buff", kind: "title", name: "History Buff", detail: "Shown next to your name on leaderboards.", price: 80 },
  { id: "title-exam-legend", kind: "title", name: "Exam Legend", detail: "For true champions. Shown on leaderboards.", price: 300 },
];
export const shopItem = (id: string) => SHOP.find((i) => i.id === id);

/** Cosmetics and power-ups a student owns (stored on the user document as `gear`). */
export type Gear = { owned: string[]; frame: string | null; title: string | null; powerups: Record<string, number> };
export const EMPTY_GEAR: Gear = { owned: [], frame: null, title: null, powerups: {} };
export const frameRing = (frame?: string | null) => {
  const item = frame ? shopItem(frame) : undefined;
  return item && item.kind === "frame" ? item.ring : "";
};
export const titleName = (title?: string | null) => (title ? shopItem(title)?.name ?? null : null);
