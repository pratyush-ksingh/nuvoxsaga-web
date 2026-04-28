/**
 * /admin/setup-mfa — WebAuthn enrolment page.
 *
 * Requires an authenticated session (middleware enforces). After successful
 * enrolment, the JWT is re-issued with mfaVerified=true via Auth.js update().
 *
 * Client-side flow handled in MfaEnrolmentForm.tsx — this server component
 * just renders the shell + reads the current session.
 */
import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { MfaEnrolmentForm } from './MfaEnrolmentForm';
import { Providers } from './Providers';

export default async function SetupMfaPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  // @ts-expect-error -- augmented in callbacks
  if (session.user.mfaVerified) redirect('/admin');

  return (
    <Providers>
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Set up multi-factor auth</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Required for admin access. Use a passkey, Touch/Face ID, Windows Hello,
          or a hardware security key.
        </p>
        <MfaEnrolmentForm />
      </main>
    </Providers>
  );
}
