'use client';

/**
 * Client-side WebAuthn enrolment.
 *
 * 1. POST /api/admin/mfa/register/options → server returns options + stores challenge
 * 2. navigator.credentials.create() with options
 * 3. POST /api/admin/mfa/register/verify with attestation
 * 4. On success → useSession.update() flips mfaVerified → redirect /admin
 */
import { useState, useTransition } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export function MfaEnrolmentForm() {
  const router = useRouter();
  const { update } = useSession();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function enroll() {
    setError(null);
    startTransition(async () => {
      try {
        const optsRes = await fetch('/api/admin/mfa/register/options', { method: 'POST' });
        if (!optsRes.ok) throw new Error(`options request failed: ${optsRes.status}`);
        const options = await optsRes.json();

        const attResp = await startRegistration({ optionsJSON: options });

        const verifyRes = await fetch('/api/admin/mfa/register/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(attResp),
        });
        if (!verifyRes.ok) throw new Error(`verify failed: ${verifyRes.status}`);
        const { verified } = await verifyRes.json();
        if (!verified) throw new Error('credential not verified');

        await update(); // re-issue JWT with mfaVerified=true
        router.replace('/admin');
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <div className="mt-8 flex flex-col gap-4">
      <button
        onClick={enroll}
        disabled={pending}
        className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white disabled:opacity-50"
      >
        {pending ? 'Waiting for authenticator…' : 'Register passkey'}
      </button>
      {error && (
        <p
          role="alert"
          className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200"
        >
          {error}
        </p>
      )}
    </div>
  );
}
