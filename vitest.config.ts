import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["packages/*", "apps/api", { test: { name: "web", root: "apps/web", include: ["src/**/*.test.ts"] } }],
  },
});
