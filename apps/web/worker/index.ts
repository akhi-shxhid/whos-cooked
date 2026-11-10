/**
 * Front door for whoscooked-web: static assets, plus same-origin /api/* routed
 * to the API Worker over a service binding. Same origin keeps the purchase
 * cookie first-party, which in-app browsers (TikTok, Instagram) require.
 */
interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  ASSETS: Fetcher;
  API: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return env.API.fetch(request);
    return env.ASSETS.fetch(request);
  },
};
