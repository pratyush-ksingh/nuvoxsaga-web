/**
 * Archive of the old nuvox-ai.com (Ghost) posts, exported by
 * youtube-ai-system/scripts/export_archive.py into content/archive/<slug>.json.
 *
 * These posts predate the fact-checking process. They are served under /archive with a
 * warning banner, kept out of search engines (noindex) and out of the sitemap, and never
 * mixed into the fact-checked feeds. HTML is sanitized at build like every other post.
 */
import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { sanitizePostHtml } from './sanitize';

export interface ArchivePost {
  slug: string;
  title: string;
  excerpt?: string;
  bodyHtmlSanitized: string;
  publishedAt?: string;
  originalUrl?: string;
  readingTimeMin?: number;
}

const ARCHIVE_DIR = path.join(process.cwd(), 'content', 'archive');
// Old Ghost video slugs embed YouTube ids, which can contain "_".
const SLUG_RE = /^[a-z0-9_-]{1,200}$/;

let cache: ArchivePost[] | null = null;

export function loadArchive(): ArchivePost[] {
  if (cache) return cache;
  const posts: ArchivePost[] = [];
  if (fs.existsSync(ARCHIVE_DIR)) {
    for (const name of fs.readdirSync(ARCHIVE_DIR)) {
      if (!name.endsWith('.json')) continue;
      const slug = name.slice(0, -5);
      if (!SLUG_RE.test(slug)) throw new Error(`content/archive/${name}: invalid slug`);
      const raw = JSON.parse(fs.readFileSync(path.join(ARCHIVE_DIR, name), 'utf8')) as Record<string, unknown>;
      if (typeof raw.title !== 'string' || typeof raw.bodyHtml !== 'string') {
        throw new Error(`content/archive/${name}: missing title or bodyHtml`);
      }
      posts.push({
        slug,
        title: raw.title,
        excerpt: typeof raw.excerpt === 'string' && raw.excerpt ? raw.excerpt : undefined,
        bodyHtmlSanitized: sanitizePostHtml(raw.bodyHtml),
        publishedAt: typeof raw.publishedAt === 'string' ? raw.publishedAt : undefined,
        originalUrl: typeof raw.originalUrl === 'string' ? raw.originalUrl : undefined,
        readingTimeMin: typeof raw.readingTimeMin === 'number' ? raw.readingTimeMin : undefined,
      });
    }
  }
  posts.sort((a, b) => Date.parse(b.publishedAt ?? '') - Date.parse(a.publishedAt ?? ''));
  cache = posts;
  return posts;
}

export function getArchivePost(slug: string): ArchivePost | null {
  if (!SLUG_RE.test(slug)) return null;
  return loadArchive().find((p) => p.slug === slug) ?? null;
}
