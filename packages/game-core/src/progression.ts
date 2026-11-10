/**
 * Progression: XP, levels, the character roster, titles, and daily missions.
 * Every reward is fixed and visible in advance. Nothing is random and nothing
 * paid changes how you score (docs/decision.md, "Decision 2").
 */
import { streamFor } from "./rng.ts";
import { MODES, clearedCount, headlineScore, type MicroKind, type ModeKey, type RushResult } from "./rush.ts";

// ---------------------------------------------------------------- XP and levels

export interface XpContext {
  /** First finished run of the day earns the daily bonus. */
  firstRunToday: boolean;
}

export interface XpBreakdown {
  total: number;
  lines: { label: string; xp: number }[];
}

export function xpForRun(r: RushResult, ctx: XpContext): XpBreakdown {
  const lines: { label: string; xp: number }[] = [];
  const cleared = clearedCount(r);
  lines.push({ label: `${cleared} cleared`, xp: cleared * 10 });
  const bosses = r.outcomes.filter((o) => o.boss && o.outcome === "cleared").length;
  if (bosses) lines.push({ label: `${bosses} boss${bosses > 1 ? "es" : ""}`, xp: bosses * 25 });
  if (r.mode === "onelife") lines.push({ label: "One Life bonus", xp: Math.round(cleared * 5) });
  if (r.mode === "blitz") lines.push({ label: "Combo points", xp: Math.max(0, r.points - cleared) * 2 });
  if (r.mode === "daily") lines.push({ label: "Daily", xp: 25 });
  if (ctx.firstRunToday) lines.push({ label: "First run today", xp: 50 });
  return { total: lines.reduce((s, l) => s + l.xp, 0), lines: lines.filter((l) => l.xp > 0) };
}

/** Total XP needed to reach `level` (level 1 = 0). Gentle early, steady later. */
export function xpForLevel(level: number): number {
  return 50 * level * (level - 1);
}

export function levelFromXp(xp: number): { level: number; into: number; needed: number } {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  const floor = xpForLevel(level);
  return { level, into: xp - floor, needed: xpForLevel(level + 1) - floor };
}

// ---------------------------------------------------------------- Characters and titles

export type CharacterKey =
  | "toasty" | "npc" | "doomscroll" | "delulu" | "sigma" | "goblin"
  | "rizzler" | "maincharacter"
  | "moai" | "glitch" | "microwave";

export type Unlock = { level: number } | { pack: "plus" | "crew" };

export interface CharacterDef {
  key: CharacterKey;
  name: string;
  /** Catchphrase shown on cards and the locker. */
  line: string;
  unlock: Unlock;
}

export const CHARACTERS: readonly CharacterDef[] = [
  { key: "toasty", name: "Toasty", line: "Has seen your screen time.", unlock: { level: 1 } },
  { key: "npc", name: "NPC", line: "Hello, traveler.", unlock: { level: 2 } },
  { key: "doomscroll", name: "Doomscroll", line: "One more video. Then bed.", unlock: { level: 4 } },
  { key: "delulu", name: "Delulu", line: "Trust the process.", unlock: { level: 6 } },
  { key: "sigma", name: "Sigma", line: "...", unlock: { level: 9 } },
  { key: "goblin", name: "Goblin", line: "Goblin mode: on.", unlock: { level: 12 } },
  { key: "rizzler", name: "Rizzler", line: "W rizz, L focus.", unlock: { pack: "plus" } },
  { key: "maincharacter", name: "Main Character", line: "It's my movie, actually.", unlock: { pack: "plus" } },
  { key: "moai", name: "Moai", line: "Unbothered since forever.", unlock: { pack: "crew" } },
  { key: "glitch", name: "Glitch", line: "e̶r̶r̶o̶r̶ locked in.", unlock: { pack: "crew" } },
  { key: "microwave", name: "Microwave", line: "BEEP BEEP BEEP.", unlock: { pack: "crew" } },
];

export const TITLES: readonly { level: number; title: string }[] = [
  { level: 1, title: "Fresh Out the Bag" },
  { level: 3, title: "Lightly Toasted" },
  { level: 5, title: "Thumb Athlete" },
  { level: 7, title: "Focus Merchant" },
  { level: 10, title: "Touch Grass Champion" },
  { level: 15, title: "Certified Locked In" },
];

export function titleFor(level: number): string {
  let t = TITLES[0]!.title;
  for (const x of TITLES) if (level >= x.level) t = x.title;
  return t;
}

export interface Owned {
  level: number;
  plus: boolean;
  crew: boolean;
}

export function ownsCharacter(c: CharacterDef, o: Owned): boolean {
  if ("level" in c.unlock) return o.level >= c.unlock.level;
  return c.unlock.pack === "plus" ? o.plus : o.crew;
}

/** What a level-up unlocks, so the game-over screen can announce it. */
export function rewardsForLevel(level: number): string[] {
  const out: string[] = [];
  for (const c of CHARACTERS) if ("level" in c.unlock && c.unlock.level === level) out.push(`${c.name} unlocked`);
  for (const t of TITLES) if (t.level === level) out.push(`Title: ${t.title}`);
  return out;
}

// ---------------------------------------------------------------- Missions

export type MissionKind = "clearKind" | "reach" | "playMode" | "clearBoss" | "runs";

export interface Mission {
  id: string;
  text: string;
  kind: MissionKind;
  target: number;
  kindParam?: MicroKind;
  modeParam?: ModeKey;
  xp: number;
}

export const MISSION_POOL: readonly Mission[] = [
  { id: "pop5", text: "Clear 5 POP!s", kind: "clearKind", kindParam: "pop", target: 5, xp: 60 },
  { id: "flags6", text: "Clear 6 RED FLAGS!", kind: "clearKind", kindParam: "flags", target: 6, xp: 60 },
  { id: "catch5", text: "Catch 5 phones", kind: "clearKind", kindParam: "catch", target: 5, xp: 60 },
  { id: "count4", text: "COUNT! right 4 times", kind: "clearKind", kindParam: "count", target: 4, xp: 60 },
  { id: "mash5", text: "Win 5 MASH!es", kind: "clearKind", kindParam: "mash", target: 5, xp: 60 },
  { id: "order4", text: "Nail 4 ORDER!s", kind: "clearKind", kindParam: "order", target: 4, xp: 60 },
  { id: "classic15", text: "Reach 15 in Classic", kind: "reach", modeParam: "classic", target: 15, xp: 100 },
  { id: "blitz30", text: "Score 30 in Blitz", kind: "reach", modeParam: "blitz", target: 30, xp: 100 },
  { id: "onelife8", text: "Get 8 in One Life", kind: "reach", modeParam: "onelife", target: 8, xp: 100 },
  { id: "boss1", text: "Beat a boss", kind: "clearBoss", target: 1, xp: 80 },
  { id: "runs3", text: "Finish 3 runs", kind: "runs", target: 3, xp: 50 },
  { id: "duel1", text: "Play a Duel", kind: "playMode", modeParam: "duel", target: 1, xp: 60 },
  { id: "daily1", text: "Play today's Daily", kind: "playMode", modeParam: "daily", target: 1, xp: 50 },
];

/** Three missions per day, the same for everyone, never two of the same kind. */
export function missionsFor(dayKey: string): Mission[] {
  const picked: Mission[] = [];
  for (const m of streamFor(`missions-${dayKey}`, "pick").shuffle(MISSION_POOL)) {
    if (picked.some((p) => p.kind === m.kind)) continue;
    picked.push(m);
    if (picked.length === 3) break;
  }
  return picked;
}

/** How much a finished run advances a mission. `reach` missions track the best value, others add up. */
export function missionDelta(m: Mission, r: RushResult): number {
  switch (m.kind) {
    case "clearKind":
      return r.outcomes.filter((o) => o.kind === m.kindParam && o.outcome === "cleared").length;
    case "reach":
      return r.mode === m.modeParam ? headlineScore(r) : 0;
    case "playMode":
      return r.mode === m.modeParam ? 1 : 0;
    case "clearBoss":
      return r.outcomes.filter((o) => o.boss && o.outcome === "cleared").length;
    case "runs":
      return 1;
  }
}

export function advanceMission(m: Mission, current: number, r: RushResult): number {
  const d = missionDelta(m, r);
  return Math.min(m.target, m.kind === "reach" ? Math.max(current, d) : current + d);
}

export function modeName(k: ModeKey): string {
  return MODES[k].name;
}
