/** /latest: the newest 60 stories from every desk, newest first. */
import type { Metadata } from 'next';
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
  const posts = all.slice(0, 60);
  return (
    <section className="container-page pb-24 pt-10 md:pt-14">
      <h1 className="display text-[clamp(2.5rem,6vw,4.5rem)]">Latest</h1>
      <p className="mt-3 max-w-[60ch] text-ink-2">The newest stories from all three desks.</p>
      <h2 className="sr-only">Stories</h2>
      {posts.length ? (
        <div className="mt-10 grid gap-14 lg:grid-cols-[1fr_20rem] lg:gap-16">
          <River posts={posts} />
          <Rail ledger={ledger(all, new Date())} topics={trendingTopics()} />
        </div>
      ) : (
        <div className="mt-10">
          <EmptyDesk label="published" />
        </div>
      )}
    </section>
  );
}
