/**
 * The archive loader strips model chatter the old blog export carried: an opening
 * "Here is the … article" paragraph and a trailing SEO metadata block.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { stripModelChatter } = await import('@/lib/archive');

describe('stripModelChatter', () => {
  it('removes a leading "Here is the … version of the article" paragraph', () => {
    const html = '<p>Here is the SEO-optimized version of the article for Nuvox World.</p>\n<h1 id="x">Title</h1>\n<p>Body.</p>';
    expect(stripModelChatter(html)).toBe('<h1 id="x">Title</h1>\n<p>Body.</p>');
  });

  it('removes the preamble together with the rule that follows it', () => {
    const html = '<p>Here is the optimized article, followed by the required metadata block.</p>\n<hr />\n<h1>Title</h1>';
    expect(stripModelChatter(html)).toBe('<h1>Title</h1>');
  });

  it('removes an "Of course. … Here is the fully optimized article." opener', () => {
    const html =
      '<p>Of course. As an elite SEO optimizer for Nuvox Space, my mission is to rank. Here is the fully optimized, polished article.</p>\n<hr />\n<h1>Title</h1>';
    expect(stripModelChatter(html)).toBe('<h1>Title</h1>');
  });

  it('removes a trailing SEO metadata block', () => {
    const html = '<h1>Title</h1>\n<p>Last paragraph.</p>\n<hr />\n<p>---SEO_METADATA---</p>\n<div class="codehilite"><pre>{"a":1}</pre></div>\n<p>---END_METADATA---</p>';
    expect(stripModelChatter(html)).toBe('<h1>Title</h1>\n<p>Last paragraph.</p>');
  });

  it('removes the heading and unclosed-paragraph variants of the metadata block', () => {
    const h2 = '<p>Body.</p>\n<hr />\n<h2 id="seo_metadata">SEO_METADATA</h2>\n<div class="codehilite"><pre>{}</pre></div>';
    expect(stripModelChatter(h2)).toBe('<p>Body.</p>');
    const open = '<p>Body.</p>\n<p>---SEO_METADATA---\n{\n "meta_description": "x"\n}</p>';
    expect(stripModelChatter(open)).toBe('<p>Body.</p>');
  });

  it('leaves ordinary article text alone', () => {
    const html = '<p>Here is the thing about rockets: they are loud.</p>\n<p>Body.</p>';
    expect(stripModelChatter(html)).toBe(html);
    const mid = '<h1>T</h1>\n<p>Here is the source hierarchy we actually use at Nuvox AI.</p>';
    expect(stripModelChatter(mid)).toBe(mid);
  });
});
