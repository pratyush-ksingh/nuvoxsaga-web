import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nuvoxsaga.com';

/**
 * Crawlers that collect pages to train AI models. They are refused.
 *
 * Search and citation crawlers (OAI-SearchBot, Claude-SearchBot, PerplexityBot) and
 * Google-Extended are deliberately NOT listed: they are how a story gets linked from an
 * AI answer, and being found is the point of a news site. Keep this list to training
 * crawlers only.
 */
const TRAINING_CRAWLERS = ['GPTBot', 'ClaudeBot', 'anthropic-ai', 'CCBot'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          // Newsletter endpoints (Pages Functions): nothing to index.
          '/api',
          '/api/',
          // Pagefind's generated index files.
          '/pagefind/',
          // Search results page (also noindex in its metadata).
          '/search',
        ],
      },
      ...TRAINING_CRAWLERS.map((userAgent) => ({ userAgent, disallow: '/' })),
    ],
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/news-sitemap.xml`],
  };
}
