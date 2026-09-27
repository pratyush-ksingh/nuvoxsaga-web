import type { Metadata } from 'next';
import Link from 'next/link';
import { loadArchive } from '@/lib/archive';
import { ArchiveNotice } from '@/components/ArchiveNotice';

export const metadata: Metadata = {
  title: 'Archive',
  description: 'Posts from the old nuvox-ai.com blog, kept for reference. Not fact-checked.',
  alternates: { canonical: '/archive' },
  // Unverified content: readable for anyone with a link, invisible to search engines.
  robots: { index: false, follow: false },
};

const dateFmt = new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });

export default function ArchiveIndex() {
  const posts = loadArchive();
  return (
    <section className="container-page pb-24 pt-14 md:pt-20">
      <div className="max-w-3xl">
        <h1 className="display text-[clamp(2.5rem,5vw,4rem)]">Archive</h1>
        <p className="mt-4 text-lg text-ink-2">
          {posts.length} posts from the old nuvox-ai.com blog, kept so existing links keep working.
        </p>
        <div className="mt-8">
          <ArchiveNotice />
        </div>
      </div>
      <ol className="mt-12 max-w-3xl divide-y divide-hairline border-y border-hairline">
        {posts.map((p) => (
          <li key={p.slug} className="py-5">
            <Link href={`/archive/${p.slug}`} className="group block">
              <h2 className="text-lg font-semibold leading-snug transition-colors duration-150 group-hover:text-ink-2">
                {p.title}
              </h2>
              {p.publishedAt && (
                <time dateTime={p.publishedAt} className="mt-1 block text-sm text-ink-3">
                  {dateFmt.format(new Date(p.publishedAt))}
                </time>
              )}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
