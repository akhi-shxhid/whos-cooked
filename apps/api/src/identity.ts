import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";

/**
 * Anonymous player identity in a signed, HTTP-only cookie (PRD section 18).
 * Value: "<uuid>.<base64url HMAC-SHA256(uuid)>". Only created at checkout or
 * restore, so browsing and playing never store an identifier.
 */
export const COOKIE = "wc_pid";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function sign(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
  let s = "";
  for (const b of mac) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function makeToken(secret: string, playerId: string): Promise<string> {
  return `${playerId}.${await sign(secret, playerId)}`;
}

export async function readToken(secret: string, token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const id = token.slice(0, dot);
  if (!UUID.test(id)) return null;
  const expected = await sign(secret, id);
  const got = token.slice(dot + 1);
  if (got.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0 ? id : null;
}

export async function currentPlayer(c: Context, secret: string): Promise<string | null> {
  return readToken(secret, getCookie(c, COOKIE));
}

export async function setPlayer(c: Context, secret: string, playerId: string) {
  setCookie(c, COOKIE, await makeToken(secret, playerId), {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === "https:",
    sameSite: "Lax",
    path: "/",
    // Browsers cap cookie lifetimes at 400 days.
    maxAge: 60 * 60 * 24 * 400,
  });
}
