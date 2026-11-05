import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ToastMascot, type ToastMood } from "./ToastMascot.tsx";

const moods: ToastMood[] = ["neutral", "happy", "focused", "shocked", "smug", "panic"];

describe("ToastMascot", () => {
  it.each(moods)("renders the %s mood", (mood) => {
    const html = renderToStaticMarkup(<ToastMascot mood={mood} doneness={40} />);
    expect(html).toContain("<svg");
    expect(html).toContain('role="img"');
  });

  it("is hidden from assistive tech when decorative", () => {
    const html = renderToStaticMarkup(<ToastMascot title={null} />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain("<title");
  });

  it("smokes only when well done", () => {
    const raw = renderToStaticMarkup(<ToastMascot doneness={10} />);
    const charcoal = renderToStaticMarkup(<ToastMascot doneness={95} />);
    expect(raw).not.toContain("c-10 -12");
    expect(charcoal).toContain("c-10 -12");
  });

  it("switches face ink to white on charcoal toast", () => {
    const html = renderToStaticMarkup(<ToastMascot doneness={100} mood="happy" />);
    expect(html).toContain('fill="#FFFFFF" stroke="#FFFFFF"');
  });

  it("is deterministic for the same props", () => {
    const props = { doneness: 62, mood: "panic" as const, squash: 0.4, lookX: -0.5, lookY: 0.2 };
    const strip = (s: string) => s.replace(/id="[^"]+"|aria-labelledby="[^"]+"/g, "");
    expect(strip(renderToStaticMarkup(<ToastMascot {...props} />))).toBe(
      strip(renderToStaticMarkup(<ToastMascot {...props} />)),
    );
  });
});
