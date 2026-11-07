import { streamFor } from "./rng.ts";

/** Round rules from PRD section 5. Timing values are in milliseconds. */
export const ROUND_RULES = {
  calibration: {
    beats: 3,
    countIn: 2,
    beatIntervalMs: 600,
    /** Device offset estimate is capped to +/- this many ms. */
    maxOffsetMs: 40,
  },
  pop: {
    trials: 5,
    minDelayMs: 800,
    maxDelayMs: 3000,
    /** Taps before the pop, or within this many ms after it, are false starts. */
    falseStartWindowMs: 100,
    /** A trial with no tap ends after this long. */
    timeoutMs: 1500,
  },
  noise: {
    durationMs: 25_000,
    minGapMs: 520,
    maxGapMs: 860,
    itemLifetimeMs: 1250,
    notificationLifetimeMs: 1600,
  },
  order: {
    startLength: 3,
    maxLength: 9,
    maxFailures: 2,
    timeLimitMs: 40_000,
    showItemMs: 650,
    gapMs: 200,
  },
  gut: {
    picks: 8,
    durationMs: 15_000,
  },
} as const;

// ---------------------------------------------------------------- Pop

export interface PopRound {
  /** Delay before the toast pops, per trial. */
  delaysMs: number[];
}

export function generatePopRound(seed: string): PopRound {
  const rng = streamFor(seed, "pop");
  const { trials, minDelayMs, maxDelayMs } = ROUND_RULES.pop;
  return { delaysMs: Array.from({ length: trials }, () => Math.round(rng.range(minDelayMs, maxDelayMs))) };
}

// ---------------------------------------------------------------- Ignore the Noise

export type NoiseKind = "butter" | "crumb" | "notification";

export interface NoiseEvent {
  id: number;
  kind: NoiseKind;
  atMs: number;
  lifetimeMs: number;
  /** Grid cell for butter and crumbs (columns x rows below). Unused for notifications. */
  cell: number;
  /** Notification text index into FAKE_NOTIFICATIONS. */
  textIndex: number;
}

export const NOISE_GRID = { columns: 3, rows: 4 } as const;

/**
 * Clearly fictional notifications. No real app names, logos, or trade dress
 * (PRD section 5).
 */
export const FAKE_NOTIFICATIONS: readonly { from: string; text: string }[] = [
  { from: "Toaster", text: "Your bread has been waiting 4 minutes." },
  { from: "Crumb Club", text: "Someone reacted to your crumb." },
  { from: "Kettle", text: "Kettle is typing..." },
  { from: "Fridge", text: "The milk wants to talk." },
  { from: "Spatula", text: "New follower: a spatula." },
  { from: "Breadbox", text: "Your loaf is trending." },
  { from: "Jam Jar", text: "Jam Jar sent you a sticky note." },
  { from: "Oven", text: "Reminder: you left something on." },
  { from: "Fork Feed", text: "3 forks liked your plate." },
  { from: "Pantry", text: "Low on snacks. Tap to panic." },
];

export interface NoiseRound {
  events: NoiseEvent[];
  /** Number of butter pats, the denominator for Focus. */
  targets: number;
}

export function generateNoiseRound(seed: string): NoiseRound {
  const rng = streamFor(seed, "noise");
  const { durationMs, minGapMs, maxGapMs, itemLifetimeMs, notificationLifetimeMs } = ROUND_RULES.noise;
  const cells = NOISE_GRID.columns * NOISE_GRID.rows;
  const events: NoiseEvent[] = [];
  const recentCells: number[] = [];
  let at = 900;
  let id = 0;
  let notificationsLeftBeforeNext = rng.int(3, 5);

  while (at < durationMs - itemLifetimeMs) {
    let kind: NoiseKind;
    if (notificationsLeftBeforeNext <= 0) {
      kind = "notification";
      notificationsLeftBeforeNext = rng.int(4, 7);
    } else {
      kind = rng.weighted<NoiseKind>([
        ["butter", 0.68],
        ["crumb", 0.32],
      ]);
      notificationsLeftBeforeNext--;
    }

    let cell = 0;
    if (kind !== "notification") {
      const free = Array.from({ length: cells }, (_, i) => i).filter((c) => !recentCells.includes(c));
      cell = rng.pick(free);
      recentCells.push(cell);
      if (recentCells.length > 3) recentCells.shift();
    }

    events.push({
      id: id++,
      kind,
      atMs: Math.round(at),
      lifetimeMs: kind === "notification" ? notificationLifetimeMs : itemLifetimeMs,
      cell,
      textIndex: kind === "notification" ? rng.int(0, FAKE_NOTIFICATIONS.length - 1) : 0,
    });
    at += rng.range(minGapMs, maxGapMs);
  }

  return { events, targets: events.filter((e) => e.kind === "butter").length };
}

// ---------------------------------------------------------------- Order Up

export const INGREDIENTS = ["butter", "jam", "egg", "cheese", "honey", "mushroom"] as const;
export type Ingredient = (typeof INGREDIENTS)[number];

/** Sequence for one attempt. No ingredient appears twice in a row. */
export function orderSequence(seed: string, attempt: number, length: number): Ingredient[] {
  const rng = streamFor(seed, `order:${attempt}`);
  const out: Ingredient[] = [];
  while (out.length < length) {
    const options = INGREDIENTS.filter((i) => i !== out[out.length - 1]);
    out.push(rng.pick(options));
  }
  return out;
}

// ---------------------------------------------------------------- Gut Picks

export interface GutPick {
  id: string;
  a: string;
  b: string;
}

/**
 * Allowed topics only: food, habits, travel, mornings, phone behavior, silly
 * preferences. Never sex, politics, religion, body image, race, nationality,
 * or health conditions (PRD section 5).
 */
export const GUT_PICK_POOL: readonly GutPick[] = [
  { id: "toast-topping", a: "Butter", b: "Jam" },
  { id: "breakfast", a: "Sweet", b: "Savory" },
  { id: "eggs", a: "Scrambled", b: "Fried" },
  { id: "pizza-pineapple", a: "Pineapple on pizza", b: "Absolutely not" },
  { id: "fries", a: "Crispy fries", b: "Soft fries" },
  { id: "snack-time", a: "Midnight snack", b: "Sunrise snack" },
  { id: "alarm", a: "One alarm", b: "Seven alarms" },
  { id: "snooze", a: "Up at once", b: "Snooze forever" },
  { id: "morning-drink", a: "Tea", b: "Coffee" },
  { id: "shower", a: "Morning shower", b: "Night shower" },
  { id: "bed", a: "Make the bed", b: "Why bother" },
  { id: "trip", a: "Beach", b: "Mountains" },
  { id: "seat", a: "Window seat", b: "Aisle seat" },
  { id: "packing", a: "Pack early", b: "Pack at 2 a.m." },
  { id: "travel-plan", a: "Full plan", b: "Wing it" },
  { id: "battery", a: "Charge at 50%", b: "Live at 1%" },
  { id: "tabs", a: "3 tabs open", b: "300 tabs open" },
  { id: "texts", a: "Reply now", b: "Reply next week" },
  { id: "voice-notes", a: "Voice notes", b: "Text only" },
  { id: "phone-mode", a: "Sound on", b: "Always silent" },
  { id: "socks", a: "Matching socks", b: "Chaos socks" },
  { id: "pet", a: "Cats", b: "Dogs" },
  { id: "season", a: "Summer", b: "Winter" },
  { id: "cereal", a: "Milk first", b: "Cereal first" },
];

export function generateGutPicks(seed: string): GutPick[] {
  return streamFor(seed, "gut").shuffle(GUT_PICK_POOL).slice(0, ROUND_RULES.gut.picks);
}

// ---------------------------------------------------------------- Whole game

export interface GameRounds {
  seed: string;
  pop: PopRound;
  noise: NoiseRound;
  gut: GutPick[];
}

/** Everything that can be generated up front. Order Up sequences are generated per attempt. */
export function generateRounds(seed: string): GameRounds {
  return { seed, pop: generatePopRound(seed), noise: generateNoiseRound(seed), gut: generateGutPicks(seed) };
}
