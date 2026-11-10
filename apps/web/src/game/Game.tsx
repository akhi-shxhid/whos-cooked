import { useCallback, useEffect, useRef, useState } from "react";
import { Character, type CrewMood } from "@whoscooked/brand";
import { dailyNumber, ghostScoreAt, headlineScore, MODES, rushLevel, shareGrid, type RushResult } from "@whoscooked/game-core";
import { track } from "@whoscooked/analytics";
import type { RoundFeedback, RunState, SoundPlayer, Stage } from "@whoscooked/game-renderer";
import { api } from "./api.ts";
import { CrewSheet } from "./CrewSheet.tsx";
import { buzz } from "./feel.ts";
import { GameOver } from "./GameOver.tsx";
import { Hub } from "./Hub.tsx";
import { LeaderboardSheet, type Board } from "./LeaderboardSheet.tsx";
import { prefersReducedMotion, prefs } from "./prefs.ts";
import { grantWeeklyGrace, loadProgress, ownsSelected, recordRun, saveProgress, type Progress, type RunSummary } from "./progress.ts";
import { launchFor, routeFromUrl, urlFor, type Launch } from "./routes.ts";
import { ShopSheet, type ShopStep } from "./ShopSheet.tsx";
import { svgForKey } from "./svgs.tsx";
import styles from "./Game.module.css";

type Renderer = typeof import("@whoscooked/game-renderer");

// Start downloading the renderer and fonts the moment this module loads, in parallel with React mounting.
const rendererReady: Promise<Renderer> = import("@whoscooked/game-renderer");
const fontsReady = Promise.all([
  document.fonts.load('800 48px "Bricolage Grotesque"'),
  document.fonts.load('700 18px "Atkinson Hyperlegible"'),
]).catch(() => []);

type Phase =
  | { name: "hub" }
  | { name: "loading" }
  | { name: "playing" }
  | { name: "paused"; snapshot: RunState | null }
  | { name: "over"; result: RushResult; summary: RunSummary }
  | { name: "error"; message: string };

type Sheet = { kind: "shop"; step: ShopStep } | { kind: "crew" } | { kind: "board"; board: Board; submit?: { score: number; result: RushResult } } | null;

const moodFor = (tone: RoundFeedback["tone"]): CrewMood => (tone === "good" ? "happy" : tone === "bad" ? "shocked" : "neutral");

function chipFor(l: Launch): string {
  if (l.mode === "duel") return l.target === undefined ? "Duel" : `Beat ${l.target}`;
  if (l.mode === "daily") return `${l.archive ? "Archive" : "Daily"} #${dailyNumber(l.day ?? "")}`;
  return MODES[l.mode].name;
}

export default function Game() {
  const [launch, setLaunch] = useState<Launch | null>(null);
  const [phase, setPhase] = useState<Phase>({ name: "loading" });
  const [progress, setProgress] = useState<Progress | null>(null);
  const [hud, setHud] = useState({ score: 0, lost: 0, multiplier: 1, clock: null as number | null, index: 0 });
  const [mood, setMood] = useState<CrewMood>("neutral");
  const [caption, setCaption] = useState("");
  const [soundOn, setSoundOn] = useState(true);
  const [sheet, setSheet] = useState<Sheet>(null);

  const stageHost = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Stage | null>(null);
  const stageWho = useRef<string>("");
  const rendererRef = useRef<Renderer | null>(null);
  const sound = useRef<SoundPlayer | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const snapshotRef = useRef<RunState | null>(null);
  const moodTimer = useRef(0);
  const startedRef = useRef(false);

  const updateProgress = useCallback((next: Progress) => {
    saveProgress(next);
    setProgress(next);
  }, []);

  // Purchases: cached locally, confirmed by the server when reachable.
  const refreshEntitlements = useCallback(async () => {
    const r = await api<{ plus: boolean; crew: boolean }>("/entitlements");
    if (!r.ok) return null;
    const p = loadProgress();
    if (p.plus !== r.data.plus || p.crew !== r.data.crew) updateProgress({ ...p, plus: r.data.plus, crew: r.data.crew });
    return r.data;
  }, [updateProgress]);

  useEffect(() => {
    const pause = () => abortRef.current?.abort();
    const onVisibility = () => document.visibilityState === "hidden" && pause();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", pause);
    const unlock = () => sound.current?.unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", pause);
      window.removeEventListener("pointerdown", unlock);
      stageRef.current?.destroy();
    };
  }, []);

  const onFeedback = useCallback((f: RoundFeedback) => {
    if (f.sound) sound.current?.play(f.sound);
    setCaption(f.caption);
    setMood(moodFor(f.tone));
    window.clearTimeout(moodTimer.current);
    moodTimer.current = window.setTimeout(() => setMood("neutral"), 500);
  }, []);

  const start = useCallback(
    async (l: Launch, resume: RunState | null = null) => {
      setLaunch(l);
      setSheet(null);
      if (!resume) {
        setHud({ score: 0, lost: 0, multiplier: 1, clock: MODES[l.mode].clockMs, index: 0 });
        snapshotRef.current = null;
      }
      setCaption("");
      setPhase(resume ? { name: "playing" } : { name: "loading" });
      try {
        const [renderer] = await Promise.all([rendererReady, fontsReady]);
        rendererRef.current = renderer;
        sound.current ??= renderer.createSoundPlayer(prefs.soundOn());
        const who = ownsSelected(loadProgress());
        // A new character needs fresh textures.
        if (stageRef.current && stageWho.current !== who) {
          stageRef.current.destroy();
          stageRef.current = null;
        }
        // The stage container remounts between screens (hub, game over): wait for it,
        // then re-attach a surviving canvas instead of rebuilding the whole stage.
        await new Promise((r) => requestAnimationFrame(r));
        const host = stageHost.current;
        if (!host) throw new Error("Game stage is missing.");
        if (stageRef.current && stageRef.current.app.canvas.parentElement !== host) {
          host.appendChild(stageRef.current.app.canvas);
          stageRef.current.app.resizeTo = host;
          stageRef.current.app.resize();
        }
        if (!stageRef.current) {
          const tex = renderer.runTextures();
          stageRef.current = await renderer.createStage(host, {
            reducedMotion: prefersReducedMotion(),
            svgFor: svgForKey(who),
            preload: tex.now,
            later: tex.later,
          });
          stageWho.current = who;
        }
        const stage = stageRef.current;
        setPhase({ name: "playing" });
        if (!resume) track("game_started", { variant: l.mode });

        const ac = new AbortController();
        abortRef.current = ac;
        const result = await renderer.runGame(
          stage,
          { seed: l.seed, mode: l.mode },
          {
            signal: ac.signal,
            onFeedback,
            onMicroStart: (_spec, snap) => {
              snapshotRef.current = snap;
            },
            onMicroEnd: (e) => {
              const rules = MODES[l.mode];
              setHud((h) => ({
                ...h,
                score: rules.combo ? e.state.points : e.state.outcomes.filter((o) => o.outcome === "cleared").length,
                lost: e.state.lost,
                multiplier: e.outcome === "cleared" ? Math.min(5, 1 + Math.floor(e.state.streak / 3)) : 1,
                index: e.state.index,
              }));
              buzz(e.outcome === "cleared" ? "good" : rules.lives !== null && e.state.lost >= rules.lives ? "over" : "bad");
            },
            onSpeedUp: () => {
              sound.current?.play("reveal");
              buzz("tap");
              setCaption("Speed up");
            },
            onBoss: () => setCaption("Boss microgame"),
            onClock: (ms) => setHud((h) => ({ ...h, clock: ms })),
          },
          resume ?? undefined,
        );
        abortRef.current = null;

        const grid = shareGrid(result.outcomes);
        const summary = recordRun(loadProgress(), result, grid);
        updateProgress(summary.progress);
        sound.current?.play("reveal");
        setPhase({ name: "over", result, summary });
        const score = headlineScore(result);
        track("score_revealed", { cooked_score: score, level: rushLevel(score, result.mode), variant: l.mode });
        if (summary.dailyCounted) track("daily_completed", { cooked_score: score });
        if (summary.streakExtended) track("streak_extended");
      } catch (err) {
        abortRef.current = null;
        if (rendererRef.current && err instanceof rendererRef.current.RoundAborted) {
          setPhase({ name: "paused", snapshot: snapshotRef.current });
          track("game_abandoned", { variant: l.mode });
          return;
        }
        console.error(err);
        stageRef.current?.destroy();
        stageRef.current = null;
        setPhase({ name: "error", message: "This browser couldn't start the game. Update it, or open the link in Chrome or Safari, then try again." });
      }
    },
    [onFeedback, updateProgress],
  );

  // Instant play: start the moment the page loads unless the URL asks for the hub.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    setSoundOn(prefs.soundOn());
    const p = grantWeeklyGrace(loadProgress());
    updateProgress(p);
    const route = routeFromUrl(window.location.search);
    void refreshEntitlements();
    if (route.kind === "plusReturn") {
      window.history.replaceState(null, "", "/play/?hub=1");
      setPhase({ name: "hub" });
      setSheet({ kind: "shop", step: "confirming" });
      return;
    }
    if (route.kind === "hub") {
      setPhase({ name: "hub" });
      return;
    }
    if (route.kind === "play") {
      if (route.launch.archive && !p.plus) {
        setPhase({ name: "hub" });
        setSheet({ kind: "shop", step: "offer" });
        return;
      }
      if (route.launch.mode === "duel") track("challenge_opened");
      if (route.launch.mode === "daily") track("daily_started");
      void start(route.launch);
    }
  }, [start, refreshEntitlements, updateProgress]);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    prefs.setSound(next);
    sound.current?.setEnabled(next);
    if (next) sound.current?.unlock();
  };

  const go = (l: Launch) => {
    window.history.replaceState(null, "", urlFor(l));
    void start(l);
  };
  const toHub = () => {
    window.history.replaceState(null, "", "/play/?hub=1");
    setPhase({ name: "hub" });
  };

  const sheets = progress && (
    <>
      {sheet?.kind === "shop" && (
        <ShopSheet
          initial={sheet.step}
          progress={progress}
          onClose={() => setSheet(null)}
          onPurchased={refreshEntitlements}
          onPlayArchive={(day) => go({ mode: "daily", seed: `daily-${day}`, day, archive: true })}
        />
      )}
      {sheet?.kind === "crew" && (
        <CrewSheet
          progress={progress}
          onPick={(character) => updateProgress({ ...loadProgress(), character })}
          onClose={() => setSheet(null)}
          onShop={(step) => setSheet({ kind: "shop", step })}
        />
      )}
      {sheet?.kind === "board" && (
        <LeaderboardSheet board={sheet.board} submit={sheet.submit} progress={progress} onProgress={updateProgress} onClose={() => setSheet(null)} />
      )}
    </>
  );

  // ------------------------------------------------------------ Screens

  if (phase.name === "hub" && progress) {
    return (
      <>
        <Hub
          progress={progress}
          onPlay={(mode) => go(launchFor(mode))}
          onCrew={() => setSheet({ kind: "crew" })}
          onShop={(step) => setSheet({ kind: "shop", step })}
          onBoard={(board) => setSheet({ kind: "board", board })}
        />
        {sheets}
      </>
    );
  }

  if (phase.name === "over" && launch && progress) {
    return (
      <>
        <GameOver
          launch={launch}
          result={phase.result}
          summary={phase.summary}
          progress={progress}
          onPlayAgain={() => go(launch.mode === "duel" ? launch : launch.mode === "daily" && !launch.archive ? launchFor("classic") : launchFor(launch.mode))}
          onHub={toHub}
          onDaily={() => go(launchFor("daily"))}
          onCrew={() => setSheet({ kind: "crew" })}
          onShop={(step) => setSheet({ kind: "shop", step })}
          onBoard={(board, submit) => setSheet(submit ? { kind: "board", board, submit } : { kind: "board", board })}
        />
        {sheets}
      </>
    );
  }

  if (phase.name === "error") {
    return (
      <main className={styles.center}>
        <Character who="toasty" mood="shocked" size={140} title="Toasty, shocked" />
        <h1>The toaster jammed</h1>
        <p role="alert">{phase.message}</p>
        <button className="button button--primary" onClick={toHub}>
          Back to menu
        </button>
      </main>
    );
  }

  // Loading, playing, paused: the stage stays mounted throughout.
  const rules = launch ? MODES[launch.mode] : MODES.classic;
  const who = progress ? ownsSelected(progress) : "toasty";
  const livesLeft = rules.lives === null ? null : rules.lives - hud.lost;
  const ghostNow = launch?.ghost ? ghostScoreAt(launch.ghost, hud.index) : null;
  return (
    <main className={styles.shell}>
      <header className={styles.hud}>
        <div className={styles.score} aria-label={`Score ${hud.score}`}>
          <span className={styles.scoreNum}>{hud.score}</span>
          <span className={styles.scoreLabel}>{rules.combo ? "points" : "cleared"}</span>
        </div>
        <div className={styles.middle}>
          <span className={styles.modeChip}>{launch ? chipFor(launch) : "Classic"}</span>
          {rules.combo && hud.multiplier > 1 && <span className={styles.combo}>x{hud.multiplier}</span>}
          {ghostNow !== null && <span className={styles.ghost}>Ghost {ghostNow}</span>}
        </div>
        {hud.clock !== null ? (
          <div className={hud.clock < 10_000 ? styles.clockHot : styles.clock} role="timer" aria-label={`${Math.ceil(hud.clock / 1000)} seconds left`}>
            {Math.ceil(hud.clock / 1000)}s
          </div>
        ) : livesLeft !== null ? (
          <div className={styles.lives} role="img" aria-label={`${livesLeft} of ${rules.lives} lives left`}>
            {Array.from({ length: rules.lives ?? 0 }, (_, i) => (
              <span key={i} className={i < livesLeft ? styles.life : styles.lifeLost}>
                <Character who={who} mood={i < livesLeft ? (i === livesLeft - 1 ? mood : "neutral") : "panic"} size={26} title={null} />
              </span>
            ))}
          </div>
        ) : (
          <div className={styles.chill}>Chill</div>
        )}
        <button className={styles.soundToggle} aria-pressed={soundOn} onClick={toggleSound}>
          {soundOn ? "Sound" : "Muted"}
        </button>
      </header>

      <div className={styles.stageWrap}>
        <div ref={stageHost} className={styles.stage} />
        {phase.name === "loading" && (
          <div className={styles.overlay}>
            <Character who={who} mood="smug" size={110} title={null} />
            <p className={styles.loading}>Heating up</p>
          </div>
        )}
        {phase.name === "paused" && launch && (
          <div className={styles.overlay} role="alertdialog" aria-labelledby="paused-title">
            <Character who={who} mood="shocked" size={100} title={null} />
            <h2 id="paused-title">Paused</h2>
            <p>You left the game, so it stopped. Pick up where you left off.</p>
            <button className="button button--primary" onClick={() => void start(launch, phase.snapshot)} autoFocus>
              Keep going
            </button>
            <button className="button button--quiet" onClick={toHub}>
              Quit to menu
            </button>
          </div>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {caption}
      </p>
    </main>
  );
}
