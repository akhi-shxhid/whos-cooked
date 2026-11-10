import { palette, type CrewKey } from "@whoscooked/brand";
import type { ModeKey, OutcomeRecord, RushLevel } from "@whoscooked/game-core";
import { MODES } from "@whoscooked/game-core";
import { RANK_MOOD } from "./GameOver.tsx";
import { crewImage, IMAGE_TOP } from "./svgs.tsx";

const W = 1080;
const H = 1920;

export interface CardData {
  score: number;
  level: RushLevel;
  line: string;
  outcomes: OutcomeRecord[];
  mode: ModeKey;
  who: CrewKey;
  plus: boolean;
  scoreLabel: string;
}

export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
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

/** Spoiler-free squares: acid for cleared, gold for bosses, red with a cross for misses (shape differs too). */
export function drawGrid(ctx: CanvasRenderingContext2D, outcomes: Pick<OutcomeRecord, "outcome" | "boss">[], cx: number, top: number, size: number, perRow: number, upTo = outcomes.length) {
  const gap = size * 0.2;
  outcomes.slice(0, upTo).forEach((o, i) => {
    const row = Math.floor(i / perRow);
    const rowCount = Math.min(perRow, outcomes.length - row * perRow);
    const x = cx - (rowCount * (size + gap) - gap) / 2 + (i % perRow) * (size + gap);
    const y = top + row * (size + gap);
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, size * 0.18);
    ctx.fillStyle = o.outcome === "cleared" ? (o.boss ? palette.gold : palette.acid) : palette.danger;
    ctx.fill();
    if (o.outcome === "failed") {
      ctx.strokeStyle = palette.line;
      ctx.lineWidth = size * 0.12;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x + size * 0.3, y + size * 0.3);
      ctx.lineTo(x + size * 0.7, y + size * 0.7);
      ctx.moveTo(x + size * 0.7, y + size * 0.3);
      ctx.lineTo(x + size * 0.3, y + size * 0.7);
      ctx.stroke();
    }
  });
}

export async function loadCardFonts() {
  await Promise.all([document.fonts.load('800 120px "Bricolage Grotesque"'), document.fonts.load('700 48px "Atkinson Hyperlegible"')]);
}

/** Speech-bubble sticker with a hard offset shadow. */
export function bubble(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, lines: string[], lineH: number) {
  const h = lines.length * lineH + 40;
  ctx.fillStyle = palette.heat;
  ctx.beginPath();
  ctx.roundRect(x + 10, y + 10, w, h, 24);
  ctx.fill();
  ctx.fillStyle = palette.paper;
  ctx.strokeStyle = palette.line;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 24);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = palette.line;
  ctx.textAlign = "left";
  lines.forEach((l, i) => ctx.fillText(l, x + 26, y + 20 + lineH * (i + 0.8)));
  ctx.textAlign = "center";
}

/** Downloadable 9:16 result card from the real run. Important text stays inside mobile safe zones. */
export async function renderShareCard(d: CardData): Promise<Blob> {
  await loadCardFonts();
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");

  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";

  ctx.fillStyle = palette.paper;
  ctx.font = '800 92px "Bricolage Grotesque"';
  ctx.fillText("WHO'S COOKED?", W / 2, 210);
  ctx.fillStyle = palette.muted;
  ctx.font = '700 40px "Atkinson Hyperlegible"';
  ctx.fillText(d.plus ? `${MODES[d.mode].name}  |  Cooked+` : MODES[d.mode].name, W / 2, 272);

  const img = await crewImage(d.who, RANK_MOOD[d.level], 3);
  const body = 430;
  const th = body * ((240 + IMAGE_TOP) / 240);
  const tw = (body * 200) / 240;
  ctx.drawImage(img, 120, 330, tw, th);

  ctx.font = '700 44px "Atkinson Hyperlegible"';
  const lines = wrapText(ctx, `"${d.line}"`, 400).slice(0, 4);
  bubble(ctx, 560, 400, 440, lines, 56);

  ctx.fillStyle = palette.acid;
  ctx.font = '800 300px "Bricolage Grotesque"';
  ctx.fillText(String(d.score), W / 2, 1190);
  ctx.fillStyle = palette.muted;
  ctx.font = '700 46px "Atkinson Hyperlegible"';
  ctx.fillText(d.scoreLabel, W / 2, 1250);
  ctx.fillStyle = palette.heat;
  ctx.font = '800 110px "Bricolage Grotesque"';
  ctx.fillText(d.level.toUpperCase(), W / 2, 1380);

  drawGrid(ctx, d.outcomes.slice(0, 30), W / 2, 1440, 40, 15);

  ctx.fillStyle = palette.acid;
  ctx.fillRect(0, H - 240, W, 240);
  ctx.fillStyle = palette.line;
  ctx.font = '800 64px "Bricolage Grotesque"';
  ctx.fillText(`CAN YOU BEAT ${d.score}?`, W / 2, H - 140);
  ctx.font = '700 48px "Atkinson Hyperlegible"';
  ctx.fillText(window.location.host, W / 2, H - 68);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("The card couldn't be created."))), "image/png"));
}
