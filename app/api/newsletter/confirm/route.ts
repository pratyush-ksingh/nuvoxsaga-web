/**
 * GET /api/newsletter/confirm?t=<HMAC_TOKEN>
 *
 * Activates a subscriber after they click the confirm link in their email.
 * Token TTL is 24h (set at issue time in /subscribe).
 *
 * Always returns the same generic page on every failure path — never reveals
 * whether the token matched a real subscriber.
 *
 * Phase 10 review hardening:
 *   - HTML-escape any interpolated values (defence-in-depth — all current
 *     interpolations come from envs we control, but escape so a future
 *     edit can't slip user input into the response unsanitised).
 *   - Constant-time stored-token comparison (in addition to the HMAC verify
 *     gate) to remove any timing channel on the equality check.
 *   - W2 (Phase 12 launch-prep): the inline <style> now carries the
 *     middleware's per-request CSP nonce (req.headers.get('x-nonce')),
 *     so the response survives a future tightening of style-src that
 *     drops 'unsafe-inline'. Today's CSP still allows 'unsafe-inline'
 *     (Tailwind runtime CSS); the nonce is harmless when both are present.
 */
import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { verifyOpaqueToken } from '@/lib/crypto';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nuvoxsaga.com';

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const SAFE_SITE_URL = htmlEscape(SITE_URL);

function constantTimeStringEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

// Strict allowlist for the nonce — middleware emits a 32-char hex via
// crypto.randomUUID().replace(/-/g,''), but defend against header spoof.
function safeNonce(raw: string | null): string {
  if (!raw) return '';
  return /^[a-zA-Z0-9_-]{1,64}$/.test(raw) ? raw : '';
}

function htmlPage(title: string, body: string, nonce: string): NextResponse {
  const nonceAttr = nonce ? ` nonce="${nonce}"` : '';
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">
     <title>${htmlEscape(title)}</title>
     <meta name="viewport" content="width=device-width,initial-scale=1">
     <style${nonceAttr}>body{font-family:ui-sans-serif,system-ui;background:#0a0a0f;color:#ededef;
     display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
     main{max-width:32rem;padding:2rem;text-align:center}
     a{color:#00B4FF}</style></head>
     <body><main>${body}</main></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('t');
  // NEWSLETTER_HMAC_SECRET is required-in-prod (see lib/env.ts); fallback to
  // PAYLOAD_INTERNAL_SECRET removed (prevents cross-secret blast radius).
  const secret = process.env.NEWSLETTER_HMAC_SECRET;
  const nonce = safeNonce(req.headers.get('x-nonce'));

  // Always render the generic page on any failure path — no enumeration.
  if (!token || !secret) {
    return htmlPage(
      'Confirmation',
      `<h1>Subscription confirmed</h1><p>You're on the list.</p>
       <p><a href="${SAFE_SITE_URL}/">Back to Nuvoxsaga</a></p>`,
      nonce,
    );
  }

  const verified = await verifyOpaqueToken(token, secret);
  if (!verified) {
    return htmlPage(
      'Confirmation',
      `<h1>Confirmation expired</h1>
       <p>That link is no longer valid. <a href="${SAFE_SITE_URL}/">Sign up again</a> to get a new one.</p>`,
      nonce,
    );
  }

  try {
    const payload = await getPayload({ config });
    const found = await payload.find({
      collection: 'subscribers',
      where: { emailHash: { equals: verified.emailHash } },
      limit: 1,
      depth: 0,
    });
    const sub = found.docs[0] as
      | { id: string; confirmed?: boolean; confirmToken?: string }
      | undefined;
    if (
      sub &&
      sub.confirmToken &&
      constantTimeStringEq(sub.confirmToken, token) &&
      !sub.confirmed
    ) {
      await payload.update({
        collection: 'subscribers',
        id: sub.id,
        data: { confirmed: true, confirmToken: '', confirmedAt: new Date().toISOString() },
      });
    }
  } catch (e) {
    console.warn('newsletter confirm DB error:', (e as Error).message);
  }

  return htmlPage(
    'Confirmation',
    `<h1>You're confirmed</h1>
     <p>Welcome to the saga. <a href="${SAFE_SITE_URL}/">Read the latest →</a></p>`,
    nonce,
  );
}
