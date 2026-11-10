import { streamFor } from "./rng.ts";
import type { RushLevel } from "./rush.ts";

/**
 * Game-over lines, 8 per rank. Roast the run, never the person: no jokes about
 * appearance, identity, intelligence as a fixed trait, disability, or mental health.
 * TODO(owner): review and edit every line before launch.
 * TODO(M6): move to i18n messages once fluent speakers translate them.
 */
export const SOLO_LINES: Record<RushLevel, readonly string[]> = {
  "Locked In": [
    "Locked in. Who even are you?",
    "Built different. Statistically.",
    "Zero cooking detected.",
    "Your focus has a skincare routine.",
    "Main character run, confirmed.",
    "The toaster is scared of you.",
    "Certified locked in. Screenshot this.",
    "Not cooked. Not even warm.",
  ],
  Goated: [
    "Goated, with light seasoning.",
    "Lowkey cracked.",
    "Respectfully, that was clean.",
    "Almost locked in. Almost.",
    "Your thumbs ate.",
    "Slight sizzle. Still goated.",
    "That run had aura.",
    "Clean. Suspiciously clean.",
  ],
  Mid: [
    "Mid. Painfully mid.",
    "Not cooked, not locked in. Just vibing.",
    "It's giving okay.",
    "Room temperature performance.",
    "Mid run, main character dreams.",
    "You were there. Technically.",
    "Mid, but make it confident.",
    "A solid eh.",
  ],
  Cooked: [
    "You're cooked, chief.",
    "The group chat will hear about this.",
    "Medium-well. Mostly well.",
    "That was a lot of red flags.",
    "Your thumbs filed a complaint.",
    "Cooked, but redeemable.",
    "Respectfully: what was that.",
    "Run it back. Immediately.",
  ],
  "Fully Cooked": [
    "Fully cooked. Well done. Not a compliment.",
    "Charcoal arc unlocked.",
    "The smoke alarm is your hype man.",
    "That run was a jump scare.",
    "Speedran getting cooked.",
    "Burnt to the timeline.",
    "A moment of silence, please.",
    "Delete this run. We won't tell.",
  ],
};

/** Same seed and rank always give the same line, so a shared result reads the same. */
export function soloLineFor(level: RushLevel, seed: string): string {
  return streamFor(seed, `line:${level}`).pick(SOLO_LINES[level]);
}
