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

/**
 * The old posts were written by a model that sometimes left its own chatter in the
 * output: an opening "Here is the SEO-optimized version of the article…" paragraph and a
 * trailing "---SEO_METADATA---" block. Neither is article text, so both are removed
 * when the archive is loaded. Pure, so it is unit-tested (tests/archive.test.ts).
 */
// The first paragraph, when it holds plain text only (a preamble never has markup in it).
const FIRST_P = /^\s*<p>([^<]*)<\/p>\s*/i;
const PREAMBLE_TEXT = /\bhere is the\b.*\b(?:article|version)\b/i;
const OF_COURSE = /^\s*of course\b/i;
const LEADING_HR = /^<hr\s*\/?>\s*/i;
// "<p>---SEO_METADATA---</p>", "<h2 id="seo_metadata">SEO_METADATA</h2>" and "<p>---SEO_METADATA---\n{…"
// all mark the start of the leaked block; everything from there to the end goes.
const META_START = /<(?:p|h[1-6])\b[^>]*>\s*-*\s*(?:SEO[_ ])?METADATA\b/i;
const TRAILING_HR = /<hr\s*\/?>\s*$/i;

export function stripModelChatter(html: string): string {
  let out = html;
  // A preamble can span two paragraphs ("Of course. …" then "Here is the article.").
  for (let i = 0; i < 2; i++) {
    const m = FIRST_P.exec(out);
    if (!m || !(PREAMBLE_TEXT.test(m[1]) || OF_COURSE.test(m[1]))) break;
    out = out.slice(m[0].length).replace(LEADING_HR, '');
  }
  const at = out.search(META_START);
  if (at >= 0) out = out.slice(0, at).trimEnd().replace(TRAILING_HR, '');
  return out.trim();
}

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
        bodyHtmlSanitized: sanitizePostHtml(stripModelChatter(raw.bodyHtml)),
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
