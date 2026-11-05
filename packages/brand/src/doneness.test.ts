import { describe, expect, it } from "vitest";
import { relativeLuminance } from "./color.ts";
import { crumbColor, crustColor } from "./doneness.ts";

describe("doneness ramp", () => {
  it("gets darker as doneness rises", () => {
    let previous = Infinity;
    for (let d = 0; d <= 100; d += 5) {
      const lum = relativeLuminance(crumbColor(d));
      expect(lum).toBeLessThanOrEqual(previous);
      previous = lum;
    }
  });

  it("clamps out-of-range and invalid input", () => {
    expect(crumbColor(-20)).toBe(crumbColor(0));
    expect(crumbColor(400)).toBe(crumbColor(100));
    expect(crumbColor(Number.NaN)).toBe(crumbColor(0));
  });

  it("keeps the crust darker than the crumb", () => {
    for (let d = 0; d <= 100; d += 10) {
      expect(relativeLuminance(crustColor(d))).toBeLessThan(relativeLuminance(crumbColor(d)));
    }
  });
});
