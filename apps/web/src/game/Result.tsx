import { useEffect, useRef, useState } from "react";
import { animate, motion } from "motion/react";
import { SubScoreBar, ToastMascot, ToasterDial, type ToastMood } from "@whoscooked/brand";
import type { PlayScore } from "@whoscooked/game-core";
import { track } from "@whoscooked/analytics";
import type { SoundPlayer } from "@whoscooked/game-renderer";
import { prefersReducedMotion, prefs } from "./prefs.ts";
import { moodForScore, renderShareCard } from "./shareCard.ts";
import styles from "./Result.module.css";

export interface ResultProps {
  score: PlayScore;
  line: string;
  animate: boolean;
  sound: SoundPlayer | null;
  onPlayAgain(): void;
}

type Beat = "dial" | "launch" | "count" | "landed" | "done";

/** Reveal timeline in ms. Total stays under 4 seconds (PRD section 13). */
const T = { launch: 1300, land: 2550, line: 2850, done: 3300 } as const;

export function Result({ score, line, animate: shouldAnimate, sound, onPlayAgain }: ResultProps) {
  const reduced = prefersReducedMotion();
  const instant = !shouldAnimate || reduced;
  const [beat, setBeat] = useState<Beat>(instant ? "done" : "dial");
  const [shown, setShown] = useState(instant ? score.cooked : 0);
  const [dial, setDial] = useState(instant ? score.cooked : 0);
  const [canSkip] = useState(() => prefs.seenReveal());
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const timers = useRef<number[]>([]);
  const finalMood: ToastMood = moodForScore(score.cooked);

  const finish = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setShown(score.cooked);
    setDial(score.cooked);
    setBeat("done");
    prefs.markRevealSeen();
  };

  useEffect(() => {
    if (instant) {
      prefs.markRevealSeen();
      return;
    }
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    const dialAnim = animate(0, score.cooked, { duration: T.launch / 1000, ease: "easeInOut", onUpdate: (v) => setDial(v) });
    for (let t = 0; t < T.launch; t += 130) at(t, () => sound?.play("tick"));
    at(T.launch, () => {
      setBeat("launch");
      sound?.play("pop");
    });
    let countAnim: { stop(): void } | undefined;
    at(T.launch + 150, () => {
      setBeat("count");
      countAnim = animate(0, score.cooked, { duration: (T.land - T.launch - 150) / 1000, ease: "easeOut", onUpdate: (v) => setShown(Math.round(v)) });
    });
    at(T.land, () => {
      setBeat("landed");
      setShown(score.cooked);
      sound?.play("reveal");
    });
    at(T.done, finish);
    return () => {
      dialAnim.stop();
      countAnim?.stop();
      timers.current.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lineVisible = beat === "done" || (beat === "landed" && !instant);
  const toastY = beat === "launch" || beat === "count" ? -150 : 0;
  const mood: ToastMood = beat === "dial" ? "focused" : beat === "launch" || beat === "count" ? "shocked" : finalMood;

  async function challenge() {
    // TODO(M2): replace with a real challenge link that replays the same seed.
    const text = `I got ${score.cooked} (${score.level}) on Who's Cooked? Your turn.`;
    const url = window.location.origin;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Who's Cooked?", text, url });
        track("challenge_shared", { share_method: "native", cooked_score: score.cooked });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setStatus("Link copied. Paste it to someone.");
      track("challenge_shared", { share_method: "copy", cooked_score: score.cooked });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setStatus(`Couldn't open sharing. Send this link instead: ${url}`);
    }
  }

  async function save() {
    setBusy(true);
    setStatus("");
    try {
      const blob = await renderShareCard(score, line);
      const file = new File([blob], `whos-cooked-${score.cooked}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "Who's Cooked?" });
          track("result_saved", { share_method: "native" });
          return;
        } catch (err) {
          if ((err as Error).name === "AbortError") return;
        }
      }
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(href), 10_000);
      setStatus("Result card saved.");
      track("result_saved", { share_method: "download" });
    } catch {
      setStatus("The card couldn't be saved. Try again, or take a screenshot.");
    } finally {
      setBusy(false);
    }
  }

  const rounds = [
    { label: "Reaction", value: score.subScores.reaction },
    { label: "Focus", value: score.subScores.focus },
    { label: "Memory", value: score.subScores.memory },
    { label: "Impulse", value: score.subScores.impulse },
  ];

  return (
    <main className={styles.page}>
      <section className={styles.reveal} aria-labelledby="score-heading">
        <h1 id="score-heading" className="sr-only">
          Your Cooked Score is {score.cooked}, {score.level}.
        </h1>

        <div className={styles.toasterScene} aria-hidden="true">
          <motion.div
            className={styles.toast}
            initial={false}
            animate={{
              y: toastY,
              scaleY: beat === "launch" ? 1.12 : beat === "landed" ? 0.9 : 1,
              scaleX: beat === "launch" ? 0.92 : beat === "landed" ? 1.08 : 1,
            }}
            transition={instant ? { duration: 0 } : { type: "spring", stiffness: 420, damping: beat === "landed" ? 14 : 22 }}
          >
            <ToastMascot doneness={beat === "dial" ? 15 : shown} mood={mood} size={190} title={null} />
          </motion.div>
          <div className={styles.toaster}>
            <ToasterDial value={dial} size={78} title={null} className={styles.dial} />
          </div>
        </div>

        <p className={styles.score} aria-hidden="true">
          {shown}
        </p>
        <p className={styles.level} aria-hidden="true" style={{ visibility: beat === "done" || beat === "landed" ? "visible" : "hidden" }}>
          {score.level}
        </p>
        <motion.p
          className={styles.line}
          initial={false}
          animate={{ opacity: lineVisible ? 1 : 0 }}
          transition={{ duration: instant ? 0 : 0.18 }}
        >
          "{line}"
        </motion.p>

        {beat !== "done" && canSkip && (
          <button className={`button button--quiet ${styles.skip}`} onClick={finish}>
            Skip
          </button>
        )}

        {beat === "done" && (
          <div className={styles.actions}>
            <button className="button button--primary" onClick={challenge}>
              Challenge someone
            </button>
            <div className={styles.secondary}>
              <button className="button button--secondary" onClick={save} disabled={busy}>
                {busy ? "Saving" : "Save result"}
              </button>
              <button className="button button--secondary" onClick={onPlayAgain}>
                Play again
              </button>
            </div>
            <p className={styles.status} role="status">
              {status}
            </p>
          </div>
        )}
      </section>

      {beat === "done" && (
        <section className={styles.breakdown} aria-labelledby="rounds-heading">
          <h2 id="rounds-heading">Your rounds</h2>
          <p className={styles.note}>Higher is sharper. Lower Cooked Score wins.</p>
          {rounds.map((r) => (
            <SubScoreBar key={r.label} label={r.label} value={r.value} />
          ))}
          <p className={styles.note}>
            {score.medianReactionMs === null ? "No clean reaction taps this time." : `Typical reaction: ${score.medianReactionMs} ms.`}
            {score.falseStarts > 0 ? ` False starts: ${score.falseStarts}.` : ""}
          </p>
          <p className={styles.disclaimer}>
            Who's Cooked? is a game for fun. It isn't a medical, psychological, or relationship test.
          </p>
        </section>
      )}
    </main>
  );
}
