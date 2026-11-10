import { useEffect, useRef } from "react";
import { Character, type CrewKey } from "@whoscooked/brand";
import { CHARACTERS, ownsCharacter } from "@whoscooked/game-core";
import { level, owned, ownsSelected, type Progress } from "./progress.ts";
import type { ShopStep } from "./ShopSheet.tsx";
import styles from "./Sheet.module.css";

export interface CrewSheetProps {
  progress: Progress;
  onPick(who: CrewKey): void;
  onClose(): void;
  onShop(step: ShopStep): void;
}

/** The Cooked Crew roster. Unlock by levelling up or buy a pack outright. No random boxes. */
export function CrewSheet({ progress, onPick, onClose, onShop }: CrewSheetProps) {
  const dialog = useRef<HTMLDivElement>(null);
  const o = owned(progress);
  const selected = ownsSelected(progress);
  useEffect(() => {
    dialog.current?.querySelector<HTMLElement>("h2")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={styles.backdrop} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={dialog} className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="crew-title">
        <button className={styles.close} onClick={onClose} aria-label="Close">
          Close
        </button>
        <h2 id="crew-title" tabIndex={-1}>
          The Crew
        </h2>
        <p className={styles.small}>Level {level(progress).level}. Your pick pops out of the toaster and shows on your cards.</p>
        <div className={styles.crew}>
          {CHARACTERS.map((c) => {
            const open = ownsCharacter(c, o);
            const isSel = selected === c.key;
            const how = "level" in c.unlock ? `Level ${c.unlock.level}` : c.unlock.pack === "plus" ? "Cooked+" : "Chaos Crew";
            return (
              <button
                key={c.key}
                className={isSel ? styles.slotSelected : open ? styles.slot : styles.slotLocked}
                aria-pressed={isSel}
                aria-label={`${c.name}. ${open ? (isSel ? "Selected" : "Tap to play as") : `Locked: ${how}`}`}
                onClick={() => (open ? onPick(c.key as CrewKey) : "pack" in c.unlock ? onShop("offer") : undefined)}
              >
                <Character who={c.key as CrewKey} mood={open ? "happy" : "neutral"} size={62} title={null} />
                <span className={styles.slotName}>{c.name}</span>
                <span className={styles.slotNote}>{open ? (isSel ? "Playing" : c.line) : how}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
