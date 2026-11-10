import { Character } from "@whoscooked/brand";
import { CHARACTERS, dailyKey, dailyNumber, MODE_ORDER, MODES, titleFor, type ModeKey } from "@whoscooked/game-core";
import type { Board } from "./LeaderboardSheet.tsx";
import { level, ownsSelected, todaysMissions, type Progress } from "./progress.ts";
import type { ShopStep } from "./ShopSheet.tsx";
import styles from "./Hub.module.css";

export interface HubProps {
  progress: Progress;
  onPlay(mode: ModeKey): void;
  onCrew(): void;
  onShop(step: ShopStep): void;
  onBoard(board: Board): void;
}

const MODE_ACCENT: Record<ModeKey, string> = {
  classic: "var(--acid)",
  blitz: "var(--heat)",
  onelife: "var(--danger)",
  daily: "var(--gold)",
  chill: "var(--ice)",
  duel: "var(--bubble)",
};

export function Hub({ progress, onPlay, onCrew, onShop, onBoard }: HubProps) {
  const lv = level(progress);
  const who = ownsSelected(progress);
  const name = CHARACTERS.find((c) => c.key === who)?.name ?? "Toasty";
  const today = dailyKey();
  const ms = todaysMissions(progress, today);
  const playedDaily = Boolean(progress.daily[today]);

  return (
    <main className={styles.page}>
      <section className={styles.profile} aria-label="Your profile">
        <button className={styles.avatar} onClick={onCrew} aria-label={`Change character. Now playing as ${name}`}>
          <Character who={who} mood="smug" size={78} title={null} />
        </button>
        <div className={styles.who}>
          <p className={styles.level}>Level {lv.level}</p>
          <p className={styles.title}>{titleFor(lv.level)}</p>
          <div className={styles.xpBar} role="progressbar" aria-label="XP to next level" aria-valuemin={0} aria-valuemax={lv.needed} aria-valuenow={lv.into}>
            <span style={{ width: `${Math.round((lv.into / lv.needed) * 100)}%` }} />
          </div>
          <p className={styles.xpText}>
            {lv.into} / {lv.needed} XP
          </p>
        </div>
        <div className={styles.streak}>
          <span className={styles.streakNum}>{progress.streak.current}</span>
          <span className={styles.streakLabel}>day streak</span>
          {progress.freezes > 0 && <span className={styles.grace}>{progress.freezes} grace day</span>}
        </div>
      </section>

      <section className={styles.missions} aria-labelledby="missions-title">
        <h2 id="missions-title">Today's missions</h2>
        <ul>
          {ms.missions.map((m) => {
            const done = ms.done.includes(m.id);
            const have = Math.min(m.target, ms.progress[m.id] ?? 0);
            return (
              <li key={m.id} className={done ? styles.missionDone : styles.mission}>
                <span className={styles.missionText}>{m.text}</span>
                <span className={styles.missionMeta}>{done ? `+${m.xp} XP` : `${have}/${m.target}`}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="modes-title">
        <h2 id="modes-title" className={styles.sectionTitle}>
          Pick your poison
        </h2>
        <div className={styles.modes}>
          {MODE_ORDER.filter((m) => m !== "duel").map((m) => {
            const rules = MODES[m];
            const best = progress.bestByMode[m];
            const daily = m === "daily";
            return (
              <button key={m} className={styles.mode} style={{ ["--accent" as string]: MODE_ACCENT[m] }} onClick={() => onPlay(m)}>
                <span className={styles.modeName}>{daily ? `Daily #${dailyNumber(today)}` : rules.name}</span>
                <span className={styles.modePitch}>{rules.pitch}</span>
                <span className={styles.modeBest}>
                  {daily ? (playedDaily ? `Today: ${progress.daily[today]!.score}` : "Not played yet") : best !== undefined ? `Best ${best}` : "New"}
                </span>
              </button>
            );
          })}
        </div>
        <p className={styles.duelHint}>Duel: finish any run, then hit "Duel a friend" to send the same rounds.</p>
      </section>

      <nav className={styles.nav} aria-label="More">
        <button className="button button--secondary" onClick={onCrew}>
          Crew
        </button>
        <button className="button button--secondary" onClick={() => onBoard("daily")}>
          Leaderboards
        </button>
        <button className="button button--secondary" onClick={() => onShop("offer")}>
          Shop
        </button>
      </nav>

      <p className={styles.claim}>A daily focus challenge. Practice gets you better at this game.</p>
      <p className={styles.fine}>
        Who's Cooked? is a game for fun. It isn't a medical, psychological, or relationship test. <a href="/privacy/">Privacy</a> <a href="/terms/">Terms</a>
      </p>
    </main>
  );
}
