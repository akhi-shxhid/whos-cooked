import { useCallback, useEffect, useRef, useState } from "react";
import { ToastMascot, type ToastMood } from "@whoscooked/brand";
import {
  estimateOffset,
  generateRounds,
  randomSeed,
  scorePlay,
  soloLineFor,
  type CalibrationResult,
  type DeviceInfo,
  type PlayScore,
  type RawPlay,
} from "@whoscooked/game-core";
import { track } from "@whoscooked/analytics";
import type { RoundFeedback, SoundPlayer, Stage } from "@whoscooked/game-renderer";
import { detectDevice } from "./device.ts";
import { prefersReducedMotion, prefs } from "./prefs.ts";
import { RoundIntro } from "./RoundIntro.tsx";
import { Result } from "./Result.tsx";
import { toastSvg } from "./toastSvg.tsx";
import styles from "./Game.module.css";

type Renderer = typeof import("@whoscooked/game-renderer");

const ROUNDS = [
  { title: "Pop", instruction: "Tap the moment the toast pops." },
  { title: "Ignore the Noise", instruction: "Tap butter. Ignore crumbs and notifications." },
  { title: "Order Up", instruction: "Watch the order, then repeat it." },
  { title: "Gut Picks", instruction: "Pick fast. There are no wrong answers." },
] as const;

const WARMUP = { title: "Warm-up", instruction: "Tap each time the toast lands." };

type Step = "warmup" | 0 | 1 | 2 | 3;

type Phase =
  | { name: "age" }
  | { name: "underage" }
  | { name: "ready" }
  | { name: "loading" }
  | { name: "intro"; step: Step }
  | { name: "playing"; step: Step }
  | { name: "paused"; step: Step }
  | { name: "result"; score: PlayScore; line: string; seed: string; animate: boolean }
  | { name: "error"; message: string };

const moodFor = (tone: RoundFeedback["tone"]): ToastMood => (tone === "good" ? "happy" : tone === "bad" ? "shocked" : "focused");

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(id);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

export default function Game() {
  const [phase, setPhase] = useState<Phase>(() => (prefs.ageConfirmed() ? { name: "ready" } : { name: "age" }));
  const [soundOn, setSoundOn] = useState(true);
  const [mood, setMood] = useState<ToastMood>("neutral");
  const [caption, setCaption] = useState("");
  const [count, setCount] = useState<number | null>(null);

  const stageHost = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Stage | null>(null);
  const sound = useRef<SoundPlayer | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const resumeRef = useRef<(() => void) | null>(null);
  const calibrationRef = useRef<{ calibration: CalibrationResult; device: DeviceInfo } | null>(null);
  const moodTimer = useRef<number>(0);

  useEffect(() => setSoundOn(prefs.soundOn()), []);

  // Pause the round and offer a restart if the tab loses focus (PRD section 5).
  useEffect(() => {
    const pause = () => abortRef.current?.abort();
    const onVisibility = () => document.visibilityState === "hidden" && pause();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", pause);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", pause);
    };
  }, []);

  useEffect(() => () => stageRef.current?.destroy(), []);

  const onFeedback = useCallback((f: RoundFeedback) => {
    if (f.sound) sound.current?.play(f.sound);
    setCaption(f.caption);
    setMood(moodFor(f.tone));
    window.clearTimeout(moodTimer.current);
    moodTimer.current = window.setTimeout(() => setMood("neutral"), 600);
  }, []);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    prefs.setSound(next);
    sound.current?.setEnabled(next);
  };

  /** Runs one step (intro countdown + round). On abort, waits for Restart and runs it again. */
  async function step<T>(s: Step, body: (signal: AbortSignal) => Promise<T>, renderer: Renderer): Promise<T> {
    for (;;) {
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        setPhase({ name: "intro", step: s });
        setCaption("");
        for (const n of [3, 2, 1]) {
          setCount(n);
          sound.current?.play("tick");
          await sleep(650, ac.signal);
        }
        setCount(null);
        setCaption("");
        setPhase({ name: "playing", step: s });
        track("round_started", { round: s === "warmup" ? 0 : s + 1 });
        const out = await body(ac.signal);
        sound.current?.play("complete");
        return out;
      } catch (err) {
        const aborted = err instanceof renderer.RoundAborted || (err instanceof DOMException && err.name === "AbortError");
        if (!aborted) throw err;
        setCount(null);
        setPhase({ name: "paused", step: s });
        track("game_abandoned", { round: s === "warmup" ? 0 : s + 1 });
        await new Promise<void>((resolve) => (resumeRef.current = resolve));
      } finally {
        abortRef.current = null;
      }
    }
  }

  async function play() {
    const seed = randomSeed();
    setPhase({ name: "loading" });
    try {
      const renderer = await import("@whoscooked/game-renderer");
      await Promise.all([
        document.fonts.load('400 40px "Bagel Fat One"'),
        document.fonts.load('700 18px "Atkinson Hyperlegible"'),
      ]);
      sound.current ??= renderer.createSoundPlayer(soundOn);
      sound.current.setEnabled(soundOn);
      sound.current.unlock();

      setPhase({ name: "intro", step: calibrationRef.current ? 0 : "warmup" });
      await new Promise((r) => requestAnimationFrame(r));
      const host = stageHost.current;
      if (!host) throw new Error("Game stage is missing.");
      stageRef.current?.destroy();
      const stage = await renderer.createStage(host, {
        reducedMotion: prefersReducedMotion(),
        toastSvgs: {
          neutral: toastSvg({ doneness: 25, mood: "neutral" }),
          happy: toastSvg({ doneness: 25, mood: "happy" }),
          shocked: toastSvg({ doneness: 25, mood: "shocked" }),
          panic: toastSvg({ doneness: 25, mood: "panic" }),
          focused: toastSvg({ doneness: 25, mood: "focused" }),
        },
      });
      stageRef.current = stage;
      track("game_started");

      const hooks = (signal: AbortSignal) => ({ signal, onFeedback });
      const rounds = generateRounds(seed);

      if (!calibrationRef.current) {
        const out = await step("warmup", (signal) => renderer.runCalibration(stage, hooks(signal)), renderer);
        calibrationRef.current = {
          calibration: { offsetMs: estimateOffset(out.tapMinusBeatMs) },
          device: detectDevice(out.refreshHz, out.inputType),
        };
        track("calibration_completed", { device_class: calibrationRef.current.device.deviceClass, browser: calibrationRef.current.device.browser });
      }

      const pop = await step(0, (signal) => renderer.runPop(stage, rounds.pop, hooks(signal)), renderer);
      track("round_completed", { round: 1 });
      const noise = await step(1, (signal) => renderer.runNoise(stage, rounds.noise, hooks(signal)), renderer);
      track("round_completed", { round: 2 });
      const order = await step(2, (signal) => renderer.runOrder(stage, seed, hooks(signal)), renderer);
      track("round_completed", { round: 3 });
      const gut = await step(3, (signal) => renderer.runGut(stage, rounds.gut, hooks(signal)), renderer);
      track("round_completed", { round: 4 });

      const raw: RawPlay = { seed, ...calibrationRef.current!, pop, noise, order, gut };
      const score = scorePlay(raw);
      // TODO(M2): submit `raw` to POST /api/v1/plays (queued locally with retry) so the server recomputes and stores it.
      stage.destroy();
      stageRef.current = null;
      setPhase({ name: "result", score, line: soloLineFor(score.level, seed), seed, animate: true });
      track("score_revealed", { cooked_score: score.cooked, level: score.level, scoring_version: score.scoringVersion });
    } catch (err) {
      console.error(err);
      stageRef.current?.destroy();
      stageRef.current = null;
      setPhase({
        name: "error",
        message: "This browser couldn't start the game. Update it, or open the link in Chrome or Safari, then try again.",
      });
    }
  }

  // ------------------------------------------------------------ Screens

  if (phase.name === "age" || phase.name === "underage") {
    return (
      <main className={styles.gate}>
        <ToastMascot doneness={30} mood={phase.name === "underage" ? "shocked" : "neutral"} size={150} title="A slice of toast" />
        {phase.name === "age" ? (
          <>
            <h1 className={styles.gateTitle}>Quick check</h1>
            <p>Who's Cooked? is for people aged 16 and over.</p>
            <div className={styles.actions}>
              <button
                className="button button--primary"
                onClick={() => {
                  prefs.confirmAge();
                  track("age_confirmed");
                  setPhase({ name: "ready" });
                }}
              >
                I'm 16 or older
              </button>
              <button className="button button--quiet" onClick={() => setPhase({ name: "underage" })}>
                I'm under 16
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className={styles.gateTitle}>Not yet</h1>
            <p>This game is for people aged 16 and over. Come back when you're 16.</p>
          </>
        )}
      </main>
    );
  }

  if (phase.name === "ready") {
    return (
      <main className={styles.gate}>
        <ToastMascot doneness={30} mood="smug" lookX={0.3} size={170} title="A slice of toast, looking smug" />
        <h1 className={styles.gateTitle}>Four rounds. About 90 seconds.</h1>
        <p>A quick warm-up, then Pop, Ignore the Noise, Order Up, and Gut Picks. Turn your sound on if you can.</p>
        <div className={styles.actions}>
          <button className="button button--primary" onClick={play}>
            Start game
          </button>
        </div>
      </main>
    );
  }

  if (phase.name === "error") {
    return (
      <main className={styles.gate}>
        <ToastMascot doneness={70} mood="shocked" size={150} title="A surprised slice of toast" />
        <h1 className={styles.gateTitle}>The toaster jammed</h1>
        <p role="alert">{phase.message}</p>
        <div className={styles.actions}>
          <button className="button button--primary" onClick={() => setPhase({ name: "ready" })}>
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (phase.name === "result") {
    return (
      <Result
        score={phase.score}
        line={phase.line}
        animate={phase.animate}
        sound={sound.current}
        onPlayAgain={() => {
          setPhase({ name: "ready" });
          void play();
        }}
      />
    );
  }

  // Loading, intro, playing, paused: the stage stays mounted throughout.
  const s: Step = phase.name === "loading" ? (calibrationRef.current ? 0 : "warmup") : phase.step;
  const meta = s === "warmup" ? WARMUP : ROUNDS[s];
  const heading = s === "warmup" ? "Warm-up" : `Round ${s + 1} of 4`;

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <span className={styles.roundLabel}>{heading}</span>
        <button className={styles.soundToggle} aria-pressed={soundOn} onClick={toggleSound}>
          {soundOn ? "Sound on" : "Sound off"}
        </button>
      </header>

      <div className={styles.stageWrap}>
        <div ref={stageHost} className={styles.stage} />
        {(phase.name === "intro" || phase.name === "loading") && (
          <RoundIntro
            label={heading}
            title={meta.title}
            instruction={meta.instruction}
            count={phase.name === "loading" ? null : count}
            loading={phase.name === "loading"}
          />
        )}
        {phase.name === "paused" && (
          <div className={styles.overlay} role="alertdialog" aria-labelledby="paused-title">
            <ToastMascot doneness={25} mood="shocked" size={110} title={null} />
            <h2 id="paused-title">Paused</h2>
            <p>You left the game, so this round stopped. Restart it when you're ready.</p>
            <button className="button button--primary" onClick={() => resumeRef.current?.()} autoFocus>
              Restart round
            </button>
          </div>
        )}
      </div>

      <footer className={styles.below}>
        <ToastMascot doneness={25} mood={mood} size={64} title={null} />
        <div>
          <p className={styles.instruction}>{meta.instruction}</p>
          <p className={styles.caption} aria-live="polite">
            {caption}
          </p>
        </div>
      </footer>
    </main>
  );
}
