// @ts-check
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Removes the loading waterfall on /play/. After each build it walks the real
 * chunk graph from the Game island (static imports, Vite's preload lists, and
 * Pixi's own lazy chunks) and injects:
 *   - /play/:  <link rel="modulepreload"> for every game chunk, <link rel="preload"> for the fonts
 *   - landing: <link rel="prefetch"> for the same files, so Play is usually instant
 * Prefetch and modulepreload download files without running them, so the
 * landing page still executes no JavaScript.
 */
const FONT_PATTERNS = [/^bricolage-grotesque-latin-800-normal\..+\.woff2$/,/^atkinson-hyperlegible-latin-700-normal\..+\.woff2$/, /^atkinson-hyperlegible-latin-400-normal\..+\.woff2$/];
// Pixi renderers we never use (we ask for WebGL) and the dev-only mascot tool.
const SKIP = [/^MascotPlayground\./, /^WebGPURenderer\./, /^CanvasRenderer\./, /^webworkerAll\./];

export default function preloadGame() {
  return {
    name: "whoscooked:preload-game",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const astroDir = join(root, "_astro");
        const files = await readdir(astroDir);
        const playPath = join(root, "play", "index.html");
        const play = await readFile(playPath, "utf8");
        const entry = /component-url="\/_astro\/([^"]+\.js)"/.exec(play)?.[1];
        if (!entry) {
          logger.warn("Game island not found on /play/; skipping preload hints.");
          return;
        }

        const seen = new Set();
        const queue = [entry];
        const renderer = /renderer-url="\/_astro\/([^"]+\.js)"/.exec(play)?.[1];
        if (renderer) queue.push(renderer);
        while (queue.length) {
          const f = queue.shift();
          if (!f || seen.has(f) || !files.includes(f) || SKIP.some((r) => r.test(f))) continue;
          seen.add(f);
          const src = await readFile(join(astroDir, f), "utf8");
          for (const m of src.matchAll(/["'](?:\.\/|_astro\/|\/_astro\/)([A-Za-z0-9._-]+\.js)["']/g)) queue.push(m[1]);
        }

        const chunks = [...seen].map((f) => `/_astro/${f}`);
        const fonts = files.filter((f) => FONT_PATTERNS.some((r) => r.test(f))).map((f) => `/_astro/${f}`);
        const css = [...play.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);

        const playHints = [
          ...fonts.map((h) => `<link rel="preload" href="${h}" as="font" type="font/woff2" crossorigin>`),
          ...chunks.map((h) => `<link rel="modulepreload" href="${h}">`),
        ].join("");
        await writeFile(playPath, play.replace("</head>", `${playHints}</head>`));

        const landingPath = join(root, "index.html");
        const landing = await readFile(landingPath, "utf8");
        const landingHints = [
          `<link rel="prefetch" href="/play/">`,
          ...css.map((h) => `<link rel="prefetch" href="${h}" as="style">`),
          ...fonts.map((h) => `<link rel="prefetch" href="${h}" as="font" type="font/woff2" crossorigin>`),
          ...chunks.map((h) => `<link rel="prefetch" href="${h}" as="script">`),
        ].join("");
        await writeFile(landingPath, landing.replace("</head>", `${landingHints}</head>`));

        logger.info(`Preload hints: ${chunks.length} chunks, ${fonts.length} fonts on /play/; prefetch on landing.`);
      },
    },
  };
}
