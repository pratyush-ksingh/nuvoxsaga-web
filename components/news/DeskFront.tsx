/**
 * A desk front (/space) and its older pages (/space/page/2). Page 1 opens with the
 * lead + 3 top stories; every page then runs the "Latest" river with a sidebar of the
 * desk's recent features.
 */
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { BRAND_BY_ID, type BrandId } from '@/lib/brands';
import { DESKS, PAGE_SIZE } from '@/lib/desks';
import { fetchAllPostsForBrand, splitTop, type PublicPost } from '@/lib/content';
import { BrandProvider } from '@/components/brand/BrandProvider';
import { HeadlineList, River, TopStories } from '@/components/news/StoryCards';
import { DeskHeader, EmptyDesk, Pager } from '@/components/news/DeskChrome';

export async function deskRiver(brand: BrandId) {
  const all = await fetchAllPostsForBrand(brand);
  const top = splitTop(all);
  const pages = Math.max(1, Math.ceil(top.rest.length / PAGE_SIZE));
  return { all, ...top, pages };
}

export async function DeskFront({ brand, page }: { brand: BrandId; page: number }) {
  const b = BRAND_BY_ID[brand];
  const desk = DESKS[brand];
  const { all, lead, secondary, rest, pages } = await deskRiver(brand);
  const river = rest.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  // Skip anything already on this page (top stories on page 1, plus this page's river).
  const shown = new Set([...(page === 1 ? [lead, ...secondary] : []), ...river].map((p) => p?.id));
  const features = all.filter((p) => p.kind === 'feature' && !shown.has(p.id)).slice(0, 5);

  return (
    <BrandProvider brand={brand}>
      <DeskHeader brand={brand} />
      <div className="container-page pb-24 pt-10 md:pt-14">
        {all.length === 0 ? (
          <EmptyDesk label={desk.name} />
        ) : (
          <>
            {page === 1 && <TopStories lead={lead} secondary={secondary} showDesk={false} />}
            <div className={`grid gap-14 lg:grid-cols-[1fr_20rem] lg:gap-16 ${page === 1 ? 'mt-16' : ''}`}>
              <section aria-labelledby="latest-title">
                <h2 id="latest-title" className="mb-2 text-2xl font-bold tracking-[-0.02em]">
                  {page === 1 ? 'Latest' : `Latest, page ${page}`}
                </h2>
                {river.length > 0 ? (
                  <River posts={river} showDesk={false} />
                ) : (
                  <p className="border-t border-hairline py-6 text-ink-2">Every story on this desk is above.</p>
                )}
                <Pager base={`/${b.slug}`} page={page} pages={pages} />
              </section>
              <Sidebar brand={brand} features={features} />
            </div>
          </>
        )}
      </div>
    </BrandProvider>
  );
}

function Sidebar({ brand, features }: { brand: BrandId; features: PublicPost[] }) {
  const b = BRAND_BY_ID[brand];
  return (
    <aside className="flex flex-col gap-12 lg:sticky lg:top-24 lg:self-start">
      {features.length > 0 && (
        <section aria-labelledby="features-title">
          <h2 id="features-title" className="border-b border-hairline pb-3 text-lg font-bold">
            Features and explainers
          </h2>
          <HeadlineList posts={features} />
        </section>
      )}
      <section aria-labelledby="watch-title" className="rounded-2xl border border-hairline bg-surface p-6">
        <h2 id="watch-title" className="text-lg font-bold">
          Watch {b.name}
        </h2>
        <p className="mt-2 text-sm text-ink-2">Daily shorts from the {DESKS[brand].name} desk.</p>
        <a
          href={`https://www.youtube.com/${b.handle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="link-arrow mt-4 text-sm"
        >
          Open on YouTube <ArrowUpRight aria-hidden="true" size={15} />
        </a>
      </section>
      <p className="text-sm text-ink-3">
        How we check stories:{' '}
        <Link href="/standards" className="text-ink-2 underline underline-offset-4 hover:text-ink">
          editorial standards
        </Link>
      </p>
    </aside>
  );
}
