/**
 * sitemap.xml: home, desk and section fronts, trust pages, topics and every published
 * story (/<desk>/news/<slug>). Drafts, scheduled posts and the noindex archive are
 * excluded. Fresh stories are also listed in /news-sitemap.xml for Google News.
 */
import type { MetadataRoute } from 'next';
import { BRANDS } from '@/lib/brands';
import { DESKS } from '@/lib/desks';
import { loadAllPosts, loadTopics, storyPath } from '@/lib/content';

export const dynamic = 'force-static';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nuvoxsaga.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const posts = loadAllPosts();

  const pages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: 'hourly', priority: 1 },
    { url: `${SITE_URL}/latest`, lastModified: now, changeFrequency: 'hourly', priority: 0.8 },
    { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/standards`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/corrections`, changeFrequency: 'weekly', priority: 0.3 },
  ];

  const desks: MetadataRoute.Sitemap = BRANDS.flatMap((b) => [
    { url: `${SITE_URL}/${b.slug}`, lastModified: now, changeFrequency: 'hourly' as const, priority: 0.9 },
    ...DESKS[b.id].sections.map((s) => ({
      url: `${SITE_URL}/${b.slug}/${s.slug}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.6,
    })),
  ]);

  const topics: MetadataRoute.Sitemap = [...loadTopics().entries()]
    .filter(([, t]) => t.posts.length >= 2)
    .map(([slug]) => ({ url: `${SITE_URL}/topic/${slug}`, changeFrequency: 'daily' as const, priority: 0.4 }));

  const stories: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${SITE_URL}${storyPath(p)}`,
    lastModified: new Date(p.updatedAt ?? p.publishedAt ?? now),
    changeFrequency: 'monthly' as const,
    priority: p.kind === 'feature' ? 0.7 : 0.5,
  }));

  return [...pages, ...desks, ...topics, ...stories];
}
