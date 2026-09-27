/**
 * POST /api/newsletter/subscribe  { email, brands[], turnstile }
 *
 * Double opt-in signup. Always answers with the same body and a constant minimum
 * delay, so the endpoint cannot be used to find out who is subscribed.
 *   new address          → store (encrypted) as unconfirmed, send confirm email
 *   known, unconfirmed   → update brands, re-send confirm email
 *   known, confirmed     → nothing (same response)
 */
import {
  BRAND_IDS,
  emailHash,
  floor,
  json,
  makeToken,
  sealEmail,
  sendEmail,
  verifyTurnstile,
  type Env,
} from '../../../functions-lib/newsletter';

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,63}$/;
const GENERIC_OK = { ok: true, message: 'Check your inbox — confirmation link valid for 24 hours.' };

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const startedAt = Date.now();
  let body: { email?: unknown; brands?: unknown; turnstile?: unknown };
  try {
    body = await request.json();
  } catch {
    await floor(startedAt);
    return json({ error: 'invalid request' }, 400);
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const brands = Array.isArray(body.brands)
    ? [...new Set(body.brands.filter((b): b is string => BRAND_IDS.includes(b as never)))]
    : [];
  if (!EMAIL_RE.test(email) || email.length > 254 || brands.length === 0) {
    await floor(startedAt);
    return json({ error: 'invalid request' }, 400);
  }

  const ip = request.headers.get('CF-Connecting-IP');
  const dev = env.DEV_NO_EMAIL === '1';
  if (!(await verifyTurnstile(String(body.turnstile ?? ''), env.TURNSTILE_SECRET, ip, dev))) {
    await floor(startedAt);
    return json({ error: 'verification failed' }, 400);
  }
  if (!env.NEWSLETTER_HMAC_SECRET || !env.SUBSCRIBER_PUBLIC_KEY) {
    return json({ error: 'not configured' }, 503);
  }

  const hash = await emailHash(email, env.NEWSLETTER_HMAC_SECRET);
  try {
    const existing = await env.DB.prepare('SELECT confirmed FROM subscribers WHERE email_hash = ?')
      .bind(hash)
      .first<{ confirmed: number }>();
    if (existing?.confirmed) {
      await floor(startedAt);
      return json(GENERIC_OK);
    }
    const now = new Date().toISOString();
    if (existing) {
      await env.DB.prepare('UPDATE subscribers SET brands = ?, unsubscribed_at = NULL WHERE email_hash = ?')
        .bind(JSON.stringify(brands), hash)
        .run();
    } else {
      const sealed = await sealEmail(email, env.SUBSCRIBER_PUBLIC_KEY);
      await env.DB.prepare(
        'INSERT INTO subscribers (email_hash, email_epk, email_iv, email_ct, brands, confirmed, created_at) ' +
          'VALUES (?, ?, ?, ?, ?, 0, ?)',
      )
        .bind(hash, sealed.epk, sealed.iv, sealed.ct, JSON.stringify(brands), now)
        .run();
    }
  } catch (e) {
    // Never leak storage errors (or whether the address exists) to the caller.
    console.error('newsletter subscribe: storage error', (e as Error).message);
    await floor(startedAt);
    return json(GENERIC_OK);
  }

  const site = env.SITE_URL ?? 'https://nuvoxsaga.com';
  const confirm = await makeToken('confirm', hash, 24 * 3600, env.NEWSLETTER_HMAC_SECRET);
  const unsub = await makeToken('unsub', hash, 365 * 24 * 3600, env.NEWSLETTER_HMAC_SECRET);
  const confirmUrl = `${site}/api/newsletter/confirm?t=${encodeURIComponent(confirm)}`;
  const unsubUrl = `${site}/api/newsletter/unsubscribe?t=${encodeURIComponent(unsub)}`;
  const sent = await sendEmail(
    env,
    email,
    'Confirm your Nuvoxsaga subscription',
    `<p>Tap the link below to confirm — valid for 24 hours.</p>
     <p><a href="${confirmUrl}">Confirm subscription</a></p>
     <p style="color:#666;font-size:12px">Didn't request this? Ignore this email or
     <a href="${unsubUrl}">unsubscribe</a>.</p>`,
    `Confirm: ${confirmUrl}\n\nUnsubscribe: ${unsubUrl}`,
  );
  if (!sent) console.error('newsletter subscribe: email send failed', hash.slice(0, 8));

  await floor(startedAt);
  return json(GENERIC_OK);
};
