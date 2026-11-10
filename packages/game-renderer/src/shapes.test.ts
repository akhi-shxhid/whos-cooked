import { describe, expect, it } from "vitest";
import { cleanPolygon, hasDegenerateSegment, mushroomCap, teardrop } from "./shapes.ts";

describe("custom shapes have no zero-length segments (the stray-line bug)", () => {
  it("the old honey seam reproduces the problem", () => {
    // Bezier ending at (38,16) followed by an arc whose first point is also (38,16).
    const seam = [0, -46, 10, -20, 38, 16, 38, 16, 0, 54, -38, 16, 0, -46];
    expect(hasDegenerateSegment(seam)).toBe(true);
    expect(hasDegenerateSegment(cleanPolygon(seam))).toBe(false);
  });

  it.each([24, 45, 90, 200])("teardrop at size %i is clean", (s) => {
    const pts = teardrop(s);
    expect(pts.length).toBeGreaterThanOrEqual(40);
    expect(hasDegenerateSegment(pts)).toBe(false);
    // Stays inside its box: nothing shoots out.
    for (let i = 0; i < pts.length; i += 2) {
      expect(Math.abs(pts[i]!)).toBeLessThanOrEqual(s * 0.5);
      expect(Math.abs(pts[i + 1]!)).toBeLessThanOrEqual(s * 0.5);
    }
  });

  it.each([24, 45, 90, 200])("mushroom cap at size %i is clean", (s) => {
    expect(hasDegenerateSegment(mushroomCap(s))).toBe(false);
  });

  it("drops non-finite points and a closing duplicate", () => {
    expect(cleanPolygon([0, 0, NaN, 1, 1, 1, 1, 1, 2, 0, 0, 0])).toEqual([0, 0, 1, 1, 2, 0]);
  });
});
