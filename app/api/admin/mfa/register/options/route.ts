/**
 * POST /api/admin/mfa/register/options — issue WebAuthn registration options.
 *
 * Requires authenticated admin session. Uses an OPAQUE random userHandle
 * (per WebAuthn §4 — not derived from PII). Stores the challenge short-TTL
 * in Upstash keyed by emailHash so the verify step can compare.
 */
import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { auth } from '@/app/(auth)/auth';
import { buildRegistrationOptions } from '@/lib/webauthn';
import { Redis } from '@upstash/redis';
import { emailHash } from '@/lib/crypto';

function makeUserHandle(): string {
  // 64 bytes → base64url, zero padding
  return randomBytes(64)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.email) return new NextResponse('Unauthorized', { status: 401 });
  // @ts-expect-error -- augmented
  if (session.user.role !== 'admin') return new NextResponse('Forbidden', { status: 403 });

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return new NextResponse('Upstash unavailable', { status: 503 });

  // Look up (or create) the user's opaque WebAuthn handle.
  const payload = await getPayload({ config });
  const matches = await payload.find({
    collection: 'users',
    where: { email: { equals: session.user.email } },
    limit: 1,
  });
  const userDoc = matches.docs[0];
  if (!userDoc) return new NextResponse('User not found', { status: 404 });

  let userHandle = (userDoc as { webauthnUserHandle?: string }).webauthnUserHandle;
  if (!userHandle) {
    userHandle = makeUserHandle();
    await payload.update({
      collection: 'users',
      id: userDoc.id,
      data: { webauthnUserHandle: userHandle },
    });
  }

  const options = await buildRegistrationOptions({
    userId: userHandle, // opaque random — not derived from email
    userName: session.user.email,
  });

  // Store challenge for verify step (5min TTL, keyed by emailHash for lookup).
  const lookupKey = await emailHash(session.user.email);
  const redis = new Redis({ url, token });
  await redis.set(`mfa:reg:${lookupKey}`, options.challenge, { ex: 300 });

  return NextResponse.json(options);
}
