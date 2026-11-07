import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  cookedScore,
  estimateOffset,
  focusScore,
  gutMatchPercent,
  headToHead,
  impulseScore,
  levelFor,
  memoryScore,
  reactionScore,
  reactionStats,
  SCORING_VERSION,
  scorePlay,
  syncScore,
  type PlayScore,
  type RawPlay,
} from "./scoring.ts";

const basePlay = (overrides: Partial<RawPlay> = {}): RawPlay => ({
  seed: "test",
  calibration: { offsetMs: 0 },
  pop: [400, 420, 430, 450, 460].map((tapMs) => ({ delayMs: 1000, tapMs })),
  noise: { targets: 20, hits: 15, misses: 5, falseAlarms: 1, notificationTaps: 1 },
  order: { maxSpan: 6, attempts: [] },
  gut: { choices: [0, 1, 0, 1, 0, 1, 0, 1] },
  ...overrides,
});

describe("reaction", () => {
  it("follows the PRD formula", () => {
    expect(reactionScore({ medianReactionMs: 430, falseStarts: 0 })).toBeCloseTo(50, 5);
    expect(reactionScore({ medianReactionMs: 240, falseStarts: 0 })).toBe(100);
    expect(reactionScore({ medianReactionMs: 620, falseStarts: 0 })).toBe(0);
    expect(reactionScore({ medianReactionMs: 430, falseStarts: 1 })).toBeCloseTo(44, 5);
  });

  it("clamps the final value, including after false-start penalties", () => {
    expect(reactionScore({ medianReactionMs: 100, falseStarts: 0 })).toBe(100);
    expect(reactionScore({ medianReactionMs: 900, falseStarts: 3 })).toBe(0);
    expect(reactionScore({ medianReactionMs: null, falseStarts: 5 })).toBe(0);
  });

  it("treats taps before the pop or within 100 ms as false starts", () => {
    const stats = reactionStats(
      [
        { delayMs: 1000, tapMs: -50 },
        { delayMs: 1000, tapMs: 99 },
        { delayMs: 1000, tapMs: 100 },
        { delayMs: 1000, tapMs: 300 },
        { delayMs: 1000, tapMs: null },
      ],
      0,
    );
    expect(stats.falseStarts).toBe(2);
    // Valid times: 100, 300, and a miss counted as the 1500 ms timeout.
    expect(stats.medianReactionMs).toBe(300);
  });

  it("subtracts the calibration offset", () => {
    const stats = reactionStats([{ delayMs: 1000, tapMs: 330 }], 30);
    expect(stats.medianReactionMs).toBe(300);
  });
});

describe("calibration", () => {
  it("caps the offset at plus or minus 40 ms", () => {
    expect(estimateOffset([10, 20, 30])).toBe(20);
    expect(estimateOffset([90, 100, 120])).toBe(40);
    expect(estimateOffset([-90, -100, -120])).toBe(-40);
    expect(estimateOffset([])).toBe(0);
  });

  it("ignores wild taps", () => {
    expect(estimateOffset([15, 25, 2000])).toBe(20);
  });
});

describe("focus, memory, impulse", () => {
  it("focus follows the PRD formula", () => {
    expect(focusScore({ targets: 20, hits: 15, misses: 5, falseAlarms: 1, notificationTaps: 1 })).toBe(55);
    expect(focusScore({ targets: 20, hits: 20, misses: 0, falseAlarms: 0, notificationTaps: 0 })).toBe(100);
    expect(focusScore({ targets: 20, hits: 2, misses: 18, falseAlarms: 4, notificationTaps: 3 })).toBe(0);
    expect(focusScore({ targets: 0, hits: 0, misses: 0, falseAlarms: 0, notificationTaps: 0 })).toBe(0);
  });

  it("memory maps span 3..9 to 0..100", () => {
    expect(memoryScore(0)).toBe(0);
    expect(memoryScore(3)).toBe(0);
    expect(memoryScore(6)).toBe(50);
    expect(memoryScore(9)).toBe(100);
  });

  it("impulse follows the PRD formula", () => {
    expect(impulseScore(1, 1)).toBe(75);
    expect(impulseScore(0, 0)).toBe(100);
    expect(impulseScore(5, 5)).toBe(0);
  });
});

describe("cooked score", () => {
  it("matches a worked example", () => {
    const s = scorePlay(basePlay({ pop: [430, 430, 430, 430, -20].map((tapMs) => ({ delayMs: 1000, tapMs })) }));
    // Reaction 44, Focus 55, Memory 50, Impulse 75 -> 100 - 54 = 46.
    expect(s.subScores).toEqual({ reaction: 44, focus: 55, memory: 50, impulse: 75 });
    expect(s.cooked).toBe(46);
    expect(s.level).toBe("Crispy");
    expect(s.scoringVersion).toBe(SCORING_VERSION);
  });

  it("is 0 for perfect play and 100 for no sharpness at all", () => {
    expect(cookedScore({ reaction: 100, focus: 100, memory: 100, impulse: 100 })).toBe(0);
    expect(cookedScore({ reaction: 0, focus: 0, memory: 0, impulse: 0 })).toBe(100);
  });

  it("assigns levels at the exact boundaries", () => {
    const cases: [number, string][] = [
      [0, "Raw"], [19, "Raw"], [20, "Golden"], [39, "Golden"], [40, "Crispy"],
      [59, "Crispy"], [60, "Burnt"], [79, "Burnt"], [80, "Charcoal"], [100, "Charcoal"],
    ];
    for (const [score, level] of cases) expect(levelFor(score)).toBe(level);
  });

  it("always stays within 0..100 (property)", () => {
    const trial = fc.record({
      delayMs: fc.integer({ min: 800, max: 3000 }),
      tapMs: fc.option(fc.integer({ min: -3000, max: 5000 }), { nil: null }),
    });
    fc.assert(
      fc.property(
        fc.array(trial, { minLength: 0, maxLength: 5 }),
        fc.integer({ min: 0, max: 40 }),
        fc.integer({ min: 0, max: 40 }),
        fc.integer({ min: 0, max: 30 }),
        fc.integer({ min: 0, max: 30 }),
        fc.integer({ min: 0, max: 9 }),
        fc.integer({ min: -40, max: 40 }),
        (pop, targets, hitsRaw, falseAlarms, notificationTaps, maxSpan, offsetMs) => {
          const hits = Math.min(hitsRaw, targets);
          const s = scorePlay(
            basePlay({
              calibration: { offsetMs },
              pop,
              noise: { targets, hits, misses: targets - hits, falseAlarms, notificationTaps },
              order: { maxSpan, attempts: [] },
            }),
          );
          for (const v of [s.cooked, ...Object.values(s.subScores)]) {
            expect(Number.isInteger(v)).toBe(true);
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThanOrEqual(100);
          }
          expect(levelFor(s.cooked)).toBe(s.level);
        },
      ),
    );
  });

  it("never gets less cooked when play gets worse (property)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 240, max: 900 }),
        fc.integer({ min: 0, max: 200 }),
        fc.integer({ min: 0, max: 5 }),
        (rt, slower, extraAlarms) => {
          const good = scorePlay(basePlay({ pop: [{ delayMs: 1000, tapMs: rt }] }));
          const worse = scorePlay(
            basePlay({
              pop: [{ delayMs: 1000, tapMs: rt + slower }],
              noise: { targets: 20, hits: 15, misses: 5, falseAlarms: 1 + extraAlarms, notificationTaps: 1 },
            }),
          );
          expect(worse.cooked).toBeGreaterThanOrEqual(good.cooked);
        },
      ),
    );
  });
});

describe("sync and head-to-head", () => {
  const score = (cooked: number, medianReactionMs: number | null, focus = 50): PlayScore => ({
    scoringVersion: SCORING_VERSION,
    cooked,
    level: levelFor(cooked),
    subScores: { reaction: 50, focus, memory: 50, impulse: 50 },
    medianReactionMs,
    falseStarts: 0,
  });

  it("counts only answered, matching gut picks", () => {
    expect(gutMatchPercent({ choices: [0, 1, null, 1] }, { choices: [0, 0, null, 1] })).toBe(50);
  });

  it("weights gut match 70% and sub-score closeness 30%", () => {
    const sub = { reaction: 50, focus: 50, memory: 50, impulse: 50 };
    expect(syncScore({ gut: { choices: [0, 0] }, subScores: sub }, { gut: { choices: [0, 0] }, subScores: sub })).toBe(100);
    expect(
      syncScore(
        { gut: { choices: [0, 0] }, subScores: sub },
        { gut: { choices: [1, 1] }, subScores: { reaction: 70, focus: 30, memory: 50, impulse: 50 } },
      ),
    ).toBe(27); // 0 * 0.7 + (100 - 10) * 0.3
  });

  it("calls reaction differences under 25 ms a tie", () => {
    expect(headToHead(score(40, 300), score(50, 324)).rounds.reaction).toBe("tie");
    expect(headToHead(score(40, 300), score(50, 325)).rounds.reaction).toBe("a");
  });

  it("uses the lower Cooked Score as winner, with a tie under 2 points", () => {
    expect(headToHead(score(40, 300), score(41, 300)).overall).toBe("tie");
    expect(headToHead(score(40, 300), score(42, 300)).overall).toBe("a");
    expect(headToHead(score(70, 300), score(42, 300)).overall).toBe("b");
  });
});
