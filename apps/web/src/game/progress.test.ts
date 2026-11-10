import { describe, expect, it } from "vitest";
import { missionsFor, type RushResult } from "@whoscooked/game-core";
import { grantWeeklyGrace, migrateV1, reconcileStreak, recordRun, type Progress } from "./progress.ts";

const base = (): Progress => ({
  xp: 0,
  runs: 0,
  bestByMode: {},
  daily: {},
  streak: { current: 0, best: 0, lastKey: null },
  freezes: 0,
  freezeGrantedWeek: "2026-11-09",
  character: "toasty",
  plus: false,
  crew: false,
  missions: { day: "", progress: {}, done: [] },
  lastRunDay: null,
  sessionRuns: 0,
  handle: null,
});

const run = (mode: RushResult["mode"], cleared: number, failed = 3): RushResult => ({
  seed: "s",
  mode,
  points: cleared,
  bestPopMs: null,
  outcomes: [
    ...Array.from({ length: cleared }, () => ({ kind: "pop" as const, outcome: "cleared" as const, ms: 300, points: 1, boss: false })),
    ...Array.from({ length: failed }, () => ({ kind: "flags" as const, outcome: "failed" as const, ms: 900, points: 0, boss: false })),
  ],
});

describe("recording runs", () => {
  it("tracks best per mode, XP with a first-run bonus, and level-ups", () => {
    const r1 = recordRun(base(), run("classic", 12), "", "2026-11-10");
    expect(r1.newBest).toBe(true);
    expect(r1.progress.bestByMode.classic).toBe(12);
    expect(r1.xp.lines.some((l) => l.label === "First run today")).toBe(true);
    expect(r1.levelAfter).toBeGreaterThan(r1.levelBefore);
    expect(r1.unlocks).toContain("NPC unlocked");
    const r2 = recordRun(r1.progress, run("classic", 5), "", "2026-11-10");
    expect(r2.newBest).toBe(false);
    expect(r2.previousBest).toBe(12);
    expect(r2.xp.lines.some((l) => l.label === "First run today")).toBe(false);
  });

  it("counts only the first Daily and grows the streak day by day", () => {
    let r = recordRun(base(), run("daily", 5), "x", "2026-11-10");
    expect(r.dailyCounted && r.streakExtended).toBe(true);
    r = recordRun(r.progress, run("daily", 9), "y", "2026-11-10");
    expect(r.dailyCounted).toBe(false);
    r = recordRun(r.progress, run("daily", 3), "z", "2026-11-11");
    expect(r.progress.streak.current).toBe(2);
  });

  it("advances today's missions and pays their XP once", () => {
    const missions = missionsFor("2026-11-10");
    const runs = missions.find((m) => m.kind === "runs");
    let p = base();
    let completed = 0;
    for (let i = 0; i < 4; i++) {
      const r = recordRun(p, run("classic", 16), "", "2026-11-10");
      completed += r.missionsCompleted.length;
      p = r.progress;
    }
    if (runs) expect(p.missions.done).toContain(runs.id);
    expect(completed).toBe(p.missions.done.length);
  });
});

describe("streak grace and migration", () => {
  it("covers one missed day with a free weekly grace day", () => {
    const p: Progress = { ...base(), freezes: 1, streak: { current: 5, best: 5, lastKey: "2026-11-08" } };
    const r = reconcileStreak(p, "2026-11-10");
    expect(r.broken).toBe(false);
    expect(r.progress.freezes).toBe(0);
    expect(reconcileStreak({ ...p, freezes: 0 }, "2026-11-10").broken).toBe(true);
    expect(grantWeeklyGrace({ ...base(), freezeGrantedWeek: "2026-11-02" }, "2026-11-10").freezes).toBe(1);
  });

  it("keeps v1 players' best, streak, and Cooked+", () => {
    const m = migrateV1({ best: 23, totalCleared: 40, streak: { current: 3, best: 4, lastKey: "2026-11-09" }, plus: true });
    expect(m.bestByMode).toEqual({ classic: 23 });
    expect(m.xp).toBe(400);
    expect(m.plus).toBe(true);
    expect(m.streak?.current).toBe(3);
  });
});
