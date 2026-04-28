/**
 * POST /api/newsletter/subscribe
 *
 * Public newsletter signup. Rate-limited at middleware (3/hr/IP).
 *
 * Flow:
 *   1. Validate body (Zod)
 *   2. Verify Turnstile token (server-side)
 *   3. Compute emailHash; check Subscribers for existing row
 *   4. If new: encrypt email + create row + create HMAC confirm/unsub tokens
 *      If existing + unconfirmed: re-issue confirm token + send again
 *      If existing + confirmed: silently succeed (no enumeration)
 *   5. Send confirm email via Resend
 *   6. Always return same shape — prevents email enumeration timing oracle
 *      by sleeping to a constant minimum duration.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { encryptEmail, emailHash, makeOpaqueToken } from '@/lib/crypto';
import { verifyTurnstile } from '@/lib/turnstile';
import { sendEmail } from '@/lib/resend';
import { BRANDS, type BrandId } from '@/lib/brands';

const ALLOWED_BRAND_IDS = BRANDS.map((b) => b.id) as [BrandId, ...BrandId[]];

const Body = z.object({
  email: z.string().email().max(254),
  brands: z.array(z.enum(ALLOWED_BRAND_IDS)).min(1).max(3),
  turnstile: z.string().max(2048),
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nuvoxsaga.com';
const MIN_RESPONSE_MS = 800; // anti-enumeration constant-time floor

function clientIp(req: NextRequest): string | undefined {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined;
}

function genericOk() {
  return NextResponse.json({
    ok: true,
    message: 'Check your inbox — confirmation link valid for 24 hours.',
  });
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const ip = clientIp(req);

  // (1) Parse + validate
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    // Generic 400 — don't reveal which field failed.
    await sleepUntil(startedAt + MIN_RESPONSE_MS);
    return NextResponse.json({ error: 'invalid request' }, { status: 400 });
  }

  // (2) Turnstile
  const turnstile = await verifyTurnstile({
    token: body.turnstile,
    remoteIp: ip,
    expectedAction: 'newsletter',
  });
  if (!turnstile.ok) {
    await sleepUntil(startedAt + MIN_RESPONSE_MS);
    return NextResponse.json({ error: 'verification failed' }, { status: 400 });
  }

  // Secrets — fail-closed in prod if missing
  const hmacSecret = process.env.NEWSLETTER_HMAC_SECRET ?? process.env.PAYLOAD_INTERNAL_SECRET;
  if (!hmacSecret) {
    return NextResponse.json({ error: 'not configured' }, { status: 503 });
  }

  // (3) Lookup
  const hash = await emailHash(body.email);
  let confirmToken: string;
  let unsubscribeToken: string;

  try {
    const payload = await getPayload({ config });
    const existing = await payload.find({
      collection: 'subscribers',
      where: { emailHash: { equals: hash } },
      limit: 1,
      depth: 0,
    });

    confirmToken = await makeOpaqueToken({
      emailHash: hash,
      ttlSec: 24 * 60 * 60,
      secret: hmacSecret,
    });
    unsubscribeToken = await makeOpaqueToken({
      emailHash: hash,
      ttlSec: 365 * 24 * 60 * 60,
      secret: hmacSecret,
    });

    if (existing.docs.length === 0) {
      // (4a) New subscriber — encrypt + create
      const enc = await encryptEmail(body.email);
      await payload.create({
        collection: 'subscribers',
        data: {
          emailSealed: enc.sealed,
          emailNonce: enc.nonce,
          emailHash: enc.hash,
          brandsOfInterest: body.brands,
          confirmed: false,
          confirmToken,
          unsubscribeToken,
          sourceIp: ip ?? null,
          sourceUa: req.headers.get('user-agent') ?? null,
        },
      });
    } else {
      // Phase 10 review M-4: preserve existing unsubscribeToken so any
      // welcome/confirmation email the user already kept stays valid. Only
      // re-issue the confirmToken.
      const sub = existing.docs[0] as {
        id: string;
        confirmed?: boolean;
        unsubscribeToken?: string;
      };
      if (sub.unsubscribeToken) {
        unsubscribeToken = sub.unsubscribeToken;
      }
      if (!sub.confirmed) {
        // (4b) Already signed up but never confirmed — re-issue confirm link.
        await payload.update({
          collection: 'subscribers',
          id: sub.id,
          data: {
            brandsOfInterest: body.brands,
            confirmToken,
          },
        });
      }
      // (4c) Already confirmed — fall through silently to (5) so the response
      // shape is identical. We DO NOT send a confirmation email since they're
      // already on the list — but we also don't reveal that fact.
      if (sub.confirmed) {
        await sleepUntil(startedAt + MIN_RESPONSE_MS);
        return genericOk();
      }
    }
  } catch (e) {
    // Even on DB failure, return generic shape so the caller can't probe.
    console.warn('newsletter subscribe DB error:', (e as Error).message);
    await sleepUntil(startedAt + MIN_RESPONSE_MS);
    return genericOk();
  }

  // (5) Send confirm email. URLs use opaque HMAC tokens (safe charset) +
  // encodeURIComponent — no HTML escape needed. Phase 10 review M-2: log
  // failure server-side without leaking the recipient.
  const confirmUrl = `${SITE_URL}/api/newsletter/confirm?t=${encodeURIComponent(confirmToken)}`;
  const unsubUrl = `${SITE_URL}/api/newsletter/unsubscribe?t=${encodeURIComponent(unsubscribeToken)}`;

  const sendResult = await sendEmail({
    to: body.email,
    subject: 'Confirm your Nuvoxsaga subscription',
    html: `<p>Tap the link below to confirm — valid for 24 hours.</p>
           <p><a href="${confirmUrl}">Confirm subscription</a></p>
           <p style="color:#666;font-size:12px">Didn't request this? Ignore this email or
           <a href="${unsubUrl}">unsubscribe immediately</a>.</p>`,
    text: `Confirm: ${confirmUrl}\n\nUnsubscribe: ${unsubUrl}`,
  });
  if (!sendResult.ok) {
    // Server-only log — don't surface to caller. Recipient is intentionally
    // omitted; emailHash + reason is enough to diagnose without leaking PII.
    console.error(
      'newsletter sendEmail failed',
      JSON.stringify({ emailHash: hash.slice(0, 8), reason: sendResult.reason }),
    );
  }

  // (6) Constant-time floor + return
  await sleepUntil(startedAt + MIN_RESPONSE_MS);
  return genericOk();
}

async function sleepUntil(t: number): Promise<void> {
  const remaining = t - Date.now();
  if (remaining <= 0) return;
  await new Promise((r) => setTimeout(r, remaining));
}
