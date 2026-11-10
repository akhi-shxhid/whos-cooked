import { Application, Container, Graphics, Texture } from "pixi.js";
import { palette } from "@whoscooked/brand";

export const hex = (c: string) => parseInt(c.slice(1), 16);

/** Stage palette (brand tokens v2). The stage itself is a light "paper" surface. */
export const C = {
  bg: hex(palette.bg),
  panel: hex(palette.panel),
  panel2: hex(palette.panel2),
  paper: hex(palette.paper),
  line: hex(palette.line),
  muted: hex(palette.muted),
  heat: hex(palette.heat),
  acid: hex(palette.acid),
  ice: hex(palette.ice),
  danger: hex(palette.danger),
  gold: hex(palette.gold),
  white: 0xffffff,
} as const;

export const FONT_DISPLAY = "Bricolage Grotesque";
export const FONT_BODY = "Atkinson Hyperlegible";
export const FONT_EMOJI = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

export type MoodKey = "neutral" | "happy" | "shocked" | "panic";

/**
 * Texture keys:
 *   `char:<mood>`           the player's selected character
 *   `toast:<doneness>:<mood>` toast slices for BURNT ONE!
 */
export type TexKey = `char:${MoodKey}` | `toast:${number}:${MoodKey}`;

export interface StageOptions {
  reducedMotion: boolean;
  /** SVG markup for a texture key, rendered by the caller from the pure brand components. */
  svgFor(key: TexKey): string;
  /** Textures needed in the first seconds. The stage waits for these. */
  preload: readonly TexKey[];
  /** Everything else, made in the background after the stage is ready. */
  later?: readonly TexKey[];
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
  /** A preloaded texture, or the closest preloaded one of the same kind. */
  texture(key: TexKey): Texture;
  onPointer(cb: (hit: PointerHit) => void): () => void;
  onKey(cb: (e: KeyboardEvent) => void): () => void;
  /** Runs `cb(nowMs)` every frame until the returned function is called. */
  onFrame(cb: (now: number) => void): () => void;
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
    background: C.paper,
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    preference: "webgl",
  });
  app.canvas.style.display = "block";
  app.canvas.style.touchAction = "none";
  app.canvas.setAttribute("aria-hidden", "true");
  container.appendChild(app.canvas);

  const scale = Math.min(window.devicePixelRatio || 1, 2);
  const textures = new Map<TexKey, Texture>();
  let destroyed = false;
  const make = async (key: TexKey) => {
    if (textures.has(key)) return;
    const t = await svgTexture(opts.svgFor(key), scale);
    if (destroyed) t.destroy(true);
    else textures.set(key, t);
  };
  await Promise.all(opts.preload.map(make));
  void (async () => {
    for (const key of opts.later ?? []) {
      if (destroyed) return;
      await make(key).catch(() => {});
    }
  })();

  const texture = (key: TexKey): Texture => {
    const hit = textures.get(key);
    if (hit) return hit;
    // Fallback while background textures are still being made.
    const [kind, a, b] = key.split(":");
    let best: Texture | undefined;
    let bestGap = Infinity;
    for (const [k, t] of textures) {
      const [kk, ka, kb] = k.split(":");
      if (kk !== kind) continue;
      const gap = kind === "toast" ? Math.abs(Number(ka) - Number(a)) + (kb === b ? 0 : 500) : ka === a ? 0 : 1;
      if (gap < bestGap) {
        bestGap = gap;
        best = t;
      }
    }
    best ??= textures.values().next().value;
    if (!best) throw new Error("No textures were preloaded.");
    return best;
  };

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
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "BUTTON" || target.tagName === "SELECT")) return;
    for (const cb of keySubs) cb(e);
  };
  window.addEventListener("keydown", onKeyDown);

  return {
    app,
    root,
    get width() {
      return app.screen.width;
    },
    get height() {
      return app.screen.height;
    },
    reducedMotion: opts.reducedMotion,
    texture,
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
      destroyed = true;
      app.canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      pointerSubs.clear();
      keySubs.clear();
      for (const t of textures.values()) t.destroy(true);
      app.destroy({ removeView: true }, { children: true });
    },
  };
}

/** Thrown when a run is aborted (tab hidden, player left). */
export class RoundAborted extends Error {
  constructor() {
    super("Round aborted");
    this.name = "RoundAborted";
  }
}

/** Feedback for the DOM layer: a reaction plus a text cue (every sound has a text equivalent). */
export interface RoundFeedback {
  tone: "good" | "bad" | "neutral";
  caption: string;
  sound?: SoundName;
}

export type SoundName = "tick" | "pop" | "butter" | "burn" | "complete" | "reveal";

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

/** Rounded joins and caps everywhere, plus a low miter limit (see shapes.ts for the stray-line bug). */
export const ink = (width: number, color: number = C.line) => ({ width, color, join: "round" as const, cap: "round" as const, miterLimit: 2 });

/** Sticker slab: fill, hard border, optional offset shadow. */
export function slab(w: number, h: number, r: number, fill: number, opts: { border?: number; shadow?: number } = {}): Graphics {
  const g = new Graphics();
  if (opts.shadow !== undefined) g.roundRect(5, 5, w, h, r).fill(opts.shadow);
  g.roundRect(0, 0, w, h, r).fill(fill).stroke(ink(opts.border ?? 4));
  return g;
}
