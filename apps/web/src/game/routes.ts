import { dailyKey, dailySeed, decodeGhost, randomSeed, type ModeKey } from "@whoscooked/game-core";

/** What the player is about to play, parsed from the URL or chosen on the hub. */
export interface Launch {
  mode: ModeKey;
  seed: string;
  /** Daily or archive day. */
  day?: string;
  /** Duel: the friend's score and per-microgame ghost. */
  target?: number;
  ghost?: boolean[];
  archive?: boolean;
}

const SEED_OK = /^[a-z0-9-]{4,40}$/;
const PLAYABLE: readonly ModeKey[] = ["classic", "blitz", "onelife", "chill"];

export function launchFor(mode: ModeKey): Launch {
  if (mode === "daily") {
    const day = dailyKey();
    return { mode, seed: dailySeed(day), day };
  }
  return { mode, seed: randomSeed() };
}

export type Route = { kind: "hub" } | { kind: "play"; launch: Launch } | { kind: "archiveLocked"; day: string } | { kind: "plusReturn" };

export function routeFromUrl(search: string, today = dailyKey()): Route {
  const q = new URLSearchParams(search);
  if (q.get("plus") === "return") return { kind: "plusReturn" };
  if (q.get("hub")) return { kind: "hub" };
  if (q.get("daily") || q.get("mode") === "daily") return { kind: "play", launch: { mode: "daily", seed: dailySeed(today), day: today } };
  const day = q.get("day");
  if (day && /^\d{4}-\d{2}-\d{2}$/.test(day) && day < today) {
    return { kind: "play", launch: { mode: "daily", seed: dailySeed(day), day, archive: true } };
  }
  const c = q.get("c");
  if (c && SEED_OK.test(c)) {
    const t = Number(q.get("t"));
    const ghost = decodeGhost(q.get("g"));
    return {
      kind: "play",
      launch: {
        mode: "duel",
        seed: c,
        ...(Number.isInteger(t) && t >= 0 && t < 1000 ? { target: t } : {}),
        ...(ghost ? { ghost } : {}),
      },
    };
  }
  const m = q.get("mode") as ModeKey | null;
  return { kind: "play", launch: launchFor(m && PLAYABLE.includes(m) ? m : "classic") };
}

export function urlFor(l: Launch): string {
  if (l.archive && l.day) return `/play/?day=${l.day}`;
  if (l.mode === "daily") return "/play/?mode=daily";
  if (l.mode === "duel") return `/play/?c=${l.seed}`;
  return l.mode === "classic" ? "/play/" : `/play/?mode=${l.mode}`;
}
