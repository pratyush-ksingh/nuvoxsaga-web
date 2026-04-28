/**
 * /[brand]/blog/[slug] — single post detail.
 *
 * SECURITY:
 *   - Slug + brand strictly validated; unknown → 404.
 *   - Renders post.bodyHtmlSanitized (DOMPurify-sanitised on save) — NEVER
 *     the raw `body` Lexical tree. Phase 6 review M4 hardening.
 *   - Schema-LD inlined as <script type="application/ld+json">. JSON.stringify
 *     alone does NOT escape `</script>` — an attacker who controls a Post
 *     title (LLM-generated copy from the Python pipeline) could break out
 *     of the inline block. We post-process JSON output by replacing every
 *     `<` with `<` (Phase 8 review H1). lib/seo.ts stripUnsafeJSONLD
 *     adds belt-and-braces defence at the TS path.
 *   - Drafts/scheduled CANNOT leak — fetchPost enforces status='published'.
 */
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import type { Metadata } from 'next';
import { BRAND_BY_SLUG, type BrandSlug } from '@/lib/brands';
import { BrandProvider } from '@/components/brand/BrandProvider';
import { fetchPost } from '@/lib/content';
import {
  articleSchema,
  breadcrumbSchema,
  organizationSchema,
  faqSchema,
  videoSchema,
  generateAllSchemas,
} from '@/lib/seo';

interface Props {
  params: Promise<{ brand: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { brand: brandSlug, slug } = await params;
  const brand = BRAND_BY_SLUG[brandSlug as BrandSlug];
  if (!brand) return {};
  const post = await fetchPost(brand.id, slug);
  if (!post) return {};
  const ogUrl = `/api/og/${encodeURIComponent(post.slug)}?brand=${encodeURIComponent(brand.id)}`;
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/${brand.slug}/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      url: `/${brand.slug}/blog/${post.slug}`,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      images: [{ url: ogUrl, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [ogUrl],
    },
  };
}

/**
 * Build the JSON-LD payload. Prefer the post's pre-computed schemaLD blob
 * (written by the Python pipeline). Fall back to TS builders if the field
 * is missing (defence-in-depth).
 */
function buildSchemas(brand: typeof BRAND_BY_SLUG[BrandSlug], post: NonNullable<Awaited<ReturnType<typeof fetchPost>>>) {
  if (Array.isArray(post.schemaLD) && post.schemaLD.length > 0) {
    return post.schemaLD;
  }
  return generateAllSchemas({
    brandId: brand.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    wordCount: post.wordCount,
    faqPairs: post.faqPairs,
    videoId: post.sourceVideoId,
  });
}

export default async function PostPage({ params }: Props) {
  const { brand: brandSlug, slug } = await params;
  const brand = BRAND_BY_SLUG[brandSlug as BrandSlug];
  if (!brand) notFound();

  const post = await fetchPost(brand.id, slug);
  if (!post) notFound();

  const schemas = buildSchemas(brand, post);

  return (
    <BrandProvider brand={brand.id}>
      {/* JSON-LD for search — server-side only.
          Phase 8 review H1: `</script>` cannot appear in a JSON string after
          replacing every `<` with the unicode escape `<`. JSON parsers
          decode it correctly; HTML parsers see no script terminator. */}
      {schemas.map((s, i) => (
        <Script
          key={i}
          id={`ld-${i}`}
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger -- JSON-LD requires raw script content
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(s).replace(/</g, '\\u003c'),
          }}
        />
      ))}

      <article className="mx-auto max-w-3xl px-6 py-24">
        <nav className="text-xs text-foreground/40 mb-8">
          <Link href={`/${brand.slug}`} className="hover:text-[var(--brand)]">
            {brand.name}
          </Link>
          {' · '}
          <Link href={`/${brand.slug}/blog`} className="hover:text-[var(--brand)]">
            Blog
          </Link>
        </nav>
        <header>
          <h1 className="text-5xl md:text-6xl leading-[1.05]">{post.title}</h1>
          {post.excerpt && (
            <p className="mt-6 text-xl text-foreground/65 leading-snug">{post.excerpt}</p>
          )}
          <div className="mt-8 flex items-center gap-3 text-xs text-foreground/40">
            {post.publishedAt && (
              <time dateTime={post.publishedAt}>
                {new Date(post.publishedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            )}
            {post.readingTimeMin && <span>· {post.readingTimeMin} min read</span>}
            {post.wordCount && <span>· {post.wordCount.toLocaleString()} words</span>}
          </div>
        </header>

        <div
          // PHASE-6-M4: We render bodyHtmlSanitized (DOMPurify-cleaned at save),
          // never the raw Lexical body. The DOMPurify config in
          // collections/Posts.ts strips <script>, <iframe>, javascript: URIs,
          // event handlers, etc.
          // eslint-disable-next-line react/no-danger -- bodyHtmlSanitized is server-sanitised
          dangerouslySetInnerHTML={{ __html: post.bodyHtmlSanitized ?? '' }}
          className="prose prose-invert prose-lg mt-16 max-w-none
            prose-headings:font-[family-name:var(--font-heading)]
            prose-headings:tracking-tight
            prose-a:text-[var(--brand)] prose-a:no-underline hover:prose-a:underline
            prose-img:rounded-lg
            prose-blockquote:border-l-[var(--brand)]
            prose-code:text-[var(--brand-cyan)]
            prose-code:before:content-none prose-code:after:content-none
            prose-pre:bg-card"
        />

        {post.faqPairs && post.faqPairs.length > 0 && (
          <section className="mt-16 border-t border-white/10 pt-12">
            <h2 className="text-3xl">Frequently asked</h2>
            <dl className="mt-8 space-y-6">
              {post.faqPairs.map((p, i) => (
                <div key={i}>
                  <dt className="text-lg">{p.question}</dt>
                  <dd className="mt-2 text-foreground/70">{p.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </article>
    </BrandProvider>
  );
}
