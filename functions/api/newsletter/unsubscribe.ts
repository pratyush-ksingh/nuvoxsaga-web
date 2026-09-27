/**
 * /api/newsletter/unsubscribe?t=<token>
 *
 * GET shows a one-button confirmation page; POST performs the unsubscribe. Mail
 * security scanners follow every link in an email, so a mutating GET would silently
 * unsubscribe people. POST also serves RFC 8058 one-click (List-Unsubscribe-Post).
 */
import { page, verifyToken, type Env } from '../../../functions-lib/newsletter';

function tokenFrom(request: Request): string {
  const t = new URL(request.url).searchParams.get('t') ?? '';
  return t.length < 400 ? t : '';
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const token = tokenFrom(request);
  if (!(await verifyToken(token, 'unsub', env.NEWSLETTER_HMAC_SECRET))) {
    return page('Link expired', 'This unsubscribe link is invalid or has expired.');
  }
  const action = `/api/newsletter/unsubscribe?t=${encodeURIComponent(token)}`;
  return page(
    'Unsubscribe?',
    'You will stop receiving the Nuvoxsaga newsletter.',
    `<form method="post" action="${action.replace(/"/g, '&quot;')}"><button type="submit">Unsubscribe</button></form>`,
  );
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const hash = await verifyToken(tokenFrom(request), 'unsub', env.NEWSLETTER_HMAC_SECRET);
  if (!hash) return page('Link expired', 'This unsubscribe link is invalid or has expired.');
  await env.DB.prepare('UPDATE subscribers SET confirmed = 0, unsubscribed_at = ? WHERE email_hash = ?')
    .bind(new Date().toISOString(), hash)
    .run();
  return page('Unsubscribed', "You won't get any more emails from us.");
};
