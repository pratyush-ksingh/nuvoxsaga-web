/**
 * /[desk]/news/[slug]: one story, brief or feature.
 *
 * SECURITY:
 *   - Brand and slug are validated; unknown -> 404 (dynamicParams = false).
 *   - Renders only post.bodyHtmlSanitized (lib/sanitize.ts at build).
 *   - JSON-LD goes through components/JsonLd.tsx, which escapes every `<`.
 *   - Drafts and scheduled posts cannot render: fetchPost only sees published ones.
 */
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowDown, ArrowRight, ArrowUpRight } from 'lucide-react';
import { BRAND_BY_ID, BRAND_BY_SLUG, type BrandSlug } from '@/lib/brands';
import { DESKS, findSection } from '@/lib/desks';
import { fetchAllPostsForBrand, fetchPost, loadAllPosts, storyPath, topicSlug, type PublicPost } from '@/lib/content';
import { generateAllSchemas } from '@/lib/seo';
import { BrandProvider } from '@/components/brand/BrandProvider';
import { YouTubeEmbed } from '@/components/blog/YouTubeEmbed';
import { FormatLabel, SecondaryStory, StoryImage, sourceCount } from '@/components/news/StoryCards';
import { JsonLd } from '@/components/JsonLd';
import { og, OG_CARD } from '@/lib/og';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nuvoxsaga.com';
const stampFmt = new Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
  timeZoneName: 'short',
});

interface Props {
  params: Promise<{ brand: string; slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  const params = loadAllPosts().map((p) => ({ brand: BRAND_BY_ID[p.brand].slug, slug: p.slug }));
  // Static export refuses an empty list. The placeholder is not a valid slug (renders
  // notFound) and the post-build script deletes it.
  return params.length ? params : [{ brand: 'ai', slug: '_placeholder' }];
}

async function resolve(params: Props['params']) {
  const { brand: brandSlug, slug } = await params;
  const brand = BRAND_BY_SLUG[brandSlug as BrandSlug];
  if (!brand) return null;
  const post = await fetchPost(brand.id, slug);
  return post ? { brand, post } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await resolve(params);
  if (!r) return {};
  const { post } = r;
  const image = shareImage(post);
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: storyPath(post) },
    openGraph: og({
      title: post.title,
      description: post.excerpt,
      type: 'article',
      url: storyPath(post),
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      section: DESKS[post.brand].name,
      tags: post.tags,
      images: [image],
    }),
    twitter: { card: 'summary_large_image', title: post.title, description: post.excerpt, images: [image] },
  };
}

/**
 * The image a shared link shows. A real, credited photo is used as it is. A stock
 * section illustration says nothing about the story, so those stories share the title
 * card built for every post at /og/<brand>/<slug>.png (app/og/[brand]/[file]).
 */
function shareImage(post: PublicPost): { url: string; alt: string; width?: number; height?: number } {
  if (post.image && post.image.credit !== 'AI illustration') {
    // Story photos are written at 1200 x 675 by the pipeline (newsdesk/images.py).
    return { url: post.image.src, alt: post.image.alt, width: 1200, height: 675 };
  }
  return { url: `/og/${post.brand}/${post.slug}.png`, alt: post.title, ...OG_CARD };
}

/** Three more stories from this desk: shared topics first, then the same section, then the newest. */
async function related(post: PublicPost): Promise<PublicPost[]> {
  const desk = (await fetchAllPostsForBrand(post.brand)).filter((p) => p.id !== post.id);
  const topics = new Set((post.tags ?? []).map(topicSlug).filter(Boolean));
  const shared = (p: PublicPost) => (p.tags ?? []).filter((t) => topics.has(topicSlug(t))).length;
  // Array.sort is stable, so stories with the same number of shared topics stay newest first.
  const sameTopics = desk.filter((p) => shared(p) > 0).sort((a, b) => shared(b) - shared(a));
  const sameSection = desk.filter((p) => post.section && p.section === post.section);
  return [...new Set([...sameTopics, ...sameSection, ...desk])].slice(0, 3);
}

export default async function StoryPage({ params }: Props) {
  const r = await resolve(params);
  if (!r) notFound();
  const { brand, post } = r;
  const desk = DESKS[brand.id];
  const section = findSection(brand.id, post.section);
  const isBrief = post.kind === 'brief';
  const updated = post.updatedAt && post.updatedAt !== post.publishedAt ? post.updatedAt : undefined;
  const more = await related(post);

  // The pipeline's pre-built JSON-LD wins; the TS builders are the fallback.
  const pipelineLD = Array.isArray(post.schemaLD) ? post.schemaLD : post.schemaLD ? [post.schemaLD] : [];
  const schemas = pipelineLD.length > 0 ? pipelineLD : generateAllSchemas({
    brandId: brand.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    imageUrl: post.image ? `${SITE_URL}${post.image.src}` : undefined,
    wordCount: post.wordCount,
    tier: 'news',
    format: post.kind,
    faqPairs: post.faqPairs,
    videoId: post.sourceVideoId,
  });

  return (
    <BrandProvider brand={brand.id}>
      <JsonLd schemas={schemas} />

      <article className="container-page pb-24 pt-10 md:pt-14">
        <header className="mx-auto max-w-[46rem]">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm font-medium">
            {/* desk.accent, not text-brand: the raw World crimson fails 4.5:1 on the canvas. */}
            <Link href={`/${brand.slug}`} className="hover:underline hover:underline-offset-4" style={{ color: desk.accent }}>
              {desk.name}
            </Link>
            {section && (
              <>
                <span aria-hidden="true" className="text-ink-3">
                  ·
                </span>
                <Link href={`/${brand.slug}/${section.slug}`} className="text-ink-2 hover:text-ink hover:underline hover:underline-offset-4">
                  {section.name}
                </Link>
              </>
            )}
            <span className="ml-1">
              <FormatLabel post={post} />
            </span>
          </nav>
          <h1 className={`display mt-5 ${isBrief ? 'text-[clamp(2rem,4vw,3rem)]' : 'text-[clamp(2.25rem,5vw,3.75rem)]'}`}>
            {post.title}
          </h1>
          {post.excerpt && <p className="deck mt-5 text-[1.4rem] leading-snug text-ink-2">{post.excerpt}</p>}
          {/* The format, defined in one line: labels alone are missed by about half of readers. */}
          <p className="mt-4 text-sm text-ink-3">
            <span className="font-medium text-ink-2">{isBrief ? 'Brief.' : 'Feature.'}</span>{' '}
            {isBrief
              ? `A short, checked summary of one primary source${post.source ? `: ${post.source.name}` : ''}.`
              : (() => {
                  const n = sourceCount(post);
                  return `Researched from ${n > 0 ? `${n} ${n === 1 ? 'source' : 'sources'}` : 'several sources'}, with context, every claim checked.`;
                })()}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-y border-hairline py-4 text-sm text-ink-3">
            <span className="text-ink-2">By the Nuvoxsaga {desk.name} desk</span>
            {post.publishedAt && <time dateTime={post.publishedAt}>{stampFmt.format(new Date(post.publishedAt))}</time>}
            {updated && <span>Updated <time dateTime={updated}>{stampFmt.format(new Date(updated))}</time></span>}
            {!isBrief && post.readingTimeMin ? <span>{post.readingTimeMin} min read</span> : null}
            {isBrief && post.source && (
              <span>
                Source:{' '}
                <a
                  href={post.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink-2 underline underline-offset-4 hover:text-ink"
                >
                  {post.source.name}
                </a>
              </span>
            )}
          </div>
        </header>

        {post.image && (
          <figure className="mx-auto mt-10 max-w-[60rem]">
            <StoryImage post={post} sizes="(min-width: 1024px) 960px, 100vw" priority className="aspect-[16/9] w-full rounded-2xl object-cover" />
            <figcaption className="mt-3 text-sm text-ink-3">{post.image.credit}</figcaption>
          </figure>
        )}

        {post.sourceVideoId && (
          <div className="mx-auto mt-10 max-w-[56rem] overflow-hidden rounded-2xl">
            <YouTubeEmbed videoId={post.sourceVideoId} title={post.title} />
          </div>
        )}

        {/* Body to topics, with the story rail in the left margin on wide screens. */}
        <div className="relative">
        <StoryRail post={post} deskName={desk.name} deskHref={`/${brand.slug}`} />
        <div
          // Sanitized at build time (lib/sanitize.ts); raw pipeline HTML is never rendered.
          // eslint-disable-next-line react/no-danger -- sanitized at build
          dangerouslySetInnerHTML={{ __html: post.bodyHtmlSanitized ?? '' }}
          className="article-body mx-auto mt-10 max-w-[46rem]"
        />

        {post.corrections && post.corrections.length > 0 && (
          <section aria-labelledby="corrections-title" className="mx-auto mt-12 max-w-[46rem] border-l-2 border-brand pl-5">
            <h2 id="corrections-title" className="font-bold">
              Correction
            </h2>
            {post.corrections.map((c, i) => (
              <p key={i} className="mt-2 text-ink-2">
                <time dateTime={c.date} className="text-ink-3">
                  {stampFmt.format(new Date(c.date))}:
                </time>{' '}
                {c.text}
              </p>
            ))}
          </section>
        )}

        {post.faqPairs && post.faqPairs.length > 0 && (
          <section aria-labelledby="faq-title" className="mx-auto mt-16 max-w-[46rem] border-t border-hairline pt-12">
            <h2 id="faq-title" className="text-3xl font-bold tracking-[-0.02em]">
              Questions readers ask
            </h2>
            <dl className="mt-8 grid gap-7">
              {post.faqPairs.map((p, i) => (
                <div key={i}>
                  <dt className="text-lg font-semibold">{p.question}</dt>
                  <dd className="mt-2 text-ink-2">{p.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <CheckedBox post={post} />

        {post.tags && post.tags.length > 0 && (
          <ul aria-label="Topics" className="mx-auto mt-10 flex max-w-[46rem] flex-wrap gap-2">
            {post.tags.map((t) =>
              topicSlug(t) ? (
                <li key={t}>
                  <Link
                    href={`/topic/${topicSlug(t)}`}
                    className="block rounded-full border border-hairline px-3.5 py-1.5 text-sm text-ink-2 transition-colors duration-150 hover:text-ink"
                  >
                    {t}
                  </Link>
                </li>
              ) : null,
            )}
          </ul>
        )}
        </div>
      </article>

      {more.length > 0 && (
        <section aria-labelledby="more-title" className="border-t border-hairline">
          <div className="container-page py-16 md:py-20">
            <h2 id="more-title" className="mb-8 text-2xl font-bold tracking-[-0.02em]">
              More from {desk.name}
            </h2>
            <div className="grid gap-10 md:grid-cols-3 md:gap-8">
              {more.map((p) => (
                <SecondaryStory key={p.id} post={p} showDesk={false} />
              ))}
            </div>
          </div>
        </section>
      )}
    </BrandProvider>
  );
}

/**
 * Story rail: the left margin of a wide screen, sticky beside the body. Shows how the story
 * was checked (claim count and source, linking to the full check below), reading time and
 * share links. Hidden under 1280px, where the margin is too narrow.
 */
function StoryRail({ post, deskName, deskHref }: { post: PublicPost; deskName: string; deskHref: string }) {
  const claims = post.checkedClaims?.length ?? 0;
  const anchor = post.kind === 'brief' && post.source ? '#source-title' : '#checked-title';
  const url = `${SITE_URL}${storyPath(post)}`;
  const share = [
    ['X', `https://x.com/intent/post?url=${encodeURIComponent(url)}&text=${encodeURIComponent(post.title)}`],
    ['LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`],
    ['Email', `mailto:?subject=${encodeURIComponent(post.title)}&body=${encodeURIComponent(url)}`],
  ];
  return (
    <aside aria-label="About this story" className="absolute inset-y-0 left-0 hidden w-[calc((100%-46rem)/2-3rem)] xl:block">
      <div className="sticky top-24 flex flex-col gap-7 border-t border-hairline pt-5 text-sm">
        {claims > 0 && (
          <a href={anchor} className="group block">
            <span className="data block text-[2.4rem] leading-none text-ink">{claims}</span>
            <span className="mt-2 block text-ink-2 group-hover:text-ink">
              claims checked{post.kind === 'brief' && post.source ? ` against ${post.source.name}` : ''}
            </span>
            <span className="link-arrow mt-2 text-xs text-ink-3 group-hover:text-ink">
              See the check <ArrowDown aria-hidden="true" size={13} />
            </span>
          </a>
        )}
        <p className="data text-ink-3">
          {post.kind === 'brief' ? 'Brief' : 'Feature'}
          {post.readingTimeMin ? ` · ${post.readingTimeMin} min read` : ''}
        </p>
        <div>
          <p className="text-ink-3">Share</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {share.map(([name, href]) => (
              <li key={name}>
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-ink-2 hover:text-ink hover:underline hover:underline-offset-4">
                  {name}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <Link href={deskHref} className="link-arrow text-ink-2">
          More from {deskName} <ArrowRight aria-hidden="true" size={14} />
        </Link>
      </div>
    </aside>
  );
}

function CheckedBox({ post }: { post: PublicPost }) {
  const claims = post.checkedClaims ?? [];
  if (post.kind === 'brief' && post.source) {
    return (
      <section aria-labelledby="source-title" className="mx-auto mt-14 max-w-[46rem] rounded-2xl border border-hairline bg-surface p-6 md:p-8">
        <h2 id="source-title" className="text-xl font-bold tracking-[-0.015em]">
          Here&apos;s how we know
        </h2>
        <p className="mt-3">
          <a href={post.source.url} target="_blank" rel="noopener noreferrer" className="link-arrow">
            {post.source.name} <ArrowUpRight aria-hidden="true" size={15} />
          </a>
        </p>
        <p className="mt-3 text-sm text-ink-2">
          This brief was written from the source above. Before publication every name, number and date in it was
          matched against that source, and a separate check confirmed each claim.
        </p>
        <ClaimList claims={claims} />
        <ReportLink />
      </section>
    );
  }
  if (!post.sources?.length && !claims.length) return null;
  return (
    <section aria-labelledby="checked-title" className="mx-auto mt-14 max-w-[46rem] rounded-2xl border border-hairline bg-surface p-6 md:p-8">
      <h2 id="checked-title" className="text-xl font-bold tracking-[-0.015em]">
        Here&apos;s how we know
      </h2>
      <p className="mt-2 text-ink-2">
        Before publication, an independent search-based check confirmed every factual claim below.
      </p>
      {post.sources && post.sources.length > 0 && (
        <p className="mt-4 text-sm text-ink-2">
          <span className="font-semibold text-ink">Sources:</span> {post.sources.join(', ')}
        </p>
      )}
      <ClaimList claims={claims} />
      <ReportLink />
    </section>
  );
}

/** The checked claims, closed by default: the count is the summary, the list is one tap away. */
function ClaimList({ claims }: { claims: { claim: string; source: string }[] }) {
  if (!claims.length) return null;
  return (
    <details className="mt-4 text-sm">
      <summary className="cursor-pointer font-semibold text-ink">{claims.length} claims verified</summary>
      <ul className="mt-3 grid gap-2 text-ink-2">
        {claims.map((c, i) => (
          <li key={i}>
            {c.claim}
            {c.source && <span className="text-ink-3"> ({c.source})</span>}
          </li>
        ))}
      </ul>
    </details>
  );
}

function ReportLink() {
  return (
    <p className="mt-5 text-sm text-ink-3">
      Spotted a mistake?{' '}
      <Link href="/corrections" className="text-ink-2 underline underline-offset-4 hover:text-ink">
        Report it
      </Link>{' '}
      and we will correct it in public.
    </p>
  );
}
