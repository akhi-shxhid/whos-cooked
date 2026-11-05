# Deploy and setup (owner steps)

1. Create a Neon project (US East), a dedicated `hyperdrive` role, and a dev branch.
2. `pnpm --filter @whoscooked/api exec wrangler login`
3. `pnpm --filter @whoscooked/api exec wrangler hyperdrive create whoscooked-db --connection-string="<direct, non-pooled Neon URL>"`
4. Put the returned id in `apps/api/wrangler.jsonc`, then run `pnpm --filter @whoscooked/api types`.
5. Deploy: `pnpm --filter @whoscooked/api deploy` and `pnpm --filter @whoscooked/web deploy`.
6. Check `/api/v1/health/db` returns `ok: true`.
7. Once the domain is on Cloudflare, route `<domain>/api/*` to `whoscooked-api`.

Rollback: `wrangler rollback` in the affected app folder.
