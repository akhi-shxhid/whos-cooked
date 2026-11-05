import { Hono } from "hono";
import { connect, pingDatabase } from "@whoscooked/db";
import { apiError } from "./errors.ts";

export type AppEnv = { Bindings: Env };

export const app = new Hono<AppEnv>().basePath("/api/v1");

app.get("/health", (c) => c.json({ ok: true, service: "whoscooked-api" }));

// M0 acceptance check: proves Worker -> Hyperdrive -> Neon works in each environment.
app.get("/health/db", async (c) => {
  const hyperdrive = c.env?.HYPERDRIVE;
  if (!hyperdrive) {
    return apiError(c, 503, "db_not_configured", "The database binding is missing. Check the Hyperdrive config in wrangler.jsonc.");
  }
  let conn: Awaited<ReturnType<typeof connect>> | undefined;
  try {
    conn = await connect(hyperdrive.connectionString);
    return c.json(await pingDatabase(conn.db));
  } catch (err) {
    console.error("db health check failed", err);
    return apiError(c, 503, "db_unavailable", "The database didn't answer. Try again in a moment.");
  } finally {
    await conn?.close().catch(() => {});
  }
});

app.notFound((c) => apiError(c, 404, "not_found", "No API route matches this path. Check the URL and try again."));

app.onError((err, c) => {
  console.error(err);
  return apiError(c, 500, "internal_error", "The server hit an error. Try again in a moment.");
});

export default app;
