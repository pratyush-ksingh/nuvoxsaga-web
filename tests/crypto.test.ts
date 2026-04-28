/**
 * Crypto helpers — round-trip + property tests.
 *
 * Covers (Phase 11 gate 5 — security-critical):
 *   - encryptEmail → decryptEmail returns the same plaintext
 *   - emailHash is deterministic + case-insensitive (matches encrypt path)
 *   - HMAC opaque tokens verify when valid; reject when tampered, expired,
 *     or signed with a different secret
 */
import { describe, it, expect, beforeAll } from 'vitest';
import sodium from 'libsodium-wrappers';
import {
  encryptEmail,
  decryptEmail,
  emailHash,
  makeOpaqueToken,
  verifyOpaqueToken,
} from '@/lib/crypto';

const SECRET_A = 'a'.repeat(64);
const SECRET_B = 'b'.repeat(64);

beforeAll(async () => {
  await sodium.ready;
  // 32-byte base64 key for libsodium secretbox
  process.env.SUBSCRIBER_ENCRYPTION_KEY = sodium.to_base64(
    sodium.randombytes_buf(sodium.crypto_secretbox_KEYBYTES),
    sodium.base64_variants.ORIGINAL,
  );
});

describe('encryptEmail / decryptEmail', () => {
  it('round-trips a normal email', async () => {
    const enc = await encryptEmail('alice@example.com');
    expect(enc.sealed).not.toBe('alice@example.com');
    expect(enc.nonce).toBeTruthy();
    expect(enc.hash).toMatch(/^[0-9a-f]{64}$/);
    const back = await decryptEmail(enc);
    expect(back).toBe('alice@example.com');
  });

  it('normalises case and whitespace before hashing', async () => {
    const a = await encryptEmail('  Alice@Example.COM  ');
    const b = await encryptEmail('alice@example.com');
    expect(a.hash).toBe(b.hash);
    expect(await decryptEmail(a)).toBe('alice@example.com');
  });

  it('different emails produce different hashes', async () => {
    const a = await emailHash('a@x.com');
    const b = await emailHash('b@x.com');
    expect(a).not.toBe(b);
  });

  it('emailHash matches the hash computed at encrypt-time', async () => {
    const enc = await encryptEmail('Bob@example.com');
    const h = await emailHash('bob@example.com');
    expect(enc.hash).toBe(h);
  });

  it('decrypt fails on tampered sealed payload', async () => {
    const enc = await encryptEmail('charlie@example.com');
    const tampered = { ...enc, sealed: enc.sealed.slice(0, -2) + 'AA' };
    await expect(decryptEmail(tampered)).rejects.toThrow();
  });
});

describe('makeOpaqueToken / verifyOpaqueToken', () => {
  it('round-trips a fresh token', async () => {
    const hash = await emailHash('alice@example.com');
    const t = await makeOpaqueToken({ emailHash: hash, ttlSec: 60, secret: SECRET_A });
    const v = await verifyOpaqueToken(t, SECRET_A);
    expect(v?.emailHash).toBe(hash);
  });

  it('rejects an expired token', async () => {
    const hash = await emailHash('a@x.com');
    const t = await makeOpaqueToken({ emailHash: hash, ttlSec: -10, secret: SECRET_A });
    expect(await verifyOpaqueToken(t, SECRET_A)).toBeNull();
  });

  it('rejects a token signed with a different secret', async () => {
    const hash = await emailHash('a@x.com');
    const t = await makeOpaqueToken({ emailHash: hash, ttlSec: 60, secret: SECRET_A });
    expect(await verifyOpaqueToken(t, SECRET_B)).toBeNull();
  });

  it('rejects a tampered token', async () => {
    const hash = await emailHash('a@x.com');
    const t = await makeOpaqueToken({ emailHash: hash, ttlSec: 60, secret: SECRET_A });
    // flip a char in the signature segment
    const flipped = t.slice(0, -1) + (t.slice(-1) === '0' ? '1' : '0');
    expect(await verifyOpaqueToken(flipped, SECRET_A)).toBeNull();
  });

  it('rejects malformed tokens', async () => {
    expect(await verifyOpaqueToken('', SECRET_A)).toBeNull();
    expect(await verifyOpaqueToken('garbage', SECRET_A)).toBeNull();
    expect(await verifyOpaqueToken('v2.foo.123.deadbeef', SECRET_A)).toBeNull();
    expect(await verifyOpaqueToken('v1.foo.notanumber.deadbeef', SECRET_A)).toBeNull();
  });
});
