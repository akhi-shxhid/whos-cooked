import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Character, type CrewKey, type CrewMood } from "./Character.tsx";

const crew: CrewKey[] = ["toasty", "npc", "doomscroll", "delulu", "sigma", "goblin", "rizzler", "maincharacter", "moai", "glitch", "microwave"];
const moods: CrewMood[] = ["neutral", "happy", "shocked", "smug", "panic"];

describe("Cooked Crew", () => {
  it.each(crew)("%s renders every mood", (who) => {
    for (const mood of moods) {
      const html = renderToStaticMarkup(<Character who={who} mood={mood} title={who} />);
      expect(html).toContain("<svg");
      expect(html).not.toContain("NaN");
    }
  });

  it("is hidden from assistive tech when decorative", () => {
    expect(renderToStaticMarkup(<Character who="npc" title={null} />)).toContain('aria-hidden="true"');
  });
});
