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
 * person (Google's structured-data policy forbids impersonation). The one real human,
 * the editor (lib/editor.ts), is credited as `editor` on every article and has a
 * ProfilePage + Person of his own; the organisation is a NewsMediaOrganization whose
 * policy links (standards, corrections, masthead, ownership, feedback) point at the
 * pages that state them.
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
  NewsMediaOrganization,
  ProfilePage,
  ReportageNewsArticle,
  BackgroundNewsArticle,
  TechArticle,
  VideoObject,
  WebSite,
  WithContext,
} from 'schema-dts';
import { BRAND_BY_ID, BRANDS, type BrandId } from './brands';
import { DESKS } from './desks';
import { EDITOR } from './editor';
import { INSTAGRAM_URL, X_URL } from './social';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nuvoxsaga.com';
export const ORG_NAME = 'Nuvoxsaga';
/** 512 x 512 PNG wordmark (public/logos/nuvoxsaga.png). */
const ORG_LOGO = `${SITE_URL}/logos/nuvoxsaga.png`;
/** First story published (the archive predates the newsroom and is not counted). */
export const FOUNDING_DATE = '2026-09-27';
const EDITOR_URL = `${SITE_URL}${EDITOR.path}`;

export function stripUnsafeJSONLD(s: unknown): string {
  if (typeof s !== 'string') return '';
  return s
    .replace(/<\/script/gi, '<\\/script')
    .replace(/<!--/g, '<\\!--')
    // Defence-in-depth: close CDATA breakout even though we never wrap in CDATA.
    .replace(/]]>/g, ']]\\>');
}

// ─────────────────────────────────────────────────────────────────────────
// The editor (Person), the organisation (NewsMediaOrganization) and the WebSite
// ─────────────────────────────────────────────────────────────────────────
/** The editor as a Person node: the short form every article's `editor` carries. */
export function editorPerson() {
  return {
    '@type': 'Person' as const,
    '@id': `${EDITOR_URL}#person`,
    name: EDITOR.name,
    url: EDITOR_URL,
    jobTitle: EDITOR.jobTitle,
  };
}

export function organizationSchema(): WithContext<NewsMediaOrganization> {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsMediaOrganization',
    '@id': `${SITE_URL}/#organization`,
    name: ORG_NAME,
    url: SITE_URL,
    logo: ORG_LOGO,
    foundingDate: FOUNDING_DATE,
    founder: editorPerson(),
    sameAs: [X_URL, INSTAGRAM_URL, ...BRANDS.map((b) => `https://www.youtube.com/${b.handle}`)],
    // Trust Project vocabulary: each link is the page that states the policy.
    ethicsPolicy: `${SITE_URL}/standards`,
    publishingPrinciples: `${SITE_URL}/standards`,
    correctionsPolicy: `${SITE_URL}/corrections`,
    masthead: `${SITE_URL}/about#masthead`,
    ownershipFundingInfo: `${SITE_URL}/about#ownership`,
    actionableFeedbackPolicy: `${SITE_URL}/contact`,
  };
}

/** /about/<editor>: a ProfilePage whose main entity is the editor, with photo when present. */
export function editorProfileSchema(args: { photoUrl?: string; description: string }): WithContext<ProfilePage> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url: EDITOR_URL,
    dateCreated: FOUNDING_DATE,
    mainEntity: {
      ...editorPerson(),
      description: stripUnsafeJSONLD(args.description),
      email: EDITOR.email,
      sameAs: [...EDITOR.sameAs],
      worksFor: { '@type': 'NewsMediaOrganization', '@id': `${SITE_URL}/#organization`, name: ORG_NAME, url: SITE_URL },
      ...(args.photoUrl ? { image: args.photoUrl } : {}),
    },
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
  /** News format: a brief reports one source (ReportageNewsArticle), a feature gives
   *  researched context (BackgroundNewsArticle). Both are NewsArticle subtypes. */
  format?: 'brief' | 'feature';
}): WithContext<TechArticle | NewsArticle | ReportageNewsArticle | BackgroundNewsArticle | BlogPosting | Article> {
  const brand = BRAND_BY_ID[args.brandId];
  const url = `${SITE_URL}/${brand.slug}/news/${args.slug}`;
  const news =
    args.format === 'brief' ? 'ReportageNewsArticle' : args.format === 'feature' ? 'BackgroundNewsArticle' : 'NewsArticle';
  const t = args.tier === 'evergreen' ? 'TechArticle' : args.tier === 'news' ? news : 'BlogPosting';

  // The 1200 x 630 title card exists for every story (app/og); a credited story photo,
  // when there is one, comes second. Both are >= 1200 px wide, as Discover asks.
  const card = `${SITE_URL}/og/${args.brandId}/${args.slug}.png`;
  const image = args.imageUrl && args.imageUrl !== card ? [card, args.imageUrl] : [card];

  return {
    '@context': 'https://schema.org',
    '@type': t,
    headline: stripUnsafeJSONLD(args.title),
    description: stripUnsafeJSONLD(args.excerpt ?? ''),
    image,
    // author.url identifies the author: the page that says who writes and checks stories.
    author: { '@type': 'Organization', name: ORG_NAME, url: `${SITE_URL}/standards` },
    // The human who set the sources, reviewed the checks and owns corrections.
    editor: editorPerson(),
    publisher: { '@type': 'Organization', '@id': `${SITE_URL}/#organization`, name: ORG_NAME, url: SITE_URL, logo: ORG_LOGO },
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
  format?: 'brief' | 'feature';
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
