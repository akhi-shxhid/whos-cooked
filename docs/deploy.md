# Deploy and environments

## What exists (set up 2026-11-06)

| Piece | Value |
|---|---|
| Neon project | `whos-cooked` (`still-recipe-70179481`), AWS US East 1, Postgres 18, free plan |
| Neon database | `whoscooked`, owned by `whoscooked_owner` (use for migrations) |
| Neon role for Hyperdrive | `hyperdrive`: SELECT/INSERT/UPDATE/DELETE only, plus default privileges on future tables |
| Neon branches | `main` (production), `dev` (local development) |
| Cloudflare account | `fb5ace7dd8ddd156496753688fbe5688` |
| Hyperdrive config | `whoscooked-db` (`3d8c73a855f74c7bb0e81d9a9088a499`) → Neon `main`, role `hyperdrive`, direct URL |
| API Worker | `whoscooked-api` → https://whoscooked-api.whoscooked-api.workers.dev |
| Web Worker | `whoscooked` → https://whoscooked.whoscooked-api.workers.dev |

Health checks: `/api/v1/health` and `/api/v1/health/db` on the API Worker.

## Local development

`apps/api/.env.local-db` (git-ignored, loaded by `pnpm dev` through Node, not exposed to the Worker) sets `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` to the
Neon `dev` branch. Recreate it with:

```bash
npx neonctl connection-string dev --project-id still-recipe-70179481 --role-name hyperdrive --database-name whoscooked
```

`pnpm dev` runs the API with a **local test payment provider** (`PAYMENTS_PROVIDER=fake`), so you can buy Cooked+
end to end on your machine without real money. The test checkout page lives at `/api/v1/dev/fake-checkout` and only
exists when `ENVIRONMENT=development`.

## Scheduled jobs

`whoscooked-api` runs a daily cron (03:17 UTC) that deletes leaderboard rows older than 30 days, as promised in /privacy.

## Routing

`whoscooked` serves the static site and forwards `/api/*` to `whoscooked-api` over a service binding
(`apps/web/worker/index.ts`). Same origin keeps the purchase cookie first-party inside in-app browsers.

## Deploying by hand

```bash
pnpm --filter @whoscooked/api deploy
pnpm --filter @whoscooked/web deploy
```

## Database migrations

Migrations are generated with `pnpm --filter @whoscooked/db db:generate` and applied to Neon `main` by CI when the
`DATABASE_URL` secret is set (owner role, direct URL). Migrations so far: `0000_commerce` (purchases) and `0001_leaderboard` (handles, daily boards). Both `dev` and `main` are migrated (`main` on 2026-11-10, by hand with the owner role).

## Turning on real payments (owner)

1. **Get Dodo's written approval first.** Their Merchant Acceptance Policy lists games as unsupported (see
   docs/research.md §4). Email compliance@dodopayments.com: "browser game, one-time cosmetic and archive unlock,
   no in-game currency, no loot boxes." If they decline, only `packages/payments` needs a new provider.
2. In the Dodo dashboard (test mode first), create two one-time products: "Cooked+" (USD 3.99, EUR 3.99, GBP 3.49)
   and "Chaos Crew" (USD 1.99, EUR 1.99, GBP 1.79), tax-inclusive for EUR and GBP.
3. Add a webhook endpoint: `https://<your site>/api/v1/webhooks/dodo`, events `payment.succeeded` and `refund.succeeded`.
4. Set the API secrets (each command prompts for the value; never paste them in chat):

   ```bash
   cd apps/api
   npx wrangler secret put COOKIE_SECRET
   npx wrangler secret put DODO_API_KEY
   npx wrangler secret put DODO_WEBHOOK_SECRET
   npx wrangler secret put DODO_PRODUCT_PLUS
   npx wrangler secret put DODO_PRODUCT_CREW
   ```

   `COOKIE_SECRET` is any long random string, for example from `openssl rand -base64 48`.
5. Buy once in test mode, refund it, and check access is removed. Then switch `DODO_MODE` to `live` in
   `apps/api/wrangler.jsonc`, set the live key and webhook secret, and redeploy.

Until step 4 is done, checkout shows: "Checkout isn't open yet. Everything in the game is free to play in the meantime."

## Still to do (owner)

1. GitHub secrets: move `CLOUDFLARE_API_TOKEN` (rolled) to **Repository secrets**, and add `DATABASE_URL`
   (Neon `main`, `whoscooked_owner` role, direct URL) so CI can run migrations.
2. Optional: rename the workers.dev subdomain (currently `whoscooked-api`) in Workers → Settings.
3. When the domain is on Cloudflare, add it as a custom domain on `whoscooked` and update `PUBLIC_BASE_URL`.
4. Neon free plan scales compute to zero, which adds cold-start latency on the first purchase check. Consider a paid plan for launch.
5. Set Neon and Cloudflare spend and usage alerts.
6. Create the support@ and privacy@ mailboxes the Privacy and Terms pages point to, and get both pages legally reviewed.

Rollback: `npx wrangler rollback` in `apps/api` or `apps/web`.
