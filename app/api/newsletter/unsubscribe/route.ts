/**
 * GET /api/newsletter/unsubscribe?t=<HMAC_TOKEN>
 *
 * Unsubscribe always available without auth — the HMAC token IS the auth.
 * 1-year TTL (issued at signup). Deletes the row outright (right-to-erasure).
 *
 * Phase 10 review hardening:
 *   - HTML-escape SITE_URL interpolations (defence-in-depth).
 *   - Constant-time stored-token comparison (in addition to HMAC verify).
 *   - Inline <style> documented for Phase 11 nonce-pipeline migration.
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

function htmlPage(body: string): NextResponse {
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">
     <title>Unsubscribe</title>
     <style>body{font-family:ui-sans-serif,system-ui;background:#0a0a0f;color:#ededef;
     display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
     main{max-width:32rem;padding:2rem;text-align:center} a{color:#00B4FF}</style>
     </head><body><main>${body}</main></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('t');
  const secret = process.env.NEWSLETTER_HMAC_SECRET ?? process.env.PAYLOAD_INTERNAL_SECRET;

  if (!token || !secret) {
    return htmlPage(
      `<h1>Unsubscribed</h1><p><a href="${SAFE_SITE_URL}/">Back to Nuvoxsaga</a></p>`,
    );
  }
  const verified = await verifyOpaqueToken(token, secret);
  if (!verified) {
    return htmlPage(
      `<h1>Link expired</h1><p>This unsubscribe link is no longer valid.
       <a href="${SAFE_SITE_URL}/">Back to Nuvoxsaga</a></p>`,
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
    const sub = found.docs[0] as { id: string; unsubscribeToken?: string } | undefined;
    if (sub && sub.unsubscribeToken && constantTimeStringEq(sub.unsubscribeToken, token)) {
      await payload.delete({ collection: 'subscribers', id: sub.id });
    }
  } catch (e) {
    console.warn('newsletter unsubscribe DB error:', (e as Error).message);
  }

  return htmlPage(
    `<h1>Unsubscribed</h1><p>You're off the list. Sorry to see you go.
     <a href="${SAFE_SITE_URL}/">Back to Nuvoxsaga</a></p>`,
  );
}
