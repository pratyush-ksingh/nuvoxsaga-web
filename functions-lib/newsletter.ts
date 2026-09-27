/**
 * Shared helpers for the newsletter Pages Functions (Cloudflare Workers runtime).
 *
 * Lives outside ./functions on purpose: every file under ./functions becomes a public
 * route, helpers must not.
 *
 * Crypto uses Web Crypto only (no libsodium/wasm) so each request stays far below the
 * free plan's 10 ms CPU budget.
 *
 * Subscriber emails are encrypted to a PUBLIC key (ECDH P-256 + HKDF-SHA256 +
 * AES-256-GCM). The Worker can encrypt but never decrypt; the private key lives only
 * on the machine that sends newsletters. A leaked D1 database or Worker secret
 * therefore exposes no addresses. (The old Payload design used a symmetric key held
 * by the server, which could decrypt everything.)
 */

/** The slice of Cloudflare's D1 API these functions use (avoids a workers-types dependency). */
export interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<unknown>;
}
export interface D1Like {
  prepare(query: string): D1Statement;
}

export interface Env {
  DB: D1Like;
  NEWSLETTER_HMAC_SECRET: string;
  SUBSCRIBER_PUBLIC_KEY: string; // base64 of the raw 65-byte uncompressed P-256 point
  TURNSTILE_SECRET: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string; // e.g. "Nuvoxsaga <newsletter@nuvoxsaga.com>"
  SITE_URL?: string;
  DEV_NO_EMAIL?: string; // "1" in local dev: log instead of sending
}

export const BRAND_IDS = ['nuvox_ai', 'nuvox_space', 'nuvox_world'] as const;
export type BrandId = (typeof BRAND_IDS)[number];

const enc = new TextEncoder();

export function b64(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (const b of u8) s += String.fromCharCode(b);
  return btoa(s);
}

export function unb64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function unhex(s: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[0-9a-f]+$/.test(s) || s.length % 2) return null;
  const out = new Uint8Array(new ArrayBuffer(s.length / 2));
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Lookup key for a subscriber. Keyed (HMAC), not a plain hash, so a leaked table
 * can't be reversed by hashing a list of known addresses.
 */
export async function emailHash(email: string, secret: string): Promise<string> {
  const key = await hmacKey(secret);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(`email:v1:${normalizeEmail(email)}`)));
}

/** Signed, expiring link token: v1.<purpose>.<emailHash>.<exp>.<sig> */
export async function makeToken(purpose: 'confirm' | 'unsub', hash: string, ttlSec: number, secret: string) {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const payload = `v1.${purpose}.${hash}.${exp}`;
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(payload));
  return `${payload}.${hex(sig)}`;
}

/** Returns the emailHash if the token is authentic, unexpired and for this purpose. */
export async function verifyToken(token: string, purpose: 'confirm' | 'unsub', secret: string) {
  const parts = token.split('.');
  if (parts.length !== 5 || parts[0] !== 'v1' || parts[1] !== purpose) return null;
  const [, , hash, expStr, sigHex] = parts;
  if (!/^[0-9a-f]{64}$/.test(hash)) return null;
  const exp = Number(expStr);
  if (!Number.isInteger(exp) || Date.now() / 1000 > exp) return null;
  const sig = unhex(sigHex);
  if (!sig) return null;
  // crypto.subtle.verify compares in constant time.
  const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), sig, enc.encode(`v1.${purpose}.${hash}.${exp}`));
  return ok ? hash : null;
}

/** Encrypt to the offline private key. Returns base64 fields for storage. */
export async function sealEmail(email: string, publicKeyB64: string) {
  const recipient = await crypto.subtle.importKey(
    'raw',
    unb64(publicKeyB64),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );
  const eph = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
    'deriveBits',
  ])) as CryptoKeyPair;
  const shared = await crypto.subtle.deriveBits({ name: 'ECDH', public: recipient }, eph.privateKey, 256);
  const hkdf = await crypto.subtle.importKey('raw', shared, 'HKDF', false, ['deriveKey']);
  const aes = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: enc.encode('nuvoxsaga-subscriber-v1') },
    hkdf,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aes, enc.encode(normalizeEmail(email)));
  return {
    epk: b64(await crypto.subtle.exportKey('raw', eph.publicKey)),
    iv: b64(iv),
    ct: b64(ct),
  };
}

export async function verifyTurnstile(token: string, secret: string, ip: string | null, dev = false) {
  if (!token || token.length > 2048) return false;
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    });
    const data = (await res.json()) as { success?: boolean; action?: string };
    // The form renders the widget with action "newsletter"; a token minted for any other
    // action (or site) is rejected. Cloudflare's published test keys can't carry an
    // action, so local dev skips only that part of the check.
    return !!data.success && (dev || data.action === 'newsletter');
  } catch {
    return false;
  }
}

export async function sendEmail(env: Env, to: string, subject: string, html: string, text: string) {
  if (env.DEV_NO_EMAIL === '1') {
    console.log(`[dev] email to <redacted> subject="${subject}"
${text}`);
    return true;
  }
  if (!env.RESEND_API_KEY) {
    console.error('newsletter email: RESEND_API_KEY is not set');
    return false;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.RESEND_FROM ?? 'Nuvoxsaga <newsletter@nuvoxsaga.com>',
      to: [to],
      subject,
      html,
      text,
    }),
  });
  if (!res.ok) {
    // Resend's error body names the problem (unverified domain, restricted key, quota)
    // and never echoes the recipient, so it is safe to log.
    const detail = (await res.text()).slice(0, 300);
    console.error(`newsletter email: Resend rejected the send (HTTP ${res.status}): ${detail}`);
  }
  return res.ok;
}

/** Security headers for Function responses (public/_headers covers static files only). */
export const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-store',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...SECURITY_HEADERS, 'Content-Type': 'application/json' },
  });
}

export function page(title: string, message: string, extra = ''): Response {
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(title)} · Nuvoxsaga</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0a0a0a;color:#eee;
font:16px/1.6 system-ui,sans-serif}main{max-width:32rem;padding:2rem;text-align:center}
a{color:#00b4ff}button{margin-top:1rem;padding:.7rem 1.4rem;border:0;border-radius:.4rem;
background:#00b4ff;color:#000;font-weight:600;cursor:pointer}</style></head>
<body><main><h1>${esc(title)}</h1><p>${esc(message)}</p>${extra}
<p><a href="/">Back to Nuvoxsaga</a></p></main></body></html>`;
  return new Response(html, { headers: { ...SECURITY_HEADERS, 'Content-Type': 'text/html; charset=utf-8' } });
}

/** Constant minimum response time, so timing can't reveal whether an address is subscribed. */
export async function floor(startedAt: number, ms = 800) {
  const wait = startedAt + ms - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}
