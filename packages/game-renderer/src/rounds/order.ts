import { Container, Graphics } from "pixi.js";
import { INGREDIENTS, orderSequence, ROUND_RULES, type Ingredient, type OrderResult } from "@whoscooked/game-core";
import { INGREDIENT_LABELS, ingredientIcon, label } from "../draw.ts";
import { C, clamp01, runRound, slab, type RoundHooks, type Stage } from "../stage.ts";

type Phase =
  | { kind: "show"; start: number }
  | { kind: "input" }
  | { kind: "result"; until: number; next: "same" | "longer" | "end" };

/**
 * Round 3: Order Up. Watch a sequence of ingredients, then repeat it. Starts
 * at 3, adds one after each success, ends after two failures, at span 9, or
 * at the time limit. Keys 1-6 work as an alternative to tapping.
 */
export function runOrder(stage: Stage, seed: string, hooks: RoundHooks): Promise<OrderResult> {
  return runRound<OrderResult>(stage, hooks, (finish, cleanups) => {
    const { startLength, maxLength, maxFailures, timeLimitMs, showItemMs, gapMs } = ROUND_RULES.order;
    const w = stage.width;
    const h = stage.height;
    const t0 = performance.now();

    let attempt = 0;
    let length = startLength;
    let failures = 0;
    let maxSpan = 0;
    const attempts: OrderResult["attempts"] = [];
    let sequence: Ingredient[] = [];
    let entered = 0;
    let phase: Phase = { kind: "show", start: t0 + 500 };
    let shownIndex = -1;

    // Show area
    const showY = h * 0.27;
    const showIcon = new Container();
    showIcon.position.set(w / 2, showY);
    const showLabel = label("", 22);
    showLabel.position.set(w / 2, showY + Math.min(h * 0.13, 70));
    const status = label("", 20);
    status.position.set(w / 2, h * 0.06);
    const progress = new Graphics();

    // Buttons
    const cols = 3;
    const gridTop = h * 0.56;
    const pad = 10;
    const bw = (w - pad * (cols + 1)) / cols;
    const bh = (h - gridTop - pad * 3) / 2;
    const buttons = new Container();
    const buttonViews: Container[] = INGREDIENTS.map((kind, i) => {
      const b = new Container();
      const bg = slab(bw, bh, 18, C.white);
      const icon = ingredientIcon(kind, Math.min(bw, bh) * 0.48);
      icon.position.set(bw / 2, bh * 0.42);
      const name = label(`${INGREDIENT_LABELS[kind]}`, 15);
      name.position.set(bw / 2, bh * 0.82);
      const key = label(String(i + 1), 13, { color: C.crust });
      key.position.set(16, 16);
      b.addChild(bg, icon, name, key);
      b.position.set(pad + (i % cols) * (bw + pad), gridTop + Math.floor(i / cols) * (bh + pad));
      buttons.addChild(b);
      return b;
    });
    stage.root.addChild(status, progress, showIcon, showLabel, buttons);

    const setButtonsEnabled = (on: boolean) => {
      for (const b of buttonViews) b.alpha = on ? 1 : 0.35;
    };

    const drawProgress = () => {
      progress.clear();
      const size = 12;
      const gap = 8;
      const total = sequence.length * (size + gap) - gap;
      for (let i = 0; i < sequence.length; i++) {
        const x = w / 2 - total / 2 + i * (size + gap) + size / 2;
        progress.circle(x, h * 0.47, size / 2).stroke({ width: 3, color: C.burnt });
        if (i < entered) progress.circle(x, h * 0.47, size / 2).fill(C.plate);
      }
    };

    const beginAttempt = (now: number) => {
      sequence = orderSequence(seed, attempt, length);
      entered = 0;
      status.text = `Watch ${length} items`;
      status.style.fill = C.burnt;
      hooks.onProgress?.(`Length ${length}`);
      setButtonsEnabled(false);
      drawProgress();
      shownIndex = -1;
      phase = { kind: "show", start: now + 350 };
    };

    const conclude = (correct: boolean, now: number) => {
      attempts.push({ length, correct });
      attempt++;
      if (correct) {
        maxSpan = Math.max(maxSpan, length);
        status.text = "Order up";
        hooks.onFeedback?.({ tone: "good", caption: `Correct, ${length} in a row`, sound: "complete" });
        phase = { kind: "result", until: now + 650, next: length >= maxLength ? "end" : "longer" };
      } else {
        failures++;
        status.text = "Wrong order";
        status.style.fill = C.jam;
        hooks.onFeedback?.({ tone: "bad", caption: "Wrong order", sound: "burn" });
        phase = { kind: "result", until: now + 800, next: failures >= maxFailures ? "end" : "same" };
      }
      setButtonsEnabled(false);
    };

    const press = (index: number) => {
      if (phase.kind !== "input") return;
      const kind = INGREDIENTS[index];
      if (!kind) return;
      const view = buttonViews[index]!;
      if (!stage.reducedMotion) view.scale.set(0.96);
      setTimeout(() => view.destroyed || view.scale.set(1), 90);
      if (kind === sequence[entered]) {
        entered++;
        drawProgress();
        hooks.onFeedback?.({ tone: "good", caption: INGREDIENT_LABELS[kind], sound: "tick" });
        if (entered === sequence.length) conclude(true, performance.now());
      } else {
        conclude(false, performance.now());
      }
    };

    cleanups.push(
      stage.onPointer((p) => {
        buttonViews.forEach((b, i) => {
          if (p.x >= b.x && p.x <= b.x + bw && p.y >= b.y && p.y <= b.y + bh) press(i);
        });
      }),
    );
    cleanups.push(
      stage.onKey((e) => {
        const n = Number(e.key);
        if (Number.isInteger(n) && n >= 1 && n <= INGREDIENTS.length) press(n - 1);
      }),
    );

    beginAttempt(t0);

    const done = () => finish({ maxSpan, attempts });

    cleanups.push(
      stage.onFrame((now) => {
        if (now - t0 >= timeLimitMs) return done();

        if (phase.kind === "show") {
          const t = now - phase.start;
          const slot = showItemMs + gapMs;
          const i = Math.floor(t / slot);
          const within = t - i * slot;
          const visible = t >= 0 && i < sequence.length && within < showItemMs ? i : -1;
          if (visible !== shownIndex) {
            shownIndex = visible;
            showIcon.removeChildren().forEach((c) => c.destroy());
            showLabel.text = "";
            if (visible >= 0) {
              const kind = sequence[visible]!;
              showIcon.addChild(ingredientIcon(kind, Math.min(w * 0.36, h * 0.2)));
              showLabel.text = INGREDIENT_LABELS[kind];
            }
          }
          if (visible >= 0 && !stage.reducedMotion) showIcon.scale.set(0.85 + 0.15 * clamp01(within / 120));
          if (t >= sequence.length * slot) {
            phase = { kind: "input" };
            status.text = "Your turn";
            setButtonsEnabled(true);
          }
        }

        if (phase.kind === "result" && now >= phase.until) {
          if (phase.next === "end") return done();
          if (phase.next === "longer") length++;
          beginAttempt(now);
        }
      }),
    );
  });
}
