import { describe, expect, it } from "vitest";
import {
  clearedCount,
  comboMultiplier,
  dailyKey,
  dailyNumber,
  dailySeed,
  decodeGhost,
  encodeGhost,
  ghostScoreAt,
  headlineScore,
  isBoss,
  kindAt,
  microAt,
  MODES,
  pointsFor,
  rushLevel,
  shareGrid,
  speedFactor,
  tierAt,
  type MicroKind,
  type OutcomeRecord,
} from "./rush.ts";

const rec = (kind: MicroKind, outcome: "cleared" | "failed", boss = false, points = 1): OutcomeRecord => ({ kind, outcome, ms: 400, points, boss });

describe("sequence", () => {
  it("always opens with Pop and is deterministic per seed", () => {
    for (let i = 0; i < 10; i++) expect(kindAt(`s${i}`, 0)).toBe("pop");
    const a = Array.from({ length: 40 }, (_, i) => microAt("same", i, MODES.blitz));
    expect(Array.from({ length: 40 }, (_, i) => microAt("same", i, MODES.blitz))).toEqual(a);
  });

  it("uses all eight kinds once per block and never repeats back to back", () => {
    for (let s = 0; s < 20; s++) {
      const kinds = Array.from({ length: 48 }, (_, i) => kindAt(`seed-${s}`, i));
      for (let b = 0; b < 6; b++) expect(new Set(kinds.slice(b * 8, b * 8 + 8)).size).toBe(8);
      for (let i = 1; i < kinds.length; i++) expect(kinds[i]).not.toBe(kinds[i - 1]);
    }
  });

  it("keeps every microgame's parameters sane at every speed", () => {
    for (const mode of Object.values(MODES)) {
      for (let i = 0; i < 60; i++) {
        const m = microAt(`ranges-${mode.key}`, i, mode);
        expect(m.timeMs).toBeGreaterThan(250);
        if (m.kind === "flags") {
          const g = m.cells.filter((c) => c.green).length;
          expect(g).toBeGreaterThanOrEqual(2);
          expect(g).toBeLessThan(m.cells.length);
        }
        if (m.kind === "count") {
          const want = m.cells.filter((c) => c.symbol === m.target).length;
          expect(m.options).toContain(want);
          expect(new Set(m.options).size).toBe(3);
          expect(new Set(m.cells.map((c) => c.cell)).size).toBe(m.cells.length);
        }
        if (m.kind === "order") expect(m.sequence.length).toBeLessThanOrEqual(7);
        if (m.kind === "burnt") expect(m.burntIndex).toBeLessThan(m.columns * m.rows);
        if (m.kind === "mash") expect(m.taps).toBeLessThanOrEqual(18);
      }
    }
  });
});

describe("modes change the rules, not just speed", () => {
  it("differ in lives, clock, start speed, combos, and bosses", () => {
    expect(MODES.classic.lives).toBe(3);
    expect(MODES.onelife.lives).toBe(1);
    expect(MODES.blitz.lives).toBeNull();
    expect(MODES.blitz.clockMs).toBe(60_000);
    expect(MODES.chill.maxMicros).toBe(24);
    expect(tierAt(MODES.onelife, 0)).toBeGreaterThan(tierAt(MODES.classic, 0));
    expect(microAt("x", 3, MODES.chill).timeMs).toBeGreaterThan(microAt("x", 3, MODES.classic).timeMs);
  });

  it("puts a boss every 10th microgame only where bosses are on", () => {
    expect(isBoss(MODES.classic, 9)).toBe(true);
    expect(isBoss(MODES.classic, 8)).toBe(false);
    expect(isBoss(MODES.blitz, 9)).toBe(false);
    expect(microAt("b", 9, MODES.classic).boss).toBe(true);
  });

  it("grows the combo multiplier in combo modes only, capped at 5", () => {
    expect(comboMultiplier(MODES.classic, 20)).toBe(1);
    expect(comboMultiplier(MODES.blitz, 0)).toBe(1);
    expect(comboMultiplier(MODES.blitz, 3)).toBe(2);
    expect(comboMultiplier(MODES.blitz, 100)).toBe(5);
    expect(pointsFor(MODES.onelife, true, 6)).toBe(9);
  });

  it("speeds up with a floor", () => {
    expect(speedFactor(0)).toBe(1);
    expect(speedFactor(100)).toBe(0.42);
  });
});

describe("scoring and ranks", () => {
  it("uses clears for lives modes and points for combo modes", () => {
    const outcomes = [rec("pop", "cleared"), rec("flags", "failed"), rec("dont", "cleared", false, 2)];
    expect(clearedCount({ outcomes })).toBe(2);
    expect(headlineScore({ mode: "classic", outcomes, points: 3 })).toBe(2);
    expect(headlineScore({ mode: "blitz", outcomes, points: 3 })).toBe(3);
  });

  it("ranks in slang, per mode", () => {
    expect(rushLevel(0)).toBe("Fully Cooked");
    expect(rushLevel(6)).toBe("Cooked");
    expect(rushLevel(12)).toBe("Mid");
    expect(rushLevel(20)).toBe("Goated");
    expect(rushLevel(30)).toBe("Locked In");
    expect(rushLevel(30, "blitz")).toBe("Cooked");
  });

  it("builds a spoiler-free grid with bosses marked", () => {
    expect(shareGrid([rec("pop", "cleared"), rec("flags", "failed"), rec("burnt", "cleared", true)])).toBe("🟨🟥🟩");
  });
});

describe("daily and duel ghosts", () => {
  it("uses a UTC date key and a shared seed", () => {
    expect(dailyKey(new Date("2026-11-07T23:30:00Z"))).toBe("2026-11-07");
    expect(dailySeed("2026-11-07")).toBe(dailySeed("2026-11-07"));
    expect(dailyNumber("2026-11-20")).toBe(13);
  });

  it("round-trips a ghost and rejects junk", () => {
    const g = encodeGhost([rec("pop", "cleared"), rec("flags", "failed"), rec("dont", "cleared")]);
    expect(g).toBe("101");
    expect(decodeGhost(g)).toEqual([true, false, true]);
    expect(ghostScoreAt(decodeGhost(g)!, 3)).toBe(2);
    expect(decodeGhost("12x")).toBeNull();
    expect(decodeGhost(null)).toBeNull();
  });
});
