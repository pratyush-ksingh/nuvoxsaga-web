/**
 * GET /api/newsletter/confirm?t=<token> — second step of double opt-in.
 * Every failure shows the same generic page (no hint whether an address exists).
 */
import { page, verifyToken, type Env } from '../../../functions-lib/newsletter';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const token = new URL(request.url).searchParams.get('t') ?? '';
  const hash = token.length < 400 ? await verifyToken(token, 'confirm', env.NEWSLETTER_HMAC_SECRET) : null;
  if (!hash) {
    return page('Link expired', 'This confirmation link is invalid or has expired. Sign up again to get a fresh one.');
  }
  await env.DB.prepare(
    'UPDATE subscribers SET confirmed = 1, confirmed_at = COALESCE(confirmed_at, ?), unsubscribed_at = NULL ' +
      'WHERE email_hash = ?',
  )
    .bind(new Date().toISOString(), hash)
    .run();
  return page("You're in", 'Subscription confirmed. The next issue will land in your inbox.');
};
