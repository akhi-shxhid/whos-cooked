import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import pg from "pg";
import * as schema from "./schema.ts";

export type Database = NodePgDatabase<typeof schema>;

/**
 * Open a per-request connection. On Workers, pass the Hyperdrive binding's
 * `connectionString`; Hyperdrive pools connections at the edge, so a fresh
 * `pg.Client` per request is the documented pattern.
 */
export async function connect(connectionString: string) {
  const client = new pg.Client({ connectionString });
  await client.connect();
  const db = drizzle(client, { schema });
  return { db, close: () => client.end() };
}

/** Round-trip query used by the health check. */
export async function pingDatabase(db: Database) {
  const started = Date.now();
  const result = await db.execute<{ now: string }>(sql`select now()::text as now`);
  return { ok: true as const, serverTime: result.rows[0]?.now ?? null, latencyMs: Date.now() - started };
}
