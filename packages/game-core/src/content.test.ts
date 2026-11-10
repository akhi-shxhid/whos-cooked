import { describe, expect, it } from "vitest";
import { FAKE_NOTIFICATIONS, SYMBOLS } from "./content.ts";
import { SOLO_LINES, soloLineFor } from "./lines.ts";
import { CHARACTERS, MISSION_POOL } from "./progression.ts";
import { createRng, randomSeed } from "./rng.ts";
import { RUSH_RANKS } from "./rush.ts";

describe("seeded rng", () => {
  it("is deterministic per seed and differs across seeds", () => {
    const a = createRng("seed-1");
    const a2 = createRng("seed-1");
    const b = createRng("seed-2");
    const xs = Array.from({ length: 5 }, () => a.next());
    expect(Array.from({ length: 5 }, () => a2.next())).toEqual(xs);
    expect(Array.from({ length: 5 }, () => b.next())).not.toEqual(xs);
  });

  it("makes hard-to-guess seeds", () => {
    expect(randomSeed()).toMatch(/^[a-z2-9]{12}$/);
  });
});

describe("content guardrails", () => {
  // Roast the run, never the person (docs/decision.md).
  const banned = /\b(sex|politic|religio|god|fat|ugly|race|adhd|autis|dement|brain damage|stupid|dumb|idiot|crazy|insane|retard|depress|suicid|kill|cure|diagnos|treat)/i;

  it("has 8 lines per rank, none banned", () => {
    for (const r of RUSH_RANKS) expect(SOLO_LINES[r.level]).toHaveLength(8);
    for (const line of Object.values(SOLO_LINES).flat()) expect(line).not.toMatch(banned);
    expect(soloLineFor("Cooked", "s")).toBe(soloLineFor("Cooked", "s"));
  });

  it("keeps notifications, characters, and missions clean and fictional", () => {
    for (const n of FAKE_NOTIFICATIONS) expect(`${n.from} ${n.text}`).not.toMatch(banned);
    for (const c of CHARACTERS) expect(`${c.name} ${c.line}`).not.toMatch(banned);
    for (const m of MISSION_POOL) expect(m.text).not.toMatch(banned);
    expect(SYMBOLS).toHaveLength(6);
  });
});
