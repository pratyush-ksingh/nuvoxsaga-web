/**
 * RSS 2.0 and Google News sitemap builders. Every interpolated value goes through xml(),
 * so a headline can never inject markup into a feed.
 *
 * Each RSS item carries the desk as author (dc:creator, and RSS's own <author>, which
 * needs an address: the public corrections inbox), the story's image as an enclosure
 * (the credited photo when it has one, else the title card from app/og) with its credit
 * as media:credit, the brief's primary source as <source>, and the body as content:encoded. The feeds are the input to the social posters, so they carry what a
 * post needs: picture, text, link.
 */
import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { DESKS } from './desks';
import { storyPath, type PublicPost } from './content';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nuvoxsaga.com';
const FEED_EMAIL = 'corrections@nuvoxsaga.com';

export function xml(s: string): string {
  return s
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** HTML inside CDATA: the only sequence that can end the section is split in two. */
export function cdata(html: string): string {
  return `<![CDATA[${html.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
}

const MIME: Record<string, string> = { webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', avif: 'image/avif' };

/**
 * The image a feed item carries: a real, credited photo as it is, else the 1200 x 630
 * title card built for every story. The enclosure length is the file's size when the
 * photo is on disk; the card is rendered by another route during the same build, so its
 * size is unknown and reported as 0 (readers accept that).
 */
export function feedImage(p: PublicPost, root = process.cwd()): { url: string; type: string; length: number; credit: string } {
  if (p.image && p.image.credit !== 'AI illustration') {
    const ext = p.image.src.split('.').pop()?.toLowerCase() ?? '';
    let length = 0;
    try {
      length = fs.statSync(path.join(root, 'public', p.image.src)).size;
    } catch {
      length = 0;
    }
    return { url: `${SITE_URL}${p.image.src}`, type: MIME[ext] ?? 'application/octet-stream', length, credit: p.image.credit };
  }
  // The title card is ours (app/og): the credit names the publication.
  return { url: `${SITE_URL}/og/${p.brand}/${p.slug}.png`, type: 'image/png', length: 0, credit: 'Nuvoxsaga' };
}

export function rss(args: { title: string; path: string; description: string; posts: PublicPost[] }): Response {
  const items = args.posts
    .slice(0, 50)
    .map((p) => {
      const url = `${SITE_URL}${storyPath(p)}`;
      const desk = `Nuvoxsaga ${DESKS[p.brand].name} desk`;
      const img = feedImage(p);
      return [
        '<item>',
        `<title>${xml(p.title)}</title>`,
        `<link>${xml(url)}</link>`,
        `<guid isPermaLink="true">${xml(url)}</guid>`,
        p.publishedAt ? `<pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>` : '',
        `<dc:creator>${xml(desk)}</dc:creator>`,
        `<author>${xml(`${FEED_EMAIL} (${desk})`)}</author>`,
        `<category>${xml(DESKS[p.brand].name)}</category>`,
        p.excerpt ? `<description>${xml(p.excerpt)}</description>` : '',
        // The primary source a brief was written from, as RSS's own <source> (url required).
        p.source ? `<source url="${xml(p.source.url)}">${xml(p.source.name)}</source>` : '',
        `<enclosure url="${xml(img.url)}" type="${img.type}" length="${img.length}"/>`,
        `<media:credit>${xml(img.credit)}</media:credit>`,
        p.bodyHtmlSanitized ? `<content:encoded>${cdata(p.bodyHtmlSanitized)}</content:encoded>` : '',
        '</item>',
      ].join('');
    })
    .join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/">
<channel>
<title>${xml(args.title)}</title>
<link>${xml(SITE_URL + args.path)}</link>
<atom:link href="${xml(`${SITE_URL}${args.path === '/' ? '' : args.path}/feed.xml`)}" rel="self" type="application/rss+xml"/>
<description>${xml(args.description)}</description>
<language>en</language>
<image><url>${xml(`${SITE_URL}/logos/nuvoxsaga.png`)}</url><title>${xml(args.title)}</title><link>${xml(SITE_URL + args.path)}</link></image>
${items}
</channel>
</rss>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}

/** Google News sitemap: only stories from the last 2 days (Google's rule). */
export function newsSitemap(posts: PublicPost[], now = Date.now()): Response {
  const recent = posts.filter((p) => p.publishedAt && now - Date.parse(p.publishedAt) <= 2 * 864e5).slice(0, 1000);
  const urls = recent
    .map(
      (p) => `<url><loc>${xml(`${SITE_URL}${storyPath(p)}`)}</loc><news:news><news:publication><news:name>Nuvoxsaga</news:name><news:language>en</news:language></news:publication><news:publication_date>${xml(p.publishedAt!)}</news:publication_date><news:title>${xml(p.title)}</news:title></news:news></url>`,
    )
    .join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
