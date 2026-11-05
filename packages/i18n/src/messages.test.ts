import { describe, expect, it } from "vitest";
import { baseLocale, locales, m } from "./index.ts";

describe("i18n", () => {
  it("ships the four launch locales with English as base", () => {
    expect(baseLocale).toBe("en");
    expect([...locales].sort()).toEqual(["de", "en", "es", "fr"]);
  });

  it("uses the mandatory disclaimer wording", () => {
    expect(m.disclaimer()).toBe(
      "Who's Cooked? is a game for fun. It isn't a medical, psychological, or relationship test.",
    );
  });
});
