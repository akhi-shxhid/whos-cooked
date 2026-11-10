/**
 * Every price in one typed config (PRD section 9). UI components read from
 * here; the server maps product keys to provider product IDs. Prices are
 * launch hypotheses: change them here only, with the owner's approval.
 */
export type Currency = "USD" | "EUR" | "GBP";
export type ProductKey = "plus" | "crew";

export interface Product {
  key: ProductKey;
  name: string;
  kind: "one_time";
  /** Minor units (cents/pence), tax-inclusive for EUR and GBP. */
  prices: Record<Currency, number>;
  /** Entitlement granted on a verified payment. */
  entitlement: ProductKey;
  includes: readonly string[];
}

export const PRODUCTS: Record<ProductKey, Product> = {
  plus: {
    key: "plus",
    name: "Cooked+",
    kind: "one_time",
    prices: { USD: 399, EUR: 399, GBP: 349 },
    entitlement: "plus",
    includes: [
      "Every past Daily in the archive",
      "Rizzler and Main Character",
      "Full stats for every mode",
      "A Cooked+ frame on cards and clips",
      "Supports a solo developer",
    ],
  },
  crew: {
    key: "crew",
    name: "Chaos Crew",
    kind: "one_time",
    prices: { USD: 199, EUR: 199, GBP: 179 },
    entitlement: "crew",
    includes: ["Moai, Glitch, and Microwave", "Yours forever. No random boxes."],
  },
};

export const PRODUCT_KEYS = Object.keys(PRODUCTS) as ProductKey[];

export function isProductKey(v: unknown): v is ProductKey {
  return typeof v === "string" && (PRODUCT_KEYS as string[]).includes(v);
}

/** Free forever. Shown next to the price so nobody thinks the game is paywalled. */
export const FREE_FEATURES: readonly string[] = [
  "All six modes, unlimited runs",
  "The Daily, streaks, and missions",
  "Duels, sharing, and leaderboards",
  "Six characters you unlock by levelling up",
];

/** Display currency guess from the browser. The provider decides the final charge currency. */
export function currencyFor(locale: string, timeZone = ""): Currency {
  if (/^en-GB/i.test(locale) || timeZone === "Europe/London") return "GBP";
  if (timeZone.startsWith("Europe/") || /^en-IE/i.test(locale) || /^(de|fr|es|nl|it|pt|fi|el|sk|sl|et|lv|lt|ga)\b/i.test(locale)) return "EUR";
  return "USD";
}

export function formatPrice(product: Product, currency: Currency, locale = "en"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(product.prices[currency] / 100);
}
