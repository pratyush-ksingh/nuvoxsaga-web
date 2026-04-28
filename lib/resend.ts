/**
 * Resend transactional email helper.
 *
 * Wraps the REST API directly (no SDK — keeps deps light, easier to audit).
 * Fail-soft: in dev without RESEND_API_KEY, logs and returns true so flows
 * can be exercised end-to-end.
 *
 * Domain SPF/DKIM verified during Phase 0 — emails From: admin@nuvoxsaga.com.
 */
import 'server-only';

const RESEND_API = 'https://api.resend.com/emails';
const FROM = 'admin@nuvoxsaga.com';

export async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ ok: boolean; reason?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      return { ok: false, reason: 'resend-not-configured' };
    }
    console.info(`[resend dev] would send to ${args.to}: ${args.subject}`);
    return { ok: true };
  }
  try {
    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: args.to,
        subject: args.subject,
        html: args.html,
        text: args.text,
      }),
    });
    if (!res.ok) {
      // Don't log the response body — may contain the recipient email.
      return { ok: false, reason: `http-${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: `network-${(e as Error).message}` };
  }
}
