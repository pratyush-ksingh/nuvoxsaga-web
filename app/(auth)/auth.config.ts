/**
 * Edge-runtime-safe Auth.js config — used by middleware.
 *
 * MUST NOT import provider modules (nodemailer, oauth) — those pull Node-only
 * deps and break in Edge. Providers live in auth.ts.
 *
 * Split-config pattern: middleware uses this; route handlers use auth.ts.
 */
import type { NextAuthConfig } from 'next-auth';

const isProd = process.env.NODE_ENV === 'production';

export default {
  trustHost: true,
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 8,
    updateAge: 60 * 30,
  },
  providers: [], // populated in auth.ts
  cookies: {
    sessionToken: {
      name: isProd ? '__Host-nuvoxsaga.session' : 'nuvoxsaga.session.dev',
      options: {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
      },
    },
  },
  pages: {
    signIn: '/login',
    verifyRequest: '/login?check-email=1',
    error: '/login?error=1',
  },
  callbacks: {
    async signIn({ user }) {
      const allowlist = (process.env.ADMIN_EMAIL_ALLOWLIST ?? '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
      if (!allowlist.length) return false;
      const email = user.email?.toLowerCase();
      return Boolean(email && allowlist.includes(email));
    },
    async jwt({ token, user }) {
      if (user) {
        // Initial signin only — magic-link callback is the only path that
        // sets `user`. Edge runtime sees the JWT decode path (no `user`,
        // no `trigger`); auth.ts overrides this callback with a Node-only
        // version that handles trigger==='update' against the Payload DB.
        token.email = user.email ?? null;
        token.role = 'admin';
        token.mfaVerified = false; // never trusted true at signin
        token.mintedAt = Math.floor(Date.now() / 1000);
      }
      // SECURITY: Do NOT honour trigger==='update' here. A client-side
      // useSession().update() must NOT be able to flip mfaVerified — that's
      // enforced server-side in auth.ts by querying Payload directly.
      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        role: token.role as string | undefined,
        mfaVerified: token.mfaVerified as boolean | undefined,
        mintedAt: token.mintedAt as number | undefined,
      } as typeof session.user;
      return session;
    },
  },
} satisfies NextAuthConfig;
