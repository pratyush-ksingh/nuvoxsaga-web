/**
 * Auth.js v5 — full Node-runtime config.
 *
 * Used by route handlers (api/auth/[...nextauth]/route.ts) and server components.
 * Middleware imports the Edge-safe variant from auth.config.ts.
 *
 * Critical: this file overrides the jwt callback from auth.config.ts to handle
 * trigger==='update' SECURELY by re-reading mfaVerified from Payload — never
 * trusting a client-supplied update payload (security review H2).
 */
import NextAuth from 'next-auth';
import Email from 'next-auth/providers/nodemailer';
import { getPayload } from 'payload';
import payloadConfig from '@/payload.config';
import authConfig from './auth.config';

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Email({
      server: {
        host: 'smtp.resend.com',
        port: 465,
        auth: {
          user: 'resend',
          pass: process.env.RESEND_API_KEY ?? '',
        },
      },
      from: 'admin@nuvoxsaga.com',
      maxAge: 10 * 60, // 10min link TTL
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger }) {
      // (1) Run the Edge-safe base callback first — handles initial signin.
      const baseToken =
        (await authConfig.callbacks?.jwt?.({
          token,
          user,
          trigger,
          // The user/account/profile params are unused after signin.
        } as Parameters<NonNullable<NonNullable<typeof authConfig.callbacks>['jwt']>>[0])) ?? token;

      // (2) On client-driven update (e.g. setup-mfa flips mfaVerified),
      //     NEVER trust the supplied payload. Re-derive mfaVerified from
      //     Payload's authoritative state.
      if (trigger === 'update' && baseToken.email) {
        try {
          const payload = await getPayload({ config: payloadConfig });
          const matches = await payload.find({
            collection: 'users',
            where: { email: { equals: String(baseToken.email) } },
            limit: 1,
          });
          const userDoc = matches.docs[0];
          baseToken.mfaVerified = userDoc?.mfaVerified === true;
        } catch {
          // Fail-closed — if we can't verify, claim mfaVerified=false.
          baseToken.mfaVerified = false;
        }
      }

      return baseToken;
    },
  },
});
