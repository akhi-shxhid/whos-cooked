import { describe, expect, it } from "vitest";
import { routeFromUrl, urlFor } from "./routes.ts";

describe("routes", () => {
  it("starts Classic instantly on a bare /play/", () => {
    const r = routeFromUrl("");
    expect(r.kind === "play" && r.launch.mode).toBe("classic");
  });

  it("picks modes, the daily, duels with ghosts, and the archive", () => {
    const blitz = routeFromUrl("?mode=blitz");
    expect(blitz.kind === "play" && blitz.launch.mode).toBe("blitz");
    const daily = routeFromUrl("?daily=1", "2026-11-10");
    expect(daily.kind === "play" && daily.launch.seed).toBe("daily-2026-11-10");
    const duel = routeFromUrl("?c=abcd2345&t=7&g=1101");
    expect(duel.kind === "play" && duel.launch).toMatchObject({ mode: "duel", seed: "abcd2345", target: 7, ghost: [true, true, false, true] });
    const arch = routeFromUrl("?day=2026-11-08", "2026-11-10");
    expect(arch.kind === "play" && arch.launch).toMatchObject({ mode: "daily", archive: true, day: "2026-11-08" });
  });

  it("ignores unknown modes, future archive days, and bad seeds", () => {
    const junk = routeFromUrl("?mode=godmode");
    expect(junk.kind === "play" && junk.launch.mode).toBe("classic");
    const future = routeFromUrl("?day=2099-01-01", "2026-11-10");
    expect(future.kind === "play" && future.launch.archive).toBeFalsy();
    const bad = routeFromUrl("?c=../../x");
    expect(bad.kind === "play" && bad.launch.mode).toBe("classic");
    expect(routeFromUrl("?hub=1").kind).toBe("hub");
  });

  it("builds clean URLs back", () => {
    expect(urlFor({ mode: "classic", seed: "x" })).toBe("/play/");
    expect(urlFor({ mode: "blitz", seed: "x" })).toBe("/play/?mode=blitz");
  });
});
