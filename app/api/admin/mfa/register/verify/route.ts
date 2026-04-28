/**
 * POST /api/admin/mfa/register/verify — verify the WebAuthn registration response
 * and persist the credential to the admin's Payload Users record.
 */
import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { auth } from '@/app/(auth)/auth';
import { verifyRegistration } from '@/lib/webauthn';
import { Redis } from '@upstash/redis';
import { emailHash } from '@/lib/crypto';
import type { RegistrationResponseJSON } from '@simplewebauthn/server';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return new NextResponse('Unauthorized', { status: 401 });
  // @ts-expect-error -- augmented
  if (session.user.role !== 'admin') return new NextResponse('Forbidden', { status: 403 });

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return new NextResponse('Upstash unavailable', { status: 503 });

  const lookupKey = await emailHash(session.user.email);
  const redis = new Redis({ url, token });
  const challenge = await redis.get<string>(`mfa:reg:${lookupKey}`);
  if (!challenge) return new NextResponse('Challenge expired', { status: 400 });
  // One-shot — delete immediately to prevent replay.
  await redis.del(`mfa:reg:${lookupKey}`);

  const body = (await req.json()) as RegistrationResponseJSON;

  const verification = await verifyRegistration({
    response: body,
    expectedChallenge: challenge,
  });

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ verified: false }, { status: 400 });
  }

  // Persist credential to the user's Payload record. The schema-on-Users for
  // credentials is added in Phase 5.4 — for now we store it in the existing
  // mfaSecret JSON field (will refactor when we add the proper Credentials
  // collection in a follow-up).
  const payload = await getPayload({ config });
  const cred = verification.registrationInfo.credential;

  const matches = await payload.find({
    collection: 'users',
    where: { email: { equals: session.user.email } },
    limit: 1,
  });
  const userDoc = matches.docs[0];
  if (!userDoc) return NextResponse.json({ verified: false }, { status: 404 });

  await payload.update({
    collection: 'users',
    id: userDoc.id,
    data: {
      mfaVerified: true,
      mfaSecret: JSON.stringify({
        credentialID: cred.id,
        publicKey: Buffer.from(cred.publicKey).toString('base64'),
        counter: cred.counter,
      }),
    },
  });

  // Audit log
  await payload.create({
    collection: 'audit-log',
    data: {
      action: 'mfa_setup',
      collection: 'users',
      docId: String(userDoc.id),
      userId: String(userDoc.id),
      userEmail: session.user.email,
      userRole: 'admin',
      ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      userAgent: req.headers.get('user-agent') ?? null,
    },
  });

  return NextResponse.json({ verified: true });
}
