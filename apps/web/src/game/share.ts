import { dailyNumber, type RushLevel } from "@whoscooked/game-core";

/**
 * Sharing with fallbacks. Android in-app browsers (TikTok, Instagram) often
 * lack navigator.share, so we fall back to the clipboard, then to showing the
 * text for a manual copy (docs/research.md §2).
 */
export type ShareOutcome = "shared" | "copied" | "manual" | "cancelled";

export async function shareText(text: string, url: string): Promise<ShareOutcome> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ text, url });
      return "shared";
    } catch (err) {
      if ((err as Error).name === "AbortError") return "cancelled";
    }
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return "copied";
  } catch {
    return "manual";
  }
}

/** Shares a file (card or clip) if the browser can, otherwise downloads it. */
export async function shareFile(file: File, title: string): Promise<"shared" | "downloaded" | "cancelled"> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return "shared";
    } catch (err) {
      if ((err as Error).name === "AbortError") return "cancelled";
    }
  }
  const href = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = href;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 30_000);
  return "downloaded";
}

/** Duel link: same seed, the sender's score, and their ghost (cleared/missed per microgame). */
export function duelUrl(seed: string, score: number, ghost: string): string {
  const u = new URL("/play/", window.location.origin);
  u.searchParams.set("c", seed);
  u.searchParams.set("t", String(score));
  if (ghost) u.searchParams.set("g", ghost);
  return u.toString();
}

export function dailyUrl(): string {
  return new URL("/play/?mode=daily", window.location.origin).toString();
}

/** Spoiler-free daily result, Wordle-style: no microgame names or order revealed. */
export function dailyShareText(key: string, score: number, level: RushLevel, grid: string): string {
  return `Who's Cooked? Daily #${dailyNumber(key)}\n${score} cleared. ${level}.\n${grid}`;
}

export function duelShareText(score: number, level: RushLevel): string {
  return `I cleared ${score} on Who's Cooked? (${level}). Same rounds, your turn. Bet you're cooked.`;
}
