/**
 * Section front (/space/launch): the desk masthead with this tab active, then the
 * section's river. Shows the newest 60 stories; older ones stay reachable through the
 * desk pages and topic pages.
 */
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BRANDS, BRAND_BY_ID, BRAND_BY_SLUG, type BrandId, type BrandSlug } from '@/lib/brands';
import { DESKS, findSection, SECTION_INDEX_MIN } from '@/lib/desks';
import { storiesForSection } from '@/lib/content';
import { BrandProvider } from '@/components/brand/BrandProvider';
import { River } from '@/components/news/StoryCards';
import { HeroStage } from '@/components/home/HomeFront';
import { DeskHeader, EmptyDesk } from '@/components/news/DeskChrome';
import { og, OG_CARD } from '@/lib/og';
import { ADS_ON, SLOTS, adsEligible } from '@/lib/ads';
import { AdSlot } from '@/components/ads/AdSlot';

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
  const count = storiesForSection(r.brand.id, r.section.slug).length;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: og({ title, description, url, images: [{ url: `/og/${r.brand.id}/default.png`, ...OG_CARD }] }),
    // A section with a handful of stories is a thin page (the sitemap applies the same
    // threshold). The key is left out for an indexable section: `robots: undefined` would
    // erase the root layout's robots tag, and with it max-image-preview:large.
    ...(count < SECTION_INDEX_MIN ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function SectionPage({ params }: Props) {
  const r = await resolve(params);
  if (!r) notFound();
  const posts = storiesForSection(r.brand.id, r.section.slug).slice(0, 60);
  // The 3D hero stage takes the lead + up to 3 more once the section has 5+ stories;
  // a thin section keeps a single lead so the river below is not left empty.
  const [lead, ...others] = posts;
  const secondary = posts.length >= 5 ? others.slice(0, 3) : [];
  const rest = others.slice(secondary.length);
  // One unit between the stage and the river, only on a section with enough stories
  // (lib/ads.ts); a thin section is noindex and carries none.
  const ads = ADS_ON && adsEligible({ kind: 'section', storyCount: posts.length });

  return (
    <BrandProvider brand={r.brand.id}>
      <DeskHeader brand={r.brand.id} active={r.section.slug} title={r.section.name} intro={r.section.blurb} />
      <div className="container-page pb-24 pt-10 md:pt-14">
        {posts.length === 0 ? (
          <EmptyDesk label={r.section.name} />
        ) : (
          <div className="grid gap-14">
            <HeroStage lead={lead} secondary={secondary} showDesk={false} />
            {ads && <AdSlot slot={SLOTS.sectionTop} shape="leaderboard" />}
            {rest.length > 0 && <River posts={rest} showDesk={false} />}
          </div>
        )}
        <Elsewhere brand={r.brand.id} current={r.section.slug} />
      </div>
    </BrandProvider>
  );
}

/** The desk's other sections, each with its count and newest headline: where to go next. */
function Elsewhere({ brand, current }: { brand: BrandId; current: string }) {
  const desk = DESKS[brand];
  const b = BRAND_BY_ID[brand];
  const others = desk.sections
    .filter((s) => s.slug !== current)
    .map((s) => ({ ...s, posts: storiesForSection(brand, s.slug) }));
  return (
    <section aria-labelledby="elsewhere-title" className="mt-20 border-t border-hairline pt-12">
      <h2 id="elsewhere-title" className="display text-[clamp(1.75rem,3vw,2.5rem)]">
        Elsewhere on {desk.name}
      </h2>
      <ul className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
        {others.map((s) => {
          const [top] = s.posts;
          return (
            <li key={s.slug} className="group relative flex flex-col bg-canvas p-6 transition-colors duration-150 hover:bg-surface">
              <p className="flex items-baseline justify-between gap-4">
                <span className="font-medium" style={{ color: desk.accent }}>
                  {s.name}
                </span>
                <span className="data text-sm text-ink-3">
                  {s.posts.length} {s.posts.length === 1 ? 'story' : 'stories'}
                </span>
              </p>
              <h3 className="mt-3 text-lg font-bold leading-snug">
                <Link href={`/${b.slug}/${s.slug}`} className="card-link">
                  {top ? top.title : `No ${s.name} stories yet`}
                </Link>
              </h3>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
