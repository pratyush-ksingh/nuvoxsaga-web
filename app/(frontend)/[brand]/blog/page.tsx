/**
 * /[brand]/blog — published posts index for one brand.
 *
 * Drafts/scheduled cannot leak — fetchAllPostsForBrand enforces status='published'.
 */
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { BRAND_BY_SLUG, type BrandSlug } from '@/lib/brands';
import { BrandProvider } from '@/components/brand/BrandProvider';
import { fetchAllPostsForBrand } from '@/lib/content';

interface Props {
  params: Promise<{ brand: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { brand: slug } = await params;
  const brand = BRAND_BY_SLUG[slug as BrandSlug];
  if (!brand) return {};
  return {
    title: `Blog · ${brand.name}`,
    description: `Long-form essays from ${brand.name}.`,
    alternates: { canonical: `/${brand.slug}/blog` },
  };
}

export default async function BlogIndex({ params }: Props) {
  const { brand: slug } = await params;
  const brand = BRAND_BY_SLUG[slug as BrandSlug];
  if (!brand) notFound();

  const posts = await fetchAllPostsForBrand(brand.id);

  return (
    <BrandProvider brand={brand.id}>
      <section className="brand-glow mx-auto max-w-4xl px-6 py-section">
        <span className="text-eyebrow">{brand.name} · Blog</span>
        <h1 className="text-display mt-8 text-[clamp(2.75rem,6vw,5rem)] text-balance">
          {brand.name}
        </h1>
        <p className="mt-6 text-lg text-foreground/85 capitalize">
          {brand.niche.replace(/_/g, ' ')}
        </p>

        <div className="mt-20 space-y-8">
          {posts.length === 0 ? (
            <div className="border border-white/10 rounded-xl p-12">
              <div className="font-mono text-sm tracking-[0.16em] text-[var(--brand)]">ISSUE 00</div>
              <p className="mt-6 text-2xl md:text-3xl text-foreground/85 leading-snug text-balance">
                The first essay is being written. The next one will be too.
              </p>
              <p className="mt-6 text-sm text-foreground/60 max-w-md">
                Want them in your inbox the day they ship? Subscribe in the footer — no
                tracking, double opt-in, one-click unsubscribe.
              </p>
            </div>
          ) : (
            posts.map((p) => (
              <Link
                key={p.id}
                href={`/${brand.slug}/blog/${p.slug}`}
                className="group block border-b border-white/5 pb-10 hover:border-[var(--brand)] transition-colors"
              >
                <div className="text-xs font-mono tracking-[0.16em] text-foreground/60">
                  {p.publishedAt
                    ? new Date(p.publishedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      }).toUpperCase()
                    : ''}
                  {p.readingTimeMin ? ` · ${p.readingTimeMin} MIN` : ''}
                </div>
                <h2 className="mt-3 text-3xl md:text-4xl text-display group-hover:text-[var(--brand)] transition-colors">
                  {p.title}
                </h2>
                {p.excerpt && (
                  <p className="mt-4 text-foreground/85 line-clamp-2 max-w-2xl leading-relaxed">{p.excerpt}</p>
                )}
              </Link>
            ))
          )}
        </div>
      </section>
    </BrandProvider>
  );
}
