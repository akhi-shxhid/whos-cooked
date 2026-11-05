// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";

// Static output, served from Cloudflare Workers static assets. The landing
// page makes no database or API call (PRD section 15).
export default defineConfig({
  site: "https://whoscooked.com", // TODO(M0-owner): confirm final domain (PRD section 31).
  output: "static",
  integrations: [react()],
  vite: {
    server: {
      // Local dev: forward API calls to `wrangler dev` in apps/api.
      proxy: { "/api": "http://localhost:8787" },
    },
  },
});
