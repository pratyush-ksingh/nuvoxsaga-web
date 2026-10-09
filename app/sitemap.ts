/**
 * sitemap.xml: home, desk fronts, sections and topics with enough stories to be worth
 * indexing (SECTION_INDEX_MIN, TOPIC_INDEX_MIN), trust pages and every published story
 * (/<desk>/news/<slug>). Drafts, scheduled posts, /<desk>/page/N and the noindex archive
 * are excluded. Fresh stories are also listed in /news-sitemap.xml for Google News.
 */
import type { MetadataRoute } from 'next';
import { BRANDS } from '@/lib/brands';
import { DESKS, SECTION_INDEX_MIN } from '@/lib/desks';
import { EDITOR } from '@/lib/editor';
import { loadAllPosts, loadTopics, storiesForSection, storyPath, TOPIC_INDEX_MIN } from '@/lib/content';

export const dynamic = 'force-static';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nuvoxsaga.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const posts = loadAllPosts();

  const pages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: 'hourly', priority: 1 },
    { url: `${SITE_URL}/latest`, lastModified: now, changeFrequency: 'hourly', priority: 0.8 },
    { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}${EDITOR.path}`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/standards`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/corrections`, changeFrequency: 'weekly', priority: 0.3 },
    { url: `${SITE_URL}/contact`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.2 },
  ];

  const desks: MetadataRoute.Sitemap = BRANDS.flatMap((b) => [
    { url: `${SITE_URL}/${b.slug}`, lastModified: now, changeFrequency: 'hourly' as const, priority: 0.9 },
    ...DESKS[b.id].sections
      .filter((s) => storiesForSection(b.id, s.slug).length >= SECTION_INDEX_MIN)
      .map((s) => ({
        url: `${SITE_URL}/${b.slug}/${s.slug}`,
        lastModified: now,
        changeFrequency: 'daily' as const,
        priority: 0.6,
      })),
  ]);

  const topics: MetadataRoute.Sitemap = [...loadTopics().entries()]
    .filter(([, t]) => t.posts.length >= TOPIC_INDEX_MIN)
    .map(([slug]) => ({ url: `${SITE_URL}/topic/${slug}`, changeFrequency: 'daily' as const, priority: 0.4 }));

  const stories: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${SITE_URL}${storyPath(p)}`,
    lastModified: new Date(p.updatedAt ?? p.publishedAt ?? now),
    changeFrequency: 'monthly' as const,
    priority: p.kind === 'feature' ? 0.7 : 0.5,
  }));

  return [...pages, ...desks, ...topics, ...stories];
}
