/**
 * sitemap.xml lists only pages worth indexing: sections from SECTION_INDEX_MIN stories,
 * topics from TOPIC_INDEX_MIN, the trust pages including /terms and the editor, never
 * /<desk>/page/N. Same fixture pattern as tests/content.test.ts.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

let dir: string;

function write(brand: string, slug: string, post: Record<string, unknown>) {
  const folder = path.join(dir, 'posts', brand);
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, `${slug}.json`), JSON.stringify(post));
}

function story(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    status: 'published',
    title: 'A title',
    bodyHtml: '<p>Body</p>',
    publishedAt: '2026-09-20T10:00:00Z',
    kind: 'brief',
    source: { name: 'NASA', url: 'https://www.nasa.gov/news-release/x/' },
    checkedClaims: [{ claim: 'A checked claim', source: 'NASA' }],
    ...over,
  };
}

beforeAll(async () => {
  await import('isomorphic-dompurify');
}, 120_000);

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nuvoxsaga-sitemap-'));
});
afterEach(() => {
  delete process.env.NUVOXSAGA_CONTENT_DIR;
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('sitemap', () => {
  it('lists sections and topics only once they have enough stories, plus every trust page', async () => {
    for (let i = 0; i < 5; i++) write('nuvox_space', `launch-${i}`, story({ section: 'launch', tags: ['SpaceX'] }));
    write('nuvox_world', 'asia-1', story({ section: 'asia', tags: ['SpaceX', 'Canada'] }));
    write('nuvox_world', 'asia-2', story({ section: 'asia', tags: ['Canada'] }));
    vi.resetModules();
    process.env.NUVOXSAGA_CONTENT_DIR = dir;
    const { default: sitemap } = await import('@/app/sitemap');
    const urls = (await sitemap()).map((u) => u.url);

    expect(urls).toContain('https://nuvoxsaga.com/space/launch');
    expect(urls).not.toContain('https://nuvoxsaga.com/world/asia');
    expect(urls).toContain('https://nuvoxsaga.com/topic/spacex');
    expect(urls).not.toContain('https://nuvoxsaga.com/topic/canada');
    for (const p of ['/about', '/about/pratyush-kumar-singh', '/standards', '/corrections', '/contact', '/privacy', '/terms']) {
      expect(urls).toContain(`https://nuvoxsaga.com${p}`);
    }
    expect(urls).toContain('https://nuvoxsaga.com/space/news/launch-0');
    expect(urls.some((u) => /\/page\/\d+$/.test(u))).toBe(false);
    expect(urls.some((u) => u.includes('/archive'))).toBe(false);
  });
});
