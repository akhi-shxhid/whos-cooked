/**
 * Shared game content. Notifications are clearly fictional: no real app
 * names, logos, or trade dress (PRD section 5).
 */
export const FAKE_NOTIFICATIONS: readonly { from: string; text: string }[] = [
  { from: "Group chat", text: "17 new messages. You're the topic." },
  { from: "Your ex", text: "hey" },
  { from: "Mom", text: "Call me. Not urgent. Very urgent." },
  { from: "FitTrack", text: "You walked 212 steps today. Wow." },
  { from: "Pic Drop", text: "Someone viewed your story 9 times." },
  { from: "Bank", text: "Your balance is giving broke." },
  { from: "Delivery", text: "Your order is 1 min away (it isn't)." },
  { from: "Study App", text: "You missed your 6th lesson. We're sad." },
  { from: "Unknown", text: "You've won a free cruise!!" },
  { from: "Bestie", text: "omg you will NOT believe this" },
];

/** Symbols for ORDER! and COUNT!. Labels always shown, so the glyph is never the only cue. */
export const SYMBOLS = [
  { key: "skull", glyph: "💀", label: "Skull" },
  { key: "fire", glyph: "🔥", label: "Fire" },
  { key: "cap", glyph: "🧢", label: "Cap" },
  { key: "moai", glyph: "🗿", label: "Moai" },
  { key: "nails", glyph: "💅", label: "Nails" },
  { key: "eyes", glyph: "👀", label: "Eyes" },
] as const;
export type SymbolKey = (typeof SYMBOLS)[number]["key"];

export function symbol(key: SymbolKey) {
  return SYMBOLS.find((s) => s.key === key)!;
}
