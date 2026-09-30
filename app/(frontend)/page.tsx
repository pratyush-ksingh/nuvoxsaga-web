/**
 * Home, the media-house front page:
 *   1. top stories (lead + 3) across the desks    2. Latest river + trending topics/features
 *   3. one block per desk                          4. how we report (newsletter band: SiteFooter)
 * Before the first story is published it shows the launch composition instead (LaunchHome).
 */
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { BRANDS, BRAND_BY_ID, type BrandId } from '@/lib/brands';
import { BRAND_CONTENT } from '@/lib/brand-content';
import { DESKS } from '@/lib/desks';
import { loadAllPosts, splitTop, trendingTopics, type PublicPost } from '@/lib/content';
import { Picture } from '@/components/Picture';
import { HeadlineList, River, SecondaryStory, TopStories } from '@/components/news/StoryCards';
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
    title: 'Primary sources, not memory',
    body: 'Briefs are written from one primary source, such as a space agency or a research lab, and features from live search. Never from what a model remembers.',
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
  const latest = rest.slice(0, 14);
  const features = all.filter((p) => p.kind === 'feature' && !topIds.has(p.id)).slice(0, 5);
  const topics = trendingTopics();

  return (
    <>
      <JsonLd schemas={SITE_SCHEMAS} />
      <h1 className="sr-only">Nuvoxsaga: AI, space and world news</h1>

      {/* 1. Top stories across the three desks */}
      <section aria-label="Top stories" className="container-page pb-16 pt-10 md:pb-20 md:pt-14">
        <TopStories lead={lead} secondary={secondary} />
      </section>

      {/* 2. Latest river + sidebar */}
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
          <aside className="flex flex-col gap-12 lg:sticky lg:top-24 lg:self-start">
            {topics.length > 0 && (
              <section aria-labelledby="topics-title">
                <h2 id="topics-title" className="border-b border-hairline pb-3 text-lg font-bold">
                  Trending topics
                </h2>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {topics.map((t) => (
                    <li key={t.slug}>
                      <Link
                        href={`/topic/${t.slug}`}
                        className="block rounded-full border border-hairline px-3.5 py-1.5 text-sm text-ink-2 transition-colors duration-150 hover:text-ink"
                      >
                        {t.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {features.length > 0 && (
              <section aria-labelledby="features-title">
                <h2 id="features-title" className="border-b border-hairline pb-3 text-lg font-bold">
                  Features and explainers
                </h2>
                <HeadlineList posts={features} numbered />
              </section>
            )}
          </aside>
        </div>
      </section>

      {/* 3. One block per desk */}
      <section aria-label="Desks" className="border-t border-hairline">
        <div className="container-page grid gap-14 py-16 md:grid-cols-3 md:gap-8 md:py-20">
          {BRANDS.map((b) => (
            <DeskBlock key={b.id} brand={b.id} posts={all.filter((p) => p.brand === b.id && !topIds.has(p.id))} />
          ))}
        </div>
      </section>

      {/* 4. How we report (compact) */}
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

function DeskBlock({ brand, posts }: { brand: BrandId; posts: PublicPost[] }) {
  const b = BRAND_BY_ID[brand];
  const desk = DESKS[brand];
  const [first, ...next] = posts;
  return (
    <section aria-labelledby={`desk-${b.slug}`}>
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-hairline pb-3">
        <h2 id={`desk-${b.slug}`} className="text-2xl font-extrabold tracking-[-0.03em]">
          <Link href={`/${b.slug}`} className="inline-flex items-center gap-3 hover:text-ink-2">
            <span aria-hidden="true" className="h-[3px] w-6 rounded-full" style={{ background: desk.accent }} />
            {desk.name}
          </Link>
        </h2>
        <Link href={`/${b.slug}`} className="text-sm text-ink-2 hover:text-ink">
          See all
        </Link>
      </div>
      {first ? (
        <>
          <SecondaryStory post={first} showDesk={false} />
          {next.length > 0 && (
            <div className="mt-4">
              <HeadlineList posts={next.slice(0, 4)} />
            </div>
          )}
        </>
      ) : (
        <p className="text-ink-2">No {desk.name} stories yet.</p>
      )}
      <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink-3">
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
        <div className="grid gap-3 md:grid-cols-[1.25fr_1fr] md:grid-rows-2">
          <BrandTile brand={lead} large />
          {rest.map((b) => (
            <BrandTile key={b.id} brand={b} />
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

function BrandTile({ brand, large = false }: { brand: (typeof BRANDS)[number]; large?: boolean }) {
  const c = BRAND_CONTENT[brand.id];
  const desk = DESKS[brand.id];
  return (
    <Link
      href={`/${brand.slug}`}
      className={`group reveal relative block overflow-hidden rounded-2xl border border-hairline ${
        large ? 'aspect-[4/5] md:row-span-2 md:aspect-auto md:min-h-[36rem]' : 'aspect-[16/10] md:aspect-auto md:min-h-[17.5rem]'
      }`}
    >
      <Picture
        name={c.image}
        alt=""
        sizes={large ? '(min-width: 768px) 55vw, 100vw' : '(min-width: 768px) 45vw, 100vw'}
        className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
      />
      <div aria-hidden="true" className="scrim-bottom absolute inset-0" />
      <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
        <span aria-hidden="true" className="mb-4 block h-[3px] w-10 rounded-full" style={{ background: desk.accent }} />
        <h3 className={`font-extrabold tracking-[-0.03em] ${large ? 'text-4xl md:text-5xl' : 'text-3xl'}`}>{desk.name}</h3>
        <p className="mt-2 max-w-[36ch] text-ink-2">{c.tileCaption}</p>
      </div>
    </Link>
  );
}
