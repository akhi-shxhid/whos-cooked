import { defineConfig } from "drizzle-kit";

// Migrations run through Drizzle Kit in CI, never at runtime (PRD section 15).
// DATABASE_URL must be a direct, non-pooled Neon connection string.
const url = process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL to run Drizzle Kit.");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./migrations",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
