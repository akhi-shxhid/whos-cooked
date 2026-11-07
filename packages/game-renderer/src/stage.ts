import { Application, Container, Graphics, Texture } from "pixi.js";
import { colors } from "@whoscooked/brand";

export const hex = (c: string) => parseInt(c.slice(1), 16);

export const C = {
  butter: hex(colors.butter),
  burnt: hex(colors.burnt),
  crust: hex(colors.crust),
  plate: hex(colors.plate),
  jam: hex(colors.jam),
  white: hex(colors.white),
} as const;

export const FONT_DISPLAY = "Bagel Fat One";
export const FONT_BODY = "Atkinson Hyperlegible";

export type ToastMoodKey = "neutral" | "happy" | "shocked" | "panic" | "focused";

export interface StageOptions {
  reducedMotion: boolean;
  /** SVG markup for each toast mood, rendered by the caller from ToastMascot. */
  toastSvgs: Record<ToastMoodKey, string>;
}

export interface PointerHit {
  x: number;
  y: number;
  /** `event.timeStamp`, same clock as performance.now(). */
  timeStamp: number;
  pointerType: string;
}

export interface Stage {
  app: Application;
  root: Container;
  width: number;
  height: number;
  reducedMotion: boolean;
  toast: Record<ToastMoodKey, Texture>;
  /** Subscribe to pointerdown on the stage. Returns an unsubscribe function. */
  onPointer(cb: (hit: PointerHit) => void): () => void;
  /** Subscribe to keydown (outside text inputs). Returns an unsubscribe function. */
  onKey(cb: (e: KeyboardEvent) => void): () => void;
  /** Runs `cb(nowMs)` every frame until the returned function is called. */
  onFrame(cb: (now: number) => void): () => void;
  /** Remove everything drawn by the current round. */
  clear(): void;
  destroy(): void;
}

async function svgTexture(svg: string, scale: number): Promise<Texture> {
  const img = new Image();
  img.decoding = "async";
  const sized = svg.replace(/width="[\d.]+" height="[\d.]+"/, `width="${200 * scale}" height="${240 * scale}"`);
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sized)}`;
  await img.decode();
  return Texture.from(img);
}

export async function createStage(container: HTMLElement, opts: StageOptions): Promise<Stage> {
  const app = new Application();
  await app.init({
    resizeTo: container,
    background: C.white,
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    preference: "webgl",
  });
  app.canvas.style.display = "block";
  app.canvas.style.touchAction = "none";
  app.canvas.setAttribute("aria-hidden", "true");
  container.appendChild(app.canvas);

  const scale = Math.min(window.devicePixelRatio || 1, 2) * 1.5;
  const entries = await Promise.all(
    (Object.keys(opts.toastSvgs) as ToastMoodKey[]).map(async (k) => [k, await svgTexture(opts.toastSvgs[k], scale)] as const),
  );
  const toast = Object.fromEntries(entries) as Record<ToastMoodKey, Texture>;

  const root = new Container();
  app.stage.addChild(root);

  const pointerSubs = new Set<(hit: PointerHit) => void>();
  const onPointerDown = (e: PointerEvent) => {
    if (!e.isPrimary) return;
    e.preventDefault();
    const rect = app.canvas.getBoundingClientRect();
    const hit: PointerHit = { x: e.clientX - rect.left, y: e.clientY - rect.top, timeStamp: e.timeStamp, pointerType: e.pointerType };
    for (const cb of pointerSubs) cb(hit);
  };
  app.canvas.addEventListener("pointerdown", onPointerDown);

  const keySubs = new Set<(e: KeyboardEvent) => void>();
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "BUTTON")) return;
    for (const cb of keySubs) cb(e);
  };
  window.addEventListener("keydown", onKeyDown);

  const stage: Stage = {
    app,
    root,
    get width() {
      return app.screen.width;
    },
    get height() {
      return app.screen.height;
    },
    reducedMotion: opts.reducedMotion,
    toast,
    onPointer(cb) {
      pointerSubs.add(cb);
      return () => pointerSubs.delete(cb);
    },
    onKey(cb) {
      keySubs.add(cb);
      return () => keySubs.delete(cb);
    },
    onFrame(cb) {
      const fn = () => cb(performance.now());
      app.ticker.add(fn);
      return () => app.ticker.remove(fn);
    },
    clear() {
      for (const child of root.removeChildren()) child.destroy({ children: true });
    },
    destroy() {
      app.canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      pointerSubs.clear();
      keySubs.clear();
      for (const t of Object.values(toast)) t.destroy(true);
      app.destroy({ removeView: true }, { children: true });
    },
  };
  return stage;
}

/** Thrown when a round is aborted (tab hidden, player left). */
export class RoundAborted extends Error {
  constructor() {
    super("Round aborted");
    this.name = "RoundAborted";
  }
}

/** Feedback for the DOM layer: the toast's reaction plus a text cue (audio has text equivalents). */
export interface RoundFeedback {
  tone: "good" | "bad" | "neutral";
  caption: string;
  sound?: SoundName;
}

export type SoundName = "tick" | "pop" | "butter" | "burn" | "complete" | "reveal";

export interface RoundHooks {
  signal: AbortSignal;
  onFeedback?(f: RoundFeedback): void;
  /** Progress text such as "Trial 2 of 5". */
  onProgress?(text: string): void;
}

/** Runs a round body with standard cleanup and abort handling. */
export function runRound<T>(
  stage: Stage,
  hooks: RoundHooks,
  body: (finish: (value: T) => void, cleanups: (() => void)[]) => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const cleanups: (() => void)[] = [];
    let done = false;
    const end = () => {
      done = true;
      for (const fn of cleanups.splice(0)) fn();
      hooks.signal.removeEventListener("abort", onAbort);
      stage.clear();
    };
    const onAbort = () => {
      if (done) return;
      end();
      reject(new RoundAborted());
    };
    if (hooks.signal.aborted) return reject(new RoundAborted());
    hooks.signal.addEventListener("abort", onAbort);
    stage.clear();
    body((value) => {
      if (done) return;
      end();
      resolve(value);
    }, cleanups);
  });
}

/** Ease helpers for frame-based tweens. */
export const ease = {
  outBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
  },
  outCubic: (t: number) => 1 - (1 - t) ** 3,
  inCubic: (t: number) => t ** 3,
};

export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/** Plain helper so rounds can make a rounded rectangle quickly. */
export function slab(w: number, h: number, r: number, fill: number, stroke = C.burnt, strokeWidth = 4): Graphics {
  return new Graphics().roundRect(0, 0, w, h, r).fill(fill).stroke({ width: strokeWidth, color: stroke });
}
