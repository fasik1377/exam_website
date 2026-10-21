/** Points, levels and badges for students. Pure functions, shared by the API and the exam page. */

export const XP = { correct: 10, wrong: 2, timeout: 0, comboBonus: 5 } as const;
export const DAILY_GOAL = 10;

/** MongoDB expression for an attempt's XP; attempts saved before XP existed get the standard amount. */
export const XP_EXPR = { $ifNull: ["$xp", { $cond: ["$correct", XP.correct, XP.wrong] }] };

/** XP for one answer. A bonus is added for every 3rd correct answer in a row. */
export const xpFor = (correct: boolean, timedOut = false, combo = 0) =>
  timedOut ? XP.timeout : correct ? XP.correct + (combo > 0 && combo % 3 === 0 ? XP.comboBonus : 0) : XP.wrong;

export const LEVELS = [
  { xp: 0, title: "Beginner" },
  { xp: 100, title: "Learner" },
  { xp: 300, title: "Explorer" },
  { xp: 600, title: "Achiever" },
  { xp: 1000, title: "Scholar" },
  { xp: 1600, title: "Expert" },
  { xp: 2500, title: "Master" },
  { xp: 4000, title: "Champion" },
  { xp: 6000, title: "Legend" },
];

export function levelFor(xp: number) {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1].xp) i++;
  const next = LEVELS[i + 1];
  return {
    level: i + 1,
    title: LEVELS[i].title,
    xp,
    floor: LEVELS[i].xp,
    next: next?.xp ?? null,
    progress: next ? (xp - LEVELS[i].xp) / (next.xp - LEVELS[i].xp) : 1,
  };
}

export type BadgeStats = { total: number; correct: number; streak: number; bestRun: number; subjects: number; goalDays: number };
export const BADGES: { id: string; name: string; detail: string; earned: (s: BadgeStats) => boolean; progress: (s: BadgeStats) => [number, number] }[] = [
  { id: "first", name: "First step", detail: "Answer your first question", earned: (s) => s.total >= 1, progress: (s) => [s.total, 1] },
  { id: "ten-correct", name: "Sharp mind", detail: "Get 10 answers right", earned: (s) => s.correct >= 10, progress: (s) => [s.correct, 10] },
  { id: "fifty", name: "Half century", detail: "Answer 50 questions", earned: (s) => s.total >= 50, progress: (s) => [s.total, 50] },
  { id: "hundred", name: "Centurion", detail: "Answer 100 questions", earned: (s) => s.total >= 100, progress: (s) => [s.total, 100] },
  { id: "run5", name: "On fire", detail: "5 correct answers in a row", earned: (s) => s.bestRun >= 5, progress: (s) => [s.bestRun, 5] },
  { id: "streak3", name: "Habit builder", detail: "Practise 3 days in a row", earned: (s) => s.streak >= 3, progress: (s) => [s.streak, 3] },
  { id: "streak7", name: "Week warrior", detail: "Practise 7 days in a row", earned: (s) => s.streak >= 7, progress: (s) => [s.streak, 7] },
  { id: "explorer", name: "All-rounder", detail: "Practise 3 different subjects", earned: (s) => s.subjects >= 3, progress: (s) => [s.subjects, 3] },
  { id: "accurate", name: "Sharpshooter", detail: "80% accuracy after 20+ answers", earned: (s) => s.total >= 20 && s.correct / s.total >= 0.8, progress: (s) => [Math.min(s.total, 20), 20] },
  { id: "goal", name: "Goal getter", detail: `Hit the daily goal (${DAILY_GOAL} answers)`, earned: (s) => s.goalDays >= 1, progress: (s) => [s.goalDays, 1] },
];

/** Longest run of correct answers in a chronological list. */
export function bestRun(answers: boolean[]) {
  let best = 0, run = 0;
  for (const ok of answers) { run = ok ? run + 1 : 0; best = Math.max(best, run); }
  return best;
}
