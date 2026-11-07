/**
 * Per-device conveniences in localStorage. Storage can be blocked (private mode,
 * in-app browsers), so every access is guarded and the game works without it.
 */
const KEYS = {
  age: "wc.ageConfirmed",
  sound: "wc.sound",
  seenReveal: "wc.seenReveal",
} as const;

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage blocked: the preference lasts for this visit only.
  }
}

export const prefs = {
  ageConfirmed: () => read(KEYS.age) === "1",
  confirmAge: () => write(KEYS.age, "1"),
  soundOn: () => read(KEYS.sound) !== "0",
  setSound: (on: boolean) => write(KEYS.sound, on ? "1" : "0"),
  seenReveal: () => read(KEYS.seenReveal) === "1",
  markRevealSeen: () => write(KEYS.seenReveal, "1"),
};

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
