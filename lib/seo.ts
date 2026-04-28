/**
 * Schema.org JSON-LD builders — TS port of the 7-schema generator from
 * D:/nuvoxai/youtube-ai-system/blog/blog_seo.py:generate_all_schemas.
 *
 * Two roles:
 *  1. Used by the Python pipeline path indirectly: posts already have
 *     `schemaLD` JSON pre-populated by the pipeline; the page just inlines
 *     it. These TS builders provide a FALLBACK when post.schemaLD is
 *     missing or empty (defense-in-depth).
 *  2. Used by non-blog routes (homepage, brand pages, /about) which the
 *     Python pipeline doesn't write — those generate schema fresh in TS.
 *
 * Compile-time validated via Google's official `schema-dts` types.
 *
 * SECURITY: nothing here writes HTML — output is pure JSON, embedded in
 * <script type="application/ld+json"> by the page. Even so, all string
 * fields that flow from user-controlled Post records are passed through
 * stripUnsafeJSONLD before serialisation (defence against JSON-LD-shaped
 * XSS via </script> in a title).
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
  WithContext,
} from 'schema-dts';
import { BRAND_BY_ID, type BrandId } from './brands';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nuvoxsaga.com';
const ORG_NAME = 'Nuvoxsaga';

// ─────────────────────────────────────────────────────────────────────────
// String hygiene — JSON.stringify already escapes most chars, but a literal
// `</script>` in a title would close the inline script block. We strip the
// closing tag pattern as defence-in-depth even though the page must also
// JSON.stringify before insertion.
// ─────────────────────────────────────────────────────────────────────────
export function stripUnsafeJSONLD(s: unknown): string {
  if (typeof s !== 'string') return '';
  return s
    .replace(/<\/script/gi, '<\\/script')
    .replace(/<!--/g, '<\\!--')
    // Defence-in-depth — close CDATA breakout even though we never wrap in CDATA.
    .replace(/]]>/g, ']]\\>');
}

// ─────────────────────────────────────────────────────────────────────────
// Organization (publisher)
// ─────────────────────────────────────────────────────────────────────────
export function organizationSchema(brandId?: BrandId): WithContext<Organization> {
  const brand = brandId ? BRAND_BY_ID[brandId] : undefined;
  const url = brand ? `${SITE_URL}/${brand.slug}` : SITE_URL;
  const logo = brand ? `${SITE_URL}/logos/${brand.id}.png` : `${SITE_URL}/logos/nuvox_ai.png`;
  const name = brand ? brand.name : ORG_NAME;
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url,
    logo,
    sameAs: brand
      ? [`https://youtube.com/${brand.handle}`]
      : ['https://youtube.com/@nuvoxai', 'https://youtube.com/@nuvoxspace', 'https://youtube.com/@nuvoxworld'],
  };
}

// ─────────────────────────────────────────────────────────────────────────
// BreadcrumbList
// ─────────────────────────────────────────────────────────────────────────
export function breadcrumbSchema(args: {
  brandId: BrandId;
  postSlug?: string;
  postTitle?: string;
}): WithContext<BreadcrumbList> {
  const brand = BRAND_BY_ID[args.brandId];
  const items = [
    { '@type': 'ListItem' as const, position: 1, name: 'Nuvoxsaga', item: SITE_URL },
    { '@type': 'ListItem' as const, position: 2, name: brand.name, item: `${SITE_URL}/${brand.slug}` },
    { '@type': 'ListItem' as const, position: 3, name: 'Blog', item: `${SITE_URL}/${brand.slug}/blog` },
  ];
  if (args.postSlug && args.postTitle) {
    items.push({
      '@type': 'ListItem',
      position: 4,
      name: stripUnsafeJSONLD(args.postTitle),
      item: `${SITE_URL}/${brand.slug}/blog/${args.postSlug}`,
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
  author?: string;
  publishedAt?: string;
  updatedAt?: string;
  imageUrl?: string;
  wordCount?: number;
  tier?: 'evergreen' | 'news' | 'companion';
}): WithContext<TechArticle | NewsArticle | BlogPosting | Article> {
  const brand = BRAND_BY_ID[args.brandId];
  const url = `${SITE_URL}/${brand.slug}/blog/${args.slug}`;
  const t =
    args.tier === 'evergreen' ? 'TechArticle' : args.tier === 'news' ? 'NewsArticle' : 'BlogPosting';

  return {
    '@context': 'https://schema.org',
    '@type': t,
    headline: stripUnsafeJSONLD(args.title),
    description: stripUnsafeJSONLD(args.excerpt ?? ''),
    image: args.imageUrl ? [args.imageUrl] : [`${SITE_URL}/banners/${args.brandId}_1.1920.avif`],
    author: { '@type': 'Person', name: args.author || 'Nuvoxsaga Editorial' },
    publisher: organizationSchema(args.brandId),
    datePublished: args.publishedAt ?? new Date().toISOString(),
    dateModified: args.updatedAt ?? args.publishedAt ?? new Date().toISOString(),
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    wordCount: args.wordCount,
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['h1', '.key-takeaways', 'h2'],
    },
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
// generateAll — FALLBACK when post.schemaLD JSON is missing.
// Mirrors blog_seo.py:generate_all_schemas.
// ─────────────────────────────────────────────────────────────────────────
export function generateAllSchemas(args: {
  brandId: BrandId;
  slug: string;
  title: string;
  excerpt?: string;
  author?: string;
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
  out.push(organizationSchema(args.brandId));
  if (args.faqPairs?.length) {
    const faq = faqSchema(args.faqPairs);
    if (faq) out.push(faq);
  }
  if (args.videoId) {
    const v = videoSchema({ videoId: args.videoId, title: args.title });
    if (v) out.push(v);
  }
  return out;
}
