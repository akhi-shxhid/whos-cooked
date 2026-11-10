import { Container, Graphics, type Sprite } from "pixi.js";
import {
  COUNT_GRID,
  donenessForLives,
  FAKE_NOTIFICATIONS,
  GRID,
  MICRO_COMMANDS,
  MICRO_SHOUTS,
  microAt,
  MODES,
  pointsFor,
  comboMultiplier,
  SYMBOLS,
  symbol,
  type MicroOutcome,
  type MicroSpec,
  type ModeKey,
  type ModeRules,
  type OutcomeRecord,
  type RushResult,
} from "@whoscooked/game-core";
import { flag, glyph, label, notificationCard, phone, sprite, toaster } from "./draw.ts";
import { C, clamp01, ease, ink, RoundAborted, slab, type PointerHit, type RoundFeedback, type Stage, type TexKey } from "./stage.ts";

export interface RunConfig {
  seed: string;
  mode: ModeKey;
}

export interface RunState {
  index: number;
  lost: number;
  streak: number;
  points: number;
  outcomes: OutcomeRecord[];
  bestPopMs: number | null;
  /** Remaining clock in Blitz, null in modes without a clock. */
  clockLeftMs: number | null;
}

export interface MicroEnd {
  spec: MicroSpec;
  outcome: MicroOutcome;
  ms: number;
  reason: string;
  gained: number;
  multiplier: number;
  state: RunState;
}

export interface RunHooks {
  signal: AbortSignal;
  onFeedback?(f: RoundFeedback): void;
  /** Snapshot can be passed back as `resume` to restart the interrupted microgame. */
  onMicroStart?(spec: MicroSpec, snapshot: RunState): void;
  onMicroEnd?(e: MicroEnd): void;
  onSpeedUp?(tier: number): void;
  onBoss?(): void;
  /** Blitz clock, about 10 times a second. */
  onClock?(msLeft: number): void;
}

/** Textures the run draws: needed-now first, the rest in the background. */
export function runTextures(): { now: TexKey[]; later: TexKey[] } {
  const base = donenessForLives(0);
  const now: TexKey[] = ["char:neutral", "char:shocked", "char:happy", `toast:${base}:neutral`, `toast:${base + 60}:shocked`];
  const later: TexKey[] = ["char:panic"];
  for (const c of [54, 48, 42, 36, 30, 24, 20]) later.push(`toast:${base + c}:shocked`);
  return { now, later };
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new RoundAborted());
    const id = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(id);
      reject(new RoundAborted());
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

const fresh = (rules: ModeRules): RunState => ({ index: 0, lost: 0, streak: 0, points: 0, outcomes: [], bestPopMs: null, clockLeftMs: rules.clockMs });
const copy = (s: RunState): RunState => ({ ...s, outcomes: [...s.outcomes] });

export async function runGame(stage: Stage, cfg: RunConfig, hooks: RunHooks, resume?: RunState): Promise<RushResult> {
  const rules = MODES[cfg.mode];
  const state = resume ? copy(resume) : fresh(rules);
  let deadline = state.clockLeftMs === null ? null : performance.now() + state.clockLeftMs;
  let lastClock = 0;
  const stopClock = stage.onFrame((now) => {
    if (deadline === null) return;
    state.clockLeftMs = Math.max(0, deadline - now);
    if (now - lastClock > 100) {
      lastClock = now;
      hooks.onClock?.(state.clockLeftMs);
    }
  });
  const timeUp = () => deadline !== null && performance.now() >= deadline;
  const ended = () =>
    (rules.lives !== null && state.lost >= rules.lives) || timeUp() || (rules.maxMicros !== null && state.index >= rules.maxMicros);

  let first = true;
  try {
    while (!ended()) {
      const spec = microAt(cfg.seed, state.index, rules);
      if (!(first && resume)) {
        if (state.index > 0 && state.index % rules.speedUpEvery === 0) {
          hooks.onSpeedUp?.(spec.tier);
          await banner(stage, "SPEED UP", C.ice, rules.outcomeMs + 250, hooks.signal);
        }
        if (spec.boss) {
          hooks.onBoss?.();
          await banner(stage, "BOSS", C.danger, 700, hooks.signal);
        }
        if (timeUp()) break;
      }
      first = false;
      hooks.onMicroStart?.(spec, copy(state));

      const r = await playMicro(stage, spec, rules, state.lost, deadline, hooks);
      if (r.outcome === "timeout") break;

      let gained = 0;
      let multiplier = 1;
      if (r.outcome === "cleared") {
        multiplier = comboMultiplier(rules, state.streak);
        gained = pointsFor(rules, spec.boss, state.streak);
        state.streak++;
        state.points += gained;
        if (spec.kind === "pop") state.bestPopMs = state.bestPopMs === null ? Math.round(r.ms) : Math.min(state.bestPopMs, Math.round(r.ms));
      } else {
        state.streak = 0;
        if (rules.lives !== null) state.lost++;
        if (deadline !== null && rules.missPenaltyMs) deadline -= rules.missPenaltyMs;
      }
      state.outcomes.push({ kind: spec.kind, outcome: r.outcome, ms: Math.round(r.ms), points: gained, boss: spec.boss });
      state.index++;
      hooks.onMicroEnd?.({ spec, outcome: r.outcome, ms: r.ms, reason: r.reason, gained, multiplier, state: copy(state) });

      const stampText = r.outcome === "cleared" && multiplier > 1 ? `${r.reason}  x${multiplier}` : r.reason;
      await stamp(stage, r.outcome, stampText, rules.outcomeMs, hooks.signal);
      stage.clear();
    }
    hooks.onClock?.(0);
    return { seed: cfg.seed, mode: cfg.mode, outcomes: state.outcomes, points: state.points, bestPopMs: state.bestPopMs };
  } catch (err) {
    // Keep the clock where it was so a resume continues fairly.
    if (deadline !== null) state.clockLeftMs = Math.max(0, deadline - performance.now());
    throw err;
  } finally {
    stopClock();
    stage.root.position.set(0, 0);
  }
}

// ---------------------------------------------------------------- Overlays

async function banner(stage: Stage, text: string, fill: number, ms: number, signal: AbortSignal) {
  stage.clear();
  const w = stage.width;
  const t = label(text, Math.min(54, w / 6), { display: true, color: C.line });
  const bw = t.width + 48;
  const bh = t.height + 26;
  const panel = new Container();
  panel.addChild(slab(bw, bh, 8, fill, { shadow: C.line, border: 5 }));
  t.position.set(bw / 2, bh / 2);
  panel.addChild(t);
  panel.pivot.set(bw / 2, bh / 2);
  panel.position.set(w / 2, stage.height / 2);
  panel.rotation = -0.06;
  const fit = Math.min(1, (w - 28) / bw);
  panel.scale.set(fit);
  stage.root.addChild(panel);
  const start = performance.now();
  const stop = stage.onFrame((now) => {
    if (!stage.reducedMotion) panel.scale.set(fit * (0.6 + 0.4 * ease.outBack(clamp01((now - start) / 160))));
  });
  try {
    await wait(ms, signal);
  } finally {
    stop();
    stage.clear();
  }
}

async function stamp(stage: Stage, outcome: MicroOutcome, text: string, ms: number, signal: AbortSignal) {
  const w = stage.width;
  const good = outcome === "cleared";
  const t = label(text, Math.min(36, w / 9.5), { display: true, color: C.line });
  const bw = t.width + 40;
  const bh = t.height + 22;
  const s = new Container();
  s.addChild(slab(bw, bh, 8, good ? C.acid : C.danger, { shadow: C.line, border: 5 }));
  t.position.set(bw / 2, bh / 2);
  s.addChild(t);
  s.pivot.set(bw / 2, bh / 2);
  s.position.set(w / 2, stage.height * 0.42);
  s.rotation = good ? -0.07 : 0.06;
  const fit = Math.min(1, (w - 28) / bw);
  stage.root.addChild(s);
  const start = performance.now();
  const stop = stage.onFrame((now) => {
    s.scale.set(fit * (stage.reducedMotion ? 1 : 1.45 - 0.45 * ease.outCubic(clamp01((now - start) / 130))));
    if (!good && !stage.reducedMotion) {
      const left = 1 - clamp01((now - start) / 240);
      stage.root.position.set((Math.random() - 0.5) * 16 * left, (Math.random() - 0.5) * 10 * left);
    }
  });
  try {
    await wait(ms + (good ? 0 : 160), signal);
  } finally {
    stop();
    stage.root.position.set(0, 0);
  }
}

// ---------------------------------------------------------------- Microgame framework

interface MicroResult {
  outcome: MicroOutcome | "timeout";
  reason: string;
  ms: number;
}

interface MicroCtx {
  stage: Stage;
  layer: Container;
  w: number;
  h: number;
  top: number;
  lost: number;
  liveAt: number;
  startTimer(now: number, ms: number): void;
  finish(outcome: MicroOutcome, reason: string, ms?: number): void;
  feedback(f: RoundFeedback): void;
}

interface MicroImpl {
  onLive?(now: number): void;
  onFrame?(now: number): void;
  onTap?(hit: PointerHit): void;
  onKey?(e: KeyboardEvent): void;
  surviveToWin?: boolean;
  winReason?: string;
  timeoutReason?: string;
}

function playMicro(stage: Stage, spec: MicroSpec, rules: ModeRules, lost: number, deadline: number | null, hooks: RunHooks): Promise<MicroResult> {
  return new Promise<MicroResult>((resolve, reject) => {
    if (hooks.signal.aborted) return reject(new RoundAborted());
    stage.clear();
    const layer = new Container();
    const timer = new Graphics();
    stage.root.addChild(layer, timer);

    const cleanups: (() => void)[] = [];
    let done = false;
    let timerStart = 0;
    let timerMs = 0;
    const commandStart = performance.now();

    const end = () => {
      done = true;
      for (const fn of cleanups.splice(0)) fn();
      hooks.signal.removeEventListener("abort", onAbort);
    };
    const onAbort = () => {
      if (done) return;
      end();
      reject(new RoundAborted());
    };
    hooks.signal.addEventListener("abort", onAbort);

    const ctx: MicroCtx = {
      stage,
      layer,
      w: stage.width,
      h: stage.height,
      top: 16,
      lost,
      liveAt: 0,
      startTimer(now, ms) {
        timerStart = now;
        timerMs = ms;
      },
      finish(outcome, reason, ms) {
        if (done) return;
        end();
        timer.clear();
        hooks.onFeedback?.({ tone: outcome === "cleared" ? "good" : "bad", caption: reason, sound: outcome === "cleared" ? "complete" : "burn" });
        resolve({ outcome, reason, ms: ms ?? (ctx.liveAt ? performance.now() - ctx.liveAt : 0) });
      },
      feedback(f) {
        hooks.onFeedback?.(f);
      },
    };

    const impl = MICROS[spec.kind](ctx, spec as never);

    // Command card: shouted word plus a short instruction. Input is ignored until it clears.
    const command = new Container();
    const shout = label(spec.boss ? `BOSS: ${MICRO_SHOUTS[spec.kind]}` : MICRO_SHOUTS[spec.kind], Math.min(54, ctx.w / 6.2), { display: true, color: C.line });
    const sub = label(MICRO_COMMANDS[spec.kind], 17, { color: C.line });
    const cw = Math.max(shout.width, sub.width) + 44;
    const ch = shout.height + sub.height + 30;
    command.addChild(slab(cw, ch, 10, spec.boss ? C.danger : C.acid, { shadow: C.line, border: 5 }));
    shout.position.set(cw / 2, 12 + shout.height / 2);
    sub.position.set(cw / 2, 18 + shout.height + sub.height / 2);
    command.addChild(shout, sub);
    command.pivot.set(cw / 2, ch / 2);
    command.position.set(ctx.w / 2, ctx.h * 0.38);
    command.rotation = -0.04;
    const fit = Math.min(1, (ctx.w - 28) / cw);
    command.scale.set(fit);
    stage.root.addChild(command);
    hooks.onFeedback?.({ tone: "neutral", caption: MICRO_COMMANDS[spec.kind], sound: "tick" });

    cleanups.push(stage.onPointer((hit) => !done && ctx.liveAt && impl.onTap?.(hit)));
    cleanups.push(stage.onKey((e) => !done && ctx.liveAt && impl.onKey?.(e)));
    cleanups.push(
      stage.onFrame((now) => {
        if (done) return;
        if (deadline !== null && now >= deadline) {
          end();
          timer.clear();
          resolve({ outcome: "timeout", reason: "Time", ms: 0 });
          return;
        }
        if (!ctx.liveAt) {
          const k = (now - commandStart) / rules.commandMs;
          if (!stage.reducedMotion) command.scale.set(fit * (k < 0.2 ? 0.7 + 0.3 * ease.outBack(k / 0.2) : k > 0.85 ? 1 - (k - 0.85) * 3 : 1));
          if (k >= 1) {
            command.destroy({ children: true });
            ctx.liveAt = now;
            impl.onLive?.(now);
          }
          return;
        }
        impl.onFrame?.(now);
        if (done) return;
        if (timerMs > 0) {
          const left = clamp01(1 - (now - timerStart) / timerMs);
          timer.clear().rect(0, 0, ctx.w * left, 10).fill(left < 0.25 ? C.danger : C.line);
          if (left <= 0) {
            if (impl.surviveToWin) ctx.finish("cleared", impl.winReason ?? "Held it", now - ctx.liveAt);
            else ctx.finish("failed", impl.timeoutReason ?? "Too slow");
          }
        }
      }),
    );
  });
}

// ---------------------------------------------------------------- Microgames

type MicroFactory<K extends MicroSpec["kind"]> = (ctx: MicroCtx, spec: Extract<MicroSpec, { kind: K }>) => MicroImpl;

const hitBox = (s: { getBounds(): { x: number; y: number; width: number; height: number } }, p: PointerHit, pad = 0) => {
  const b = s.getBounds();
  return p.x >= b.x - pad && p.x <= b.x + b.width + pad && p.y >= b.y - pad && p.y <= b.y + b.height + pad;
};

const pop: MicroFactory<"pop"> = (ctx, spec) => {
  const { w, h, layer, stage } = ctx;
  const tw = Math.min(w * 0.68, 270);
  const t = toaster(tw);
  const base = new Container();
  base.position.set((w - tw) / 2, h * 0.9);
  const ch = Math.min(h * 0.32, tw * 0.66);
  const who = sprite(stage.texture("char:neutral"), ch);
  const restY = t.slotY + ch * 0.55;
  const popY = Math.max(-h * 0.9 + ctx.top + 64 + ch, t.slotY - ch * 0.12 - Math.min(h * 0.2, 120));
  who.position.set(tw / 2, restY);
  base.addChild(t.back, who, t.front);
  layer.addChild(base);
  const k0 = who.scale.x;

  let popAt = Infinity;
  let onset = 0;
  // Fake-outs: the toaster twitches before the real pop. Tapping on a twitch is a false start.
  let fakes: number[] = [];
  return {
    timeoutReason: "Too slow",
    onLive(now) {
      popAt = now + spec.delayMs;
      fakes = Array.from({ length: spec.fakeOuts }, (_, i) => now + spec.delayMs * ((i + 1) / (spec.fakeOuts + 1.4)));
    },
    onFrame(now) {
      if (!onset) {
        const twitch = fakes.some((f) => now >= f && now < f + 130);
        base.x = (w - tw) / 2 + (twitch && !stage.reducedMotion ? Math.sin(now / 12) * 6 : 0);
        who.y = restY - (twitch ? ch * 0.08 : 0);
      }
      if (!onset && now >= popAt) {
        onset = now;
        who.texture = stage.texture("char:shocked");
        ctx.feedback({ tone: "neutral", caption: "Pop", sound: "pop" });
        ctx.startTimer(now, spec.timeMs);
      }
      if (onset) {
        const k = stage.reducedMotion ? 1 : clamp01((now - onset) / 110);
        who.y = restY + (popY - restY) * ease.outBack(k);
        const stretch = stage.reducedMotion ? 0 : 0.18 * (1 - k);
        who.scale.set(k0 * (1 - stretch * 0.5), k0 * (1 + stretch));
      }
    },
    onTap(hit) {
      if (!onset) return ctx.finish("failed", "Too soon");
      const ms = hit.timeStamp - onset;
      who.texture = stage.texture("char:happy");
      ctx.finish("cleared", `${Math.max(0, Math.round(ms))} ms`, ms);
    },
    onKey(e) {
      if (e.code !== "Space" && e.code !== "Enter") return;
      e.preventDefault();
      if (!onset) return ctx.finish("failed", "Too soon");
      ctx.finish("cleared", `${Math.max(0, Math.round(e.timeStamp - onset))} ms`, e.timeStamp - onset);
    },
  };
};

const flags: MicroFactory<"flags"> = (ctx, spec) => {
  const { w, h, layer, stage } = ctx;
  const top = ctx.top + 8;
  const cw = w / GRID.columns;
  const chh = (h - top - 12) / GRID.rows;
  const size = Math.min(cw, chh) * 0.7;
  const items = spec.cells.map(({ cell, green }) => {
    const view = flag(green, size);
    view.position.set(cw * ((cell % GRID.columns) + 0.5), top + chh * (Math.floor(cell / GRID.columns) + 0.5));
    layer.addChild(view);
    return { view, green, tapped: false, at: 0 };
  });
  let left = items.filter((i) => i.green).length;
  return {
    timeoutReason: "Flags left",
    onLive(now) {
      ctx.startTimer(now, spec.timeMs);
    },
    onFrame(now) {
      for (const it of items) {
        if (it.tapped && !stage.reducedMotion) {
          const k = clamp01((now - it.at) / 140);
          it.view.scale.set(1 + 0.3 * k);
          it.view.alpha = 1 - k;
        }
      }
    },
    onTap(hit) {
      const it = items.find((i) => !i.tapped && Math.hypot(hit.x - i.view.x, hit.y - i.view.y) < size * 0.6);
      if (!it) return;
      it.tapped = true;
      it.at = performance.now();
      if (stage.reducedMotion) it.view.visible = false;
      if (!it.green) return ctx.finish("failed", "Red flag!");
      left--;
      ctx.feedback({ tone: "good", caption: "Green flag", sound: "butter" });
      if (left === 0) ctx.finish("cleared", "Green flags only");
    },
  };
};

const dont: MicroFactory<"dont"> = (ctx, spec) => {
  const { w, h, layer, stage } = ctx;
  const r = Math.min(w, h) * 0.2;
  const bait = new Container();
  bait.addChild(new Graphics().circle(5, 6, r).fill(C.line), new Graphics().circle(0, 0, r).fill(C.heat).stroke(ink(6)), label("TAP ME", Math.min(28, r / 2.4), { display: true, color: C.line }));
  bait.position.set(w / 2, h * 0.64);
  layer.addChild(bait);
  const cardW = Math.min(w - 24, 360);
  const cards = spec.notifications.map((n, i) => {
    const note = FAKE_NOTIFICATIONS[n]!;
    const card = notificationCard(cardW, note.from, note.text);
    card.position.set((w - cardW) / 2 + i * 6, -120);
    layer.addChild(card);
    return card;
  });
  let live = 0;
  return {
    surviveToWin: true,
    winReason: "Unbothered",
    onLive(now) {
      live = now;
      ctx.startTimer(now, spec.timeMs);
    },
    onFrame(now) {
      const t = now - live;
      if (!stage.reducedMotion) bait.scale.set(1 + 0.06 * Math.sin(t / 100));
      cards.forEach((card, i) => {
        const startAt = spec.timeMs * (0.2 + i * 0.22);
        const k = ease.outCubic(clamp01((t - startAt) / 180));
        card.y = -120 + (ctx.top + 10 + i * 18 + 120) * k;
      });
    },
    onTap() {
      ctx.finish("failed", "You tapped");
    },
    onKey(e) {
      if (e.code === "Space" || e.code === "Enter") ctx.finish("failed", "You tapped");
    },
  };
};

const order: MicroFactory<"order"> = (ctx, spec) => {
  const { w, h, layer, stage } = ctx;
  const showY = h * 0.28;
  const show = new Container();
  show.position.set(w / 2, showY);
  const showLabel = label("", 22);
  showLabel.position.set(w / 2, showY + Math.min(h * 0.13, 72));
  const dots = new Graphics();
  layer.addChild(show, showLabel, dots);

  const pad = 10;
  const cols = 3;
  const gridTop = h * 0.55;
  const bw = (w - pad * (cols + 1)) / cols;
  const bh = (h - gridTop - pad * 3) / 2;
  const buttons = new Container();
  buttons.visible = false;
  const boxes = SYMBOLS.map((s, i) => {
    const b = new Container();
    b.addChild(slab(bw, bh, 12, C.white, { border: 4 }));
    const g = glyph(s.key, Math.min(bw, bh) * 0.42);
    g.position.set(bw / 2, bh * 0.42);
    const name = label(s.label, 14);
    name.position.set(bw / 2, bh * 0.82);
    b.addChild(g, name);
    b.position.set(pad + (i % cols) * (bw + pad), gridTop + Math.floor(i / cols) * (bh + pad));
    buttons.addChild(b);
    return { key: s.key, b };
  });
  layer.addChild(buttons);

  const gap = 140;
  let live = 0;
  let shown = -1;
  let entered = 0;
  let open = false;

  const drawDots = () => {
    dots.clear();
    const size = 14;
    const g = 8;
    const total = spec.sequence.length * (size + g) - g;
    for (let i = 0; i < spec.sequence.length; i++) {
      const x = w / 2 - total / 2 + i * (size + g) + size / 2;
      if (i < entered) dots.circle(x, h * 0.48, size / 2).fill(C.heat);
      dots.circle(x, h * 0.48, size / 2).stroke(ink(3));
    }
  };

  const press = (key: string, view: Container) => {
    if (!open) return;
    if (!stage.reducedMotion) {
      view.scale.set(0.95);
      setTimeout(() => !view.destroyed && view.scale.set(1), 80);
    }
    if (key !== spec.sequence[entered]) return ctx.finish("failed", "Wrong order");
    entered++;
    drawDots();
    ctx.feedback({ tone: "good", caption: symbol(spec.sequence[entered - 1]!).label, sound: "tick" });
    if (entered === spec.sequence.length) ctx.finish("cleared", "Order up");
  };

  return {
    onLive(now) {
      live = now;
    },
    onFrame(now) {
      if (open) return;
      const t = now - live;
      const slot = spec.showMs + gap;
      const i = Math.floor(t / slot);
      const visible = i < spec.sequence.length && t - i * slot < spec.showMs ? i : -1;
      if (visible !== shown) {
        shown = visible;
        show.removeChildren().forEach((c) => c.destroy());
        showLabel.text = "";
        if (visible >= 0) {
          const s = symbol(spec.sequence[visible]!);
          show.addChild(glyph(s.key, Math.min(w * 0.3, h * 0.17)));
          showLabel.text = s.label;
          ctx.feedback({ tone: "neutral", caption: s.label, sound: "tick" });
        }
      }
      if (visible >= 0 && !stage.reducedMotion) show.scale.set(0.85 + 0.15 * clamp01((t - i * slot) / 110));
      if (t >= spec.sequence.length * slot) {
        open = true;
        buttons.visible = true;
        showLabel.text = "Your turn";
        drawDots();
        ctx.startTimer(now, spec.timeMs);
      }
    },
    onTap(hit) {
      const box = boxes.find(({ b }) => hit.x >= b.x && hit.x <= b.x + bw && hit.y >= b.y && hit.y <= b.y + bh);
      if (box) press(box.key, box.b);
    },
    onKey(e) {
      const box = boxes[Number(e.key) - 1];
      if (box) press(box.key, box.b);
    },
  };
};

const burnt: MicroFactory<"burnt"> = (ctx, spec) => {
  const { w, h, layer, stage } = ctx;
  const top = ctx.top + 10;
  const cw = w / spec.columns;
  const chh = (h - top - 10) / spec.rows;
  const th = Math.min(chh * 0.84, cw * 1.1);
  const base = donenessForLives(0);
  const slices: { s: Sprite; burnt: boolean }[] = [];
  for (let i = 0; i < spec.columns * spec.rows; i++) {
    const isBurnt = i === spec.burntIndex;
    const s = sprite(stage.texture(isBurnt ? `toast:${base + spec.contrast}:shocked` : `toast:${base}:neutral`), th);
    s.position.set(cw * ((i % spec.columns) + 0.5), top + chh * (Math.floor(i / spec.columns) + 0.5) + th / 2);
    layer.addChild(s);
    slices.push({ s, burnt: isBurnt });
  }
  return {
    onLive(now) {
      ctx.startTimer(now, spec.timeMs);
    },
    onTap(hit) {
      const target = slices.find(({ s }) => hitBox(s, hit));
      if (!target) return;
      if (target.burnt) ctx.finish("cleared", "Found it");
      else ctx.finish("failed", "That one's fine");
    },
  };
};

const mash: MicroFactory<"mash"> = (ctx, spec) => {
  const { w, h, layer, stage } = ctx;
  const meterW = Math.min(w - 60, 300);
  const meter = new Graphics();
  const count = label(`0 / ${spec.taps}`, 26, { display: true });
  count.position.set(w / 2, h * 0.24);
  const r = Math.min(w, h) * 0.22;
  const btn = new Container();
  btn.addChild(new Graphics().circle(6, 7, r).fill(C.line), new Graphics().circle(0, 0, r).fill(C.acid).stroke(ink(6)), label("MASH", Math.min(30, r / 2.2), { display: true }));
  btn.position.set(w / 2, h * 0.62);
  layer.addChild(meter, count, btn);
  let n = 0;
  let pulse = 0;
  const draw = () => {
    meter.clear().roundRect((w - meterW) / 2, h * 0.32, meterW, 22, 6).fill(C.white).stroke(ink(4));
    if (n > 0) meter.roundRect((w - meterW) / 2 + 3, h * 0.32 + 3, (meterW - 6) * Math.min(1, n / spec.taps), 16, 4).fill(C.heat);
  };
  draw();
  return {
    timeoutReason: "Too slow",
    onLive(now) {
      ctx.startTimer(now, spec.timeMs);
    },
    onFrame(now) {
      if (!stage.reducedMotion) btn.scale.set(1 - 0.08 * clamp01(1 - (now - pulse) / 90));
    },
    onTap() {
      n++;
      pulse = performance.now();
      count.text = `${n} / ${spec.taps}`;
      draw();
      if (n % 3 === 0) ctx.feedback({ tone: "good", caption: `${n}`, sound: "butter" });
      if (n >= spec.taps) ctx.finish("cleared", "Mashed");
    },
    onKey(e) {
      if (e.code === "Space" || e.code === "Enter") this.onTap?.({ x: 0, y: 0, timeStamp: e.timeStamp, pointerType: "keyboard" });
    },
  };
};

const catcher: MicroFactory<"catch"> = (ctx, spec) => {
  const { w, h, layer } = ctx;
  const size = Math.min(w, h) * 0.2;
  const floorY = h - 18;
  const floor = new Graphics().rect(0, floorY, w, 6).fill(C.line);
  layer.addChild(floor);
  const phones = Array.from({ length: spec.phones }, (_, i) => {
    const p = phone(size);
    const x0 = w * (spec.phones === 1 ? spec.startX : i === 0 ? 0.3 : 0.7);
    p.position.set(x0, ctx.top - size);
    layer.addChild(p);
    return { p, x0, caught: false, delay: i * spec.timeMs * 0.18 };
  });
  let live = 0;
  const fall = spec.timeMs;
  return {
    onLive(now) {
      live = now;
    },
    onFrame(now) {
      for (const ph of phones) {
        if (ph.caught) continue;
        const k = clamp01((now - live - ph.delay) / fall);
        ph.p.y = ctx.top - size + (floorY - size * 0.5 - (ctx.top - size)) * (k * k * 0.6 + k * 0.4);
        ph.p.x = Math.min(w - size * 0.4, Math.max(size * 0.4, ph.x0 + spec.drift * w * k));
        ph.p.rotation = Math.sin((now - live) / 160) * 0.25;
        if (k >= 1) return ctx.finish("failed", "Dropped it");
      }
    },
    onTap(hit) {
      const ph = phones.find((x) => !x.caught && Math.hypot(hit.x - x.p.x, hit.y - x.p.y) < size * 0.75);
      if (!ph) return;
      ph.caught = true;
      ph.p.visible = false;
      ctx.feedback({ tone: "good", caption: "Caught", sound: "butter" });
      if (phones.every((x) => x.caught)) ctx.finish("cleared", "Caught");
    },
  };
};

const count: MicroFactory<"count"> = (ctx, spec) => {
  const { w, h, layer } = ctx;
  const target = symbol(spec.target);
  const prompt = new Container();
  const q = label("How many", 22, { display: true });
  const tg = glyph(spec.target, 30);
  // Lay the words and the glyph out side by side, centered as a group.
  const gap = 10;
  const total = q.width + gap + tg.width;
  q.position.set(w / 2 - total / 2 + q.width / 2, ctx.top + 28);
  tg.position.set(w / 2 + total / 2 - tg.width / 2, ctx.top + 28);
  prompt.addChild(q, tg);
  layer.addChild(prompt);
  const gridTop = ctx.top + 56;
  const gridH = h * 0.6;
  const cw = w / COUNT_GRID.columns;
  const chh = gridH / COUNT_GRID.rows;
  const gsize = Math.min(cw, chh) * 0.6;
  for (const { cell, symbol: key } of spec.cells) {
    const g = glyph(key, gsize);
    g.position.set(cw * ((cell % COUNT_GRID.columns) + 0.5), gridTop + chh * (Math.floor(cell / COUNT_GRID.columns) + 0.5));
    layer.addChild(g);
  }
  const want = spec.cells.filter((c) => c.symbol === spec.target).length;
  const pad = 12;
  const bw = (w - pad * 4) / 3;
  const bh = Math.min(70, h - (gridTop + gridH) - 22);
  const by = gridTop + gridH + 8;
  const options = spec.options.map((n, i) => {
    const b = new Container();
    b.addChild(slab(bw, bh, 10, C.ice, { border: 4, shadow: C.line }));
    const l = label(String(n), Math.min(34, bh * 0.55), { display: true });
    l.position.set(bw / 2, bh / 2);
    b.addChild(l);
    b.position.set(pad + i * (bw + pad), by);
    layer.addChild(b);
    return { n, b };
  });
  void target;
  const answer = (n: number) => (n === want ? ctx.finish("cleared", "Counted") : ctx.finish("failed", `It was ${want}`));
  return {
    onLive(now) {
      ctx.startTimer(now, spec.timeMs);
    },
    onTap(hit) {
      const o = options.find(({ b }) => hit.x >= b.x && hit.x <= b.x + bw && hit.y >= b.y && hit.y <= b.y + bh);
      if (o) answer(o.n);
    },
    onKey(e) {
      const o = options[Number(e.key) - 1];
      if (o) answer(o.n);
    },
  };
};

const MICROS: { [K in MicroSpec["kind"]]: MicroFactory<K> } = { pop, flags, dont, order, burnt, mash, catch: catcher, count };
