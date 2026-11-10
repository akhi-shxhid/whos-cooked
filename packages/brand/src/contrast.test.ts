import { describe, expect, it } from "vitest";
import { contrastRatio } from "./color.ts";
import { approvedPairs, palette } from "./tokens.ts";

describe("brand contrast", () => {
  it.each(approvedPairs)("$fg on $bg meets $level contrast", ({ fg, bg, level }) => {
    expect(contrastRatio(palette[fg], palette[bg])).toBeGreaterThanOrEqual(level === "text" ? 4.5 : 3);
  });

  it("matches known WCAG values", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
  });
});
