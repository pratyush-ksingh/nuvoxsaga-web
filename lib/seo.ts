/**
 * Schema.org JSON-LD builders.
 *
 * Two roles:
 *  1. Story pages: posts may carry `schemaLD` pre-built by the pipeline; these TS
 *     builders are the fallback when it is missing (today: always).
 *  2. Non-story routes (home) generate their schema here.
 *
 * One publisher: every story is published and authored by the organisation
 * "Nuvoxsaga". The desk (AI, Space, World) is the article's section, not a separate
 * publisher, so the JSON-LD, the byline and the news sitemap all name the same entity.
 * Stories are drafted with AI, so the author is the organisation, never an invented
 * person (Google's structured-data policy forbids impersonation).
 *
 * Compile-time validated via Google's official `schema-dts` types.
 *
 * SECURITY: nothing here writes HTML; output is pure JSON, embedded in
 * <script type="application/ld+json"> by components/JsonLd.tsx, which escapes every
 * `<`. String fields that flow from post files also pass through stripUnsafeJSONLD
 * (defence in depth against a `</script>` in a title).
 */
import type {
  Article,
  BlogPosting,
  BreadcrumbList,
  FAQPage,
  HowTo,
  NewsArticle,
  Organization,
  TechArticle,
  VideoObject,
  WebSite,
  WithContext,
} from 'schema-dts';
import { BRAND_BY_ID, BRANDS, type BrandId } from './brands';
import { DESKS } from './desks';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nuvoxsaga.com';
export const ORG_NAME = 'Nuvoxsaga';
/** 512 x 512 PNG wordmark (public/logos/nuvoxsaga.png). */
const ORG_LOGO = `${SITE_URL}/logos/nuvoxsaga.png`;

export function stripUnsafeJSONLD(s: unknown): string {
  if (typeof s !== 'string') return '';
  return s
    .replace(/<\/script/gi, '<\\/script')
    .replace(/<!--/g, '<\\!--')
    // Defence-in-depth: close CDATA breakout even though we never wrap in CDATA.
    .replace(/]]>/g, ']]\\>');
}

// ─────────────────────────────────────────────────────────────────────────
// Organization (the one publisher) and WebSite
// ─────────────────────────────────────────────────────────────────────────
export function organizationSchema(): WithContext<Organization> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: ORG_NAME,
    url: SITE_URL,
    logo: ORG_LOGO,
    sameAs: BRANDS.map((b) => `https://www.youtube.com/${b.handle}`),
  };
}

export function websiteSchema(): WithContext<WebSite> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: ORG_NAME,
    url: SITE_URL,
    inLanguage: 'en',
    publisher: { '@type': 'Organization', name: ORG_NAME, url: SITE_URL, logo: ORG_LOGO },
  };
}

// ─────────────────────────────────────────────────────────────────────────
// BreadcrumbList: Nuvoxsaga > desk > story
// ─────────────────────────────────────────────────────────────────────────
export function breadcrumbSchema(args: {
  brandId: BrandId;
  postSlug?: string;
  postTitle?: string;
}): WithContext<BreadcrumbList> {
  const brand = BRAND_BY_ID[args.brandId];
  const items = [
    { '@type': 'ListItem' as const, position: 1, name: ORG_NAME, item: SITE_URL },
    { '@type': 'ListItem' as const, position: 2, name: DESKS[args.brandId].name, item: `${SITE_URL}/${brand.slug}` },
  ];
  if (args.postSlug && args.postTitle) {
    items.push({
      '@type': 'ListItem',
      position: 3,
      name: stripUnsafeJSONLD(args.postTitle),
      item: `${SITE_URL}/${brand.slug}/news/${args.postSlug}`,
    });
  }
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items };
}

// ─────────────────────────────────────────────────────────────────────────
// Article (TechArticle / NewsArticle / BlogPosting based on tier)
// ─────────────────────────────────────────────────────────────────────────
export function articleSchema(args: {
  brandId: BrandId;
  slug: string;
  title: string;
  excerpt?: string;
  publishedAt?: string;
  updatedAt?: string;
  imageUrl?: string;
  wordCount?: number;
  tier?: 'evergreen' | 'news' | 'companion';
}): WithContext<TechArticle | NewsArticle | BlogPosting | Article> {
  const brand = BRAND_BY_ID[args.brandId];
  const url = `${SITE_URL}/${brand.slug}/news/${args.slug}`;
  const t =
    args.tier === 'evergreen' ? 'TechArticle' : args.tier === 'news' ? 'NewsArticle' : 'BlogPosting';

  return {
    '@context': 'https://schema.org',
    '@type': t,
    headline: stripUnsafeJSONLD(args.title),
    description: stripUnsafeJSONLD(args.excerpt ?? ''),
    image: [args.imageUrl ?? `${SITE_URL}/og/${args.brandId}/${args.slug}.png`],
    // author.url identifies the author: the page that says who writes and checks stories.
    author: { '@type': 'Organization', name: ORG_NAME, url: `${SITE_URL}/standards` },
    publisher: { '@type': 'Organization', name: ORG_NAME, url: SITE_URL, logo: ORG_LOGO },
    articleSection: DESKS[args.brandId].name,
    datePublished: args.publishedAt ?? new Date().toISOString(),
    dateModified: args.updatedAt ?? args.publishedAt ?? new Date().toISOString(),
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    wordCount: args.wordCount,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// FAQPage
// ─────────────────────────────────────────────────────────────────────────
export function faqSchema(
  pairs: ReadonlyArray<{ question: string; answer: string }>,
): WithContext<FAQPage> | null {
  if (!pairs.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: pairs.map((p) => ({
      '@type': 'Question',
      name: stripUnsafeJSONLD(p.question),
      acceptedAnswer: { '@type': 'Answer', text: stripUnsafeJSONLD(p.answer) },
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// VideoObject (YouTube-backed)
// ─────────────────────────────────────────────────────────────────────────
export function videoSchema(args: {
  videoId: string;
  title: string;
  description?: string;
  uploadDate?: string;
}): WithContext<VideoObject> | null {
  if (!args.videoId || !/^[A-Za-z0-9_-]{11}$/.test(args.videoId)) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: stripUnsafeJSONLD(args.title),
    description: stripUnsafeJSONLD(args.description ?? ''),
    thumbnailUrl: [`https://i.ytimg.com/vi/${args.videoId}/maxresdefault.jpg`],
    embedUrl: `https://www.youtube.com/embed/${args.videoId}`,
    uploadDate: args.uploadDate ?? new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// HowTo (numbered-step posts)
// ─────────────────────────────────────────────────────────────────────────
export function howToSchema(args: {
  name: string;
  steps: ReadonlyArray<{ name: string; text: string }>;
}): WithContext<HowTo> | null {
  if (!args.steps.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: stripUnsafeJSONLD(args.name),
    step: args.steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: stripUnsafeJSONLD(s.name),
      text: stripUnsafeJSONLD(s.text),
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Everything a story page embeds: the article (which names the publisher), its
// breadcrumb, and FAQ / video blocks when the story has them.
// ─────────────────────────────────────────────────────────────────────────
export function generateAllSchemas(args: {
  brandId: BrandId;
  slug: string;
  title: string;
  excerpt?: string;
  publishedAt?: string;
  updatedAt?: string;
  imageUrl?: string;
  wordCount?: number;
  tier?: 'evergreen' | 'news' | 'companion';
  faqPairs?: ReadonlyArray<{ question: string; answer: string }>;
  videoId?: string;
}): unknown[] {
  const out: unknown[] = [];
  out.push(articleSchema(args));
  out.push(breadcrumbSchema({ brandId: args.brandId, postSlug: args.slug, postTitle: args.title }));
  if (args.faqPairs?.length) {
    const faq = faqSchema(args.faqPairs);
    if (faq) out.push(faq);
  }
  if (args.videoId) {
    const v = videoSchema({ videoId: args.videoId, title: args.title, uploadDate: args.publishedAt });
    if (v) out.push(v);
  }
  return out;
}
