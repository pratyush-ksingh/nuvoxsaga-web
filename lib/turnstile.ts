/**
 * Cloudflare Turnstile server-side verification.
 *
 * Returns true if the token verifies AND the action matches.
 * In dev (TURNSTILE_SECRET unset), returns true with a console warning so
 * the form is testable without a real site-key.
 *
 * Docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
import 'server-only';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

interface VerifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
}

export async function verifyTurnstile(args: {
  token: string;
  remoteIp?: string;
  expectedAction?: string;
}): Promise<{ ok: boolean; reason?: string }> {
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return { ok: false, reason: 'turnstile-not-configured' };
    }
    console.warn('[turnstile] secret missing — accepting in dev');
    return { ok: true };
  }
  if (!args.token) return { ok: false, reason: 'no-token' };

  try {
    const body = new URLSearchParams();
    body.set('secret', secret);
    body.set('response', args.token);
    if (args.remoteIp) body.set('remoteip', args.remoteIp);

    const res = await fetch(VERIFY_URL, { method: 'POST', body });
    if (!res.ok) return { ok: false, reason: `verify-${res.status}` };
    const data = (await res.json()) as VerifyResponse;
    if (!data.success) {
      return { ok: false, reason: data['error-codes']?.join(',') ?? 'failed' };
    }
    if (args.expectedAction && data.action && data.action !== args.expectedAction) {
      return { ok: false, reason: 'action-mismatch' };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: `network-${(e as Error).message}` };
  }
}
