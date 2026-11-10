import type { CheckoutRequest, CheckoutSession, PaymentEvent, PaymentLookup, PaymentProvider } from "./provider.ts";
import { verifyWebhook, type WebhookHeaders } from "./standardWebhooks.ts";

/**
 * Local-only stand-in for a real provider, so the whole purchase flow
 * (checkout -> signed webhook -> entitlement -> restore) can be exercised
 * end to end without a payments account. Never enabled in production: the
 * API refuses to use it unless ENVIRONMENT is "development".
 */
export class FakeProvider implements PaymentProvider {
  readonly name = "fake" as const;
  private readonly payments = new Map<string, PaymentLookup>();

  constructor(
    private readonly webhookSecret: string,
    private readonly checkoutPageUrl: string,
  ) {}

  async createCheckout(req: CheckoutRequest): Promise<CheckoutSession> {
    const sessionId = `fake_cs_${crypto.randomUUID()}`;
    const url = new URL(this.checkoutPageUrl);
    url.searchParams.set("session", sessionId);
    url.searchParams.set("player", req.playerId);
    url.searchParams.set("product", req.product);
    url.searchParams.set("return", req.returnUrl);
    return { sessionId, url: url.toString() };
  }

  /** Records a fake payment so Restore can find it. */
  remember(p: PaymentLookup) {
    this.payments.set(p.paymentId, p);
  }

  async parseWebhook(body: string, headers: WebhookHeaders): Promise<PaymentEvent> {
    await verifyWebhook(this.webhookSecret, body, headers);
    const evt = JSON.parse(body) as PaymentEvent;
    if (evt.type === "payment.succeeded") {
      this.remember({
        paymentId: evt.paymentId,
        status: "succeeded",
        customerEmail: evt.customerEmail,
        product: evt.product,
        amount: evt.amount,
        currency: evt.currency,
      });
    }
    return evt;
  }

  async getPayment(paymentId: string): Promise<PaymentLookup | null> {
    return this.payments.get(paymentId) ?? null;
  }
}
