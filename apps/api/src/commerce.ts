import { Hono, type Context } from "hono";
import { z } from "zod";
import {
  activeEntitlements,
  connect,
  createPlayer,
  grant,
  markWebhookProcessed,
  playerExists,
  purchaseByPayment,
  recordPayment,
  recordRefund,
  recordWebhookEvent,
  type Database,
} from "@whoscooked/db";
import {
  DodoProvider,
  FakeProvider,
  PRODUCTS,
  signWebhook,
  WebhookVerificationError,
  type PaymentEvent,
  type PaymentProvider,
} from "@whoscooked/payments";
import { apiError } from "./errors.ts";
import { currentPlayer, setPlayer } from "./identity.ts";

type AppEnv = { Bindings: Env };

// One fake provider per isolate, so local checkout -> webhook -> restore share state.
let fake: FakeProvider | null = null;

export function providerFor(env: Env, origin: string): PaymentProvider | null {
  if (env.PAYMENTS_PROVIDER === "fake") {
    if (env.ENVIRONMENT !== "development" || !env.FAKE_WEBHOOK_SECRET) return null;
    fake ??= new FakeProvider(env.FAKE_WEBHOOK_SECRET, `${origin}/api/v1/dev/fake-checkout`);
    return fake;
  }
  if (env.PAYMENTS_PROVIDER === "dodo" && env.DODO_API_KEY && env.DODO_WEBHOOK_SECRET && env.DODO_PRODUCT_PLUS) {
    return new DodoProvider({
      apiKey: env.DODO_API_KEY,
      webhookSecret: env.DODO_WEBHOOK_SECRET,
      mode: env.DODO_MODE === "live" ? "live" : "test",
      productIds: { plus: env.DODO_PRODUCT_PLUS, ...(env.DODO_PRODUCT_CREW ? { crew: env.DODO_PRODUCT_CREW } : {}) },
    });
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

const notReady = (c: Context) =>
  apiError(c, 503, "payments_not_configured", "Checkout isn't open yet. Everything in the game is free to play in the meantime.");

/** Applies a verified provider event exactly once. */
export async function applyEvent(db: Database, provider: string, evt: PaymentEvent) {
  const fresh = await recordWebhookEvent(db, provider, evt.eventId, evt.type === "ignored" ? evt.providerType : evt.type);
  if (!fresh) return "duplicate" as const;
  if (evt.type === "payment.succeeded" && evt.product) {
    const product = PRODUCTS[evt.product];
    const playerId = evt.playerId && (await playerExists(db, evt.playerId)) ? evt.playerId : null;
    await recordPayment(db, {
      provider,
      providerPaymentId: evt.paymentId,
      playerId,
      productKey: product.key,
      amount: evt.amount,
      currency: evt.currency,
      entitlement: product.entitlement,
    });
  } else if (evt.type === "refund.succeeded" && !evt.partial) {
    await recordRefund(db, provider, evt.paymentId);
  }
  await markWebhookProcessed(db, provider, evt.eventId);
  return "applied" as const;
}

const CheckoutBody = z.object({
  product: z.enum(["plus", "crew"]),
  currency: z.enum(["USD", "EUR", "GBP"]),
  ageBand: z.enum(["under13", "13to17", "adult"]),
  /** For 13-17s, the adult completing checkout confirms they are a parent or guardian. */
  guardianConfirmed: z.boolean().optional(),
});

const RestoreBody = z.object({
  paymentId: z.string().trim().min(4).max(80),
  email: z.string().trim().email().max(254),
});

export const commerce = new Hono<AppEnv>();

commerce.get("/entitlements", async (c) => {
  const secret = c.env?.COOKIE_SECRET;
  const playerId = secret ? await currentPlayer(c, secret) : null;
  // No cookie means no purchase on this device: answer without touching the database.
  if (!playerId) return c.json({ plus: false, crew: false });
  const keys = await withDb(c.env, (db) => activeEntitlements(db, playerId));
  return c.json({ plus: keys.includes("plus"), crew: keys.includes("crew") });
});

commerce.post("/checkout", async (c) => {
  const parsed = CheckoutBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return apiError(c, 400, "invalid_request", "That checkout request wasn't valid. Reload the page and try again.");
  const body = parsed.data;
  if (body.ageBand === "under13") {
    return apiError(c, 403, "purchase_not_available", "Cooked+ isn't available for players under 13. Everything else stays free.");
  }
  if (body.ageBand === "13to17" && !body.guardianConfirmed) {
    return apiError(c, 403, "guardian_required", "A parent or guardian needs to complete this purchase.");
  }
  const origin = new URL(c.req.url).origin;
  const provider = providerFor(c.env, origin);
  if (!provider || !c.env.COOKIE_SECRET) return notReady(c);

  const secret = c.env.COOKIE_SECRET;
  const playerId = await withDb(c.env, async (db) => {
    const existing = await currentPlayer(c, secret);
    if (existing && (await playerExists(db, existing))) return existing;
    return createPlayer(db, body.ageBand);
  });
  await setPlayer(c, secret, playerId);

  const base = c.env.PUBLIC_BASE_URL || origin;
  const session = await provider.createCheckout({
    product: body.product,
    playerId,
    currency: body.currency,
    returnUrl: `${base}/play/?plus=return`,
  });
  return c.json({ url: session.url });
});

commerce.post("/webhooks/:provider", async (c) => {
  const name = c.req.param("provider");
  const provider = providerFor(c.env, new URL(c.req.url).origin);
  if (!provider || provider.name !== name) return apiError(c, 404, "not_found", "No webhook handler for that provider.");
  const body = await c.req.text();
  let evt: PaymentEvent;
  try {
    evt = await provider.parseWebhook(body, {
      id: c.req.header("webhook-id") ?? null,
      timestamp: c.req.header("webhook-timestamp") ?? null,
      signature: c.req.header("webhook-signature") ?? null,
    });
  } catch (err) {
    if (err instanceof WebhookVerificationError) return apiError(c, 400, "invalid_signature", "Webhook signature check failed.");
    throw err;
  }
  const result = await withDb(c.env, (db) => applyEvent(db, provider.name, evt));
  return c.json({ ok: true, result });
});

commerce.post("/restore", async (c) => {
  const parsed = RestoreBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return apiError(c, 400, "invalid_request", "Enter the payment ID from your receipt and the email you paid with.");
  const provider = providerFor(c.env, new URL(c.req.url).origin);
  if (!provider || !c.env.COOKIE_SECRET) return notReady(c);
  const { paymentId, email } = parsed.data;

  const payment = await provider.getPayment(paymentId);
  const matches = payment && payment.status === "succeeded" && payment.product && payment.customerEmail?.toLowerCase() === email.toLowerCase();
  if (!matches || !payment.product) {
    return apiError(c, 404, "purchase_not_found", "We couldn't match that payment ID and email. Check your receipt email and try again.");
  }
  const secret = c.env.COOKIE_SECRET;
  const product = PRODUCTS[payment.product];
  const ok = await withDb(c.env, async (db) => {
    const existing = await currentPlayer(c, secret);
    const playerId = existing && (await playerExists(db, existing)) ? existing : await createPlayer(db, null);
    await setPlayer(c, secret, playerId);
    let purchase = await purchaseByPayment(db, provider.name, payment.paymentId);
    if (!purchase) {
      await recordPayment(db, {
        provider: provider.name,
        providerPaymentId: payment.paymentId,
        playerId: null,
        productKey: product.key,
        amount: payment.amount,
        currency: payment.currency,
        entitlement: product.entitlement,
      });
      purchase = await purchaseByPayment(db, provider.name, payment.paymentId);
    }
    if (!purchase || purchase.status !== "succeeded") return false;
    await grant(db, playerId, product.entitlement, purchase.id);
    return true;
  });
  if (!ok) return apiError(c, 409, "purchase_refunded", "That purchase was refunded, so it can't be restored.");
  return c.json({ plus: product.key === "plus", crew: product.key === "crew" });
});

// ---------------------------------------------------------------- Local development only

commerce.get("/dev/fake-checkout", (c) => {
  if (c.env.ENVIRONMENT !== "development" || c.env.PAYMENTS_PROVIDER !== "fake") return apiError(c, 404, "not_found", "Not available.");
  const q = new URL(c.req.url).searchParams;
  const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
  return c.html(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Test checkout</title>
<body style="font-family:system-ui;max-width:420px;margin:40px auto;padding:0 16px">
<h1>Test checkout</h1><p>Local development only. No real money moves.</p>
<form method="post" action="/api/v1/dev/fake-checkout">
<input type="hidden" name="player" value="${esc(q.get("player") ?? "")}">
<input type="hidden" name="product" value="${esc(q.get("product") ?? "")}">
<input type="hidden" name="return" value="${esc(q.get("return") ?? "/")}">
<label>Email <input name="email" type="email" value="test@example.com" required></label>
<p><button type="submit">Pay (test)</button></p></form></body>`);
});

commerce.post("/dev/fake-checkout", async (c) => {
  if (c.env.ENVIRONMENT !== "development" || c.env.PAYMENTS_PROVIDER !== "fake" || !c.env.FAKE_WEBHOOK_SECRET) {
    return apiError(c, 404, "not_found", "Not available.");
  }
  const form = await c.req.formData();
  const paymentId = `fake_pay_${crypto.randomUUID().slice(0, 8)}`;
  const evt: PaymentEvent = {
    type: "payment.succeeded",
    eventId: `fake_evt_${crypto.randomUUID()}`,
    paymentId,
    playerId: String(form.get("player") ?? "") || null,
    product: String(form.get("product")) === "crew" ? "crew" : "plus",
    amount: PRODUCTS[String(form.get("product")) === "crew" ? "crew" : "plus"].prices.USD,
    currency: "USD",
    customerEmail: String(form.get("email") ?? ""),
  };
  // Deliver it the same way a provider would: a signed POST to our webhook route.
  const body = JSON.stringify(evt);
  const ts = Math.floor(Date.now() / 1000);
  const res = await commerce.request(
    "/webhooks/fake",
    {
      method: "POST",
      body,
      headers: { "webhook-id": evt.eventId, "webhook-timestamp": String(ts), "webhook-signature": await signWebhook(c.env.FAKE_WEBHOOK_SECRET, evt.eventId, ts, body) },
    },
    c.env,
  );
  if (!res.ok) return c.text(`Webhook failed: ${res.status}`, 500);
  const back = new URL(String(form.get("return") ?? "/"), c.req.url);
  back.searchParams.set("test_payment", paymentId);
  return c.redirect(back.toString(), 303);
});
