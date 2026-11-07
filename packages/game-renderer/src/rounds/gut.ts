import { Container, Graphics } from "pixi.js";
import { ROUND_RULES, type GutPick, type GutResult } from "@whoscooked/game-core";
import { label } from "../draw.ts";
import { C, clamp01, runRound, slab, type RoundHooks, type Stage } from "../stage.ts";

/**
 * Round 4: Gut Picks. Eight fast this-or-that choices in about 15 seconds.
 * Used for sync only, never for the Cooked Score. Arrow keys work too.
 */
export function runGut(stage: Stage, picks: GutPick[], hooks: RoundHooks): Promise<GutResult> {
  return runRound<GutResult>(stage, hooks, (finish, cleanups) => {
    const perPick = ROUND_RULES.gut.durationMs / picks.length;
    const w = stage.width;
    const h = stage.height;
    const choices: (0 | 1 | null)[] = [];

    const pad = 12;
    const top = h * 0.16;
    const cardW = w - pad * 2;
    const cardH = (h - top - pad * 3) / 2;

    const counter = label("", 18);
    counter.position.set(w / 2, h * 0.06);
    const timer = new Graphics();
    const cards = new Container();
    stage.root.addChild(counter, timer, cards);

    let index = -1;
    let pickStart = 0;
    let lockedUntil = 0;
    let views: { a: Container; b: Container } | null = null;

    const option = (text: string, y: number, accent: number) => {
      const c = new Container();
      c.addChild(slab(cardW, cardH, 26, accent));
      const t = label(text, Math.min(34, cardW / 9), { display: true, width: cardW - 40, color: accent === C.burnt ? C.white : C.burnt });
      t.position.set(cardW / 2, cardH / 2);
      c.addChild(t);
      c.position.set(pad, y);
      return c;
    };

    const show = (now: number) => {
      index++;
      if (index >= picks.length) return finish({ choices });
      const p = picks[index]!;
      cards.removeChildren().forEach((c) => c.destroy({ children: true }));
      views = { a: option(p.a, top, C.white), b: option(p.b, top + cardH + pad, C.butter) };
      cards.addChild(views.a, views.b);
      counter.text = `${index + 1} of ${picks.length}`;
      hooks.onProgress?.(counter.text);
      pickStart = now;
      lockedUntil = 0;
    };

    const choose = (choice: 0 | 1) => {
      if (!views || lockedUntil || index >= picks.length) return;
      choices[index] = choice;
      const chosen = choice === 0 ? views.a : views.b;
      const other = choice === 0 ? views.b : views.a;
      other.alpha = 0.3;
      if (!stage.reducedMotion) chosen.scale.set(1.02);
      hooks.onFeedback?.({ tone: "neutral", caption: "Picked", sound: "tick" });
      lockedUntil = performance.now() + 160;
    };

    cleanups.push(
      stage.onPointer((p) => {
        if (p.y >= top && p.y < top + cardH) choose(0);
        else if (p.y >= top + cardH + pad) choose(1);
      }),
    );
    cleanups.push(
      stage.onKey((e) => {
        if (["ArrowUp", "ArrowLeft", "KeyA", "Digit1"].includes(e.code)) choose(0);
        if (["ArrowDown", "ArrowRight", "KeyB", "Digit2"].includes(e.code)) choose(1);
      }),
    );

    show(performance.now());

    cleanups.push(
      stage.onFrame((now) => {
        if (index >= picks.length) return;
        const elapsed = now - pickStart;
        timer.clear().rect(0, 0, w * clamp01(1 - elapsed / perPick), 6).fill(C.burnt);
        if (lockedUntil && now >= lockedUntil) return show(now);
        if (!lockedUntil && elapsed >= perPick) {
          choices[index] = null;
          show(now);
        }
      }),
    );
  });
}
