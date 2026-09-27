-- Newsletter subscribers (Cloudflare D1). Applied with:
--   npx wrangler d1 execute nuvoxsaga --remote --file infra/d1/0001_subscribers.sql
--
-- No plaintext email is ever stored. email_hash is an HMAC (keyed with
-- NEWSLETTER_HMAC_SECRET) used for lookups; the address itself is encrypted to an
-- offline P-256 public key (email_epk = ephemeral public key, email_iv, email_ct).
CREATE TABLE IF NOT EXISTS subscribers (
  email_hash      TEXT PRIMARY KEY,
  email_epk       TEXT NOT NULL,
  email_iv        TEXT NOT NULL,
  email_ct        TEXT NOT NULL,
  brands          TEXT NOT NULL,           -- JSON array of brand ids
  confirmed       INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL,
  confirmed_at    TEXT,
  unsubscribed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_subscribers_confirmed ON subscribers(confirmed);
