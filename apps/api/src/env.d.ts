// Secrets are set with `wrangler secret put` (production) or `--var` in the dev
// script (local), so they are declared here instead of in generated types.
interface Env {
  COOKIE_SECRET?: string;
  DODO_API_KEY?: string;
  DODO_WEBHOOK_SECRET?: string;
  /** Dodo product ID for Cooked+ (created in the Dodo dashboard). */
  DODO_PRODUCT_PLUS?: string;
  /** Dodo product ID for Chaos Crew. */
  DODO_PRODUCT_CREW?: string;
  /** Local development only. */
  FAKE_WEBHOOK_SECRET?: string;
}
