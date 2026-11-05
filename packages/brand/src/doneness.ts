import { mix } from "./color.ts";
import { colors } from "./tokens.ts";

/**
 * Toast browning ramp, derived only from brand tokens (no new colors).
 * Stops line up with the toast levels in PRD section 6.
 */
const stops: ReadonlyArray<readonly [score: number, color: string]> = [
  [0, mix(colors.white, colors.crust, 0.18)], // Raw
  [30, mix(colors.butter, colors.crust, 0.4)], // Golden
  [50, colors.crust], // Crispy
  [70, mix(colors.crust, colors.burnt, 0.55)], // Burnt
  [100, mix(colors.burnt, colors.crust, 0.08)], // Charcoal
];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Crumb (face) color for a doneness from 0 (raw) to 100 (charcoal). */
export function crumbColor(doneness: number): string {
  const d = clamp(Number.isFinite(doneness) ? doneness : 0, 0, 100);
  for (let i = 1; i < stops.length; i++) {
    const [s0, c0] = stops[i - 1]!;
    const [s1, c1] = stops[i]!;
    if (d <= s1) return mix(c0, c1, (d - s0) / (s1 - s0));
  }
  return stops[stops.length - 1]![1];
}

/** Crust ring color: always a step darker than the crumb. */
export function crustColor(doneness: number): string {
  return mix(crumbColor(doneness), colors.burnt, 0.35);
}
