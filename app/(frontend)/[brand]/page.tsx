/**
 * Desk front (/ai, /space, /world): masthead with section tabs, lead + 3 top stories,
 * the "Latest" river and a features sidebar. Uses this desk's accent only (DESIGN.md §3).
 */
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { BRANDS, BRAND_BY_SLUG, type BrandSlug } from '@/lib/brands';
import { BRAND_CONTENT } from '@/lib/brand-content';
import { DESKS } from '@/lib/desks';
import { DeskFront } from '@/components/news/DeskFront';
import { og, OG_CARD } from '@/lib/og';

interface Props {
  params: Promise<{ brand: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return BRANDS.map((b) => ({ brand: b.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { brand: slug } = await params;
  const brand = BRAND_BY_SLUG[slug as BrandSlug];
  if (!brand) return {};
  const title = `${DESKS[brand.id].name} news`;
  const description = BRAND_CONTENT[brand.id].publicationLine;
  return {
    title,
    description,
    alternates: {
      canonical: `/${brand.slug}`,
      types: { 'application/rss+xml': [{ url: `/${brand.slug}/feed.xml`, title: `Nuvoxsaga ${DESKS[brand.id].name}` }] },
    },
    openGraph: og({
      title,
      description,
      url: `/${brand.slug}`,
      images: [{ url: `/og/${brand.id}/default.png`, ...OG_CARD }],
    }),
  };
}

export default async function DeskPage({ params }: Props) {
  const { brand: slug } = await params;
  const brand = BRAND_BY_SLUG[slug as BrandSlug];
  if (!brand) notFound();
  return <DeskFront brand={brand.id} page={1} />;
}
