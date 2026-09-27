/**
 * Media-house content layer: story validation (briefs, sections, images), lead selection,
 * topics, and feed escaping. Each test builds its own content dir and reloads the module,
 * because lib/content.ts reads NUVOXSAGA_CONTENT_DIR and caches posts per build.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
    ...over,
  };
}

async function load() {
  vi.resetModules();
  process.env.NUVOXSAGA_CONTENT_DIR = dir;
  return import('@/lib/content');
}

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nuvoxsaga-content-'));
});
afterEach(() => {
  delete process.env.NUVOXSAGA_CONTENT_DIR;
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('story validation', () => {
  it('loads a valid brief with its section, source and story path', async () => {
    write('nuvox_space', 'launch-one', story({ section: 'launch' }));
    const { loadAllPosts, storyPath } = await load();
    const [p] = loadAllPosts();
    expect(p.kind).toBe('brief');
    expect(p.section).toBe('launch');
    expect(p.source?.name).toBe('NASA');
    expect(storyPath(p)).toBe('/space/news/launch-one');
  });

  it('rejects a brief without a source', async () => {
    write('nuvox_ai', 'no-source', story({ source: undefined }));
    const { loadAllPosts } = await load();
    expect(() => loadAllPosts()).toThrow(/primary source/);
  });

  it('rejects a non-https source url', async () => {
    write('nuvox_ai', 'bad-src', story({ source: { name: 'X', url: 'javascript:alert(1)' } }));
    const { loadAllPosts } = await load();
    expect(() => loadAllPosts()).toThrow(/https url/);
  });

  it('rejects a section that belongs to another desk', async () => {
    write('nuvox_ai', 'wrong-section', story({ section: 'launch' }));
    const { loadAllPosts } = await load();
    expect(() => loadAllPosts()).toThrow(/unknown section/);
  });

  it('rejects image paths outside /media and images without credit', async () => {
    write('nuvox_ai', 'img-a', story({ image: { src: '/media/../secret.webp', alt: 'a', credit: 'c' } }));
    let mod = await load();
    expect(() => mod.loadAllPosts()).toThrow(/image/);
    fs.rmSync(path.join(dir, 'posts'), { recursive: true });
    write('nuvox_ai', 'img-b', story({ image: { src: '/media/ai/x.webp', alt: 'a' } }));
    mod = await load();
    expect(() => mod.loadAllPosts()).toThrow(/image/);
  });

  it('treats a missing kind as a feature, which needs no source', async () => {
    write('nuvox_world', 'feature', story({ kind: undefined, source: undefined }));
    const { loadAllPosts } = await load();
    expect(loadAllPosts()[0].kind).toBe('feature');
  });

  it('never exposes drafts or future-dated stories', async () => {
    write('nuvox_ai', 'draft', story({ status: 'draft' }));
    write('nuvox_ai', 'future', story({ publishedAt: '2999-01-01T00:00:00Z' }));
    const { loadAllPosts } = await load();
    expect(loadAllPosts()).toHaveLength(0);
  });
});

describe('fronts and topics', () => {
  it('leads with a recent featured story, else the newest', async () => {
    write('nuvox_ai', 'newest', story({ publishedAt: '2026-09-20T12:00:00Z' }));
    write('nuvox_ai', 'pick', story({ publishedAt: '2026-09-19T12:00:00Z', featured: true }));
    write('nuvox_ai', 'old-pick', story({ publishedAt: '2026-09-01T12:00:00Z', featured: true }));
    const { loadAllPosts, splitTop } = await load();
    const top = splitTop(loadAllPosts());
    expect(top.lead?.slug).toBe('pick');
    expect([top.lead, ...top.secondary, ...top.rest]).toHaveLength(3);
  });

  it('builds URL-safe topic slugs and groups stories by topic', async () => {
    write('nuvox_space', 'a', story({ tags: ['SpaceX Starship', 'Moon'] }));
    write('nuvox_space', 'b', story({ tags: ['spacex starship'] }));
    const { loadTopics, topicSlug } = await load();
    expect(topicSlug('Middle East & Africa!')).toBe('middle-east-africa');
    expect(topicSlug('<script>')).toBe('script');
    expect(loadTopics().get('spacex-starship')?.posts).toHaveLength(2);
  });
});

describe('feeds', () => {
  it('escapes markup in RSS and keeps only 48h stories in the news sitemap', async () => {
    write('nuvox_ai', 'x', story({ title: 'A <b>bold</b> & "quoted" claim', publishedAt: '2026-09-20T10:00:00Z' }));
    write('nuvox_ai', 'y', story({ publishedAt: '2026-09-10T10:00:00Z' }));
    const { loadAllPosts } = await load();
    const { rss, newsSitemap, xml } = await import('@/lib/feeds');
    expect(xml('<a href="x">&</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
    const feed = await rss({ title: 't', path: '/', description: 'd', posts: loadAllPosts() }).text();
    expect(feed).not.toContain('<b>');
    expect(feed).toContain('A &lt;b&gt;bold&lt;/b&gt; &amp; &quot;quoted&quot; claim');
    const news = await newsSitemap(loadAllPosts(), Date.parse('2026-09-21T09:00:00Z')).text();
    expect(news).toContain('/ai/news/x');
    expect(news).not.toContain('/ai/news/y');
  });
});
