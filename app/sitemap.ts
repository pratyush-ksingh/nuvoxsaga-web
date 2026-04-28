/**
 * Multi-brand sitemap.xml generator.
 *
 * Routes covered:
 *   /                                    weekly
 *   /[brand]                       ×3   weekly
 *   /[brand]/blog                  ×3   daily
 *   /[brand]/blog/[slug]                published-only, lastModified=updatedAt
 *   /about /labs /shorts                weekly
 *
 * Drafts and scheduled posts are EXCLUDED. Defense in depth — ensures
 * unpublished URLs never leak via the sitemap even if Payload's access
 * rules misbehave.
 *
 * Submitted to Google Search Console + Bing Webmaster Tools after launch.
 */
import type { MetadataRoute } from 'next';
import { BRANDS } from '@/lib/brands';
import { getPayload } from 'payload';
import config from '@/payload.config';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nuvoxsaga.com';
const MAX_POSTS = 50_000; // Google's per-sitemap cap

interface PostRow {
  brand: string;
  slug: string;
  updatedAt: string;
}

async function getPublishedPosts(): Promise<PostRow[]> {
  // CI builds and dev without DB credentials produce an empty sitemap rather
  // than crashing. The sitemap is regenerated on every ISR + on-demand
  // revalidate when Payload changes — fail-soft is the right posture.
  if (!process.env.DATABASE_URI) return [];
  try {
    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: 'posts',
      where: {
        and: [
          { status: { equals: 'published' } },
          { brand: { in: BRANDS.map((b) => b.id) } },
        ],
      },
      limit: MAX_POSTS,
      depth: 0,
      sort: '-updatedAt',
    });
    return result.docs.map((d) => ({
      brand: String(d.brand ?? ''),
      slug: String(d.slug ?? ''),
      updatedAt: String(d.updatedAt ?? new Date().toISOString()),
    }));
  } catch (e) {
    console.warn('sitemap: posts query failed:', (e as Error).message);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/labs`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${SITE_URL}/shorts`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
  ];

  const brandEntries: MetadataRoute.Sitemap = BRANDS.flatMap((b) => [
    {
      url: `${SITE_URL}/${b.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/${b.slug}/blog`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    },
  ]);

  const posts = await getPublishedPosts();
  const postEntries: MetadataRoute.Sitemap = posts
    .filter((p) => /^[a-z0-9-]{1,200}$/.test(p.slug))
    .map((p) => {
      const slug = BRANDS.find((b) => b.id === p.brand)?.slug;
      if (!slug) return null;
      return {
        url: `${SITE_URL}/${slug}/blog/${p.slug}`,
        lastModified: new Date(p.updatedAt),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  return [...staticEntries, ...brandEntries, ...postEntries];
}
