/**
 * Home, the media-house front page (DESIGN.md §7):
 *   0. the wire: newest headlines crossing the top      1. hero stage: lead + 3 on 3D cards
 *   2. Latest river (news) + trending topics             3. features shelf (articles), 3+ only
 *   4. one block per desk, each opened by a photo portal 5. how we report (newsletter: SiteFooter)
 * Before the first story is published it shows the launch composition instead (LaunchHome).
 */
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { BRANDS, BRAND_BY_ID, type BrandId } from '@/lib/brands';
import { DESKS } from '@/lib/desks';
import { loadAllPosts, splitTop, storyPath, trendingTopics, type PublicPost } from '@/lib/content';
import { Picture } from '@/components/Picture';
import { HeadlineList, River } from '@/components/news/StoryCards';
import { Rail } from '@/components/news/Rail';
import { ledger } from '@/lib/ledger';
import { FeatureShelf, HeroStage, PhotoPortal, WireTicker } from '@/components/home/HomeFront';
import { Masthead } from '@/components/home/Masthead';
import { FrontierDial } from '@/components/home/FrontierDial';
import { dialData } from '@/components/home/dial';
import { JsonLd } from '@/components/JsonLd';
import { og } from '@/lib/og';
import { organizationSchema, websiteSchema } from '@/lib/seo';

export const metadata: Metadata = {
  title: { absolute: 'Nuvoxsaga: AI, space and world news' },
  alternates: {
    canonical: '/',
    types: { 'application/rss+xml': [{ url: '/feed.xml', title: 'Nuvoxsaga' }] },
  },
  openGraph: og({ url: '/' }),
};

/** Who publishes this site, for search engines (one Organization, one WebSite). */
const SITE_SCHEMAS = [organizationSchema(), websiteSchema()];

const PRINCIPLES = [
  {
    title: 'Straight from the source',
    body: "Briefs are written from one primary source, such as a space agency or a research lab. Features are researched with live search. A model's memory is never used as a source.",
  },
  {
    title: 'An independent second check',
    body: 'Every name, number and date is matched against the source, and a separate pass has to confirm each claim, headline included.',
  },
  {
    title: 'No check, no story',
    body: 'A claim that cannot be confirmed is rewritten or removed. If the story still does not hold up, it is not published.',
  },
];

export default function Home() {
  const all = loadAllPosts();
  if (all.length === 0) return <LaunchHome />;
  const { lead, secondary, rest } = splitTop(all);
  const topIds = new Set([lead, ...secondary].map((p) => p?.id));
  // Articles get their own shelf once there are enough to fill it; news stays in the river.
  const features = all.filter((p) => p.kind === 'feature' && !topIds.has(p.id)).slice(0, 8);
  const shelf = features.length >= 3 ? features : [];
  const onShelf = new Set(shelf.map((p) => p.id));
  const latest = rest.filter((p) => !onShelf.has(p.id)).slice(0, 10);
  const topics = trendingTopics();
  // The page is rebuilt on every publish: the build time is the edition time.
  const edition = new Date();
  const weekCount = all.filter((p) => edition.getTime() - Date.parse(p.publishedAt ?? '') <= 7 * 864e5).length;
  const dial = dialData(
    all.map((p) => ({ id: p.id, title: p.title, href: storyPath(p), brand: p.brand, publishedAt: p.publishedAt ?? '' })),
    edition,
  );

  return (
    <>
      <JsonLd schemas={SITE_SCHEMAS} />
      <h1 className="sr-only">Nuvoxsaga: AI, space and world news</h1>

      {/* 0. Nameplate and the wire */}
      <Masthead edition={edition} weekCount={weekCount} />
      <div className="mt-8">
        <WireTicker posts={all.slice(0, 8)} />
      </div>

      {/* 1. Top stories across the three desks */}
      <section aria-label="Top stories" className="container-page pb-16 pt-8 md:pb-20 md:pt-10">
        <HeroStage lead={lead} secondary={secondary} />
      </section>

      {/* 2. The Frontier Dial: when the newsroom published, desk by desk */}
      {dial.dots.length >= 3 && (
        <section aria-labelledby="dial-title" className="overflow-hidden border-t border-hairline">
          <div className="container-page py-16 md:py-24">
            <p className="data text-sm text-ink-3">The frontier dial</p>
            <h2 id="dial-title" className="display mt-2 max-w-[18ch] text-[clamp(2rem,4vw,3.25rem)]">
              Three desks, one clock.
            </h2>
            <div className="mt-10 md:mt-14">
              <FrontierDial data={dial} />
            </div>
          </div>
        </section>
      )}

      {/* 3. Latest river + sidebar */}
      <section className="border-t border-hairline">
        <div className="container-page grid gap-14 py-16 md:py-20 lg:grid-cols-[1fr_20rem] lg:gap-16">
          <div>
            <div className="mb-2 flex items-end justify-between gap-6">
              <h2 id="latest" className="scroll-mt-20 text-2xl font-bold tracking-[-0.02em]">
                Latest
              </h2>
              <Link href="/latest" className="link-arrow text-sm text-ink-2">
                All latest <ArrowRight aria-hidden="true" size={15} />
              </Link>
            </div>
            <River posts={latest} />
          </div>
          <Rail
            watch
            ledger={ledger(all, edition)}
            topics={topics}
            features={shelf.length === 0 ? features : []}
          />
        </div>
      </section>

      {/* 4. Articles */}
      {shelf.length > 0 && <FeatureShelf posts={shelf} />}

      {/* 5. One block per desk */}
      <section aria-label="Desks" className="border-t border-hairline">
        <div className="container-page grid gap-14 py-16 md:grid-cols-3 md:gap-8 md:py-20">
          {BRANDS.map((b) => (
            <DeskBlock
              key={b.id}
              brand={b.id}
              total={all.filter((p) => p.brand === b.id).length}
              posts={all.filter((p) => p.brand === b.id && !topIds.has(p.id))}
            />
          ))}
        </div>
      </section>

      {/* 6. How we report (compact) */}
      <section aria-labelledby="report-title" className="border-t border-hairline">
        <div className="container-page py-16 md:py-20">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 id="report-title" className="display max-w-[20ch] text-[clamp(1.75rem,3vw,2.5rem)]">
              Every claim is checked before it ships.
            </h2>
            <Link href="/standards" className="link-arrow text-ink-2">
              Our editorial standards <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </div>
          <dl className="mt-10 grid gap-8 md:grid-cols-3">
            {PRINCIPLES.map((p) => (
              <div key={p.title}>
                <dt className="text-lg font-bold tracking-[-0.015em]">{p.title}</dt>
                <dd className="mt-2 text-ink-2">{p.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}

function DeskBlock({ brand, total, posts }: { brand: BrandId; total: number; posts: PublicPost[] }) {
  const b = BRAND_BY_ID[brand];
  const desk = DESKS[brand];
  return (
    <section aria-labelledby={`desk-${b.slug}`} className="reveal">
      <h2 id={`desk-${b.slug}`} className="sr-only">
        {desk.name}
      </h2>
      <PhotoPortal brand={brand} count={total} className="aspect-[16/10]" />
      {posts.length > 0 ? (
        <HeadlineList posts={posts.slice(0, 5)} />
      ) : (
        <p className="py-4 text-ink-2">No {desk.name} stories yet.</p>
      )}
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-hairline pt-4 text-sm text-ink-3">
        {desk.sections.map((s) => (
          <li key={s.slug}>
            <Link href={`/${b.slug}/${s.slug}`} className="hover:text-ink">
              {s.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Before the first story passes its checks: the launch composition (hero, desk bento, how we report). */
function LaunchHome() {
  const [lead, ...rest] = BRANDS;
  return (
    <>
      <JsonLd schemas={SITE_SCHEMAS} />
      <section className="container-page grid gap-10 pb-20 pt-12 md:grid-cols-[1.15fr_0.85fr] md:items-center md:gap-16 md:pb-28 md:pt-20">
        <div className="hero-in">
          <h1 className="display text-[clamp(2.75rem,6.4vw,5.5rem)]">
            Three frontiers.
            <br />
            One newsroom.
          </h1>
          <p className="mt-6 max-w-[34ch] text-lg leading-relaxed text-ink-2 md:text-xl">
            News on AI, space and the world, checked claim by claim against the sources before it is published.
          </p>
          <div className="mt-9">
            <a href="#newsletter" className="btn-primary">
              Subscribe <ArrowRight aria-hidden="true" size={18} strokeWidth={2} />
            </a>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-hairline">
          <Picture
            name="home-orbit"
            alt="Illustration: Earth's horizon at dawn seen from orbit"
            sizes="(min-width: 768px) 42vw, 100vw"
            priority
            className="drift aspect-[4/5] max-h-[72vh] w-full object-cover"
          />
        </div>
      </section>

      <section aria-labelledby="desks-title" className="container-page pb-20 md:pb-28">
        <h2 id="desks-title" className="display reveal mb-8 text-[clamp(2rem,4vw,3.25rem)]">
          Pick your desk
        </h2>
        <div className="reveal grid gap-3 md:grid-cols-[1.25fr_1fr] md:grid-rows-2">
          <PhotoPortal
            brand={lead.id}
            large
            className="aspect-[4/5] md:row-span-2 md:aspect-auto md:min-h-[36rem]"
          />
          {rest.map((b) => (
            <PhotoPortal key={b.id} brand={b.id} className="aspect-[16/10] md:aspect-auto md:min-h-[17.5rem]" />
          ))}
        </div>
      </section>

      <section aria-labelledby="report-title" className="border-t border-hairline">
        <div className="container-page grid gap-12 py-20 md:grid-cols-[1fr_1fr] md:gap-20 md:py-28">
          <div className="md:sticky md:top-28 md:self-start">
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-ink-3">How we report</p>
            <h2 id="report-title" className="display reveal mt-5 max-w-[12ch] text-[clamp(2.25rem,5vw,4rem)]">
              Every claim is checked before it ships.
            </h2>
          </div>
          <div className="flex flex-col gap-10">
            <div className="reveal overflow-hidden rounded-2xl border border-hairline">
              <Picture
                name="newsroom"
                alt="Illustration: research papers and source documents on a desk"
                sizes="(min-width: 768px) 45vw, 100vw"
                className="aspect-[10/7] w-full object-cover"
              />
            </div>
            <dl className="grid gap-8">
              {PRINCIPLES.map((p) => (
                <div key={p.title} className="reveal">
                  <dt className="text-xl font-bold tracking-[-0.015em]">{p.title}</dt>
                  <dd className="mt-2 max-w-[52ch] text-ink-2">{p.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>
    </>
  );
}
