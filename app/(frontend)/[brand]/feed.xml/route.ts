/** /<desk>/feed.xml: RSS for one desk, rendered once at build. */
import { BRANDS, BRAND_BY_SLUG, type BrandSlug } from '@/lib/brands';
import { BRAND_CONTENT } from '@/lib/brand-content';
import { DESKS } from '@/lib/desks';
import { fetchAllPostsForBrand } from '@/lib/content';
import { rss } from '@/lib/feeds';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return BRANDS.map((b) => ({ brand: b.slug }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ brand: string }> }) {
  const { brand: slug } = await params;
  const brand = BRAND_BY_SLUG[slug as BrandSlug];
  return rss({
    title: `Nuvoxsaga ${DESKS[brand.id].name}`,
    path: `/${brand.slug}`,
    description: BRAND_CONTENT[brand.id].publicationLine,
    posts: await fetchAllPostsForBrand(brand.id),
  });
}
