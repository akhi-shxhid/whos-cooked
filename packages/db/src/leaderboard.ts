import { and, desc, eq, gt, lt, sql } from "drizzle-orm";
import type { Database } from "./client.ts";
import { handles, leaderboardEntries } from "./schema.ts";

const ADJ = ["Crispy", "Golden", "Sizzling", "Toasted", "Burnt", "Spicy", "Salty", "Smoky", "Zesty", "Crunchy", "Fried", "Grilled", "Saucy", "Frosty", "Sleepy", "Chaotic"];
const NOUN = ["Moai", "Toast", "Goblin", "Sigma", "Waffle", "Bagel", "Noodle", "Pickle", "Taco", "Muffin", "Nugget", "Dumpling", "Biscuit", "Pretzel", "Glitch", "Microwave"];

export function makeHandle(rand: () => number = Math.random): string {
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)]!;
  return `${pick(ADJ)}${pick(NOUN)}${10 + Math.floor(rand() * 90)}`;
}

/** The player's handle, created on first use. Retries on the rare collision. */
export async function handleFor(db: Database, playerId: string): Promise<string> {
  const existing = await db.select({ handle: handles.handle }).from(handles).where(eq(handles.playerId, playerId)).limit(1);
  if (existing[0]) return existing[0].handle;
  for (let i = 0; i < 6; i++) {
    const handle = makeHandle();
    const rows = await db.insert(handles).values({ playerId, handle }).onConflictDoNothing().returning({ handle: handles.handle });
    if (rows[0]) return rows[0].handle;
    const mine = await db.select({ handle: handles.handle }).from(handles).where(eq(handles.playerId, playerId)).limit(1);
    if (mine[0]) return mine[0].handle;
  }
  throw new Error("Couldn't create a handle.");
}

export interface PostScore {
  playerId: string;
  board: string;
  day: string;
  score: number;
  ghost: string;
  character: string;
}

/** Keeps the player's best score for that board and day. */
export async function postScore(db: Database, p: PostScore) {
  await db
    .insert(leaderboardEntries)
    .values(p)
    .onConflictDoUpdate({
      target: [leaderboardEntries.playerId, leaderboardEntries.board, leaderboardEntries.day],
      set: { score: sql`greatest(${leaderboardEntries.score}, excluded.score)`, ghost: sql`case when excluded.score > ${leaderboardEntries.score} then excluded.ghost else ${leaderboardEntries.ghost} end`, character: sql`excluded.character`, updatedAt: new Date() },
    });
}

export interface BoardRow {
  rank: number;
  handle: string;
  score: number;
  character: string;
  you?: boolean;
}

/** Top entries plus the viewer's own row if they're outside the top. */
export async function topScores(db: Database, board: string, day: string, viewer: string | null, limit = 50): Promise<BoardRow[]> {
  const rows = await db
    .select({ playerId: leaderboardEntries.playerId, score: leaderboardEntries.score, character: leaderboardEntries.character, handle: handles.handle })
    .from(leaderboardEntries)
    .innerJoin(handles, eq(handles.playerId, leaderboardEntries.playerId))
    .where(and(eq(leaderboardEntries.board, board), eq(leaderboardEntries.day, day)))
    .orderBy(desc(leaderboardEntries.score), leaderboardEntries.updatedAt)
    .limit(limit);
  const out: BoardRow[] = rows.map((r, i) => ({ rank: i + 1, handle: r.handle, score: r.score, character: r.character, ...(viewer && r.playerId === viewer ? { you: true } : {}) }));
  if (viewer && !out.some((r) => r.you)) {
    const mine = await db
      .select({ score: leaderboardEntries.score, character: leaderboardEntries.character, handle: handles.handle })
      .from(leaderboardEntries)
      .innerJoin(handles, eq(handles.playerId, leaderboardEntries.playerId))
      .where(and(eq(leaderboardEntries.board, board), eq(leaderboardEntries.day, day), eq(leaderboardEntries.playerId, viewer)))
      .limit(1);
    if (mine[0]) {
      const [{ ahead }] = (await db
        .select({ ahead: sql<number>`count(*)::int` })
        .from(leaderboardEntries)
        .where(and(eq(leaderboardEntries.board, board), eq(leaderboardEntries.day, day), gt(leaderboardEntries.score, mine[0].score)))) as [{ ahead: number }];
      out.push({ rank: ahead + 1, handle: mine[0].handle, score: mine[0].score, character: mine[0].character, you: true });
    }
  }
  return out;
}

/** Retention: leaderboard rows older than `days` (by day key). */
export async function pruneLeaderboard(db: Database, olderThanDay: string) {
  await db.delete(leaderboardEntries).where(lt(leaderboardEntries.day, olderThanDay));
}
