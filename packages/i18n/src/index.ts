// Locale tools. Messages compile from messages/*.json into src/paraglide
// (generated, git-ignored). Run `pnpm --filter @whoscooked/i18n build`.
// TODO(M6): locale strategy for Astro routes, plus German, French, and Spanish copy
// written and approved by fluent speakers.
export { m } from "./paraglide/messages.js";
export { baseLocale, locales, getLocale, setLocale } from "./paraglide/runtime.js";
