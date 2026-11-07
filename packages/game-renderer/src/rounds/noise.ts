import { Container, Graphics } from "pixi.js";
import { FAKE_NOTIFICATIONS, NOISE_GRID, ROUND_RULES, type NoiseEvent, type NoiseResult, type NoiseRound } from "@whoscooked/game-core";
import { butterPat, crumb, label, notificationCard } from "../draw.ts";
import { C, clamp01, ease, runRound, type RoundHooks, type Stage } from "../stage.ts";

interface Live {
  event: NoiseEvent;
  view: Container;
  x: number;
  y: number;
  /** Hit radius for items; for notifications we use the card rectangle. */
  r: number;
  rect?: { x: number; y: number; w: number; h: number };
  tapped: boolean;
}

/**
 * Round 2: Ignore the Noise. 25-second go/no-go: tap butter pats, ignore burnt
 * crumbs and the clearly fictional notifications.
 */
export function runNoise(stage: Stage, round: NoiseRound, hooks: RoundHooks): Promise<NoiseResult> {
  return runRound<NoiseResult>(stage, hooks, (finish, cleanups) => {
    const { durationMs } = ROUND_RULES.noise;
    const w = stage.width;
    const h = stage.height;
    const top = Math.min(110, h * 0.2);
    const cellW = w / NOISE_GRID.columns;
    const cellH = (h - top - 16) / NOISE_GRID.rows;
    const itemSize = Math.min(cellW, cellH) * 0.62;

    const timer = new Graphics();
    const field = new Container();
    const banners = new Container();
    const note = label("", 18);
    note.position.set(w / 2, top / 2 + 8);
    stage.root.addChild(field, note, banners, timer);

    const counts = { hits: 0, falseAlarms: 0, notificationTaps: 0 };
    const live: Live[] = [];
    let next = 0;
    let noteUntil = 0;
    const t0 = performance.now();

    const cellCenter = (cell: number) => {
      const col = cell % NOISE_GRID.columns;
      const row = Math.floor(cell / NOISE_GRID.columns);
      return { x: cellW * (col + 0.5), y: top + cellH * (row + 0.5) };
    };

    const spawn = (event: NoiseEvent) => {
      if (event.kind === "notification") {
        const n = FAKE_NOTIFICATIONS[event.textIndex]!;
        const cw = Math.min(w - 24, 380);
        const view = notificationCard(cw, n.from, n.text);
        const x = (w - cw) / 2;
        view.position.set(x, stage.reducedMotion ? 12 : -90);
        banners.addChild(view);
        live.push({ event, view, x, y: 12, r: 0, rect: { x, y: 12, w: cw, h: 74 }, tapped: false });
        return;
      }
      const { x, y } = cellCenter(event.cell);
      const view = event.kind === "butter" ? butterPat(itemSize) : crumb(itemSize * 0.82, event.id);
      view.position.set(x, y);
      if (!stage.reducedMotion) view.scale.set(0.2);
      field.addChild(view);
      live.push({ event, view, x, y, r: itemSize * 0.6, tapped: false });
    };

    const remove = (l: Live) => {
      const i = live.indexOf(l);
      if (i >= 0) live.splice(i, 1);
      l.view.destroy({ children: true });
    };

    cleanups.push(
      stage.onPointer((p) => {
        // Notifications sit on top, so they take the tap first.
        const target =
          live.find((l) => l.rect && p.x >= l.rect.x && p.x <= l.rect.x + l.rect.w && p.y >= l.rect.y && p.y <= l.rect.y + l.rect.h) ??
          live.find((l) => !l.rect && Math.hypot(p.x - l.x, p.y - l.y) <= l.r);
        if (!target || target.tapped) return;
        target.tapped = true;
        if (target.event.kind === "butter") {
          counts.hits++;
          hooks.onFeedback?.({ tone: "good", caption: "Butter", sound: "butter" });
        } else if (target.event.kind === "crumb") {
          counts.falseAlarms++;
          note.text = "Crumb!";
          noteUntil = performance.now() + 700;
          note.style.fill = C.jam;
          hooks.onFeedback?.({ tone: "bad", caption: "That was a crumb", sound: "burn" });
        } else {
          counts.notificationTaps++;
          note.text = "It was fake";
          noteUntil = performance.now() + 700;
          note.style.fill = C.jam;
          hooks.onFeedback?.({ tone: "bad", caption: "You tapped a fake notification", sound: "burn" });
        }
        remove(target);
      }),
    );

    hooks.onProgress?.("Tap butter. Ignore crumbs and notifications.");

    cleanups.push(
      stage.onFrame((now) => {
        const t = now - t0;
        while (next < round.events.length && round.events[next]!.atMs <= t) spawn(round.events[next++]!);

        for (const l of [...live]) {
          const age = t - l.event.atMs;
          if (age > l.event.lifetimeMs) {
            remove(l);
            continue;
          }
          if (stage.reducedMotion) continue;
          if (l.rect) {
            l.view.y = -90 + (l.y + 90) * ease.outCubic(clamp01(age / 180));
          } else {
            const grow = ease.outBack(clamp01(age / 160));
            const shrink = 1 - ease.inCubic(clamp01((age - (l.event.lifetimeMs - 140)) / 140));
            l.view.scale.set(Math.max(0.01, grow * shrink));
          }
        }

        if (note.text && now > noteUntil) note.text = "";

        const left = clamp01(1 - t / durationMs);
        timer.clear().rect(0, 0, w * left, 6).fill(C.burnt);

        if (t >= durationMs) {
          finish({
            targets: round.targets,
            hits: counts.hits,
            misses: round.targets - counts.hits,
            falseAlarms: counts.falseAlarms,
            notificationTaps: counts.notificationTaps,
          });
        }
      }),
    );
  });
}
