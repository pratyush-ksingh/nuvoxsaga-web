/** Older pages of a desk river: /space/page/2 ... (page 1 is the desk front). */
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { BRANDS, BRAND_BY_SLUG, type BrandSlug } from '@/lib/brands';
import { DESKS } from '@/lib/desks';
import { DeskFront, deskRiver } from '@/components/news/DeskFront';

interface Props {
  params: Promise<{ brand: string; n: string }>;
}

export const dynamicParams = false;

export async function generateStaticParams() {
  const params: { brand: string; n: string }[] = [];
  for (const b of BRANDS) {
    const { pages } = await deskRiver(b.id);
    for (let n = 2; n <= pages; n++) params.push({ brand: b.slug, n: String(n) });
  }
  // Static export refuses an empty list; the placeholder renders notFound and the
  // post-build script deletes it (scripts/flatten-segment-files.mjs).
  return params.length ? params : [{ brand: BRANDS[0].slug, n: '_placeholder' }];
}

async function resolve(params: Props['params']) {
  const { brand: slug, n } = await params;
  const brand = BRAND_BY_SLUG[slug as BrandSlug];
  const page = /^[0-9]{1,4}$/.test(n) ? Number(n) : NaN;
  if (!brand || !(page >= 2)) return null;
  const { pages } = await deskRiver(brand.id);
  return page <= pages ? { brand, page } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await resolve(params);
  if (!r) return {};
  return {
    title: `${DESKS[r.brand.id].name} news, page ${r.page}`,
    alternates: { canonical: `/${r.brand.slug}/page/${r.page}` },
  };
}

export default async function DeskOlderPage({ params }: Props) {
  const r = await resolve(params);
  if (!r) notFound();
  return <DeskFront brand={r.brand.id} page={r.page} />;
}
