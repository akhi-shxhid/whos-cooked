import { colors } from "@whoscooked/brand";
import type { PlayScore } from "@whoscooked/game-core";
import type { ToastMood } from "@whoscooked/brand";
import { TOAST_IMAGE_TOP, toastImage } from "./toastSvg.tsx";

const W = 1080;
const H = 1920;

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function moodForScore(cooked: number): ToastMood {
  if (cooked < 20) return "smug";
  if (cooked < 40) return "happy";
  if (cooked < 60) return "focused";
  if (cooked < 80) return "shocked";
  return "panic";
}

/** Draws the downloadable 9:16 result card from the real score. Text stays inside mobile safe zones. */
export async function renderShareCard(score: PlayScore, line: string): Promise<Blob> {
  await Promise.all([
    document.fonts.load('400 120px "Bagel Fat One"'),
    document.fonts.load('700 48px "Atkinson Hyperlegible"'),
  ]);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");

  ctx.fillStyle = colors.butter;
  ctx.fillRect(0, 0, W, H);

  // Counter-top slab, the same scenery as the desktop stage.
  ctx.fillStyle = colors.crust;
  ctx.fillRect(0, H - 240, W, 240);
  ctx.fillStyle = colors.burnt;
  ctx.fillRect(0, H - 252, W, 12);

  ctx.textAlign = "center";
  ctx.fillStyle = colors.burnt;
  ctx.font = '400 84px "Bagel Fat One"';
  ctx.fillText("Who's Cooked?", W / 2, 220);

  const toast = await toastImage({ doneness: score.cooked, mood: moodForScore(score.cooked) }, 3);
  // Slice is 540 px tall; the image adds headroom above it for smoke.
  const slice = 540;
  const th = slice * ((240 + TOAST_IMAGE_TOP) / 240);
  const tw = (slice * 200) / 240;
  ctx.drawImage(toast, (W - tw) / 2, 280, tw, th);

  ctx.font = '400 300px "Bagel Fat One"';
  ctx.fillText(String(score.cooked), W / 2, 1200);
  ctx.font = '400 110px "Bagel Fat One"';
  ctx.fillText(score.level, W / 2, 1330);

  ctx.font = '700 52px "Atkinson Hyperlegible"';
  wrap(ctx, `"${line}"`, W - 200).forEach((l, i) => ctx.fillText(l, W / 2, 1430 + i * 66));

  ctx.fillStyle = colors.white;
  ctx.font = '700 48px "Atkinson Hyperlegible"';
  ctx.fillText("Think you're less cooked?", W / 2, H - 140);
  ctx.font = '400 56px "Bagel Fat One"';
  ctx.fillText(window.location.host, W / 2, H - 66);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("The card couldn't be created."))), "image/png"),
  );
}
