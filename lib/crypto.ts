/**
 * Subscriber email crypto — libsodium sealed-box (xsalsa20poly1305).
 *
 * Why we encrypt at the application layer:
 *   - Neon at-rest encryption protects the disk, not against ops, dumps, or backups.
 *   - We want emailHash to be the lookup key (constant-time-ish), not the email itself.
 *   - Key rotation is possible by adding a `keyVersion` field on Subscribers later.
 *
 * Storage format on Subscribers:
 *   email          (encrypted blob, base64)
 *   emailNonce     (24-byte nonce, base64)
 *   emailHash      (SHA-256 hex, used for unique lookup + dedup)
 *
 * Key in env: SUBSCRIBER_ENCRYPTION_KEY (base64 of 32 random bytes).
 * Generate: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */
import sodium from 'libsodium-wrappers';

let ready = false;
async function ensureReady() {
  if (ready) return;
  await sodium.ready;
  ready = true;
}

function getKey(): Uint8Array {
  const b64 = process.env.SUBSCRIBER_ENCRYPTION_KEY;
  if (!b64) {
    throw new Error('SUBSCRIBER_ENCRYPTION_KEY missing — cannot encrypt subscriber emails');
  }
  const key = sodium.from_base64(b64, sodium.base64_variants.ORIGINAL);
  if (key.length !== sodium.crypto_secretbox_KEYBYTES) {
    throw new Error(
      `SUBSCRIBER_ENCRYPTION_KEY must be ${sodium.crypto_secretbox_KEYBYTES} bytes; got ${key.length}`,
    );
  }
  return key;
}

export interface EncryptedEmail {
  /** base64 ciphertext */
  sealed: string;
  /** base64 24-byte nonce */
  nonce: string;
  /** sha256 hex — for unique-key lookups without decrypt */
  hash: string;
}

export async function encryptEmail(email: string): Promise<EncryptedEmail> {
  await ensureReady();
  const normalized = email.trim().toLowerCase();
  const key = getKey();
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const ciphertext = sodium.crypto_secretbox_easy(normalized, nonce, key);
  const hash = sodium.crypto_generichash(32, normalized, null);
  return {
    sealed: sodium.to_base64(ciphertext, sodium.base64_variants.ORIGINAL),
    nonce: sodium.to_base64(nonce, sodium.base64_variants.ORIGINAL),
    hash: sodium.to_hex(hash),
  };
}

export async function decryptEmail(blob: Pick<EncryptedEmail, 'sealed' | 'nonce'>): Promise<string> {
  await ensureReady();
  const key = getKey();
  const sealed = sodium.from_base64(blob.sealed, sodium.base64_variants.ORIGINAL);
  const nonce = sodium.from_base64(blob.nonce, sodium.base64_variants.ORIGINAL);
  const plaintext = sodium.crypto_secretbox_open_easy(sealed, nonce, key);
  return sodium.to_string(plaintext);
}

/** Hash-only — for lookup paths that should never decrypt. */
export async function emailHash(email: string): Promise<string> {
  await ensureReady();
  const normalized = email.trim().toLowerCase();
  return sodium.to_hex(sodium.crypto_generichash(32, normalized, null));
}

/**
 * HMAC-based opaque token (used for confirm/unsubscribe links).
 * Pattern: v1.<emailHash>.<expSeconds>.<sigHex>
 */
export async function makeOpaqueToken(args: {
  emailHash: string;
  ttlSec: number;
  secret: string;
}): Promise<string> {
  await ensureReady();
  const exp = Math.floor(Date.now() / 1000) + args.ttlSec;
  const payload = `v1.${args.emailHash}.${exp}`;
  const key = sodium.crypto_generichash(32, args.secret, null);
  const sig = sodium.crypto_auth(payload, key);
  return `${payload}.${sodium.to_hex(sig)}`;
}

export async function verifyOpaqueToken(
  token: string,
  secret: string,
): Promise<{ emailHash: string } | null> {
  await ensureReady();
  const parts = token.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') return null;
  const [, hash, expStr, sigHex] = parts;
  const exp = parseInt(expStr, 10);
  if (!Number.isFinite(exp) || Date.now() / 1000 > exp) return null;
  const payload = `v1.${hash}.${exp}`;
  const key = sodium.crypto_generichash(32, secret, null);
  let sig: Uint8Array;
  try {
    sig = sodium.from_hex(sigHex);
  } catch {
    return null;
  }
  const ok = sodium.crypto_auth_verify(sig, payload, key);
  return ok ? { emailHash: hash } : null;
}
