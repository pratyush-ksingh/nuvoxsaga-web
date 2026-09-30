/**
 * Section front (/space/launch): the desk masthead with this tab active, then the
 * section's river. Shows the newest 60 stories; older ones stay reachable through the
 * desk pages and topic pages.
 */
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { BRANDS, BRAND_BY_SLUG, type BrandSlug } from '@/lib/brands';
import { DESKS, findSection } from '@/lib/desks';
import { storiesForSection } from '@/lib/content';
import { BrandProvider } from '@/components/brand/BrandProvider';
import { River, TopStories } from '@/components/news/StoryCards';
import { DeskHeader, EmptyDesk } from '@/components/news/DeskChrome';
import { og, OG_CARD } from '@/lib/og';

interface Props {
  params: Promise<{ brand: string; section: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return BRANDS.flatMap((b) => DESKS[b.id].sections.map((s) => ({ brand: b.slug, section: s.slug })));
}

async function resolve(params: Props['params']) {
  const { brand: slug, section: sectionSlug } = await params;
  const brand = BRAND_BY_SLUG[slug as BrandSlug];
  const section = brand && findSection(brand.id, sectionSlug);
  return brand && section ? { brand, section } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await resolve(params);
  if (!r) return {};
  const desk = DESKS[r.brand.id].name;
  const title = `${r.section.name}: ${desk} news`;
  const description = `The latest ${r.section.name} stories from the Nuvoxsaga ${desk} desk, each checked against its source before publication.`;
  const url = `/${r.brand.slug}/${r.section.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: og({ title, description, url, images: [{ url: `/og/${r.brand.id}/default.png`, ...OG_CARD }] }),
  };
}

export default async function SectionPage({ params }: Props) {
  const r = await resolve(params);
  if (!r) notFound();
  const posts = storiesForSection(r.brand.id, r.section.slug).slice(0, 60);
  const [lead, ...rest] = posts;

  return (
    <BrandProvider brand={r.brand.id}>
      <DeskHeader brand={r.brand.id} active={r.section.slug} title={r.section.name} />
      <div className="container-page pb-24 pt-10 md:pt-14">
        {posts.length === 0 ? (
          <EmptyDesk label={r.section.name} />
        ) : (
          <div className="grid gap-14">
            <TopStories lead={lead} secondary={[]} showDesk={false} />
            {rest.length > 0 && <River posts={rest} showDesk={false} />}
          </div>
        )}
      </div>
    </BrandProvider>
  );
}
