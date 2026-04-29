/**
 * Per-brand landing page — single dynamic route handling all 3 brands.
 *
 * generateStaticParams hard-codes the 3 brand slugs (no surprises). Unknown
 * slugs 404 immediately. Phase 9 will add the bespoke per-brand 3D hero.
 */
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { BRANDS, BRAND_BY_SLUG, type BrandSlug } from '@/lib/brands';
import { BrandProvider } from '@/components/brand/BrandProvider';
import { fetchPostsForBrand } from '@/lib/content';
import { BrandOrb } from '@/components/3d/BrandOrb';
import { MagneticLink } from '@/components/motion/MagneticLink';

interface Props {
  params: Promise<{ brand: string }>;
}

export function generateStaticParams() {
  return BRANDS.map((b) => ({ brand: b.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { brand: slug } = await params;
  const brand = BRAND_BY_SLUG[slug as BrandSlug];
  if (!brand) return {};
  return {
    title: brand.name,
    description: `${brand.name} — ${brand.niche.replace(/_/g, ' ')}.`,
    alternates: { canonical: `/${brand.slug}` },
    openGraph: {
      title: brand.name,
      description: `${brand.name} — ${brand.niche.replace(/_/g, ' ')}.`,
      url: `/${brand.slug}`,
    },
  };
}

export default async function BrandPage({ params }: Props) {
  const { brand: slug } = await params;
  const brand = BRAND_BY_SLUG[slug as BrandSlug];
  if (!brand) notFound();

  const posts = await fetchPostsForBrand(brand.id, 6);

  return (
    <BrandProvider brand={brand.id}>
      {/* Brand hero — Phase 9 swaps this for bespoke GLB scene */}
      <section className="relative overflow-hidden">
        <Image
          src={`/banners/${brand.id}_2.1920.avif`}
          alt=""
          fill
          priority
          className="absolute inset-0 object-cover opacity-30"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
        <div className="brand-glow relative mx-auto max-w-6xl px-6 pt-32 pb-24">
          <div className="flex items-center gap-3">
            <div className="size-2 rounded-full bg-[var(--brand)] shadow-[0_0_30px_var(--brand)]" />
            <span className="text-eyebrow">{brand.handle}</span>
          </div>
          <h1 className="text-display mt-8 text-[clamp(3.5rem,10vw,9rem)]">{brand.name}</h1>
          <p className="mt-8 text-xl text-foreground/85 max-w-2xl capitalize leading-relaxed">
            {brand.niche.replace(/_/g, ' ')} — long-form essays and daily shorts.
          </p>
          <div className="mt-10 flex gap-3">
            <MagneticLink
              href={`/${brand.slug}/blog`}
              className="inline-flex h-11 items-center px-6 rounded-md bg-[var(--brand)] text-background font-medium hover:opacity-90 transition-opacity"
            >
              Read the blog
            </MagneticLink>
            <Link
              href={`/${brand.slug}/videos`}
              className="inline-flex h-11 items-center px-6 rounded-md border border-white/15 hover:border-[var(--brand)] transition-colors"
            >
              Watch on YouTube →
            </Link>
          </div>
          {/* Brand 3D widget — degraded-device users see no widget here, just the
              banner above. Phase 9.3. */}
          <div className="mt-16 max-w-md mx-auto">
            <BrandOrb brand={brand.id} />
          </div>
        </div>
      </section>

      {/* Latest posts */}
      <section className="mx-auto max-w-6xl px-6 py-section">
        <div className="flex items-baseline justify-between mb-12">
          <div>
            <span className="text-eyebrow">Recent</span>
            <h2 className="mt-3 text-4xl md:text-5xl text-display">Latest essays</h2>
          </div>
          <Link
            href={`/${brand.slug}/blog`}
            className="text-sm text-foreground/85 hover:text-[var(--brand)] transition-colors"
          >
            All essays →
          </Link>
        </div>
        {posts.length === 0 ? (
          <div className="border border-white/10 rounded-xl p-12 max-w-2xl">
            <span className="text-eyebrow">Issue 00</span>
            <p className="mt-4 text-2xl text-foreground/85 leading-relaxed text-balance">
              The press is warming up. The first essay drops the moment our first writer
              finishes their first draft.
            </p>
            <p className="mt-4 text-sm text-foreground/60">
              Want it in your inbox? Subscribe in the footer.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <Link
                key={p.id}
                href={`/${brand.slug}/blog/${p.slug}`}
                className="group rounded-lg border border-white/10 p-6 hover:border-[var(--brand)] transition-colors"
              >
                <h3 className="text-xl group-hover:text-[var(--brand)] transition-colors">
                  {p.title}
                </h3>
                {p.excerpt && (
                  <p className="mt-3 text-sm text-foreground/60 line-clamp-3">{p.excerpt}</p>
                )}
                <div className="mt-4 text-xs text-foreground/40">
                  {p.publishedAt
                    ? new Date(p.publishedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : ''}
                  {p.readingTimeMin ? ` · ${p.readingTimeMin} min read` : ''}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </BrandProvider>
  );
}
