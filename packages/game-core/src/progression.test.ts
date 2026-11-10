import { describe, expect, it } from "vitest";
import {
  advanceMission,
  CHARACTERS,
  levelFromXp,
  missionsFor,
  ownsCharacter,
  rewardsForLevel,
  titleFor,
  xpForLevel,
  xpForRun,
} from "./progression.ts";
import type { RushResult } from "./rush.ts";

const run = (over: Partial<RushResult> = {}): RushResult => ({
  seed: "s",
  mode: "classic",
  points: 3,
  bestPopMs: null,
  outcomes: [
    { kind: "pop", outcome: "cleared", ms: 300, points: 1, boss: false },
    { kind: "flags", outcome: "cleared", ms: 900, points: 1, boss: false },
    { kind: "burnt", outcome: "cleared", ms: 900, points: 3, boss: true },
    { kind: "dont", outcome: "failed", ms: 900, points: 0, boss: false },
  ],
  ...over,
});

describe("xp and levels", () => {
  it("gives fixed, itemized XP", () => {
    const x = xpForRun(run(), { firstRunToday: true });
    expect(x.lines.map((l) => l.label)).toEqual(["3 cleared", "1 boss", "First run today"]);
    expect(x.total).toBe(30 + 25 + 50);
    expect(xpForRun(run(), { firstRunToday: false }).total).toBe(55);
  });

  it("maps XP to levels with a growing curve", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
    expect(levelFromXp(0)).toEqual({ level: 1, into: 0, needed: 100 });
    expect(levelFromXp(350).level).toBe(3);
    expect(levelFromXp(350).into).toBe(50);
  });

  it("unlocks characters by level or by pack, never randomly", () => {
    const npc = CHARACTERS.find((c) => c.key === "npc")!;
    const moai = CHARACTERS.find((c) => c.key === "moai")!;
    expect(ownsCharacter(npc, { level: 1, plus: false, crew: false })).toBe(false);
    expect(ownsCharacter(npc, { level: 2, plus: false, crew: false })).toBe(true);
    expect(ownsCharacter(moai, { level: 50, plus: true, crew: false })).toBe(false);
    expect(ownsCharacter(moai, { level: 1, plus: false, crew: true })).toBe(true);
    expect(rewardsForLevel(2)).toEqual(["NPC unlocked"]);
    expect(titleFor(6)).toBe("Thumb Athlete");
  });
});

describe("missions", () => {
  it("picks three different kinds per day, the same for everyone", () => {
    const m = missionsFor("2026-11-08");
    expect(m).toHaveLength(3);
    expect(new Set(m.map((x) => x.kind)).size).toBe(3);
    expect(missionsFor("2026-11-08")).toEqual(m);
  });

  it("advances sums for counters and best-of for reach goals", () => {
    const pop = { id: "pop5", text: "", kind: "clearKind" as const, kindParam: "pop" as const, target: 5, xp: 60 };
    expect(advanceMission(pop, 4, run())).toBe(5);
    expect(advanceMission(pop, 5, run())).toBe(5);
    const reach = { id: "c", text: "", kind: "reach" as const, modeParam: "classic" as const, target: 15, xp: 100 };
    expect(advanceMission(reach, 10, run())).toBe(10);
    expect(advanceMission(reach, 1, run())).toBe(3);
  });
});
