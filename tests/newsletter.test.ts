/**
 * Newsletter crypto (functions-lib/newsletter.ts): signed links and email sealing.
 * Runs on Node's Web Crypto, the same API the Cloudflare Worker uses.
 */
import { describe, it, expect } from 'vitest';
import { b64, emailHash, makeToken, sealEmail, unb64, verifyToken } from '../functions-lib/newsletter';

const SECRET = 'a'.repeat(64);

describe('signed links', () => {
  it('verifies an authentic token and returns its hash', async () => {
    const hash = await emailHash('Reader@Example.com', SECRET);
    const t = await makeToken('confirm', hash, 60, SECRET);
    expect(await verifyToken(t, 'confirm', SECRET)).toBe(hash);
  });

  it('rejects a tampered signature, wrong secret and wrong purpose', async () => {
    const hash = await emailHash('reader@example.com', SECRET);
    const t = await makeToken('confirm', hash, 60, SECRET);
    const tampered = t.slice(0, -1) + (t.endsWith('0') ? '1' : '0');
    expect(await verifyToken(tampered, 'confirm', SECRET)).toBeNull();
    expect(await verifyToken(t, 'confirm', 'b'.repeat(64))).toBeNull();
    expect(await verifyToken(t, 'unsub', SECRET)).toBeNull();
  });

  it('rejects an expired token and malformed input', async () => {
    const hash = await emailHash('reader@example.com', SECRET);
    const expired = await makeToken('unsub', hash, -1, SECRET);
    expect(await verifyToken(expired, 'unsub', SECRET)).toBeNull();
    for (const junk of ['', 'v1', 'v1.confirm.x.1.y', `v1.confirm.${hash}.notanumber.00`]) {
      expect(await verifyToken(junk, 'confirm', SECRET)).toBeNull();
    }
  });
});

describe('email hash', () => {
  it('normalises case and whitespace, and depends on the secret', async () => {
    const a = await emailHash('  Reader@Example.COM ', SECRET);
    expect(a).toBe(await emailHash('reader@example.com', SECRET));
    expect(a).not.toBe(await emailHash('reader@example.com', 'c'.repeat(64)));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('sealEmail', () => {
  it('only the private key holder can recover the address', async () => {
    const pair = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
      'deriveBits',
    ])) as CryptoKeyPair;
    const pub = b64(await crypto.subtle.exportKey('raw', pair.publicKey));
    const sealed = await sealEmail('Reader@Example.com', pub);
    expect(JSON.stringify(sealed)).not.toContain('example');

    const epk = await crypto.subtle.importKey('raw', unb64(sealed.epk), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    const shared = await crypto.subtle.deriveBits({ name: 'ECDH', public: epk }, pair.privateKey, 256);
    const hkdf = await crypto.subtle.importKey('raw', shared, 'HKDF', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey(
      { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: new TextEncoder().encode('nuvoxsaga-subscriber-v1') },
      hkdf,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    );
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(sealed.iv) }, key, unb64(sealed.ct));
    expect(new TextDecoder().decode(plain)).toBe('reader@example.com');
  });
});
