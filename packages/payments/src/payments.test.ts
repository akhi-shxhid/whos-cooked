import { describe, expect, it } from "vitest";
import { DodoProvider } from "./dodo.ts";
import { currencyFor, formatPrice, PRODUCTS } from "./products.ts";
import { signWebhook, verifyWebhook, WebhookVerificationError } from "./standardWebhooks.ts";

const SECRET = `whsec_${btoa("test-secret-for-unit-tests")}`;
const now = 1_800_000_000;

async function signed(body: string, id = "msg_1", ts = now) {
  return { id, timestamp: String(ts), signature: await signWebhook(SECRET, id, ts, body) };
}

describe("standard webhooks", () => {
  it("accepts a correctly signed, recent payload", async () => {
    const body = JSON.stringify({ hello: "world" });
    await expect(verifyWebhook(SECRET, body, await signed(body), 300, now)).resolves.toBeUndefined();
  });

  it("rejects tampered bodies, wrong secrets, stale timestamps, and missing headers", async () => {
    const body = JSON.stringify({ amount: 399 });
    const h = await signed(body);
    await expect(verifyWebhook(SECRET, body.replace("399", "1"), h, 300, now)).rejects.toBeInstanceOf(WebhookVerificationError);
    await expect(verifyWebhook(`whsec_${btoa("other")}`, body, h, 300, now)).rejects.toBeInstanceOf(WebhookVerificationError);
    await expect(verifyWebhook(SECRET, body, h, 300, now + 3600)).rejects.toThrow("timestamp");
    await expect(verifyWebhook(SECRET, body, { id: null, timestamp: null, signature: null }, 300, now)).rejects.toThrow("Missing");
  });

  it("accepts any matching signature in a space-separated list", async () => {
    const body = "{}";
    const h = await signed(body);
    await expect(verifyWebhook(SECRET, body, { ...h, signature: `v1,bogus ${h.signature}` }, 300, now)).resolves.toBeUndefined();
  });
});

describe("dodo provider", () => {
  const calls: { url: string; init: RequestInit }[] = [];
  const fakeFetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    if (url.endsWith("/checkouts")) return Response.json({ session_id: "cs_123", checkout_url: "https://checkout.example/cs_123" });
    if (url.includes("/payments/pay_1")) {
      return Response.json({ payment_id: "pay_1", status: "succeeded", total_amount: 399, currency: "USD", customer: { email: "a@b.c" }, metadata: { product: "plus", player_id: "p1" } });
    }
    return new Response("not found", { status: 404 });
  }) as unknown as typeof fetch;
  const dodo = new DodoProvider({ apiKey: "dodo_test_x", webhookSecret: SECRET, mode: "test", productIds: { plus: "pdt_plus" }, fetch: fakeFetch });

  it("creates a checkout session with player metadata on the test host", async () => {
    const s = await dodo.createCheckout({ product: "plus", playerId: "p1", currency: "GBP", returnUrl: "https://x/return" });
    expect(s).toEqual({ sessionId: "cs_123", url: "https://checkout.example/cs_123" });
    const call = calls[0]!;
    expect(call.url).toBe("https://test.dodopayments.com/checkouts");
    expect(JSON.parse(String(call.init.body))).toMatchObject({
      product_cart: [{ product_id: "pdt_plus", quantity: 1 }],
      billing_currency: "GBP",
      metadata: { player_id: "p1", product: "plus" },
    });
    expect((call.init.headers as Record<string, string>).Authorization).toBe("Bearer dodo_test_x");
  });

  it("normalizes a verified payment.succeeded webhook", async () => {
    const ts = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({
      type: "payment.succeeded",
      business_id: "b",
      timestamp: "t",
      data: { payment_id: "pay_1", total_amount: 399, currency: "USD", customer: { email: "a@b.c" }, metadata: { player_id: "p1", product: "plus" } },
    });
    const evt = await dodo.parseWebhook(body, { id: "evt_9", timestamp: String(ts), signature: await signWebhook(SECRET, "evt_9", ts, body) });
    expect(evt).toEqual({ type: "payment.succeeded", eventId: "evt_9", paymentId: "pay_1", playerId: "p1", product: "plus", amount: 399, currency: "USD", customerEmail: "a@b.c" });
  });

  it("looks up payments for restore and rejects odd IDs without calling out", async () => {
    expect(await dodo.getPayment("pay_1")).toMatchObject({ status: "succeeded", customerEmail: "a@b.c", product: "plus" });
    const before = calls.length;
    expect(await dodo.getPayment("../etc/passwd")).toBeNull();
    expect(calls.length).toBe(before);
  });
});

describe("prices", () => {
  it("keeps every price in one config and formats it per currency", () => {
    expect(PRODUCTS.plus.prices).toEqual({ USD: 399, EUR: 399, GBP: 349 });
    expect(formatPrice(PRODUCTS.plus, "USD", "en-US")).toBe("$3.99");
    expect(formatPrice(PRODUCTS.plus, "GBP", "en-GB")).toBe("£3.49");
  });

  it("guesses a display currency from locale and time zone", () => {
    expect(currencyFor("en-GB")).toBe("GBP");
    expect(currencyFor("de-DE")).toBe("EUR");
    expect(currencyFor("en-US", "Europe/Paris")).toBe("EUR");
    expect(currencyFor("en-US", "America/New_York")).toBe("USD");
  });
});
