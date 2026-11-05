/**
 * Brand color tokens (PRD section 11). Do not add colors without a reason
 * recorded in docs/design-notes.md.
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
  display: '"Bagel Fat One", system-ui, sans-serif',
  body: '"Atkinson Hyperlegible", system-ui, sans-serif',
} as const;

/** Mobile type scale in px (PRD section 11). */
export const typeScale = {
  score: { min: 96, max: 128 },
  pageHeading: { min: 40, max: 56 },
  sectionHeading: { min: 28, max: 32 },
  body: { min: 17, max: 18 },
  small: { min: 14, max: 14 },
} as const;

/**
 * Approved foreground/background pairs and the WCAG level each one meets.
 * `text` = 4.5:1 (any text), `large` = 3:1 (large text and UI shapes only).
 * Verified in contrast.test.ts.
 */
export const approvedPairs = [
  { fg: "burnt", bg: "butter", level: "text" },
  { fg: "burnt", bg: "white", level: "text" },
  { fg: "white", bg: "plate", level: "text" },
  { fg: "white", bg: "burnt", level: "text" },
  { fg: "plate", bg: "butter", level: "large" },
  { fg: "burnt", bg: "jam", level: "large" },
  { fg: "jam", bg: "burnt", level: "large" },
  { fg: "white", bg: "jam", level: "large" },
  { fg: "burnt", bg: "crust", level: "large" },
  { fg: "white", bg: "crust", level: "large" },
] as const satisfies ReadonlyArray<{
  fg: ColorToken;
  bg: ColorToken;
  level: "text" | "large";
}>;
