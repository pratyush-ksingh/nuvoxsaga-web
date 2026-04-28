/**
 * Server-side Payload data layer for the public site.
 *
 * Fail-soft on every query: if Payload/DB is unavailable (CI build, dev
 * without DATABASE_URI), we return empty arrays instead of crashing the
 * page. Production deploys MUST have DATABASE_URI set.
 *
 * SECURITY:
 *   - All queries enforce `status: 'published'` server-side. Drafts and
 *     scheduled posts CANNOT leak to public surfaces via these helpers.
 *   - The brand argument is type-narrowed to BrandId so callers can't
 *     inject arbitrary strings into Payload's `where` clause.
 *   - All public-facing post bodies are read from `bodyHtmlSanitized`
 *     (DOMPurify-sanitised at write time per Posts.ts beforeChange) — never
 *     from raw `body` (Lexical tree, untrusted).
 */
import 'server-only';
import { getPayload } from 'payload';
import config from '@/payload.config';
import type { BrandId } from './brands';

export interface PublicPost {
  id: string;
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
}

const PUBLISHED = { status: { equals: 'published' as const } };

function unwrapTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((t) => (typeof t === 'object' && t && 'tag' in t ? String((t as { tag: unknown }).tag) : ''))
    .filter(Boolean);
}

function unwrapFaq(raw: unknown): { question: string; answer: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((p) => ({
    question: String((p as { question?: unknown }).question ?? ''),
    answer: String((p as { answer?: unknown }).answer ?? ''),
  }));
}

function toPublic(doc: Record<string, unknown>): PublicPost {
  return {
    id: String(doc.id),
    title: String(doc.title ?? ''),
    slug: String(doc.slug ?? ''),
    brand: doc.brand as BrandId,
    excerpt: doc.excerpt ? String(doc.excerpt) : undefined,
    bodyHtmlSanitized: doc.bodyHtmlSanitized ? String(doc.bodyHtmlSanitized) : undefined,
    publishedAt: doc.publishedAt ? String(doc.publishedAt) : undefined,
    updatedAt: doc.updatedAt ? String(doc.updatedAt) : undefined,
    wordCount: typeof doc.wordCount === 'number' ? doc.wordCount : undefined,
    readingTimeMin: typeof doc.readingTimeMin === 'number' ? doc.readingTimeMin : undefined,
    topic: doc.topic ? String(doc.topic) : undefined,
    tags: unwrapTags(doc.tags),
    schemaLD: doc.schemaLD,
    faqPairs: unwrapFaq(doc.faqPairs),
    sourceVideoId: doc.sourceVideoId ? String(doc.sourceVideoId) : undefined,
  };
}

export async function fetchPostsForBrand(brand: BrandId, limit = 12): Promise<PublicPost[]> {
  if (!process.env.DATABASE_URI) return [];
  try {
    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: 'posts',
      where: { and: [{ brand: { equals: brand } }, PUBLISHED] },
      limit,
      depth: 0,
      sort: '-publishedAt',
    });
    return result.docs.map((d) => toPublic(d as Record<string, unknown>));
  } catch (e) {
    // Fail-soft. Server-only logging.
    console.warn(`fetchPostsForBrand(${brand}) failed:`, (e as Error).message);
    return [];
  }
}

export async function fetchPost(brand: BrandId, slug: string): Promise<PublicPost | null> {
  if (!process.env.DATABASE_URI) return null;
  // Strict slug validation BEFORE hitting Payload — defence vs malformed URL.
  if (!/^[a-z0-9-]{1,200}$/.test(slug)) return null;
  try {
    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: 'posts',
      where: {
        and: [{ brand: { equals: brand } }, { slug: { equals: slug } }, PUBLISHED],
      },
      limit: 1,
      depth: 0,
    });
    const doc = result.docs[0];
    return doc ? toPublic(doc as Record<string, unknown>) : null;
  } catch (e) {
    console.warn(`fetchPost(${brand}/${slug}) failed:`, (e as Error).message);
    return null;
  }
}

export async function fetchAllPostsForBrand(brand: BrandId): Promise<PublicPost[]> {
  return fetchPostsForBrand(brand, 100);
}
