/** /latest: the newest 30 stories from every desk, newest first; older ones live on the desk pages. */
import type { Metadata } from 'next';
import Link from 'next/link';
import { BRANDS } from '@/lib/brands';
import { DESKS } from '@/lib/desks';
import { og } from '@/lib/og';
import { loadAllPosts, trendingTopics } from '@/lib/content';
import { ledger } from '@/lib/ledger';
import { River } from '@/components/news/StoryCards';
import { Rail } from '@/components/news/Rail';
import { EmptyDesk } from '@/components/news/DeskChrome';

export const metadata: Metadata = {
  title: 'Latest news',
  description: 'The newest stories from the AI, Space and World desks.',
  alternates: { canonical: '/latest' },
  openGraph: og({ url: '/latest' }),
};

export default function LatestPage() {
  const all = loadAllPosts();
  const posts = all.slice(0, 30);
  return (
    <section className="container-page pb-24 pt-10 md:pt-14">
      <h1 className="display text-[clamp(2.5rem,6vw,4.5rem)]">Latest</h1>
      <p className="mt-3 max-w-[60ch] text-ink-2">The newest stories from all three desks.</p>
      <h2 className="sr-only">Stories</h2>
      {posts.length ? (
        <div className="mt-10 grid gap-14 lg:grid-cols-[1fr_20rem] lg:gap-16">
          <div>
            <River posts={posts} />
            {all.length > posts.length && (
              <p className="mt-8 text-ink-2">
                Older stories are on each desk:{' '}
                {BRANDS.map((b, i) => (
                  <span key={b.id}>
                    {i > 0 && ', '}
                    <Link href={`/${b.slug}`} className="text-ink underline underline-offset-4 hover:text-ink-2">
                      {DESKS[b.id].name}
                    </Link>
                  </span>
                ))}
                .
              </p>
            )}
          </div>
          <Rail watch ledger={ledger(all, new Date())} topics={trendingTopics()} />
        </div>
      ) : (
        <div className="mt-10">
          <EmptyDesk label="published" />
        </div>
      )}
    </section>
  );
}
