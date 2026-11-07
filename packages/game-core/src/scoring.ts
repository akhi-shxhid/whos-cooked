/**
 * Who's Cooked? scoring (PRD section 6). Every stored result carries
 * SCORING_VERSION. Changing any weight or formula requires a new version.
 */
import { ROUND_RULES } from "./rounds.ts";

export const SCORING_VERSION = "2026-11.v1";

const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));

// ---------------------------------------------------------------- Raw results

export interface CalibrationResult {
  /** Estimated device latency in ms, already capped to +/- 40. */
  offsetMs: number;
}

export interface PopTrial {
  delayMs: number;
  /**
   * Tap time relative to the pop in ms, from `event.timeStamp`. Negative means
   * the tap came before the pop. `null` means no tap before the trial timed out.
   */
  tapMs: number | null;
}

export interface NoiseResult {
  targets: number;
  hits: number;
  misses: number;
  /** Taps on burnt crumbs. */
  falseAlarms: number;
  /** Taps on fake notifications. */
  notificationTaps: number;
}

export interface OrderResult {
  /** Longest sequence repeated correctly. 0 if none. */
  maxSpan: number;
  attempts: { length: number; correct: boolean }[];
}

export interface GutResult {
  /** Choice per pick in round order: 0 = a, 1 = b, null = no answer. */
  choices: (0 | 1 | null)[];
}

/** Stored with each play so reaction comparisons can account for device mix (PRD sections 5 and 6). */
export interface DeviceInfo {
  deviceClass: "phone" | "tablet" | "desktop";
  browser: string;
  refreshHz: number | null;
  inputType: string;
}

export interface RawPlay {
  seed: string;
  device?: DeviceInfo;
  calibration: CalibrationResult;
  pop: PopTrial[];
  noise: NoiseResult;
  order: OrderResult;
  gut: GutResult;
}

// ---------------------------------------------------------------- Calibration

/** Device offset from rhythm taps (tap time minus beat time), capped to +/- 40 ms. */
export function estimateOffset(tapMinusBeatMs: number[]): number {
  const { maxOffsetMs } = ROUND_RULES.calibration;
  const m = median(tapMinusBeatMs.filter((v) => Number.isFinite(v) && Math.abs(v) < 400));
  if (m === null) return 0;
  return Math.round(clamp(m, -maxOffsetMs, maxOffsetMs));
}

// ---------------------------------------------------------------- Sub-scores

export interface SubScores {
  reaction: number;
  focus: number;
  memory: number;
  impulse: number;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

export function isFalseStart(trial: PopTrial): boolean {
  return trial.tapMs !== null && trial.tapMs < ROUND_RULES.pop.falseStartWindowMs;
}

export interface ReactionStats {
  medianReactionMs: number | null;
  falseStarts: number;
}

/** Misses count as the trial timeout. False starts are excluded from the median. */
export function reactionStats(trials: PopTrial[], offsetMs: number): ReactionStats {
  const times: number[] = [];
  let falseStarts = 0;
  for (const t of trials) {
    if (isFalseStart(t)) falseStarts++;
    else times.push(t.tapMs === null ? ROUND_RULES.pop.timeoutMs : t.tapMs - offsetMs);
  }
  return { medianReactionMs: median(times), falseStarts };
}

export function reactionScore({ medianReactionMs, falseStarts }: ReactionStats): number {
  const base = medianReactionMs === null ? 0 : clamp(((620 - medianReactionMs) / (620 - 240)) * 100);
  return clamp(base - falseStarts * 6);
}

export function focusScore(n: NoiseResult): number {
  const hitRate = n.targets > 0 ? (n.hits / n.targets) * 100 : 0;
  return clamp(hitRate - n.falseAlarms * 8 - n.notificationTaps * 12);
}

export function memoryScore(maxSpan: number): number {
  return clamp(((maxSpan - 3) / (9 - 3)) * 100);
}

export function impulseScore(falseStarts: number, falseAlarms: number): number {
  return clamp(100 - falseStarts * 15 - falseAlarms * 10);
}

// ---------------------------------------------------------------- Cooked Score

export type ToastLevel = "Raw" | "Golden" | "Crispy" | "Burnt" | "Charcoal";

export const LEVELS: readonly { level: ToastLevel; min: number; max: number; meaning: string }[] = [
  { level: "Raw", min: 0, max: 19, meaning: "Barely touched" },
  { level: "Golden", min: 20, max: 39, meaning: "Very sharp" },
  { level: "Crispy", min: 40, max: 59, meaning: "Holding on" },
  { level: "Burnt", min: 60, max: 79, meaning: "Getting worrying" },
  { level: "Charcoal", min: 80, max: 100, meaning: "Send help" },
];

export function levelFor(cooked: number): ToastLevel {
  const c = Math.round(clamp(cooked));
  return LEVELS.find((l) => c >= l.min && c <= l.max)!.level;
}

export function cookedScore(s: SubScores): number {
  return Math.round(clamp(100 - (s.focus * 0.35 + s.reaction * 0.25 + s.memory * 0.25 + s.impulse * 0.15)));
}

export interface PlayScore {
  scoringVersion: string;
  cooked: number;
  level: ToastLevel;
  /** Rounded to whole numbers for display and storage. */
  subScores: SubScores;
  medianReactionMs: number | null;
  falseStarts: number;
}

export function scorePlay(play: RawPlay): PlayScore {
  const stats = reactionStats(play.pop, play.calibration.offsetMs);
  const exact: SubScores = {
    reaction: reactionScore(stats),
    focus: focusScore(play.noise),
    memory: memoryScore(play.order.maxSpan),
    impulse: impulseScore(stats.falseStarts, play.noise.falseAlarms),
  };
  const cooked = cookedScore(exact);
  return {
    scoringVersion: SCORING_VERSION,
    cooked,
    level: levelFor(cooked),
    subScores: {
      reaction: Math.round(exact.reaction),
      focus: Math.round(exact.focus),
      memory: Math.round(exact.memory),
      impulse: Math.round(exact.impulse),
    },
    medianReactionMs: stats.medianReactionMs === null ? null : Math.round(stats.medianReactionMs),
    falseStarts: stats.falseStarts,
  };
}

// ---------------------------------------------------------------- Sync and head-to-head

export function gutMatchPercent(a: GutResult, b: GutResult): number {
  const n = Math.max(a.choices.length, b.choices.length);
  if (n === 0) return 0;
  let matches = 0;
  for (let i = 0; i < n; i++) {
    const ca = a.choices[i];
    if (ca !== null && ca !== undefined && ca === b.choices[i]) matches++;
  }
  return (matches / n) * 100;
}

/** A fun score only. Never present it as proof of compatibility (PRD section 6). */
export function syncScore(a: { gut: GutResult; subScores: SubScores }, b: { gut: GutResult; subScores: SubScores }): number {
  const keys = ["reaction", "focus", "memory", "impulse"] as const;
  const avgDiff = keys.reduce((sum, k) => sum + Math.abs(a.subScores[k] - b.subScores[k]), 0) / keys.length;
  return Math.round(clamp(gutMatchPercent(a.gut, b.gut) * 0.7 + (100 - avgDiff) * 0.3));
}

export type Outcome = "a" | "b" | "tie";

export interface HeadToHead {
  overall: Outcome;
  rounds: { reaction: Outcome; focus: Outcome; memory: Outcome; impulse: Outcome };
}

const higherWins = (a: number, b: number): Outcome => (a === b ? "tie" : a > b ? "a" : "b");

export function headToHead(a: PlayScore, b: PlayScore): HeadToHead {
  let reaction: Outcome;
  const ma = a.medianReactionMs;
  const mb = b.medianReactionMs;
  if (ma === null && mb === null) reaction = "tie";
  else if (ma === null) reaction = "b";
  else if (mb === null) reaction = "a";
  else reaction = Math.abs(ma - mb) < 25 ? "tie" : ma < mb ? "a" : "b";

  const overall: Outcome = Math.abs(a.cooked - b.cooked) < 2 ? "tie" : a.cooked < b.cooked ? "a" : "b";
  return {
    overall,
    rounds: {
      reaction,
      focus: higherWins(a.subScores.focus, b.subScores.focus),
      memory: higherWins(a.subScores.memory, b.subScores.memory),
      impulse: higherWins(a.subScores.impulse, b.subScores.impulse),
    },
  };
}
