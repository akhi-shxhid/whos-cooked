import { isProductKey, type ProductKey } from "./products.ts";
import type { CheckoutRequest, CheckoutSession, PaymentEvent, PaymentLookup, PaymentProvider } from "./provider.ts";
import { verifyWebhook, type WebhookHeaders } from "./standardWebhooks.ts";

/**
 * Dodo Payments (merchant of record). Plain fetch against the REST API; field
 * names checked against the official SDK types (dodopayments 2.61):
 * POST /checkouts -> { session_id, checkout_url }, GET /payments/{id},
 * webhooks { type, data } signed with Standard Webhooks.
 */
export interface DodoConfig {
  apiKey: string;
  webhookSecret: string;
  mode: "test" | "live";
  /** Our product key -> Dodo product ID (created in the Dodo dashboard). */
  productIds: Partial<Record<ProductKey, string>>;
  fetch?: typeof fetch;
}

interface DodoPayment {
  payment_id: string;
  status?: string | null;
  total_amount: number;
  currency: string;
  customer?: { email?: string | null } | null;
  metadata?: Record<string, string> | null;
}

interface DodoRefund {
  payment_id: string;
  is_partial: boolean;
}

export class DodoProvider implements PaymentProvider {
  readonly name = "dodo" as const;
  private readonly base: string;
  private readonly http: typeof fetch;

  constructor(private readonly cfg: DodoConfig) {
    this.base = cfg.mode === "live" ? "https://live.dodopayments.com" : "https://test.dodopayments.com";
    this.http = cfg.fetch ?? fetch.bind(globalThis);
  }

  private async call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await this.http(`${this.base}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${this.cfg.apiKey}`, "Content-Type": "application/json", ...init.headers },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Dodo ${init.method ?? "GET"} ${path} failed with ${res.status}: ${text.slice(0, 300)}`);
    }
    return (await res.json()) as T;
  }

  async createCheckout(req: CheckoutRequest): Promise<CheckoutSession> {
    const productId = this.cfg.productIds[req.product];
    if (!productId) throw new Error(`No Dodo product ID configured for "${req.product}"`);
    const out = await this.call<{ session_id: string; checkout_url?: string | null }>("/checkouts", {
      method: "POST",
      body: JSON.stringify({
        product_cart: [{ product_id: productId, quantity: 1 }],
        return_url: req.returnUrl,
        billing_currency: req.currency,
        metadata: { player_id: req.playerId, product: req.product },
      }),
    });
    if (!out.checkout_url) throw new Error("Dodo returned no checkout URL");
    return { sessionId: out.session_id, url: out.checkout_url };
  }

  async parseWebhook(body: string, headers: WebhookHeaders): Promise<PaymentEvent> {
    await verifyWebhook(this.cfg.webhookSecret, body, headers);
    const evt = JSON.parse(body) as { type: string; data: unknown };
    const eventId = headers.id!;
    if (evt.type === "payment.succeeded") {
      const p = evt.data as DodoPayment;
      const product = p.metadata?.product;
      return {
        type: "payment.succeeded",
        eventId,
        paymentId: p.payment_id,
        playerId: p.metadata?.player_id ?? null,
        product: isProductKey(product) ? product : null,
        amount: p.total_amount,
        currency: p.currency,
        customerEmail: p.customer?.email ?? null,
      };
    }
    if (evt.type === "refund.succeeded") {
      const r = evt.data as DodoRefund;
      return { type: "refund.succeeded", eventId, paymentId: r.payment_id, partial: r.is_partial };
    }
    return { type: "ignored", eventId, providerType: evt.type };
  }

  async getPayment(paymentId: string): Promise<PaymentLookup | null> {
    if (!/^[A-Za-z0-9_-]{4,80}$/.test(paymentId)) return null;
    try {
      const p = await this.call<DodoPayment>(`/payments/${encodeURIComponent(paymentId)}`);
      const product = p.metadata?.product;
      return {
        paymentId: p.payment_id,
        status: p.status === "succeeded" ? "succeeded" : "other",
        customerEmail: p.customer?.email ?? null,
        product: isProductKey(product) ? product : null,
        amount: p.total_amount,
        currency: p.currency,
      };
    } catch {
      return null;
    }
  }
}
