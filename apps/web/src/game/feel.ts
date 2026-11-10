/**
 * Haptics: short, event-tied pulses (Android haptics guidance: 10-20 ms taps,
 * stronger for bigger events). navigator.vibrate works on Android Chrome; iOS
 * Safari has no vibration API, so this is a silent no-op there.
 */
const KEY = "wc.haptics";

export function hapticsOn(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== "0";
  } catch {
    return true;
  }
}

export function setHaptics(on: boolean) {
  try {
    window.localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    // Storage blocked: setting lasts for this visit.
  }
}

export function canVibrate(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

export function buzz(kind: "tap" | "good" | "bad" | "over") {
  if (!canVibrate() || !hapticsOn()) return;
  const patterns = { tap: 12, good: 18, bad: [40, 40, 40], over: [60, 60, 120] } as const;
  try {
    navigator.vibrate(patterns[kind] as number | number[]);
  } catch {
    // Some in-app browsers throw instead of ignoring.
  }
}
