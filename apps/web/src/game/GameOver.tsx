import { useEffect, useMemo, useState } from "react";
import { Character, type CrewMood } from "@whoscooked/brand";
import { clearedCount, dailyKey, encodeGhost, headlineScore, levelFromXp, MODES, rushLevel, soloLineFor, type RushLevel, type RushResult } from "@whoscooked/game-core";
import { currencyFor, formatPrice, PRODUCTS } from "@whoscooked/payments";
import { track } from "@whoscooked/analytics";
import { canRecordClip, renderClip } from "./clip.ts";
import { buzz, canVibrate, hapticsOn, setHaptics } from "./feel.ts";
import type { Board } from "./LeaderboardSheet.tsx";
import { ownsSelected, type Progress, type RunSummary } from "./progress.ts";
import type { Launch } from "./routes.ts";
import { renderShareCard } from "./shareCard.ts";
import { dailyShareText, duelShareText, duelUrl, dailyUrl, shareFile, shareText } from "./share.ts";
import type { ShopStep } from "./ShopSheet.tsx";
import styles from "./GameOver.module.css";

export interface GameOverProps {
  launch: Launch;
  result: RushResult;
  summary: RunSummary;
  progress: Progress;
  onPlayAgain(): void;
  onHub(): void;
  onDaily(): void;
  onCrew(): void;
  onShop(step: ShopStep): void;
  onBoard(board: Board, submit?: { score: number; result: RushResult }): void;
}

export const RANK_MOOD: Record<RushLevel, CrewMood> = {
  "Locked In": "smug",
  Goated: "happy",
  Mid: "neutral",
  Cooked: "shocked",
  "Fully Cooked": "panic",
};

export function GameOver({ launch, result, summary, progress, onPlayAgain, onHub, onDaily, onCrew, onShop, onBoard }: GameOverProps) {
  const rules = MODES[result.mode];
  const score = headlineScore(result);
  const level = rushLevel(score, result.mode);
  const line = soloLineFor(level, `${result.seed}:${score}`);
  const who = ownsSelected(progress);
  const today = dailyKey();
  const [status, setStatus] = useState("");
  const [manual, setManual] = useState<string | null>(null);
  const [busy, setBusy] = useState<"card" | "clip" | null>(null);
  const [haptics, setHapticsState] = useState(true);
  const [clipOk, setClipOk] = useState(false);
  const currency = useMemo(() => currencyFor(navigator.language, Intl.DateTimeFormat().resolvedOptions().timeZone), []);
  const lv = levelFromXp(summary.progress.xp);
  const ranked = launch.mode === "daily" ? (summary.dailyCounted ? "daily" : null) : launch.mode === "blitz" ? "blitz" : launch.mode === "onelife" ? "onelife" : null;

  useEffect(() => {
    setHapticsState(hapticsOn());
    setClipOk(canRecordClip());
    if (summary.levelAfter > summary.levelBefore) buzz("good");
  }, [summary.levelAfter, summary.levelBefore]);

  let duelLine: string | null = null;
  if (launch.mode === "duel" && launch.target !== undefined) {
    const gap = launch.target - clearedCount(result);
    duelLine = gap < 0 ? `You beat ${launch.target}. They're cooked.` : gap === 0 ? `Tied at ${launch.target}.` : `${gap} short of ${launch.target}.`;
  }
  const bestLine = summary.newBest ? "New best" : summary.previousBest !== null ? `Best ${summary.previousBest}` : null;
  const breakPrompt = summary.progress.sessionRuns > 0 && summary.progress.sessionRuns % 10 === 0;

  async function share(kind: "duel" | "result") {
    setManual(null);
    const isDailyShare = kind === "result" && launch.mode === "daily" && summary.progress.daily[today];
    const text = isDailyShare ? dailyShareText(today, score, level, summary.progress.daily[today]!.grid) : duelShareText(clearedCount(result), level);
    const url = isDailyShare ? dailyUrl() : duelUrl(result.seed, clearedCount(result), encodeGhost(result.outcomes));
    const out = await shareText(text, url);
    if (out === "copied") setStatus("Copied. Paste it in the group chat.");
    if (out === "manual") {
      setStatus("Copy this and send it:");
      setManual(`${text}\n${url}`);
    }
    if (out !== "cancelled") track(kind === "duel" ? "challenge_created" : "challenge_shared", { share_method: out === "shared" ? "native" : "copy", cooked_score: score });
  }

  async function saveCard() {
    setBusy("card");
    setStatus("");
    try {
      const blob = await renderShareCard({ score, level, line, outcomes: result.outcomes, mode: result.mode, who, plus: progress.plus, scoreLabel: rules.combo ? "points" : "cleared" });
      const out = await shareFile(new File([blob], `whos-cooked-${score}.png`, { type: "image/png" }), "Who's Cooked?");
      if (out === "downloaded") setStatus("Card saved. Post it to your story.");
      if (out !== "cancelled") track("result_saved", { share_method: out === "shared" ? "native" : "download" });
    } catch {
      setStatus("The card couldn't be made. Take a screenshot instead.");
    } finally {
      setBusy(null);
    }
  }

  async function saveClip() {
    setBusy("clip");
    setStatus("Making your clip. About 8 seconds.");
    try {
      const file = await renderClip({ score, level, line, outcomes: result.outcomes, who, plus: progress.plus, scoreLabel: rules.combo ? "points" : "cleared" });
      const out = await shareFile(file, "Who's Cooked?");
      setStatus(out === "downloaded" ? "Clip saved. Post it to TikTok or Reels." : "");
      if (out !== "cancelled") track("result_saved", { share_method: out === "shared" ? "native" : "download", variant: "clip" });
    } catch {
      setStatus("This browser can't make clips. Save the card instead.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="score-heading">
        <h1 id="score-heading" className="sr-only">
          {score} {rules.combo ? "points" : "cleared"}. Rank: {level}.
        </h1>
        <div className={styles.top}>
          <span className={styles.modeTag}>{launch.mode === "daily" ? (launch.archive ? "Archive" : "Daily") : MODES[launch.mode].name}</span>
          {bestLine && <span className={summary.newBest ? styles.hot : styles.tag}>{bestLine}</span>}
        </div>
        <div className={styles.toast} aria-hidden="true">
          <Character who={who} mood={RANK_MOOD[level]} size={132} title={null} />
          <p className={styles.bubble}>"{line}"</p>
        </div>
        <p className={styles.score} aria-hidden="true">
          {score}
        </p>
        <p className={styles.scoreLabel} aria-hidden="true">
          {rules.combo ? "points" : "cleared"}
        </p>
        <p className={styles.level}>{level}</p>

        <ul className={styles.badges}>
          {duelLine && <li className={styles.hot}>{duelLine}</li>}
          {summary.dailyCounted && <li>Daily counted</li>}
          {launch.mode === "daily" && !launch.archive && !summary.dailyCounted && <li>Practice run (today's Daily already counted)</li>}
          {summary.progress.streak.current > 0 && <li>Streak {summary.progress.streak.current}</li>}
        </ul>

        <div className={styles.actions}>
          <button className="button button--primary" onClick={onPlayAgain} autoFocus>
            {launch.mode === "duel" ? "Rematch" : launch.mode === "daily" && !launch.archive ? "Play Classic" : "Play again"}
          </button>
          <div className={styles.row}>
            <button className="button button--secondary" onClick={() => share("duel")}>
              Duel a friend
            </button>
            <button className="button button--secondary" onClick={() => share("result")}>
              Share
            </button>
          </div>
          <div className={styles.row}>
            <button className="button button--secondary" onClick={saveCard} disabled={busy !== null}>
              {busy === "card" ? "Making card" : "Save card"}
            </button>
            {clipOk ? (
              <button className="button button--secondary" onClick={saveClip} disabled={busy !== null}>
                {busy === "clip" ? "Making clip" : "Save clip"}
              </button>
            ) : (
              <button className="button button--secondary" onClick={onHub}>
                Change mode
              </button>
            )}
          </div>
          {ranked && (
            <button className="button button--secondary" onClick={() => onBoard(ranked, { score, result })}>
              Post to leaderboard
            </button>
          )}
          <p className={styles.status} role="status">
            {status}
          </p>
          {manual && <textarea className={styles.manual} readOnly value={manual} rows={4} onFocus={(e) => e.currentTarget.select()} />}
        </div>
      </section>

      {breakPrompt && (
        <p className={styles.breakPrompt} role="note">
          That's {summary.progress.sessionRuns} runs. Stretch, drink some water, then run it back.
        </p>
      )}

      <section className={styles.xp} aria-labelledby="xp-title">
        <h2 id="xp-title">+{summary.xp.total + summary.missionXp} XP</h2>
        <ul>
          {summary.xp.lines.map((l) => (
            <li key={l.label}>
              <span>{l.label}</span>
              <span>+{l.xp}</span>
            </li>
          ))}
          {summary.missionsCompleted.map((m) => (
            <li key={m.id} className={styles.missionLine}>
              <span>Mission: {m.text}</span>
              <span>+{m.xp}</span>
            </li>
          ))}
        </ul>
        <div className={styles.levelRow}>
          <span className={styles.lvl}>Lv {lv.level}</span>
          <div className={styles.xpBar} role="progressbar" aria-label="XP to next level" aria-valuemin={0} aria-valuemax={lv.needed} aria-valuenow={lv.into}>
            <span style={{ width: `${Math.round((lv.into / lv.needed) * 100)}%` }} />
          </div>
        </div>
        {summary.levelAfter > summary.levelBefore && (
          <div className={styles.levelUp}>
            <p className={styles.levelUpTitle}>Level {summary.levelAfter}!</p>
            {summary.unlocks.length > 0 && <p>{summary.unlocks.join(". ")}.</p>}
            {summary.unlocks.some((u) => u.endsWith("unlocked")) && (
              <button className="button button--quiet" onClick={onCrew}>
                See your crew
              </button>
            )}
          </div>
        )}
      </section>

      <section className={styles.more} aria-label="More">
        {launch.mode !== "daily" && !summary.progress.daily[today] && (
          <button className={styles.panel} onClick={onDaily}>
            <span className={styles.panelTitle}>Today's Daily</span>
            <span>Same run for everyone. First try counts.</span>
          </button>
        )}
        {!progress.plus && (
          <div className={styles.offer}>
            <p className={styles.offerTitle}>
              {PRODUCTS.plus.name} <span>{formatPrice(PRODUCTS.plus, currency, navigator.language)} once</span>
            </p>
            <p>Daily archive, two Plus characters, full stats, a Plus frame on your cards. Doesn't change your score.</p>
            <button className="button button--primary" onClick={() => onShop("offer")}>
              See the shop
            </button>
          </div>
        )}
        <button className={styles.panel} onClick={onHub}>
          <span className={styles.panelTitle}>Change mode</span>
          <span>Classic, Blitz, One Life, Daily, Chill.</span>
        </button>
        {canVibrate() && (
          <label className={styles.setting}>
            <input
              type="checkbox"
              checked={haptics}
              onChange={(e) => {
                setHaptics(e.currentTarget.checked);
                setHapticsState(e.currentTarget.checked);
              }}
            />
            Vibration
          </label>
        )}
        <p className={styles.fine}>
          A daily focus challenge. Practice gets you better at this game. Who's Cooked? is a game for fun. It isn't a medical, psychological, or relationship test.{" "}
          <a href="/privacy/">Privacy</a> <a href="/terms/">Terms</a>
        </p>
      </section>
    </main>
  );
}
