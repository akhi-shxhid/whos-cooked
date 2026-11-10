import { useCallback, useEffect, useRef, useState } from "react";
import { Character, type CrewKey } from "@whoscooked/brand";
import { dailyKey, encodeGhost, type RushResult } from "@whoscooked/game-core";
import { track } from "@whoscooked/analytics";
import { bandForYear, storeBand, storedBand } from "./age.ts";
import { api } from "./api.ts";
import { ownsSelected, type Progress } from "./progress.ts";
import styles from "./Sheet.module.css";

export type Board = "daily" | "blitz" | "onelife";
const BOARD_NAMES: Record<Board, string> = { daily: "Daily", blitz: "Blitz", onelife: "One Life" };

interface Entry {
  rank: number;
  handle: string;
  score: number;
  character: string;
  you?: boolean;
}

export interface LeaderboardSheetProps {
  board: Board;
  progress: Progress;
  /** A finished run that can be posted. */
  submit?: { score: number; result: RushResult } | undefined;
  onProgress(p: Progress): void;
  onClose(): void;
}

/**
 * Today's leaderboards. Players appear under auto-generated handles only, so
 * there is no free text to moderate. Posting needs a one-time 13+ age check.
 */
export function LeaderboardSheet({ board: initial, progress, submit, onProgress, onClose }: LeaderboardSheetProps) {
  const [board, setBoard] = useState<Board>(initial);
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"list" | "age" | "under13">("list");
  const [year, setYear] = useState("");
  const [posted, setPosted] = useState(false);
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const day = dailyKey();
  const thisYear = new Date().getUTCFullYear();

  const load = useCallback(async (b: Board) => {
    setEntries(null);
    setError("");
    const r = await api<{ entries: Entry[] }>(`/leaderboard?board=${b}&day=${day}`);
    if (r.ok) setEntries(r.data.entries);
    else setError(r.error.message);
  }, [day]);

  useEffect(() => {
    void load(board);
  }, [board, load]);

  useEffect(() => {
    dialog.current?.querySelector<HTMLElement>("h2")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function post() {
    if (!submit) return;
    const band = storedBand();
    if (!band) return setStep("age");
    if (band === "under13") return setStep("under13");
    setBusy(true);
    const r = await api<{ handle: string; rank: number }>("/scores", {
      method: "POST",
      body: JSON.stringify({ board: initial, day, score: submit.score, ghost: encodeGhost(submit.result.outcomes), seed: submit.result.seed, character: ownsSelected(progress), ageBand: band }),
    });
    setBusy(false);
    if (!r.ok) return setError(r.error.message);
    onProgress({ ...progress, handle: r.data.handle });
    setPosted(true);
    track("leaderboard_posted", { variant: initial });
    setBoard(initial);
    void load(initial);
  }

  function submitAge() {
    const y = Number(year);
    if (!Number.isInteger(y)) return;
    const band = bandForYear(y);
    storeBand(band);
    if (band === "under13") setStep("under13");
    else {
      setStep("list");
      void post();
    }
  }

  return (
    <div className={styles.backdrop} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={dialog} className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="board-title">
        <button className={styles.close} onClick={onClose} aria-label="Close">
          Close
        </button>
        <h2 id="board-title" tabIndex={-1}>
          Today's best
        </h2>

        {step === "age" && (
          <>
            <p>Before you post: what year were you born? Only your age group is kept, on this device.</p>
            <label className={styles.field}>
              <span>Birth year</span>
              <select value={year} onChange={(e) => setYear(e.currentTarget.value)}>
                <option value="">Select year</option>
                {Array.from({ length: 100 }, (_, i) => thisYear - i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <button className="button button--primary" onClick={submitAge} disabled={!year}>
              Continue
            </button>
          </>
        )}

        {step === "under13" && (
          <>
            <p>Leaderboards are for players 13 and up. Your scores are still saved on this device, and duels work the same.</p>
            <button className="button button--primary" onClick={onClose}>
              Back to the game
            </button>
          </>
        )}

        {step === "list" && (
          <>
            <div className={styles.tabs} role="tablist">
              {(Object.keys(BOARD_NAMES) as Board[]).map((b) => (
                <button key={b} role="tab" aria-selected={board === b} className={board === b ? styles.tabOn : styles.tab} onClick={() => setBoard(b)}>
                  {BOARD_NAMES[b]}
                </button>
              ))}
            </div>
            {submit && !posted && (
              <button className="button button--primary" onClick={post} disabled={busy}>
                {busy ? "Posting" : `Post my ${submit.score} to ${BOARD_NAMES[initial]}`}
              </button>
            )}
            {progress.handle && <p className={styles.small}>You show up as {progress.handle}.</p>}
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
            {!entries && !error && <p className={styles.small}>Loading the board.</p>}
            {entries && entries.length === 0 && <p>No scores yet today. First one gets the crown.</p>}
            {entries && entries.length > 0 && (
              <ol className={styles.board}>
                {entries.map((e) => (
                  <li key={`${e.rank}-${e.handle}`} className={e.you ? styles.rowYou : styles.row}>
                    <span className={styles.rank}>{e.rank}</span>
                    <Character who={e.character as CrewKey} size={28} title={null} />
                    <span className={styles.handle}>{e.handle}</span>
                    <span className={styles.points}>{e.score}</span>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </div>
    </div>
  );
}
