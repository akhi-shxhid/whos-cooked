import { describe, expect, it } from "vitest";
import { makeHandle } from "@whoscooked/db";
import { app } from "./index.ts";
import { plausible, utcDay, type PostInput } from "./leaderboard.ts";

const base = (over: Partial<PostInput> = {}): PostInput => ({
  board: "daily",
  day: "2026-11-10",
  score: 3,
  ghost: "1101",
  seed: "daily-2026-11-10",
  character: "toasty",
  ageBand: "adult",
  ...over,
});

describe("leaderboard plausibility", () => {
  it("accepts an honest daily score", () => {
    expect(plausible(base(), "2026-11-10")).toBeNull();
  });

  it("rejects a daily score that doesn't match the ghost, the wrong seed, or another day", () => {
    expect(plausible(base({ score: 9 }), "2026-11-10")).toMatch(/match/);
    expect(plausible(base({ seed: "daily-2026-11-01" }), "2026-11-10")).toMatch(/Daily/);
    expect(plausible(base({ day: "2026-11-01", seed: "daily-2026-11-01" }), "2026-11-10")).toMatch(/another day/);
  });

  it("allows yesterday for players near midnight UTC", () => {
    expect(plausible(base({ day: "2026-11-09", seed: "daily-2026-11-09" }), "2026-11-10")).toBeNull();
  });

  it("caps combo-mode points at 15 per cleared microgame", () => {
    expect(plausible(base({ board: "blitz", score: 45, ghost: "111", seed: "x1y2z3" }), "2026-11-10")).toBeNull();
    expect(plausible(base({ board: "blitz", score: 46, ghost: "111", seed: "x1y2z3" }), "2026-11-10")).toMatch(/match/);
  });

  it("makes clean generated handles", () => {
    for (let i = 0; i < 50; i++) expect(makeHandle()).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+\d{2}$/);
    expect(utcDay(0, Date.parse("2026-11-10T23:59:00Z"))).toBe("2026-11-10");
  });
});

describe("leaderboard routes", () => {
  it("validates the board name before touching the database", async () => {
    const res = await app.request("/api/v1/leaderboard?board=nope");
    expect(res.status).toBe(400);
  });

  it("refuses under-13 posts and junk bodies", async () => {
    const post = (body: unknown) => app.request("/api/v1/scores", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
    expect((await post({ nope: 1 })).status).toBe(400);
    expect((await post({ ...base(), day: utcDay(), seed: `daily-${utcDay()}`, ageBand: "under13" })).status).toBe(403);
  });
});
