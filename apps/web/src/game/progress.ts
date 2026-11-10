import type { CrewKey } from "@whoscooked/brand";
import {
  advanceMission,
  CHARACTERS,
  dailyKey,
  headlineScore,
  levelFromXp,
  missionsFor,
  ownsCharacter,
  rewardsForLevel,
  xpForRun,
  type Mission,
  type ModeKey,
  type RushResult,
  type XpBreakdown,
} from "@whoscooked/game-core";

/**
 * Player progress on this device (localStorage). Nothing here is personal data,
 * and the game still works if storage is blocked.
 * TODO(M4): sync to the server for signed-in players so progress follows them.
 */
export interface Progress {
  xp: number;
  runs: number;
  bestByMode: Partial<Record<ModeKey, number>>;
  daily: Record<string, { score: number; grid: string }>;
  streak: { current: number; best: number; lastKey: string | null };
  /** Grace days. Everyone gets one free each week; they are never sold (docs/research.md §5). */
  freezes: number;
  freezeGrantedWeek: string | null;
  character: CrewKey;
  plus: boolean;
  crew: boolean;
  missions: { day: string; progress: Record<string, number>; done: string[] };
  lastRunDay: string | null;
  /** Runs since the page loaded, for the break prompt (ICO guidance). Not persisted across visits. */
  sessionRuns: number;
  handle: string | null;
}

const KEY = "wc.progress.v2";
const OLD_KEY = "wc.progress.v1";

const fresh = (): Progress => ({
  xp: 0,
  runs: 0,
  bestByMode: {},
  daily: {},
  streak: { current: 0, best: 0, lastKey: null },
  freezes: 0,
  freezeGrantedWeek: null,
  character: "toasty",
  plus: false,
  crew: false,
  missions: { day: "", progress: {}, done: [] },
  lastRunDay: null,
  sessionRuns: 0,
  handle: null,
});

function read(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Carries v1 players over: best score, daily results, streak, grace days, and Cooked+. */
export function migrateV1(v1: Record<string, unknown>): Partial<Progress> {
  const out: Partial<Progress> = {};
  if (typeof v1.best === "number") out.bestByMode = { classic: v1.best };
  if (typeof v1.totalCleared === "number") out.xp = v1.totalCleared * 10;
  if (v1.daily && typeof v1.daily === "object") out.daily = v1.daily as Progress["daily"];
  if (v1.streak && typeof v1.streak === "object") out.streak = v1.streak as Progress["streak"];
  if (typeof v1.freezes === "number") out.freezes = v1.freezes;
  if (typeof v1.plus === "boolean") out.plus = v1.plus;
  return out;
}

export function loadProgress(): Progress {
  const v2 = read(KEY) as Partial<Progress> | null;
  if (v2) return { ...fresh(), ...v2, sessionRuns: 0 };
  const v1 = read(OLD_KEY) as Record<string, unknown> | null;
  return v1 ? { ...fresh(), ...migrateV1(v1) } : fresh();
}

export function saveProgress(p: Progress) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Storage blocked: progress lasts for this visit only.
  }
}

export function level(p: Progress) {
  return levelFromXp(p.xp);
}

export function owned(p: Progress) {
  return { level: level(p).level, plus: p.plus, crew: p.crew };
}

export function ownsSelected(p: Progress): CrewKey {
  const def = CHARACTERS.find((c) => c.key === p.character);
  return def && ownsCharacter(def, owned(p)) ? p.character : "toasty";
}

// ---------------------------------------------------------------- Streaks

function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export function reconcileStreak(p: Progress, today = dailyKey()): { progress: Progress; usedFreezes: number; broken: boolean } {
  const s = p.streak;
  if (!s.lastKey || s.current === 0) return { progress: p, usedFreezes: 0, broken: false };
  const missed = daysBetween(s.lastKey, today) - 1;
  if (missed <= 0) return { progress: p, usedFreezes: 0, broken: false };
  if (missed <= p.freezes) {
    const yesterday = new Date(Date.parse(`${today}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
    return { progress: { ...p, freezes: p.freezes - missed, streak: { ...s, lastKey: yesterday } }, usedFreezes: missed, broken: false };
  }
  return { progress: { ...p, streak: { ...s, current: 0 } }, usedFreezes: 0, broken: true };
}

export function weekOf(key: string): string {
  const d = new Date(`${key}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - day * 86_400_000).toISOString().slice(0, 10);
}

export function grantWeeklyGrace(p: Progress, today = dailyKey()): Progress {
  const week = weekOf(today);
  if (p.freezeGrantedWeek === week) return p;
  return { ...p, freezes: Math.max(p.freezes, 1), freezeGrantedWeek: week };
}

// ---------------------------------------------------------------- Missions

export function todaysMissions(p: Progress, today = dailyKey()): { missions: Mission[]; progress: Record<string, number>; done: string[] } {
  const missions = missionsFor(today);
  if (p.missions.day !== today) return { missions, progress: {}, done: [] };
  return { missions, progress: p.missions.progress, done: p.missions.done };
}

// ---------------------------------------------------------------- Recording a run

export interface RunSummary {
  progress: Progress;
  xp: XpBreakdown;
  missionXp: number;
  levelBefore: number;
  levelAfter: number;
  unlocks: string[];
  newBest: boolean;
  previousBest: number | null;
  dailyCounted: boolean;
  streakExtended: boolean;
  missionsCompleted: Mission[];
}

export function recordRun(p0: Progress, r: RushResult, grid: string, today = dailyKey()): RunSummary {
  const { progress: p } = reconcileStreak(grantWeeklyGrace(p0, today), today);
  const score = headlineScore(r);
  const levelBefore = levelFromXp(p.xp).level;
  const previousBest = p.bestByMode[r.mode] ?? null;
  const xp = xpForRun(r, { firstRunToday: p.lastRunDay !== today });

  const next: Progress = {
    ...p,
    runs: p.runs + 1,
    sessionRuns: p.sessionRuns + 1,
    lastRunDay: today,
    bestByMode: { ...p.bestByMode, [r.mode]: Math.max(previousBest ?? 0, score) },
    daily: { ...p.daily },
    streak: { ...p.streak },
  };

  let dailyCounted = false;
  let streakExtended = false;
  if (r.mode === "daily" && !next.daily[today]) {
    next.daily[today] = { score, grid };
    dailyCounted = true;
    if (next.streak.lastKey !== today) {
      next.streak.current += 1;
      next.streak.best = Math.max(next.streak.best, next.streak.current);
      next.streak.lastKey = today;
      streakExtended = true;
    }
  }

  const ms = todaysMissions(p, today);
  const progress = { ...ms.progress };
  const done = [...ms.done];
  const missionsCompleted: Mission[] = [];
  for (const m of ms.missions) {
    if (done.includes(m.id)) continue;
    progress[m.id] = advanceMission(m, progress[m.id] ?? 0, r);
    if (progress[m.id]! >= m.target) {
      done.push(m.id);
      missionsCompleted.push(m);
    }
  }
  next.missions = { day: today, progress, done };
  const missionXp = missionsCompleted.reduce((s, m) => s + m.xp, 0);
  next.xp = p.xp + xp.total + missionXp;

  const levelAfter = levelFromXp(next.xp).level;
  const unlocks: string[] = [];
  for (let l = levelBefore + 1; l <= levelAfter; l++) unlocks.push(...rewardsForLevel(l));

  return {
    progress: next,
    xp,
    missionXp,
    levelBefore,
    levelAfter,
    unlocks,
    newBest: previousBest === null ? score > 0 : score > previousBest,
    previousBest,
    dailyCounted,
    streakExtended,
    missionsCompleted,
  };
}
