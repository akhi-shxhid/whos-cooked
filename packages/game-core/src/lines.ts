import { streamFor } from "./rng.ts";
import type { ToastLevel } from "./scoring.ts";

/**
 * Solo result lines, 8 per level (PRD section 7 asks for at least 40).
 * They tease the score, never the person: no jokes about appearance, identity,
 * intelligence as a fixed trait, disability, or mental health.
 *
 * TODO(M1-owner): owner reviews and edits every line before launch.
 * TODO(M6): move to i18n messages once fluent speakers translate them.
 * Duo roles, winner lines, and tie lines arrive with challenges in M2.
 */
export const SOLO_LINES: Record<ToastLevel, readonly string[]> = {
  Raw: [
    "Barely warm. Is the toaster even on?",
    "Still basically bread. Respect.",
    "The toaster didn't get a chance.",
    "Raw, sharp, and slightly annoying about it.",
    "Fresh out of the bag.",
    "The crumbs fear you.",
    "Untoasted and unbothered.",
    "Someone check the toaster is plugged in.",
  ],
  Golden: [
    "Golden. Frame this one.",
    "Perfect toast. Suspiciously perfect.",
    "Crunchy outside, sharp inside.",
    "This is the slice from the ad.",
    "Golden. Don't let it go to your head.",
    "Butter would melt on you nicely.",
    "Lightly toasted, heavily smug.",
    "Peak toast. It's all downhill from here.",
  ],
  Crispy: [
    "Crispy. Holding it together. Mostly.",
    "A little toasty around the edges.",
    "Still edible. Consider this a warning.",
    "Crispy. The smoke alarm is watching.",
    "Some crunch. Some chaos.",
    "Not burnt. Not great. Very toast.",
    "Middle of the dial. Bold choice.",
    "Holding on like the last crumb in the bag.",
  ],
  Burnt: [
    "Still warm. Still bad.",
    "Burnt. Scrape it and pretend.",
    "Someone left you in too long.",
    "The smoke alarm has entered the chat.",
    "Burnt, but in a charming way.",
    "That's not toast. That's a cry for butter.",
    "Crunch level: dangerous.",
    "The bread is filing a complaint.",
  ],
  Charcoal: [
    "Charcoal. Send help. And butter.",
    "Fully cooked. Possibly a fire hazard.",
    "This toast has left the building.",
    "Charcoal. You could draw with this.",
    "The toaster wants a word.",
    "Burnt to a crisp. Rematch immediately.",
    "Smoke detected. Excuses loading.",
    "Extra crispy. All of the crispy.",
  ],
};

/** Same seed and level always give the same line, so a shared result reads the same. */
export function soloLineFor(level: ToastLevel, seed: string): string {
  return streamFor(seed, `line:${level}`).pick(SOLO_LINES[level]);
}
