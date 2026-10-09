/**
 * .env.production is committed so every worktree build ships the same public keys. That is
 * only safe while it holds nothing but NEXT_PUBLIC_* values, which are public by design.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '..');

describe('.env.production', () => {
  const text = fs.readFileSync(path.join(ROOT, '.env.production'), 'utf8');
  const keys = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split('=')[0]);

  it('holds only public build values', () => {
    expect(keys.length).toBeGreaterThan(0);
    for (const k of keys) expect(k).toMatch(/^NEXT_PUBLIC_/);
  });

  it('is opted back in to git and carries the ad flags, off by default', () => {
    expect(fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8')).toMatch(/^!\.env\.production$/m);
    expect(text).toMatch(/^NEXT_PUBLIC_ADS=0$/m);
    expect(text).toMatch(/^NEXT_PUBLIC_ADSENSE_CLIENT=/m);
    expect(text).toMatch(/^NEXT_PUBLIC_SITE_URL=https:\/\/nuvoxsaga\.com$/m);
  });
});
