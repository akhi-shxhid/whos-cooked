/**
 * The core loop: rapid microgames under one of six modes. Modes change the
 * rules (lives, clock, seed, combos, bosses), not just the speed
 * (docs/decision.md, "Decision 2"). Same seed + same mode = same sequence.
 */
import { streamFor } from "./rng.ts";
import { FAKE_NOTIFICATIONS, SYMBOLS, type SymbolKey } from "./content.ts";

// ---------------------------------------------------------------- Modes

export type ModeKey = "classic" | "blitz" | "onelife" | "chill" | "daily" | "duel";

export interface ModeRules {
  key: ModeKey;
  name: string;
  /** One line shown on the mode picker. */
  pitch: string;
  /** null = no lives (can't fail out). */
  lives: number | null;
  /** Total clock for the run in ms, or null for no clock. */
  clockMs: number | null;
  /** Clock lost per miss (Blitz). */
  missPenaltyMs: number;
  startTier: number;
  speedUpEvery: number;
  /** Multiplier on every microgame's time limit (Chill > 1). */
  timeScale: number;
  /** Every 10th microgame is a boss. */
  bosses: boolean;
  /** Consecutive clears raise a points multiplier. */
  combo: boolean;
  /** Chill ends after this many microgames. */
  maxMicros: number | null;
  /** Where scores count. */
  ranked: "board" | "best" | "none";
  commandMs: number;
  outcomeMs: number;
}

const base = { missPenaltyMs: 0, timeScale: 1, maxMicros: null, commandMs: 650, outcomeMs: 420 } as const;

export const MODES: Record<ModeKey, ModeRules> = {
  classic: { ...base, key: "classic", name: "Classic", pitch: "3 lives. Speeds up every 5. Boss every 10.", lives: 3, clockMs: null, startTier: 0, speedUpEvery: 5, bosses: true, combo: false, ranked: "best" },
  blitz: { ...base, key: "blitz", name: "Blitz", pitch: "60 seconds. No lives. Combos multiply, misses cost 3s.", lives: null, clockMs: 60_000, missPenaltyMs: 3_000, startTier: 1, speedUpEvery: 4, bosses: false, combo: true, ranked: "board", commandMs: 420, outcomeMs: 240 },
  onelife: { ...base, key: "onelife", name: "One Life", pitch: "One miss and you're done. Starts fast.", lives: 1, clockMs: null, startTier: 2, speedUpEvery: 5, bosses: true, combo: true, ranked: "board" },
  chill: { ...base, key: "chill", name: "Chill", pitch: "No lives, slower timers. Just vibes and practice.", lives: null, clockMs: null, startTier: 0, speedUpEvery: 1_000, timeScale: 1.6, bosses: false, combo: false, maxMicros: 24, ranked: "none" },
  daily: { ...base, key: "daily", name: "Daily", pitch: "Same run for everyone today. First try counts.", lives: 3, clockMs: null, startTier: 0, speedUpEvery: 5, bosses: true, combo: false, ranked: "board" },
  duel: { ...base, key: "duel", name: "Duel", pitch: "Same rounds as your friend. Race their ghost.", lives: 3, clockMs: null, startTier: 0, speedUpEvery: 5, bosses: true, combo: false, ranked: "none" },
};

export const MODE_ORDER: readonly ModeKey[] = ["classic", "blitz", "onelife", "daily", "chill", "duel"];

// ---------------------------------------------------------------- Microgames

export type MicroKind = "pop" | "flags" | "dont" | "order" | "burnt" | "mash" | "catch" | "count";
const KINDS: readonly MicroKind[] = ["pop", "flags", "dont", "order", "burnt", "mash", "catch", "count"];

export const MICRO_COMMANDS: Record<MicroKind, string> = {
  pop: "Tap when it pops",
  flags: "Tap the green flags only",
  dont: "Don't tap anything",
  order: "Remember the order",
  burnt: "Find the burnt one",
  mash: "Tap tap tap tap",
  catch: "Catch the phone",
  count: "How many?",
};

export const MICRO_SHOUTS: Record<MicroKind, string> = {
  pop: "POP!",
  flags: "RED FLAGS!",
  dont: "DON'T!",
  order: "ORDER!",
  burnt: "BURNT ONE!",
  mash: "MASH!",
  catch: "CATCH!",
  count: "COUNT!",
};

interface Base {
  index: number;
  tier: number;
  boss: boolean;
  /** Time limit for the microgame, in ms. */
  timeMs: number;
}

export type MicroSpec =
  | (Base & { kind: "pop"; delayMs: number; fakeOuts: number })
  | (Base & { kind: "flags"; cells: { cell: number; green: boolean }[] })
  | (Base & { kind: "dont"; notifications: number[] })
  | (Base & { kind: "order"; sequence: SymbolKey[]; showMs: number })
  | (Base & { kind: "burnt"; columns: number; rows: number; burntIndex: number; contrast: number })
  | (Base & { kind: "mash"; taps: number })
  | (Base & { kind: "catch"; startX: number; drift: number; phones: number })
  | (Base & { kind: "count"; target: SymbolKey; cells: { cell: number; symbol: SymbolKey }[]; options: number[] });

export const GRID = { columns: 3, rows: 3 } as const;
export const COUNT_GRID = { columns: 4, rows: 4 } as const;

export function tierAt(rules: ModeRules, index: number): number {
  return rules.startTier + Math.floor(index / rules.speedUpEvery);
}

export function speedFactor(tier: number): number {
  return Math.max(0.42, 0.88 ** tier);
}

export function isBoss(rules: ModeRules, index: number): boolean {
  return rules.bosses && (index + 1) % 10 === 0;
}

/** Kinds come in shuffled blocks of eight; the first microgame of a run is always Pop. */
export function kindAt(seed: string, index: number): MicroKind {
  const n = KINDS.length;
  const target = Math.floor(index / n);
  let previous: MicroKind[] = [];
  for (let b = 0; b <= target; b++) {
    let block = streamFor(seed, `block:${b}`).shuffle(KINDS);
    if (b === 0) block = ["pop", ...block.filter((k) => k !== "pop")];
    else if (block[0] === previous[n - 1]) [block[0], block[1]] = [block[1]!, block[0]!];
    previous = block;
  }
  return previous[index % n]!;
}

export function microAt(seed: string, index: number, rules: ModeRules = MODES.classic): MicroSpec {
  const kind = kindAt(seed, index);
  const boss = isBoss(rules, index);
  const tier = tierAt(rules, index) + (boss ? 3 : 0);
  const f = speedFactor(tier);
  const scale = rules.timeScale * (boss ? 1.25 : 1);
  const rng = streamFor(seed, `micro:${index}`);
  const t = (ms: number, floor = 0.5) => Math.round(ms * Math.max(floor, f) * scale);
  const b = { index, tier, boss };

  switch (kind) {
    case "pop":
      return { ...b, kind, delayMs: Math.round(rng.range(450, 1600) * Math.max(0.7, f)), fakeOuts: Math.min(3, Math.floor(tier / 2)), timeMs: t(900, 0.6) };
    case "flags": {
      const total = Math.min(8, 4 + Math.floor(tier / 2));
      const green = Math.min(total - 1, 2 + Math.floor(tier / 3));
      const cells = rng.shuffle(Array.from({ length: GRID.columns * GRID.rows }, (_, i) => i)).slice(0, total);
      const greens = new Set(rng.shuffle(cells).slice(0, green));
      return { ...b, kind, timeMs: t(3400), cells: cells.map((cell) => ({ cell, green: greens.has(cell) })) };
    }
    case "dont": {
      const count = boss ? 3 : 1 + Math.floor(tier / 4);
      return { ...b, kind, timeMs: t(2400, 0.75), notifications: Array.from({ length: Math.min(3, count) }, () => rng.int(0, FAKE_NOTIFICATIONS.length - 1)) };
    }
    case "order": {
      const length = Math.min(7, 3 + Math.floor(tier / 2));
      const keys = SYMBOLS.map((s) => s.key);
      const sequence: SymbolKey[] = [];
      while (sequence.length < length) sequence.push(rng.pick(keys.filter((k) => k !== sequence[sequence.length - 1])));
      return { ...b, kind, sequence, showMs: Math.round(520 * Math.max(0.6, f) * rules.timeScale), timeMs: t(2600 + length * 700, 0.7) };
    }
    case "burnt": {
      const columns = 3;
      const rows = tier >= 4 ? 4 : tier >= 2 ? 3 : 2;
      return { ...b, kind, columns, rows, burntIndex: rng.int(0, columns * rows - 1), contrast: Math.max(20, Math.round(60 - tier * 6)), timeMs: t(3000) };
    }
    case "mash":
      return { ...b, kind, taps: Math.min(18, 7 + tier), timeMs: t(2600, 0.75) };
    case "catch":
      return { ...b, kind, startX: rng.range(0.2, 0.8), drift: rng.range(-0.25, 0.25), phones: boss ? 2 : 1, timeMs: t(2200, 0.55) };
    case "count": {
      const keys = SYMBOLS.map((s) => s.key);
      const target = rng.pick(keys);
      const total = Math.min(14, 8 + tier);
      const want = rng.int(3, Math.min(7, total - 2));
      const cells = rng.shuffle(Array.from({ length: COUNT_GRID.columns * COUNT_GRID.rows }, (_, i) => i)).slice(0, total);
      const others = keys.filter((k) => k !== target);
      const placed = cells.map((cell, i) => ({ cell, symbol: i < want ? target : rng.pick(others) }));
      const options = rng.shuffle([want - 1, want, want + 1]);
      return { ...b, kind, target, cells: rng.shuffle(placed), options, timeMs: t(3800, 0.65) };
    }
  }
}

// ---------------------------------------------------------------- Results and scoring

export type MicroOutcome = "cleared" | "failed";

export interface OutcomeRecord {
  kind: MicroKind;
  outcome: MicroOutcome;
  ms: number;
  points: number;
  boss: boolean;
}

export interface RushResult {
  seed: string;
  mode: ModeKey;
  outcomes: OutcomeRecord[];
  points: number;
  bestPopMs: number | null;
}

export function clearedCount(r: Pick<RushResult, "outcomes">): number {
  return r.outcomes.filter((o) => o.outcome === "cleared").length;
}

/** Back-compat alias: score for lives modes is microgames cleared. */
export const rushScore = clearedCount;

/** Points multiplier for the n-th clear in a row (combo modes). */
export function comboMultiplier(rules: ModeRules, streak: number): number {
  return rules.combo ? Math.min(5, 1 + Math.floor(streak / 3)) : 1;
}

/** Points for one clear: 1 (3 for a boss), times the combo multiplier. */
export function pointsFor(rules: ModeRules, boss: boolean, streak: number): number {
  return (boss ? 3 : 1) * comboMultiplier(rules, streak);
}

/** The headline number: points in combo modes, microgames cleared otherwise. */
export function headlineScore(r: Pick<RushResult, "mode" | "outcomes" | "points">): number {
  return MODES[r.mode].combo ? r.points : clearedCount(r);
}

// ---------------------------------------------------------------- Ranks (Gen Z slang)

export type RushLevel = "Locked In" | "Goated" | "Mid" | "Cooked" | "Fully Cooked";

/** Thresholds per mode, worst to best. Blitz and One Life count points; the rest count clears. */
const RANK_TABLE: Record<ModeKey, readonly [RushLevel, number][]> = {
  classic: [["Fully Cooked", 0], ["Cooked", 6], ["Mid", 12], ["Goated", 20], ["Locked In", 30]],
  daily: [["Fully Cooked", 0], ["Cooked", 6], ["Mid", 12], ["Goated", 20], ["Locked In", 30]],
  duel: [["Fully Cooked", 0], ["Cooked", 6], ["Mid", 12], ["Goated", 20], ["Locked In", 30]],
  chill: [["Fully Cooked", 0], ["Cooked", 8], ["Mid", 14], ["Goated", 19], ["Locked In", 23]],
  blitz: [["Fully Cooked", 0], ["Cooked", 15], ["Mid", 35], ["Goated", 60], ["Locked In", 90]],
  onelife: [["Fully Cooked", 0], ["Cooked", 5], ["Mid", 15], ["Goated", 35], ["Locked In", 60]],
};

export const RUSH_RANKS: readonly { level: RushLevel }[] = RANK_TABLE.classic.map(([level]) => ({ level }));

export function rushLevel(score: number, mode: ModeKey = "classic"): RushLevel {
  let level: RushLevel = "Fully Cooked";
  for (const [l, min] of RANK_TABLE[mode]) if (score >= min) level = l;
  return level;
}

/** Doneness to draw a toast after `lost` lives (0..3). */
export function donenessForLives(lost: number): number {
  return [18, 48, 72, 96][Math.min(3, Math.max(0, lost))]!;
}

// ---------------------------------------------------------------- Daily

export function dailyKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function dailySeed(key: string): string {
  // TODO(M2): issue daily seeds from the server so the sequence can't be precomputed.
  return `daily-${key}`;
}

export function dailyNumber(key: string, launch = "2026-11-08"): number {
  const ms = Date.parse(`${key}T00:00:00Z`) - Date.parse(`${launch}T00:00:00Z`);
  return Math.max(1, Math.floor(ms / 86_400_000) + 1);
}

/** Spoiler-free result grid: one square per microgame, bosses as a bigger mark. */
export function shareGrid(outcomes: Pick<OutcomeRecord, "outcome" | "boss">[], perRow = 10): string {
  const squares = outcomes.map((o) => (o.outcome === "cleared" ? (o.boss ? "🟩" : "🟨") : "🟥"));
  const rows: string[] = [];
  for (let i = 0; i < squares.length; i += perRow) rows.push(squares.slice(i, i + perRow).join(""));
  return rows.join("\n");
}

// ---------------------------------------------------------------- Duel ghosts

/** Compact ghost for a duel link: one character per microgame, "1" cleared, "0" missed. */
export function encodeGhost(outcomes: Pick<OutcomeRecord, "outcome">[]): string {
  return outcomes.map((o) => (o.outcome === "cleared" ? "1" : "0")).join("").slice(0, 120);
}

export function decodeGhost(s: string | null): boolean[] | null {
  if (!s || !/^[01]{1,120}$/.test(s)) return null;
  return [...s].map((c) => c === "1");
}

/** Ghost's cleared count after `index` microgames. */
export function ghostScoreAt(ghost: boolean[], index: number): number {
  return ghost.slice(0, index).filter(Boolean).length;
}
