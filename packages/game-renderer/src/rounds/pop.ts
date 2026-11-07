import { Container } from "pixi.js";
import { isFalseStart, ROUND_RULES, type PopRound, type PopTrial } from "@whoscooked/game-core";
import { label, toaster, toastSprite } from "../draw.ts";
import { C, clamp01, ease, runRound, type RoundHooks, type Stage } from "../stage.ts";

type Phase =
  | { kind: "waiting"; popAt: number }
  | { kind: "popped"; onset: number }
  | { kind: "result"; until: number };

/**
 * Round 1: Pop. Toast pops after a random 800-3000 ms delay; tap at once.
 * Timing uses `event.timeStamp` against the frame time the pop was drawn.
 */
export function runPop(stage: Stage, round: PopRound, hooks: RoundHooks): Promise<PopTrial[]> {
  return runRound<PopTrial[]>(stage, hooks, (finish, cleanups) => {
    const { timeoutMs } = ROUND_RULES.pop;
    const trials: PopTrial[] = [];
    const w = stage.width;
    const h = stage.height;

    const toasterW = Math.min(w * 0.7, 300);
    const t = toaster(toasterW);
    const base = new Container();
    base.position.set((w - toasterW) / 2, h * 0.86);
    const toastHeight = Math.min(h * 0.34, toasterW * 0.7);
    const toast = toastSprite(stage.toast.neutral, toastHeight);
    const restY = t.slotY + toastHeight * 0.45;
    const popY = t.slotY - toastHeight * 0.15 - Math.min(h * 0.18, 110);
    toast.position.set(toasterW / 2, restY);
    base.addChild(t.back, toast, t.front);

    const result = label("", 40, { display: true });
    result.position.set(w / 2, h * 0.14);
    const counter = label("", 17);
    counter.position.set(w / 2, h * 0.24);
    stage.root.addChild(base, result, counter);
    const baseScale = toast.scale.x;

    let phase: Phase;
    let popAnimStart = 0;

    const startTrial = (now: number) => {
      const i = trials.length;
      counter.text = `Trial ${i + 1} of ${round.delaysMs.length}`;
      hooks.onProgress?.(counter.text);
      result.text = "";
      toast.texture = stage.toast.neutral;
      toast.y = restY;
      toast.scale.set(baseScale);
      phase = { kind: "waiting", popAt: now + round.delaysMs[i]! };
    };

    const record = (trial: PopTrial, now: number) => {
      trials.push(trial);
      if (trial.tapMs === null) {
        result.text = "Missed";
        result.style.fill = C.burnt;
        hooks.onFeedback?.({ tone: "bad", caption: "Missed it", sound: "burn" });
      } else if (isFalseStart(trial)) {
        result.text = "Too soon";
        result.style.fill = C.jam;
        toast.texture = stage.toast.shocked;
        hooks.onFeedback?.({ tone: "bad", caption: "Too soon. False start.", sound: "burn" });
      } else {
        result.text = `${Math.round(trial.tapMs)} ms`;
        result.style.fill = C.burnt;
        toast.texture = stage.toast.happy;
        hooks.onFeedback?.({ tone: "good", caption: `${Math.round(trial.tapMs)} milliseconds`, sound: "butter" });
      }
      phase = { kind: "result", until: now + 900 };
    };

    const tap = (timeStamp: number) => {
      const i = trials.length;
      if (phase.kind === "waiting") {
        record({ delayMs: round.delaysMs[i]!, tapMs: timeStamp - phase.popAt }, performance.now());
      } else if (phase.kind === "popped") {
        record({ delayMs: round.delaysMs[i]!, tapMs: timeStamp - phase.onset }, performance.now());
      }
    };

    cleanups.push(stage.onPointer((p) => tap(p.timeStamp)));
    cleanups.push(
      stage.onKey((e) => {
        if (e.code === "Space" || e.code === "Enter") {
          e.preventDefault();
          tap(e.timeStamp);
        }
      }),
    );

    startTrial(performance.now());

    cleanups.push(
      stage.onFrame((now) => {
        if (phase.kind === "waiting" && now >= phase.popAt) {
          // `now` is this frame's time: the first frame the pop is drawn.
          phase = { kind: "popped", onset: now };
          popAnimStart = now;
          toast.texture = stage.toast.shocked;
          hooks.onFeedback?.({ tone: "neutral", caption: "Pop", sound: "pop" });
        }

        if (phase.kind === "popped" || (phase.kind === "result" && popAnimStart)) {
          const k = stage.reducedMotion ? 1 : clamp01((now - popAnimStart) / 140);
          toast.y = restY + (popY - restY) * ease.outBack(k);
          const stretch = stage.reducedMotion ? 0 : 0.14 * (1 - k);
          toast.scale.set(baseScale * (1 - stretch * 0.5), baseScale * (1 + stretch));
        }

        if (phase.kind === "popped" && now - phase.onset > timeoutMs) {
          record({ delayMs: round.delaysMs[trials.length]!, tapMs: null }, now);
        }

        if (phase.kind === "result" && now >= phase.until) {
          popAnimStart = 0;
          if (trials.length >= round.delaysMs.length) finish(trials);
          else startTrial(now);
        }
      }),
    );
  });
}
