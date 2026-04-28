/**
 * POST /api/revalidate — public-but-HMAC-signed ISR webhook.
 *
 * Triggered by:
 *   - Python content pipeline (`blog/blog_publisher_payload._trigger_revalidate`)
 *     after a publish_post call lands a row in Payload.
 *   - Ghost-style external integrations if we ever add them.
 *
 * Auth: HMAC-SHA256 of `${ts}.${rawBody}` keyed by REVALIDATE_HMAC_SECRET.
 * Replay protection: timestamp window 60s + nonce dedup via Upstash (24h TTL).
 *
 * Audit: every accepted call writes a `revalidate` AuditLog entry.
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { revalidateTag, revalidatePath } from 'next/cache';
import { Redis } from '@upstash/redis';
import { getPayload } from 'payload';
import config from '@/payload.config';

// 60s window — clock skew + network = generous-but-safe.
const TIMESTAMP_WINDOW_SEC = 60;
const NONCE_TTL_SEC = 24 * 60 * 60;

interface RevalidateBody {
  brand?: string;
  slug?: string;
  nonce?: string;
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_HMAC_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'not configured' }, { status: 503 });
  }

  // (1) Read raw body BEFORE parsing — HMAC must be over the byte-exact body
  //     the sender signed.
  const raw = await req.text();
  if (raw.length > 4096) {
    return NextResponse.json({ error: 'body too large' }, { status: 413 });
  }

  // (2) Headers
  const ts = req.headers.get('X-Timestamp');
  const sigHeader = req.headers.get('X-Signature');
  if (!ts || !sigHeader) {
    return NextResponse.json({ error: 'missing signature headers' }, { status: 401 });
  }

  // Strip "sha256=" prefix
  const sig = sigHeader.startsWith('sha256=') ? sigHeader.slice('sha256='.length) : sigHeader;

  // (3) Timestamp window — fail if clock too far off.
  const tsNum = parseInt(ts, 10);
  if (!Number.isFinite(tsNum)) {
    return NextResponse.json({ error: 'bad timestamp' }, { status: 401 });
  }
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - tsNum) > TIMESTAMP_WINDOW_SEC) {
    return NextResponse.json({ error: 'timestamp out of window' }, { status: 401 });
  }

  // (4) HMAC verify (timing-safe).
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${ts}.${raw}`)
    .digest('hex');
  if (!timingSafeEqualHex(sig, expected)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  // (5) Parse body.
  let body: RevalidateBody;
  try {
    body = JSON.parse(raw) as RevalidateBody;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const { brand, slug, nonce } = body;
  if (!brand || !slug || !nonce) {
    return NextResponse.json({ error: 'missing brand/slug/nonce' }, { status: 400 });
  }
  // Phase 6 review M6: literal allowlist > regex on brand (typo defense).
  const ALLOWED_BRANDS = new Set(['nuvox_ai', 'nuvox_space', 'nuvox_world']);
  if (!ALLOWED_BRANDS.has(brand)) {
    return NextResponse.json({ error: 'unknown brand' }, { status: 400 });
  }
  // Slug: kebab-case, length-bounded.
  if (!/^[a-z0-9-]{1,200}$/.test(slug)) {
    return NextResponse.json({ error: 'malformed slug' }, { status: 400 });
  }
  // Nonce: hex/alphanum, bounded length (uuid4().hex = 32 chars).
  if (!/^[a-z0-9]{8,64}$/i.test(nonce)) {
    return NextResponse.json({ error: 'malformed nonce' }, { status: 400 });
  }

  // (6) Nonce dedup — Upstash 24h key. SETNX-style atomic check.
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const tok = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !tok) {
    return NextResponse.json({ error: 'replay-store unavailable' }, { status: 503 });
  }
  const redis = new Redis({ url, token: tok });
  const setResult = await redis.set(`revalidate:nonce:${nonce}`, '1', {
    ex: NONCE_TTL_SEC,
    nx: true,
  });
  if (setResult !== 'OK') {
    // Already seen — replay attempt or duplicate request.
    return NextResponse.json({ error: 'nonce replay' }, { status: 409 });
  }

  // (7) Trigger Next.js ISR refresh.
  //     Brand slug may differ from id (e.g. nuvox_ai → nuvoxai).
  const brandSlug = brand.replace(/^nuvox_/, 'nuvox');
  try {
    // Next.js 16 requires a cache-life profile on revalidateTag.
    // 'max' invalidates the broadest cache window — appropriate for ISR refresh.
    revalidateTag(`brand:${brand}`, 'max');
    revalidateTag(`post:${brand}:${slug}`, 'max');
    revalidatePath(`/${brandSlug}/blog/${slug}`);
    revalidatePath(`/${brandSlug}/blog`);
    revalidatePath(`/${brandSlug}`);
    revalidatePath('/');
  } catch (e) {
    // Don't leak Next internals — log server-side only.
    console.error('revalidate failed', (e as Error).message);
    return NextResponse.json({ error: 'revalidate failed' }, { status: 500 });
  }

  // (8) Audit log (best-effort — don't fail the webhook on audit write errors).
  try {
    const payload = await getPayload({ config });
    await payload.create({
      collection: 'audit-log',
      data: {
        action: 'revalidate',
        collection: 'posts',
        docId: `${brand}:${slug}`,
        ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
        userAgent: req.headers.get('user-agent') ?? null,
        meta: { source: 'webhook', nonce, ts },
      },
    });
  } catch (e) {
    console.warn('audit-log write failed (non-fatal):', (e as Error).message);
  }

  return NextResponse.json({ revalidated: true, brand, slug });
}
