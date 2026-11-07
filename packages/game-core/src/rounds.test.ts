import { describe, expect, it } from "vitest";
import { SOLO_LINES, soloLineFor } from "./lines.ts";
import { createRng, randomSeed } from "./rng.ts";
import {
  FAKE_NOTIFICATIONS,
  generateRounds,
  GUT_PICK_POOL,
  INGREDIENTS,
  orderSequence,
  ROUND_RULES,
} from "./rounds.ts";
import { LEVELS } from "./scoring.ts";

describe("seeded rng", () => {
  it("is deterministic per seed and differs across seeds", () => {
    const a = Array.from({ length: 5 }, createRng("seed-1").next);
    const a2 = createRng("seed-1");
    expect(Array.from({ length: 5 }, () => a2.next())).toEqual(a);
    const b = createRng("seed-2");
    expect(Array.from({ length: 5 }, () => b.next())).not.toEqual(a);
  });

  it("stays in range", () => {
    const rng = createRng("range");
    for (let i = 0; i < 1000; i++) {
      const v = rng.int(3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
    }
  });

  it("makes hard-to-guess seeds", () => {
    expect(randomSeed()).toMatch(/^[a-z2-9]{12}$/);
    expect(randomSeed()).not.toBe(randomSeed());
  });
});

describe("rounds", () => {
  it("gives the same rounds for the same seed", () => {
    expect(generateRounds("abc")).toEqual(generateRounds("abc"));
    expect(orderSequence("abc", 2, 5)).toEqual(orderSequence("abc", 2, 5));
    expect(generateRounds("abc")).not.toEqual(generateRounds("abd"));
  });

  it("pop delays fall within 800 to 3000 ms", () => {
    for (let i = 0; i < 50; i++) {
      const { pop } = generateRounds(`pop-${i}`);
      expect(pop.delaysMs).toHaveLength(ROUND_RULES.pop.trials);
      for (const d of pop.delaysMs) {
        expect(d).toBeGreaterThanOrEqual(800);
        expect(d).toBeLessThanOrEqual(3000);
      }
    }
  });

  it("noise round fits in 25 s with enough targets and some fake notifications", () => {
    for (let i = 0; i < 50; i++) {
      const { noise } = generateRounds(`noise-${i}`);
      expect(noise.targets).toBeGreaterThanOrEqual(10);
      expect(noise.events.some((e) => e.kind === "notification")).toBe(true);
      expect(noise.events.some((e) => e.kind === "crumb")).toBe(true);
      for (const e of noise.events) expect(e.atMs + e.lifetimeMs).toBeLessThanOrEqual(ROUND_RULES.noise.durationMs + 600);
      for (let j = 1; j < noise.events.length; j++) {
        expect(noise.events[j]!.atMs - noise.events[j - 1]!.atMs).toBeGreaterThanOrEqual(ROUND_RULES.noise.minGapMs - 1);
      }
    }
  });

  it("order sequences use known ingredients with no back-to-back repeats", () => {
    const seq = orderSequence("xyz", 0, 9);
    expect(seq).toHaveLength(9);
    for (let i = 0; i < seq.length; i++) {
      expect(INGREDIENTS).toContain(seq[i]);
      if (i > 0) expect(seq[i]).not.toBe(seq[i - 1]);
    }
  });

  it("gut picks are 8 distinct allowed pairs", () => {
    const { gut } = generateRounds("gut");
    expect(gut).toHaveLength(8);
    expect(new Set(gut.map((g) => g.id)).size).toBe(8);
    for (const g of gut) expect(GUT_PICK_POOL).toContainEqual(g);
  });
});

describe("content guardrails", () => {
  const banned = /\b(sex|politic|religio|god|fat|ugly|race|adhd|autis|dement|brain damage|stupid|dumb|idiot|crazy|insane|depress|cure|diagnos|treat)/i;

  it("has at least 40 solo lines, 8 per level, none banned", () => {
    const all = LEVELS.flatMap((l) => SOLO_LINES[l.level]);
    expect(all.length).toBeGreaterThanOrEqual(40);
    for (const l of LEVELS) expect(SOLO_LINES[l.level].length).toBe(8);
    for (const line of all) expect(line).not.toMatch(banned);
    expect(soloLineFor("Burnt", "s")).toBe(soloLineFor("Burnt", "s"));
  });

  it("keeps gut picks and notifications on allowed topics", () => {
    for (const g of GUT_PICK_POOL) expect(`${g.a} ${g.b}`).not.toMatch(banned);
    for (const n of FAKE_NOTIFICATIONS) expect(`${n.from} ${n.text}`).not.toMatch(banned);
  });
});
