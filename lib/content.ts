/**
 * Build-time content layer for the static site.
 *
 * Posts are JSON files written by the Python pipeline (only after its fail-closed
 * fact-check) and committed to the repo:
 *
 *     content/posts/<brand_id>/<slug>.json
 *
 * Every file is validated here while the site is built; an invalid file fails the
 * build loudly instead of shipping a broken or unsafe page.
 *
 * SECURITY:
 *   - Only `status: "published"` posts whose publishedAt is not in the future are
 *     exposed. Drafts cannot leak onto a public page.
 *   - Body HTML is sanitized here (lib/sanitize.ts, same policy the CMS used) and
 *     only the sanitized form is ever returned as `bodyHtmlSanitized`.
 *   - Brand and slug are validated against the folder they live in, so a file
 *     cannot publish itself into another brand's section.
 */
import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { BRANDS, type BrandId } from './brands';
import { DESKS } from './desks';
import { sanitizePostHtml } from './sanitize';

/** A short news brief written from one primary source, or a longer researched feature. */
export type StoryKind = 'brief' | 'feature';

export interface StoryImage {
  /** Site-relative path under /media, e.g. /media/space/<slug>.webp */
  src: string;
  alt: string;
  /** Required: who made the image (e.g. "NASA/JPL-Caltech" or "AI illustration"). */
  credit: string;
}

export interface PublicPost {
  id: string;
  kind: StoryKind;
  /** Section slug within the desk (lib/desks.ts). */
  section?: string;
  /** Editor pick: eligible for the lead slot on the home page and desk front. */
  featured?: boolean;
  /** The primary source a brief was written from. Required for briefs. */
  source?: { name: string; url: string };
  image?: StoryImage;
  corrections?: { date: string; text: string }[];
  title: string;
  slug: string;
  brand: BrandId;
  excerpt?: string;
  bodyHtmlSanitized?: string;
  publishedAt?: string;
  updatedAt?: string;
  wordCount?: number;
  readingTimeMin?: number;
  topic?: string;
  tags?: string[];
  schemaLD?: unknown;
  faqPairs?: { question: string; answer: string }[];
  sourceVideoId?: string;
  /** Publishers the research and fact-check relied on (from live search). */
  sources?: string[];
  /** Every claim the independent fact-check confirmed, with the source that confirmed it. */
  checkedClaims?: { claim: string; source: string }[];
}

// NUVOXSAGA_CONTENT_DIR lets a local preview build against design fixtures
// (content-fixtures/). A production build must never read anything but content/.
const CONTENT_OVERRIDE = process.env.NUVOXSAGA_CONTENT_DIR;
if (CONTENT_OVERRIDE && process.env.NEXT_PUBLIC_SITE_URL === 'https://nuvoxsaga.com') {
  throw new Error('NUVOXSAGA_CONTENT_DIR is set for a production build; refusing to ship fixtures');
}
export const POSTS_DIR = path.resolve(process.cwd(), CONTENT_OVERRIDE ?? 'content', 'posts');
const SLUG_RE = /^[a-z0-9-]{1,200}$/;
const MEDIA_RE = /^\/media\/[a-z0-9/_-]{1,200}\.(webp|jpg|jpeg|png|avif)$/;
const HTTPS_RE = /^https:\/\/[^\s"'<>]{4,500}$/;

/** URL-safe topic slug for a tag ("SpaceX Starship" -> "spacex-starship"). */
export function topicSlug(tag: string): string {
  return tag
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Canonical path of a story. */
export function storyPath(p: Pick<PublicPost, 'brand' | 'slug'>): string {
  const brand = BRANDS.find((b) => b.id === p.brand);
  return `/${brand?.slug ?? ''}/news/${p.slug}`;
}
const BRAND_IDS = new Set<string>(BRANDS.map((b) => b.id));

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v : undefined;
}

function parsePost(file: string, brand: BrandId): PublicPost | null {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
  const slug = path.basename(file, '.json');
  const where = path.relative(process.cwd(), file);

  if (!SLUG_RE.test(slug)) throw new Error(`${where}: invalid slug "${slug}"`);
  if (raw.slug !== undefined && raw.slug !== slug) throw new Error(`${where}: slug field != filename`);
  if (raw.brand !== undefined && raw.brand !== brand) throw new Error(`${where}: brand field != folder`);
  if (!str(raw.title)) throw new Error(`${where}: missing title`);
  if (!str(raw.bodyHtml)) throw new Error(`${where}: missing bodyHtml`);

  if (raw.status !== 'published') return null;
  const publishedAt = str(raw.publishedAt);
  if (!publishedAt || Number.isNaN(Date.parse(publishedAt))) {
    throw new Error(`${where}: published post needs a valid publishedAt`);
  }
  if (Date.parse(publishedAt) > Date.now()) return null; // scheduled for later

  const kind: StoryKind = raw.kind === 'brief' ? 'brief' : 'feature';
  const section = str(raw.section);
  if (section && !DESKS[brand].sections.some((s) => s.slug === section)) {
    throw new Error(`${where}: unknown section "${section}" for ${brand}`);
  }
  let source: PublicPost['source'];
  if (raw.source !== undefined) {
    const src = raw.source as { name?: unknown; url?: unknown };
    if (!str(src?.name) || typeof src.url !== 'string' || !HTTPS_RE.test(src.url)) {
      throw new Error(`${where}: source needs a name and an https url`);
    }
    source = { name: String(src.name), url: src.url };
  }
  if (kind === 'brief' && !source) throw new Error(`${where}: a brief must name its primary source`);
  let image: StoryImage | undefined;
  if (raw.image !== undefined) {
    const im = raw.image as { src?: unknown; alt?: unknown; credit?: unknown };
    if (typeof im?.src !== 'string' || !MEDIA_RE.test(im.src) || !str(im.alt) || !str(im.credit)) {
      throw new Error(`${where}: image needs a /media/... src, alt and credit`);
    }
    image = { src: im.src, alt: String(im.alt), credit: String(im.credit) };
  }

  return {
    id: `${brand}/${slug}`,
    kind,
    section,
    featured: raw.featured === true,
    source,
    image,
    corrections: Array.isArray(raw.corrections)
      ? raw.corrections
          .map((c) => ({
            date: String((c as { date?: unknown }).date ?? ''),
            text: String((c as { text?: unknown }).text ?? ''),
          }))
          .filter((c) => c.text && !Number.isNaN(Date.parse(c.date)))
      : [],
    title: String(raw.title),
    slug,
    brand,
    excerpt: str(raw.excerpt),
    bodyHtmlSanitized: sanitizePostHtml(String(raw.bodyHtml)),
    publishedAt,
    updatedAt: str(raw.updatedAt) ?? publishedAt,
    wordCount: typeof raw.wordCount === 'number' ? raw.wordCount : undefined,
    readingTimeMin: typeof raw.readingTimeMin === 'number' ? raw.readingTimeMin : undefined,
    topic: str(raw.topic),
    tags: Array.isArray(raw.tags) ? raw.tags.filter((t): t is string => typeof t === 'string') : [],
    schemaLD: raw.schemaLD,
    faqPairs: Array.isArray(raw.faqPairs)
      ? raw.faqPairs.map((p) => ({
          question: String((p as { question?: unknown }).question ?? ''),
          answer: String((p as { answer?: unknown }).answer ?? ''),
        }))
      : [],
    sourceVideoId: str(raw.sourceVideoId),
    sources: Array.isArray(raw.sources) ? raw.sources.filter((x): x is string => typeof x === 'string') : [],
    checkedClaims: Array.isArray(raw.checkedClaims)
      ? raw.checkedClaims
          .map((c) => ({
            claim: String((c as { claim?: unknown }).claim ?? ''),
            source: String((c as { source?: unknown }).source ?? ''),
          }))
          .filter((c) => c.claim)
      : [],
  };
}

let cache: PublicPost[] | null = null;

/** Every published post across all brands, newest first. Read once per build. */
export function loadAllPosts(): PublicPost[] {
  if (cache) return cache;
  const posts: PublicPost[] = [];
  if (fs.existsSync(POSTS_DIR)) {
    for (const brand of fs.readdirSync(POSTS_DIR)) {
      if (!BRAND_IDS.has(brand)) {
        throw new Error(`content/posts/${brand}: unknown brand folder (expected ${[...BRAND_IDS].join(', ')})`);
      }
      const dir = path.join(POSTS_DIR, brand);
      for (const name of fs.readdirSync(dir)) {
        if (!name.endsWith('.json')) continue;
        const post = parsePost(path.join(dir, name), brand as BrandId);
        if (post) posts.push(post);
      }
    }
  }
  posts.sort((a, b) => Date.parse(b.publishedAt ?? '') - Date.parse(a.publishedAt ?? ''));
  cache = posts;
  return posts;
}

export async function fetchPostsForBrand(brand: BrandId, limit = 12): Promise<PublicPost[]> {
  return loadAllPosts().filter((p) => p.brand === brand).slice(0, limit);
}

export async function fetchPost(brand: BrandId, slug: string): Promise<PublicPost | null> {
  if (!SLUG_RE.test(slug)) return null;
  return loadAllPosts().find((p) => p.brand === brand && p.slug === slug) ?? null;
}

export async function fetchAllPostsForBrand(brand: BrandId): Promise<PublicPost[]> {
  return loadAllPosts().filter((p) => p.brand === brand);
}

export function storiesForSection(brand: BrandId, section: string): PublicPost[] {
  return loadAllPosts().filter((p) => p.brand === brand && p.section === section);
}

/** Every topic (tag) with its stories, keyed by topic slug. */
export function loadTopics(): Map<string, { name: string; posts: PublicPost[] }> {
  const topics = new Map<string, { name: string; posts: PublicPost[] }>();
  for (const p of loadAllPosts()) {
    for (const tag of p.tags ?? []) {
      const slug = topicSlug(tag);
      if (!slug) continue;
      const t = topics.get(slug) ?? { name: tag, posts: [] };
      t.posts.push(p);
      topics.set(slug, t);
    }
  }
  return topics;
}

/** The most-used topics in the last 14 days of stories, for the topic strip. */
export function trendingTopics(limit = 8): { slug: string; name: string }[] {
  const posts = loadAllPosts();
  const newest = posts[0]?.publishedAt ? Date.parse(posts[0].publishedAt) : 0;
  const counts = new Map<string, { name: string; n: number }>();
  for (const p of posts) {
    if (newest - Date.parse(p.publishedAt ?? '') > 14 * 864e5) break;
    for (const tag of p.tags ?? []) {
      const slug = topicSlug(tag);
      if (!slug) continue;
      const c = counts.get(slug) ?? { name: tag, n: 0 };
      c.n++;
      counts.set(slug, c);
    }
  }
  return [...counts.entries()]
    .filter(([, c]) => c.n >= 2)
    .sort((a, b) => b[1].n - a[1].n)
    .slice(0, limit)
    .map(([slug, c]) => ({ slug, name: c.name }));
}

/**
 * Split a list into a lead story, up to `n` secondary stories and the rest. The lead is
 * the newest featured story from the last 3 days if there is one, else the newest story.
 */
export function splitTop(posts: PublicPost[], n = 3): { lead?: PublicPost; secondary: PublicPost[]; rest: PublicPost[] } {
  if (!posts.length) return { secondary: [], rest: [] };
  const newest = Date.parse(posts[0].publishedAt ?? '');
  const lead =
    posts.find((p) => p.featured && newest - Date.parse(p.publishedAt ?? '') < 3 * 864e5) ?? posts[0];
  const others = posts.filter((p) => p !== lead);
  // Secondary slots prefer features and stories with images: they carry the visual weight.
  // Only the 10 newest compete, so a week-old feature never outranks today's news.
  const ranked = others.slice(0, 10).sort((a, b) => weight(b) - weight(a));
  const secondary = ranked.slice(0, n).sort((a, b) => others.indexOf(a) - others.indexOf(b));
  return { lead, secondary, rest: others.filter((p) => !secondary.includes(p)) };
}

function weight(p: PublicPost): number {
  return (p.kind === 'feature' ? 2 : 0) + (p.image ? 1 : 0);
}
