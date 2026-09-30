/** /corrections: how to report an error, and every correction we have published. */
import Link from 'next/link';
import type { Metadata } from 'next';
import { og } from '@/lib/og';
import { loadAllPosts, storyPath } from '@/lib/content';

export const metadata: Metadata = {
  title: 'Corrections',
  description: 'Report an error in a Nuvoxsaga story, and see every correction we have made.',
  alternates: { canonical: '/corrections' },
  openGraph: og({ url: '/corrections' }),
};

const CORRECTIONS_EMAIL = 'corrections@nuvoxsaga.com';

const stampFmt = new Intl.DateTimeFormat('en', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

export default function CorrectionsPage() {
  const items = loadAllPosts()
    .flatMap((p) => (p.corrections ?? []).map((c) => ({ post: p, ...c })))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

  return (
    <article className="container-page pb-24 pt-10 md:pt-14">
      <div className="mx-auto max-w-[46rem]">
        <h1 className="display text-[clamp(2.5rem,6vw,4.5rem)]">Corrections</h1>
        <p className="mt-5 text-xl leading-snug text-ink-2">
          If a story of ours is wrong, we want to know, and we fix it in public.
        </p>
        <section className="mt-10 rounded-2xl border border-hairline bg-surface p-6 md:p-8">
          <h2 className="text-xl font-bold">Report an error</h2>
          <p className="mt-3 text-ink-2">
            Email{' '}
            <a href={`mailto:${CORRECTIONS_EMAIL}`} className="text-ink underline underline-offset-4">
              {CORRECTIONS_EMAIL}
            </a>{' '}
            with the link to the story, what is wrong, and a source that shows it. We review every report.
          </p>
        </section>
        <section className="mt-14">
          <h2 className="text-2xl font-bold tracking-[-0.02em]">Published corrections</h2>
          {items.length === 0 ? (
            <p className="mt-4 text-ink-2">None so far.</p>
          ) : (
            <ol className="mt-6 divide-y divide-hairline border-y border-hairline">
              {items.map((c, i) => (
                <li key={i} className="py-5">
                  <time dateTime={c.date} className="text-sm text-ink-3">
                    {stampFmt.format(new Date(c.date))}
                  </time>
                  <p className="mt-1 font-semibold">
                    <Link href={storyPath(c.post)} className="hover:text-ink-2">
                      {c.post.title}
                    </Link>
                  </p>
                  <p className="mt-1 text-ink-2">{c.text}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
        <p className="mt-10 text-ink-2">
          Read our{' '}
          <Link href="/standards" className="text-ink underline underline-offset-4">
            editorial standards
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
