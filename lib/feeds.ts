/**
 * RSS 2.0 and Google News sitemap builders. Every interpolated value goes through xml(),
 * so a headline can never inject markup into a feed.
 */
import 'server-only';
import { DESKS } from './desks';
import { storyPath, type PublicPost } from './content';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nuvoxsaga.com';

export function xml(s: string): string {
  return s
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function rss(args: { title: string; path: string; description: string; posts: PublicPost[] }): Response {
  const items = args.posts
    .slice(0, 50)
    .map((p) => {
      const url = `${SITE_URL}${storyPath(p)}`;
      return [
        '<item>',
        `<title>${xml(p.title)}</title>`,
        `<link>${xml(url)}</link>`,
        `<guid isPermaLink="true">${xml(url)}</guid>`,
        p.publishedAt ? `<pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>` : '',
        `<category>${xml(DESKS[p.brand].name)}</category>`,
        p.excerpt ? `<description>${xml(p.excerpt)}</description>` : '',
        '</item>',
      ].join('');
    })
    .join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${xml(args.title)}</title>
<link>${xml(SITE_URL + args.path)}</link>
<atom:link href="${xml(`${SITE_URL}${args.path === '/' ? '' : args.path}/feed.xml`)}" rel="self" type="application/rss+xml"/>
<description>${xml(args.description)}</description>
<language>en</language>
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

