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
      <section className="mx-auto max-w-4xl px-6 py-24">
        <p className="text-xs uppercase tracking-[0.3em] text-foreground/40">Blog</p>
        <h1 className="mt-6 text-5xl">{brand.name}</h1>
        <p className="mt-3 text-foreground/60 capitalize">{brand.niche.replace(/_/g, ' ')}</p>

        <div className="mt-16 space-y-8">
          {posts.length === 0 ? (
            <p className="text-foreground/50 italic">
              No essays yet. The first one is being written.
            </p>
          ) : (
            posts.map((p) => (
              <Link
                key={p.id}
                href={`/${brand.slug}/blog/${p.slug}`}
                className="group block border-b border-white/5 pb-8 hover:border-[var(--brand)] transition-colors"
              >
                <div className="text-xs text-foreground/40">
                  {p.publishedAt
                    ? new Date(p.publishedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : ''}
                  {p.readingTimeMin ? ` · ${p.readingTimeMin} min` : ''}
                </div>
                <h2 className="mt-2 text-3xl group-hover:text-[var(--brand)] transition-colors">
                  {p.title}
                </h2>
                {p.excerpt && (
                  <p className="mt-3 text-foreground/65 line-clamp-2 max-w-2xl">{p.excerpt}</p>
                )}
              </Link>
            ))
          )}
        </div>
      </section>
    </BrandProvider>
  );
}
