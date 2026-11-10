import { Hono } from "hono";
import { z } from "zod";
import { connect, createPlayer, handleFor, playerExists, postScore, pruneLeaderboard, topScores, type Database } from "@whoscooked/db";
import { apiError } from "./errors.ts";
import { currentPlayer, setPlayer } from "./identity.ts";

type AppEnv = { Bindings: Env };

const CREW = ["toasty", "npc", "doomscroll", "delulu", "sigma", "goblin", "rizzler", "maincharacter", "moai", "glitch", "microwave"] as const;

export function utcDay(offsetDays = 0, now = Date.now()): string {
  return new Date(now + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

const PostBody = z.object({
  board: z.enum(["daily", "blitz", "onelife"]),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  score: z.number().int().min(0).max(2000),
  ghost: z.string().regex(/^[01]{0,120}$/),
  seed: z.string().min(4).max(60),
  character: z.enum(CREW),
  ageBand: z.enum(["under13", "13to17", "adult"]),
});

export type PostInput = z.infer<typeof PostBody>;

/**
 * Plausibility checks. Not anti-cheat proof (TODO(M2): server-issued seeds and
 * signed play tokens, PRD section 19), but it rejects impossible scores.
 */
export function plausible(p: PostInput, today = utcDay()): string | null {
  // Allow yesterday too, for players near midnight UTC.
  if (p.day !== today && p.day !== utcDay(-1, Date.parse(`${today}T12:00:00Z`))) return "That score is from another day.";
  const cleared = [...p.ghost].filter((c) => c === "1").length;
  if (p.board === "daily") {
    if (p.seed !== `daily-${p.day}`) return "That isn't today's Daily.";
    if (p.score !== cleared) return "That score doesn't match the run.";
  } else if (p.score > cleared * 15) {
    // Points can't exceed 3 (boss) x 5 (max combo) per cleared microgame.
    return "That score doesn't match the run.";
  }
  return null;
}

async function withDb<T>(env: Env, fn: (db: Database) => Promise<T>): Promise<T> {
  const conn = await connect(env.HYPERDRIVE.connectionString);
  try {
    return await fn(conn.db);
  } finally {
    await conn.close().catch(() => {});
  }
}

export const leaderboard = new Hono<AppEnv>();

leaderboard.get("/leaderboard", async (c) => {
  const q = new URL(c.req.url).searchParams;
  const board = q.get("board");
  const day = q.get("day") ?? utcDay();
  if (!board || !["daily", "blitz", "onelife"].includes(board) || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return apiError(c, 400, "invalid_request", "That leaderboard doesn't exist.");
  }
  const secret = c.env?.COOKIE_SECRET;
  const viewer = secret ? await currentPlayer(c, secret) : null;
  const entries = await withDb(c.env, (db) => topScores(db, board, day, viewer));
  c.header("Cache-Control", viewer ? "private, no-store" : "public, max-age=15");
  return c.json({ entries });
});

leaderboard.post("/scores", async (c) => {
  const parsed = PostBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return apiError(c, 400, "invalid_request", "That score couldn't be read. Finish a run and try again.");
  const body = parsed.data;
  if (body.ageBand === "under13") return apiError(c, 403, "not_allowed", "Leaderboards are for players 13 and up.");
  const problem = plausible(body);
  if (problem) return apiError(c, 422, "score_rejected", problem);
  const secret = c.env.COOKIE_SECRET;
  if (!secret) return apiError(c, 503, "not_configured", "Leaderboards aren't open yet. Your score is saved on this device.");

  const out = await withDb(c.env, async (db) => {
    const existing = await currentPlayer(c, secret);
    const playerId = existing && (await playerExists(db, existing)) ? existing : await createPlayer(db, body.ageBand);
    await setPlayer(c, secret, playerId);
    const handle = await handleFor(db, playerId);
    await postScore(db, { playerId, board: body.board, day: body.day, score: body.score, ghost: body.ghost, character: body.character });
    return { handle };
  });
  return c.json(out);
});

/** Retention: leaderboard entries are kept for 30 days (see /privacy). */
export async function pruneOld(env: Env) {
  await withDb(env, (db) => pruneLeaderboard(db, utcDay(-30)));
}
