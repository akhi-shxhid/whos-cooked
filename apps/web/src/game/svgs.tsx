import type { ReactElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { Character, ToastMascot, type CrewKey, type CrewMood } from "@whoscooked/brand";
import type { TexKey } from "@whoscooked/game-renderer";

/** Renders a pure brand component to SVG markup, so canvas, cards, and clips match the UI exactly. */
export function svgOf(el: ReactElement): string {
  const host = document.createElement("div");
  const root = createRoot(host);
  flushSync(() => root.render(el));
  const svg = host.innerHTML.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  root.unmount();
  return svg;
}

export function crewSvg(who: CrewKey, mood: CrewMood = "neutral"): string {
  return svgOf(<Character who={who} mood={mood} size={200} title={null} />);
}

/** SVG for a stage texture key: the player's character, or a toast slice for BURNT ONE!. */
export function svgForKey(who: CrewKey) {
  return (key: TexKey): string => {
    const [kind, a, b] = key.split(":");
    if (kind === "char") return crewSvg(who, a as CrewMood);
    return svgOf(<ToastMascot doneness={Number(a)} mood={b === "shocked" ? "shocked" : "neutral"} size={200} title={null} />);
  };
}

/** Extra room above the art so smoke and crowns aren't clipped when the SVG becomes an image. */
export const IMAGE_TOP = 50;

/** Raster of a character, 200 x (240 + IMAGE_TOP) units at `scale`. */
export async function crewImage(who: CrewKey, mood: CrewMood, scale: number): Promise<HTMLImageElement> {
  const h = 240 + IMAGE_TOP;
  const svg = crewSvg(who, mood)
    .replace(/width="200" height="240"/, `width="${200 * scale}" height="${h * scale}"`)
    .replace('viewBox="0 0 200 240"', `viewBox="0 ${-IMAGE_TOP} 200 ${h}"`);
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  return img;
}
