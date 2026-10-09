/**
 * Media-house content layer: story validation (briefs, sections, images), lead selection,
 * topics, and feed escaping. Each test builds its own content dir and reloads the module,
 * because lib/content.ts reads NUVOXSAGA_CONTENT_DIR and caches posts per build.
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

async function load() {
  vi.resetModules();
  process.env.NUVOXSAGA_CONTENT_DIR = dir;
  return import('@/lib/content');
}

// lib/content imports the sanitizer, which loads jsdom: over 20 s on a cold run here.
// Load it once up front so the first test does not hit the 5 s default timeout.
beforeAll(async () => {
  await import('isomorphic-dompurify');
}, 120_000);

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

  it('leaves out a published story that has no fact-check record', async () => {
    write('nuvox_ai', 'no-claims', story({ checkedClaims: [] }));
    write('nuvox_ai', 'blank-claims', story({ checkedClaims: [{ claim: '  ', source: 'x' }] }));
    write('nuvox_ai', 'checked', story());
    const { loadAllPosts } = await load();
    expect(loadAllPosts().map((p) => p.slug)).toEqual(['checked']);
  });

  it('accepts sources as names (legacy) or as {name, url}, and a url on a checked claim', async () => {
    write('nuvox_ai', 'legacy', story({ kind: 'feature', source: undefined, sources: ['NASA', ' ', 'ESA'] }));
    write(
      'nuvox_ai',
      'linked',
      story({
        kind: 'feature',
        format: 'explainer',
        source: undefined,
        sources: [{ name: 'NASA', url: 'https://www.nasa.gov/x' }, { name: 'ESA' }, { name: '' }],
        checkedClaims: [{ claim: 'A claim', source: 'NASA', url: 'https://www.nasa.gov/x' }, { claim: 'B', source: 'ESA' }],
      }),
    );
    const { loadAllPosts } = await load();
    const byslug = Object.fromEntries(loadAllPosts().map((p) => [p.slug, p]));
    expect(byslug.legacy.sources).toEqual([{ name: 'NASA' }, { name: 'ESA' }]);
    expect(byslug.legacy.format).toBeUndefined();
    expect(byslug.linked.format).toBe('explainer');
    expect(byslug.linked.sources).toEqual([{ name: 'NASA', url: 'https://www.nasa.gov/x' }, { name: 'ESA' }]);
    expect(byslug.linked.checkedClaims).toEqual([
      { claim: 'A claim', source: 'NASA', url: 'https://www.nasa.gov/x' },
      { claim: 'B', source: 'ESA' },
    ]);
  });

  it('rejects an unknown format, a format on a brief, and non-https source or claim urls', async () => {
    write('nuvox_ai', 'bad-format', story({ kind: 'feature', source: undefined, format: 'listicle' }));
    let mod = await load();
    expect(() => mod.loadAllPosts()).toThrow(/format must be/);
    fs.rmSync(path.join(dir, 'posts'), { recursive: true });
    write('nuvox_ai', 'brief-format', story({ format: 'explainer' }));
    mod = await load();
    expect(() => mod.loadAllPosts()).toThrow(/format must be/);
    fs.rmSync(path.join(dir, 'posts'), { recursive: true });
    write('nuvox_ai', 'bad-url', story({ kind: 'feature', source: undefined, sources: [{ name: 'X', url: 'http://x.example' }] }));
    mod = await load();
    expect(() => mod.loadAllPosts()).toThrow(/https url/);
    fs.rmSync(path.join(dir, 'posts'), { recursive: true });
    write('nuvox_ai', 'bad-claim', story({ checkedClaims: [{ claim: 'c', source: 's', url: 'javascript:alert(1)' }] }));
    mod = await load();
    expect(() => mod.loadAllPosts()).toThrow(/non-https url/);
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
    expect(feed).not.toContain('<title>A <b>');
    expect(feed).toContain('A &lt;b&gt;bold&lt;/b&gt; &amp; &quot;quoted&quot; claim');
    const news = await newsSitemap(loadAllPosts(), Date.parse('2026-09-21T09:00:00Z')).text();
    expect(news).toContain('/ai/news/x');
    expect(news).not.toContain('/ai/news/y');
  });

  it('gives every item an author, an image enclosure and the body', async () => {
    write('nuvox_space', 'photo', story({ bodyHtml: '<p>Body ]]> here</p>', image: { src: '/media/space/photo.webp', alt: 'a', credit: 'NASA' } }));
    write('nuvox_space', 'card', story({ image: { src: '/media/sections/space-launch-1.webp', alt: 'a', credit: 'AI illustration' } }));
    const { loadAllPosts } = await load();
    const { rss, cdata, feedImage } = await import('@/lib/feeds');
    const posts = loadAllPosts();
    const feed = await rss({ title: 't', path: '/space', description: 'd', posts }).text();
    expect(feed).toContain('<dc:creator>Nuvoxsaga Space desk</dc:creator>');
    expect(feed).toContain('<author>corrections@nuvoxsaga.com (Nuvoxsaga Space desk)</author>');
    // A credited photo is the enclosure; an AI illustration is replaced by the title card.
    expect(feed).toContain('<enclosure url="https://nuvoxsaga.com/media/space/photo.webp" type="image/webp"');
    expect(feed).toContain('<enclosure url="https://nuvoxsaga.com/og/nuvox_space/card.png" type="image/png" length="0"/>');
    expect(feedImage(posts.find((p) => p.slug === 'card')!).url).toMatch(/\/og\/nuvox_space\/card\.png$/);
    // The body travels as CDATA, and the one sequence that could end it is split.
    // DOMPurify serialises a text-node ">" as &gt;, so the body itself can never end the CDATA.
    expect(feed).toContain('<content:encoded><![CDATA[<p>Body ]]&gt; here</p>]]></content:encoded>');
    expect(cdata('a]]>b')).toBe('<![CDATA[a]]]]><![CDATA[>b]]>');
    expect(feed).toContain('xmlns:dc=');
    expect(feed).toContain('xmlns:content=');
  });
});
