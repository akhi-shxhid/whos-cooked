import { palette, type CrewKey, type CrewMood } from "@whoscooked/brand";
import type { OutcomeRecord, RushLevel } from "@whoscooked/game-core";
import { RANK_MOOD } from "./GameOver.tsx";
import { bubble, drawGrid, loadCardFonts, wrapText } from "./shareCard.ts";
import { crewImage, IMAGE_TOP } from "./svgs.tsx";

/**
 * 9:16 recap clip for TikTok and Reels, drawn from the real run and recorded in
 * the browser with MediaRecorder. MP4 where supported, otherwise WebM. Hidden
 * when the browser can't record (in-app support is unverified, research.md §2).
 */
const W = 720;
const H = 1280;
const FPS = 30;
const DURATION = 8000;
const TYPES = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"];

function pickType(): string | null {
  if (typeof MediaRecorder === "undefined" || typeof HTMLCanvasElement.prototype.captureStream !== "function") return null;
  return TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? null;
}

export function canRecordClip(): boolean {
  return pickType() !== null;
}

export interface ClipData {
  score: number;
  level: RushLevel;
  line: string;
  outcomes: OutcomeRecord[];
  who: CrewKey;
  plus: boolean;
  scoreLabel: string;
}

const ease = (t: number) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;

export async function renderClip(d: ClipData): Promise<File> {
  const type = pickType();
  if (!type) throw new Error("Recording isn't supported in this browser.");
  await loadCardFonts();
  const moods: CrewMood[] = ["happy", "shocked", "panic", RANK_MOOD[d.level]];
  const imgs = await Promise.all(moods.map((m) => crewImage(d.who, m, 2)));

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");

  const stream = canvas.captureStream(FPS);
  const recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 3_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
  const stopped = new Promise<void>((resolve) => (recorder.onstop = () => resolve()));

  const outcomes = d.outcomes;
  const revealStart = 800;
  const revealEnd = 4800;
  const per = outcomes.length > 0 ? (revealEnd - revealStart) / outcomes.length : 0;

  const draw = (t: number) => {
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";

    const k = ease(t / 300);
    ctx.save();
    ctx.translate(W / 2, 120);
    ctx.scale(1.6 - 0.6 * k, 1.6 - 0.6 * k);
    ctx.fillStyle = palette.paper;
    ctx.font = '800 64px "Bricolage Grotesque"';
    ctx.fillText("WHO'S COOKED?", 0, 0);
    ctx.restore();

    const shown = t < revealStart ? 0 : Math.min(outcomes.length, Math.floor((t - revealStart) / per) + 1);
    const last = outcomes[shown - 1];
    const missed = outcomes.slice(0, shown).filter((o) => o.outcome === "failed").length;
    const cleared = shown - missed;
    const done = t > revealEnd + 200;
    const img = done ? imgs[3]! : last?.outcome === "failed" ? imgs[missed >= 3 ? 2 : 1]! : imgs[0]!;
    const body = 300;
    const th = body * ((240 + IMAGE_TOP) / 240);
    const tw = (body * 200) / 240;
    const lastAt = revealStart + (shown - 1) * per;
    const shake = last?.outcome === "failed" && t - lastAt < 180 ? (Math.random() - 0.5) * 16 : 0;
    ctx.drawImage(img, (W - tw) / 2 + shake, 170, tw, th);

    if (!done) {
      ctx.fillStyle = palette.acid;
      ctx.font = '800 170px "Bricolage Grotesque"';
      ctx.fillText(String(cleared), W / 2, 740);
      ctx.fillStyle = palette.muted;
      ctx.font = '700 32px "Atkinson Hyperlegible"';
      ctx.fillText("cleared", W / 2, 785);
    } else {
      const s = ease((t - revealEnd - 200) / 280);
      ctx.save();
      ctx.translate(W / 2, 740);
      ctx.scale(1.8 - 0.8 * s, 1.8 - 0.8 * s);
      ctx.fillStyle = palette.acid;
      ctx.font = '800 190px "Bricolage Grotesque"';
      ctx.fillText(String(d.score), 0, 0);
      ctx.restore();
      ctx.fillStyle = palette.heat;
      ctx.font = '800 70px "Bricolage Grotesque"';
      ctx.fillText(d.level.toUpperCase(), W / 2, 840);
      if (t > revealEnd + 900) {
        ctx.font = '700 30px "Atkinson Hyperlegible"';
        bubble(ctx, 120, 880, 480, wrapText(ctx, `"${d.line}"`, 420).slice(0, 2), 40);
      }
    }

    drawGrid(ctx, outcomes.slice(0, 30), W / 2, done ? 1040 : 880, 26, 15, shown);

    ctx.fillStyle = palette.acid;
    ctx.fillRect(0, H - 150, W, 150);
    ctx.fillStyle = palette.line;
    ctx.font = '800 42px "Bricolage Grotesque"';
    ctx.fillText(done ? `CAN YOU BEAT ${d.score}?` : "8 GAMES. 3 LIVES.", W / 2, H - 82);
    ctx.font = '700 30px "Atkinson Hyperlegible"';
    ctx.fillText(window.location.host + (d.plus ? "  +" : ""), W / 2, H - 38);
  };

  draw(0);
  recorder.start(250);
  const t0 = performance.now();
  await new Promise<void>((resolve) => {
    const frame = () => {
      const t = performance.now() - t0;
      draw(t);
      if (t >= DURATION) return resolve();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  recorder.stop();
  await stopped;
  for (const track of stream.getTracks()) track.stop();
  const ext = type.startsWith("video/mp4") ? "mp4" : "webm";
  return new File(chunks, `whos-cooked-${d.score}.${ext}`, { type: type.split(";")[0] ?? type });
}
