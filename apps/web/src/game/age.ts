/**
 * Neutral age screen (COPPA FAQ D.4): birth year, nothing pre-selected, asked
 * only before buying or posting to a leaderboard. Only the age group is kept,
 * on this device.
 */
export type AgeBand = "under13" | "13to17" | "adult";

const AGE_KEY = "wc.ageBand";

export function storedBand(): AgeBand | null {
  try {
    const v = window.localStorage.getItem(AGE_KEY);
    return v === "under13" || v === "13to17" || v === "adult" ? v : null;
  } catch {
    return null;
  }
}

export function storeBand(b: AgeBand) {
  try {
    window.localStorage.setItem(AGE_KEY, b);
  } catch {
    // Storage blocked: we'll ask again next time.
  }
}

/** Conservative: assume the birthday hasn't happened yet this year. */
export function bandForYear(year: number, now = new Date()): AgeBand {
  const age = now.getUTCFullYear() - year - 1;
  return age < 13 ? "under13" : age < 18 ? "13to17" : "adult";
}
