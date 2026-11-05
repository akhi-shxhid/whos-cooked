import { describe, expect, it } from "vitest";
import { app } from "./index.ts";

describe("api", () => {
  it("answers the health check", async () => {
    const res = await app.request("/api/v1/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, service: "whoscooked-api" });
  });

  it("returns a typed error when the database binding is missing", async () => {
    const res = await app.request("/api/v1/health/db");
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: { code: "db_not_configured" } });
  });

  it("returns a typed 404", async () => {
    const res = await app.request("/api/v1/nope");
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: { code: "not_found" } });
  });
});
