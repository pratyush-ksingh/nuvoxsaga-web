/**
 * The rail beside a story river (home, desk fronts, Latest, topic pages). It fills the
 * column with proof instead of promotion (DESIGN.md §6, "Rail"):
 *   ledger     claims checked, primary sources and stories, counted from the stories
 *   sources    the primary sources the briefs were written from, as a small bar chart
 *   topics     trending topics
 *   features   features and explainers, when a page has no shelf for them
 *   watch      the desks' YouTube channels (optional)
 *   edition    the newsletter, one line and one button
 * Every module is optional and skipped when its data is empty.
 */
import Link from 'next/link';
import { ArrowRight, CirclePlay } from 'lucide-react';
import { BRANDS } from '@/lib/brands';
import { DESKS } from '@/lib/desks';
import type { PublicPost } from '@/lib/content';
import type { Ledger } from '@/lib/ledger';
import { HeadlineList } from '@/components/news/StoryCards';

export function Rail({
  ledger,
  topics = [],
  features = [],
  accent = 'var(--ink)',
  watch = false,
  children,
}: {
  /** Show the three desks' YouTube channels (home and pages without their own watch card). */
  watch?: boolean;
  ledger?: Ledger;
  topics?: { slug: string; name: string }[];
  features?: PublicPost[];
  /** Bar colour in the sources chart: the desk accent on a desk front. */
  accent?: string;
  /** Page-specific modules, shown first. */
  children?: React.ReactNode;
}) {
  return (
    <aside className="flex flex-col gap-12 lg:sticky lg:top-24 lg:self-start">
      {children}

      {ledger && ledger.stories > 0 && (
        <section aria-labelledby="ledger-title" className="rounded-2xl border border-hairline bg-surface p-6">
          <h2 id="ledger-title" className="data text-sm font-normal text-ink-3">
            The ledger, {ledger.label}
          </h2>
          <dl className="mt-5 grid grid-cols-3 gap-3">
            {[
              ['claims checked', ledger.claims],
              ['sources checked', ledger.sources],
              [ledger.stories === 1 ? 'story' : 'stories', ledger.stories],
            ].map(([label, n]) => (
              // dt before dd in the markup; flex-col-reverse shows the number on top.
              <div key={label as string} className="flex flex-col-reverse justify-end">
                <dt className="mt-2 text-xs leading-snug text-ink-3">{label}</dt>
                <dd className="data text-[1.9rem] leading-none text-ink">{n}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 border-t border-hairline pt-4 text-sm text-ink-2">
            Nothing is published until every claim in it matches its source.{' '}
            <Link href="/standards" className="text-ink underline underline-offset-4 hover:text-ink-2">
              How we check
            </Link>
          </p>
        </section>
      )}

      {ledger && ledger.topSources.length > 1 && (
        <section aria-labelledby="sources-title">
          <h2 id="sources-title" className="border-b border-hairline pb-3 text-lg font-bold">
            Where the news came from
          </h2>
          <ul className="mt-4 grid gap-3">
            {ledger.topSources.map((s) => (
              <li key={s.name} className="text-sm">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-ink-2">{s.name}</span>
                  <span className="data text-ink-3">{s.count}</span>
                </div>
                <div aria-hidden="true" className="mt-1.5 h-[3px] rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(s.count / ledger.topSources[0].count) * 100}%`, background: accent }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-3">Primary sources of the briefs, {ledger.label}.</p>
        </section>
      )}

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
            Features
          </h2>
          <HeadlineList posts={features} numbered />
        </section>
      )}

      {watch && (
        <section aria-labelledby="watch-title">
          <h2 id="watch-title" className="border-b border-hairline pb-3 text-lg font-bold">
            Watch the desks
          </h2>
          <ul className="mt-4 grid gap-3 text-sm">
            {BRANDS.map((b) => (
              <li key={b.id}>
                <a
                  href={`https://www.youtube.com/${b.handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between gap-4"
                >
                  <span className="flex items-center gap-2.5 text-ink-2 group-hover:text-ink">
                    <CirclePlay aria-hidden="true" size={17} strokeWidth={1.75} style={{ color: DESKS[b.id].accent }} />
                    {b.name}
                  </span>
                  <span className="data text-ink-3">{b.handle}</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-3">Daily shorts on YouTube, one channel per desk.</p>
        </section>
      )}

      <section aria-labelledby="edition-title" className="border-t border-hairline pt-6">
        <h2 id="edition-title" className="display text-2xl">
          Nuvoxsaga, by email
        </h2>
        <p className="mt-2 text-sm text-ink-2">The day&apos;s checked stories from the desks you pick. Double opt-in.</p>
        <a href="#newsletter" className="link-arrow mt-4 text-sm">
          Subscribe <ArrowRight aria-hidden="true" size={15} />
        </a>
      </section>
    </aside>
  );
}
