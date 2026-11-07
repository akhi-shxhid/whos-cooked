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
| Web Worker | `whoscooked-web` → https://whoscooked-web.whoscooked-api.workers.dev |

Health checks: `/api/v1/health` and `/api/v1/health/db` on the API Worker.

## Local development

`apps/api/.env.local-db` (git-ignored, loaded by `pnpm dev` through Node, not exposed to the Worker) sets `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` to the
Neon `dev` branch. Recreate it with:

```bash
npx neonctl connection-string dev --project-id still-recipe-70179481 --role-name hyperdrive --database-name whoscooked
```

## Deploying by hand

```bash
pnpm --filter @whoscooked/api deploy
pnpm --filter @whoscooked/web deploy
```

## Still to do (owner)

1. In GitHub → repo Settings → Secrets → Actions, add:
   - `CLOUDFLARE_API_TOKEN`: create in Cloudflare → My Profile → API Tokens, template "Edit Cloudflare Workers".
   - `CLOUDFLARE_ACCOUNT_ID`: `fb5ace7dd8ddd156496753688fbe5688`
   - `DATABASE_URL`: Neon `main` branch, `whoscooked_owner` role, direct URL (for Drizzle migrations).
   Then CI deploy jobs can be added.
2. Optional: rename the workers.dev subdomain (currently `whoscooked-api`) in Workers → Settings.
3. When the domain is on Cloudflare, route `<domain>/api/*` to `whoscooked-api` and add the custom domain to `whoscooked-web`.
4. Neon free plan scales compute to zero, which adds cold-start latency. The PRD asks to avoid that during launch; it needs a paid plan.
5. Set Neon and Cloudflare spend and usage alerts.

Rollback: `npx wrangler rollback` in `apps/api` or `apps/web`.
