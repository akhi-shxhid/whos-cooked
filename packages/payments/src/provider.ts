import type { Currency, ProductKey } from "./products.ts";
import type { WebhookHeaders } from "./standardWebhooks.ts";

/**
 * Provider-neutral payment interface (PRD section 20), so Dodo can be swapped
 * if it won't accept a games business (see docs/research.md §4).
 */
export interface CheckoutRequest {
  product: ProductKey;
  playerId: string;
  currency: Currency;
  returnUrl: string;
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
}

/** The only events the app acts on, normalized across providers. */
export type PaymentEvent =
  | {
      type: "payment.succeeded";
      eventId: string;
      paymentId: string;
      playerId: string | null;
      product: ProductKey | null;
      amount: number;
      currency: string;
      customerEmail: string | null;
    }
  | { type: "refund.succeeded"; eventId: string; paymentId: string; partial: boolean }
  | { type: "ignored"; eventId: string; providerType: string };

export interface PaymentLookup {
  paymentId: string;
  status: "succeeded" | "other";
  customerEmail: string | null;
  product: ProductKey | null;
  amount: number;
  currency: string;
}

export interface PaymentProvider {
  readonly name: "dodo" | "fake";
  createCheckout(req: CheckoutRequest): Promise<CheckoutSession>;
  /** Verifies the signature and normalizes the event. Throws on a bad signature. */
  parseWebhook(body: string, headers: WebhookHeaders): Promise<PaymentEvent>;
  /** Used by Restore purchases to confirm a payment ID from a receipt. */
  getPayment(paymentId: string): Promise<PaymentLookup | null>;
}
