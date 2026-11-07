import { Graphics } from "pixi.js";
import { ROUND_RULES } from "@whoscooked/game-core";
import { label, toastSprite } from "../draw.ts";
import { C, runRound, type RoundHooks, type Stage } from "../stage.ts";

export interface CalibrationOutput {
  /** Tap time minus beat time, one per answered beat. */
  tapMinusBeatMs: number[];
  /** Estimated display refresh rate, or null if it couldn't be measured. */
  refreshHz: number | null;
  inputType: string;
}

/**
 * Three rhythm taps after a two-beat count-in. Tapping in rhythm removes
 * reaction time, so the average tap error approximates device latency.
 * It is an estimate, never presented as perfect (PRD section 5).
 */
export function runCalibration(stage: Stage, hooks: RoundHooks): Promise<CalibrationOutput> {
  return runRound<CalibrationOutput>(stage, hooks, (finish, cleanups) => {
    const { beats, countIn, beatIntervalMs } = ROUND_RULES.calibration;
    const lead = 700;
    const total = countIn + beats;
    const t0 = performance.now();
    const beatAt = (k: number) => t0 + lead + k * beatIntervalMs;
    const end = beatAt(total - 1) + 450;

    const w = stage.width;
    const h = stage.height;
    const ground = h * 0.72;
    const toast = toastSprite(stage.toast.focused, Math.min(h * 0.3, 150));
    toast.position.set(w / 2, ground);
    const baseScale = toast.scale.x;
    const floor = new Graphics().roundRect(w * 0.2, ground, w * 0.6, 10, 5).fill(C.burnt);
    const count = label("", 44, { display: true });
    count.position.set(w / 2, h * 0.16);
    const dots = new Graphics();
    stage.root.addChild(floor, toast, count, dots);

    const answered = new Map<number, number>();
    let inputType = "unknown";
    let frames = 0;
    let firstFrame = 0;
    let lastFrame = 0;

    const drawDots = () => {
      dots.clear();
      for (let i = 0; i < beats; i++) {
        const x = w / 2 + (i - 1) * 34;
        dots.circle(x, h * 0.86, 10).stroke({ width: 4, color: C.burnt });
        if (answered.has(countIn + i)) dots.circle(x, h * 0.86, 10).fill(C.plate);
      }
    };
    drawDots();

    const tap = (timeStamp: number, type: string) => {
      inputType = type;
      let best = -1;
      let bestDiff = Infinity;
      for (let k = countIn; k < total; k++) {
        const d = timeStamp - beatAt(k);
        if (Math.abs(d) < Math.abs(bestDiff)) {
          bestDiff = d;
          best = k;
        }
      }
      if (best < 0 || Math.abs(bestDiff) > 300 || answered.has(best)) return;
      answered.set(best, bestDiff);
      hooks.onFeedback?.({ tone: "good", caption: "Tap", sound: "butter" });
      drawDots();
    };

    cleanups.push(stage.onPointer((p) => tap(p.timeStamp, p.pointerType)));
    cleanups.push(
      stage.onKey((e) => {
        if (e.code === "Space" || e.code === "Enter") {
          e.preventDefault();
          tap(e.timeStamp, "keyboard");
        }
      }),
    );

    let lastBeat = -1;
    cleanups.push(
      stage.onFrame((now) => {
        frames++;
        if (!firstFrame) firstFrame = now;
        lastFrame = now;

        const sinceLead = now - t0 - lead;
        if (sinceLead < -beatIntervalMs) {
          toast.y = ground;
        } else {
          // Parabolic hop that lands exactly on each beat.
          const p = (((sinceLead % beatIntervalMs) + beatIntervalMs) % beatIntervalMs) / beatIntervalMs;
          const height = Math.min(h * 0.22, 120) * 4 * p * (1 - p);
          const finished = now > beatAt(total - 1);
          toast.y = finished ? ground : ground - height;
          const squash = !stage.reducedMotion && !finished && p < 0.12 ? 0.12 * (1 - p / 0.12) : 0;
          toast.scale.set(baseScale * (1 + squash * 0.6), baseScale * (1 - squash));
        }

        const k = Math.floor((now - t0 - lead + beatIntervalMs / 2) / beatIntervalMs);
        if (k !== lastBeat && k >= 0 && k < total) {
          lastBeat = k;
          count.text = k < countIn ? String(countIn - k) : "Tap";
          hooks.onFeedback?.({ tone: "neutral", caption: k < countIn ? "Watch the beat" : "Tap on the landing", sound: "tick" });
        }

        if (now >= end) {
          const seconds = (lastFrame - firstFrame) / 1000;
          const refreshHz = seconds > 0.5 ? Math.round((frames - 1) / seconds) : null;
          finish({ tapMinusBeatMs: [...answered.values()], refreshHz, inputType });
        }
      }),
    );
  });
}
