/**
 * Standard Webhooks signing and verification (https://www.standardwebhooks.com),
 * which Dodo Payments uses. WebCrypto only, so it runs on Workers with no dependency.
 *
 * Signed content: `${webhook-id}.${webhook-timestamp}.${raw body}`, HMAC-SHA256,
 * base64. Header `webhook-signature` holds space-separated `v1,<sig>` entries.
 */

const encoder = new TextEncoder();

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: ArrayBuffer): string {
  let s = "";
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s);
}

function secretBytes(secret: string): Uint8Array {
  // Standard Webhooks secrets are "whsec_<base64>". Fall back to raw text otherwise.
  if (secret.startsWith("whsec_")) return base64ToBytes(secret.slice(6));
  return encoder.encode(secret);
}

async function hmac(secret: string, content: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", secretBytes(secret) as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return bytesToBase64(await crypto.subtle.sign("HMAC", key, encoder.encode(content)));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export interface WebhookHeaders {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
}

export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookVerificationError";
  }
}

/** Throws WebhookVerificationError unless the payload is authentic and recent. */
export async function verifyWebhook(secret: string, body: string, h: WebhookHeaders, toleranceSec = 300, nowSec = Math.floor(Date.now() / 1000)) {
  if (!h.id || !h.timestamp || !h.signature) throw new WebhookVerificationError("Missing webhook headers");
  const ts = Number(h.timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSec - ts) > toleranceSec) throw new WebhookVerificationError("Webhook timestamp out of range");
  const expected = await hmac(secret, `${h.id}.${h.timestamp}.${body}`);
  const ok = h.signature.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    return version === "v1" && sig !== undefined && timingSafeEqual(sig, expected);
  });
  if (!ok) throw new WebhookVerificationError("Webhook signature mismatch");
}

/** Signs a payload; used by the local fake provider and tests. */
export async function signWebhook(secret: string, id: string, timestamp: number, body: string): Promise<string> {
  return `v1,${await hmac(secret, `${id}.${timestamp}.${body}`)}`;
}
