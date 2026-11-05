import { describe, expect, it } from "vitest";
import { contrastRatio } from "./color.ts";
import { approvedPairs, colors } from "./tokens.ts";

describe("brand contrast", () => {
  it.each(approvedPairs)("$fg on $bg meets $level contrast", ({ fg, bg, level }) => {
    const ratio = contrastRatio(colors[fg], colors[bg]);
    expect(ratio).toBeGreaterThanOrEqual(level === "text" ? 4.5 : 3);
  });

  it("matches known WCAG values", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio(colors.burnt, colors.butter)).toBeCloseTo(11.2, 1);
  });
});
