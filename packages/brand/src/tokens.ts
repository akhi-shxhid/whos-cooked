/**
 * Brand tokens, v2 (docs/decision.md, "Decision 2"): dark, loud, internet-native.
 * Contrast is checked in contrast.test.ts. Record a reason in docs/design-notes.md
 * before adding a color.
 */
export const palette = {
  /** Page background. */
  bg: "#0F0F12",
  /** Raised panels on the background. */
  panel: "#1A1A20",
  panel2: "#24242C",
  /** Light surface: the game stage and sticker cards. Also main text on dark. */
  paper: "#F4EFE6",
  /** Outlines and text on light or bright surfaces. */
  line: "#111114",
  /** Secondary text on dark. */
  muted: "#A9A6B3",
  /** Brand heat: "cooked". */
  heat: "#FF5A1F",
  /** Primary action: "locked in". */
  acid: "#C6FF3D",
  ice: "#6BE4FF",
  /** Mistakes and destructive actions. */
  danger: "#FF3366",
  gold: "#FFD23F",
  bubble: "#FF9EC4",
} as const;

export type PaletteToken = keyof typeof palette;

/**
 * Bread colors for the toast doneness ramp and the classic ToastMascot.
 * Used only for toast art, never for UI.
 */
export const colors = {
  butter: "#FFCF3F",
  burnt: "#2E1A12",
  crust: "#B8662A",
  plate: "#2346FF",
  jam: "#F0383E",
  white: "#FFFFFF",
} as const;

export type ColorToken = keyof typeof colors;

export const fonts = {
  display: '"Bricolage Grotesque", system-ui, sans-serif',
  body: '"Atkinson Hyperlegible", system-ui, sans-serif',
} as const;

/** Approved text/background pairs and the WCAG level each meets (all are full AA text). */
export const approvedPairs = [
  { fg: "paper", bg: "bg", level: "text" },
  { fg: "muted", bg: "bg", level: "text" },
  { fg: "heat", bg: "bg", level: "text" },
  { fg: "acid", bg: "bg", level: "text" },
  { fg: "ice", bg: "bg", level: "text" },
  { fg: "danger", bg: "bg", level: "text" },
  { fg: "paper", bg: "panel", level: "text" },
  { fg: "muted", bg: "panel", level: "text" },
  { fg: "line", bg: "paper", level: "text" },
  { fg: "line", bg: "acid", level: "text" },
  { fg: "line", bg: "heat", level: "text" },
  { fg: "line", bg: "ice", level: "text" },
  { fg: "line", bg: "danger", level: "text" },
  { fg: "line", bg: "gold", level: "text" },
] as const satisfies ReadonlyArray<{ fg: PaletteToken; bg: PaletteToken; level: "text" | "large" }>;
