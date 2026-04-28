/**
 * /login — owner-only magic-link entry.
 *
 * No password field. Email goes to a Resend-routed mailbox; clicking the
 * link signs the user in. Allowlist is enforced in auth.ts signIn callback.
 */
import { signIn } from '@/app/(auth)/auth';

type SP = Promise<{ 'check-email'?: string; error?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const checkEmail = sp['check-email'] === '1';
  const error = sp.error === '1';

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in to Nuvoxsaga</h1>
      <p className="mt-2 text-sm text-neutral-400">
        Owner-only. A magic link will be sent to your email.
      </p>

      {checkEmail && (
        <p
          role="status"
          className="mt-6 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200"
        >
          Check your inbox for the sign-in link. The link is valid for 10 minutes.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-6 rounded-md border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200"
        >
          Sign-in failed. The link may have expired or your email isn&apos;t on the allowlist.
        </p>
      )}

      {!checkEmail && (
        <form
          action={async (formData) => {
            'use server';
            const email = formData.get('email');
            if (typeof email !== 'string' || !email.includes('@')) return;
            await signIn('nodemailer', { email, redirectTo: '/admin' });
          }}
          className="mt-8 flex flex-col gap-3"
        >
          <label htmlFor="email" className="text-xs uppercase tracking-wide text-neutral-500">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            spellCheck={false}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
          <button
            type="submit"
            className="mt-2 rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white"
          >
            Send magic link
          </button>
        </form>
      )}
    </main>
  );
}
