import { and, eq, isNull, sql } from "drizzle-orm";
import type { Database } from "./client.ts";
import { entitlements, players, purchases, webhookEvents } from "./schema.ts";

/** Queries for the purchase flow. Every write is idempotent so retried webhooks are safe. */

export async function createPlayer(db: Database, ageBand: string | null): Promise<string> {
  const [row] = await db.insert(players).values({ ageBand }).returning({ id: players.id });
  return row!.id;
}

export async function playerExists(db: Database, id: string): Promise<boolean> {
  const rows = await db.select({ id: players.id }).from(players).where(and(eq(players.id, id), isNull(players.deletedAt))).limit(1);
  return rows.length > 0;
}

export async function activeEntitlements(db: Database, playerId: string): Promise<string[]> {
  const rows = await db
    .select({ key: entitlements.key })
    .from(entitlements)
    .where(
      and(
        eq(entitlements.playerId, playerId),
        isNull(entitlements.revokedAt),
        sql`(${entitlements.endsAt} is null or ${entitlements.endsAt} > now())`,
      ),
    );
  return [...new Set(rows.map((r) => r.key))];
}

/** Returns false if this event was already recorded (a retry or duplicate). */
export async function recordWebhookEvent(db: Database, provider: string, eventId: string, eventType: string): Promise<boolean> {
  const rows = await db
    .insert(webhookEvents)
    .values({ provider, eventId, eventType })
    .onConflictDoNothing()
    .returning({ eventId: webhookEvents.eventId });
  return rows.length > 0;
}

export async function markWebhookProcessed(db: Database, provider: string, eventId: string) {
  await db
    .update(webhookEvents)
    .set({ processedAt: new Date() })
    .where(and(eq(webhookEvents.provider, provider), eq(webhookEvents.eventId, eventId)));
}

export interface PaidInput {
  provider: string;
  providerPaymentId: string;
  playerId: string | null;
  productKey: string;
  amount: number;
  currency: string;
  entitlement: string;
}

/** Records a verified payment and grants its entitlement to the buyer. */
export async function recordPayment(db: Database, p: PaidInput): Promise<{ purchaseId: string }> {
  await db
    .insert(purchases)
    .values({
      provider: p.provider,
      providerPaymentId: p.providerPaymentId,
      playerId: p.playerId,
      productKey: p.productKey,
      amount: p.amount,
      currency: p.currency,
      status: "succeeded",
    })
    .onConflictDoNothing();
  const [purchase] = await db
    .select({ id: purchases.id, status: purchases.status })
    .from(purchases)
    .where(and(eq(purchases.provider, p.provider), eq(purchases.providerPaymentId, p.providerPaymentId)))
    .limit(1);
  if (p.playerId && purchase && purchase.status === "succeeded") {
    await grant(db, p.playerId, p.entitlement, purchase.id);
  }
  return { purchaseId: purchase!.id };
}

export async function grant(db: Database, playerId: string, key: string, purchaseId: string) {
  await db.insert(entitlements).values({ playerId, key, sourceType: "purchase", sourceId: purchaseId }).onConflictDoNothing();
}

/** Full refunds remove access everywhere the purchase was used. */
export async function recordRefund(db: Database, provider: string, providerPaymentId: string) {
  const rows = await db
    .update(purchases)
    .set({ status: "refunded", updatedAt: new Date() })
    .where(and(eq(purchases.provider, provider), eq(purchases.providerPaymentId, providerPaymentId)))
    .returning({ id: purchases.id });
  for (const r of rows) {
    await db.update(entitlements).set({ revokedAt: new Date() }).where(and(eq(entitlements.sourceId, r.id), isNull(entitlements.revokedAt)));
  }
}

export async function purchaseByPayment(db: Database, provider: string, providerPaymentId: string) {
  const rows = await db
    .select()
    .from(purchases)
    .where(and(eq(purchases.provider, provider), eq(purchases.providerPaymentId, providerPaymentId)))
    .limit(1);
  return rows[0] ?? null;
}
