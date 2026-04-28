/**
 * POST /api/revalidate/internal — Payload afterChange hook target.
 *
 * SECURITY NOTE (Phase 6 review M1):
 *   Although named "internal", on Vercel ALL /api/* routes are reachable
 *   from the public internet. This route is gated solely by
 *   PAYLOAD_INTERNAL_SECRET (constant-time compared). Treat that secret
 *   like a publisher token — rotate alongside REVALIDATE_HMAC_SECRET on
 *   the same cadence (90d) and never log it. There is NO loopback
 *   guarantee on Vercel. Phase 7 ticket: gate by Vercel internal headers
 *   or fold into the public HMAC route entirely.
 *
 * Why we still have a separate route:
 *   The Payload afterChange hook (collections/Posts.ts) lives in the same
 *   Next.js process — it needs an in-process call path, and the HMAC
 *   timing-window adds nothing inside one process. The trade-off is the
 *   M1 caveat above.
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { revalidateTag, revalidatePath } from 'next/cache';
import { getPayload } from 'payload';
import config from '@/payload.config';

interface InternalRevalidateBody {
  brand?: string;
  slug?: string;
  op?: string;
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function POST(req: NextRequest) {
  const expected = process.env.PAYLOAD_INTERNAL_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'not configured' }, { status: 503 });
  }

  const supplied = req.headers.get('X-Internal-Secret') ?? '';
  if (!timingSafeEqualStr(supplied, expected)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: InternalRevalidateBody;
  try {
    body = (await req.json()) as InternalRevalidateBody;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const { brand, slug } = body;
  if (!brand || !slug) {
    return NextResponse.json({ error: 'missing brand/slug' }, { status: 400 });
  }
  if (!/^[a-z0-9_]+$/.test(brand) || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: 'malformed brand/slug' }, { status: 400 });
  }

  const brandSlug = brand.replace(/^nuvox_/, 'nuvox');
  try {
    // Next.js 16 requires a cache-life profile on revalidateTag.
    revalidateTag(`brand:${brand}`, 'max');
    revalidateTag(`post:${brand}:${slug}`, 'max');
    revalidatePath(`/${brandSlug}/blog/${slug}`);
    revalidatePath(`/${brandSlug}/blog`);
    revalidatePath(`/${brandSlug}`);
    revalidatePath('/');
  } catch (e) {
    console.error('internal revalidate failed', (e as Error).message);
    return NextResponse.json({ error: 'revalidate failed' }, { status: 500 });
  }

  // Phase 11 (Phase 6 review M2): audit log on internal revalidates so admin
  // edits leave a forensic trail. Best-effort — webhook still succeeds if
  // the audit write fails.
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
        meta: { source: 'payload-hook' },
      },
    });
  } catch (e) {
    console.warn('audit-log write failed (non-fatal):', (e as Error).message);
  }

  return NextResponse.json({ revalidated: true, brand, slug });
}
