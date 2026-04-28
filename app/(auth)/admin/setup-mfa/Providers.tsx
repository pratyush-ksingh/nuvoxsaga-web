'use client';

/**
 * SessionProvider wrapper for the setup-mfa page only.
 *
 * The MfaEnrolmentForm calls useSession().update() to flip mfaVerified after
 * WebAuthn enrolment — that REQUIRES a SessionProvider in the React tree,
 * otherwise update() is a silent no-op and the user is stuck in a redirect
 * loop (middleware keeps sending them back here because mfaVerified=false).
 *
 * Scoped narrowly: only this page needs client-side session reactivity.
 * The rest of the auth/admin/frontend trees use server-side auth() calls.
 */
import { SessionProvider } from 'next-auth/react';

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider refetchInterval={0}>{children}</SessionProvider>;
}
