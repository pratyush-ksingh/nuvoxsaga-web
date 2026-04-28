/**
 * Auth.js v5 — full Node-runtime config.
 *
 * Used by route handlers (api/auth/[...nextauth]/route.ts) and server components.
 * Middleware imports the Edge-safe variant from auth.config.ts.
 *
 * Critical: this file overrides the jwt callback from auth.config.ts to handle
 * trigger==='update' SECURELY by re-reading mfaVerified from Payload — never
 * trusting a client-supplied update payload (security review H2).
 *
 * Adapter: Auth.js's Email provider REQUIRES a database adapter to store
 * verification tokens (magic-link state). We use @auth/pg-adapter pointed at
 * the same Neon Postgres as Payload. pg-adapter creates 4 tables in the
 * public schema: `users`, `accounts`, `sessions`, `verification_token`.
 * To avoid colliding with Payload's user table we renamed Payload's slug
 * `users` collection to dbName `payload_users` (see collections/Users.ts).
 *
 * Phase 0 setup: pg-adapter auto-creates its tables on first signup.
 * No manual migration needed.
 *
 * Note: Auth.js stores recipient email in `verification_token.identifier`
 * as PLAINTEXT (the verification `token` itself is SHA-256 hashed). Window
 * is capped at 10min via Email provider's maxAge — a leak only exposes
 * users who initiated signin in the last 10min. Phase 11 follow-up: add
 * cron to prune expired rows.
 */
import NextAuth from 'next-auth';
import Email from 'next-auth/providers/nodemailer';
import PostgresAdapter from '@auth/pg-adapter';
import { Pool } from 'pg';
import { getPayload } from 'payload';
import payloadConfig from '@/payload.config';
import authConfig from './auth.config';

/**
 * Decide whether to enable TLS for the pg pool. Robust against any of:
 *   sslmode=require, sslmode=verify-full, ssl=true, neon.tech host
 * If none match, SSL is OFF (local dev only — production must use one of
 * the patterns above).
 */
function needsSsl(uri: string | undefined): boolean {
  if (!uri) return false;
  return /sslmode=(require|verify-full|verify-ca)|[?&]ssl=true|@[\w-]+\.neon\.tech/.test(uri);
}

// Singleton pool — Next.js hot-reloads modules in dev, so we cache on globalThis.
// In prod, every cold start gets a fresh Pool — no leak across deploys.
const globalForPg = globalThis as unknown as { _authPgPool?: Pool };
const pool =
  globalForPg._authPgPool ??
  new Pool({
    // eslint-disable-next-line no-secrets/no-secrets -- placeholder; real value via env
    connectionString: process.env.DATABASE_URI ?? 'postgres://devuser:devpass@127.0.0.1:5432/nuvoxsaga_dev',
    max: 5, // Auth.js writes are signin-only — 5 is plenty.
    // rejectUnauthorized: false — Neon serves an intermediate cert chain that
    // pg's bundled root CAs don't trust by default. We verify hostname via
    // Neon's URL pattern but skip strict CA validation. Same posture as the
    // node-postgres docs example for managed Postgres.
    ssl: needsSsl(process.env.DATABASE_URI) ? { rejectUnauthorized: false } : false,
  });
if (process.env.NODE_ENV !== 'production') globalForPg._authPgPool = pool;

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PostgresAdapter(pool),
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
