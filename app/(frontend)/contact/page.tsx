/** /contact: who runs Nuvoxsaga and how to reach them. Plain copy, no em-dashes. */
import Link from 'next/link';
import type { Metadata } from 'next';
import { og } from '@/lib/og';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Who runs Nuvoxsaga and how to reach the editor about a story, a correction or your data.',
  alternates: { canonical: '/contact' },
  openGraph: og({ url: '/contact' }),
};

const CONTACT_EMAIL = 'corrections@nuvoxsaga.com';

export default function ContactPage() {
  return (
    <article className="container-page pb-24 pt-10 md:pt-14">
      <div className="mx-auto max-w-[46rem]">
        <h1 className="display text-[clamp(2.5rem,6vw,4.5rem)]">Contact</h1>
        <p className="mt-5 text-xl leading-snug text-ink-2">
          Nuvoxsaga is an independent news site edited by one person. Every message is read.
        </p>

        <section className="mt-10 rounded-2xl border border-hairline bg-surface p-6 md:p-8">
          <h2 className="text-xl font-bold">Write to the editor</h2>
          <p className="mt-3 text-ink-2">
            Email{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-ink underline underline-offset-4">
              {CONTACT_EMAIL}
            </a>{' '}
            about a story, a mistake, a source we should follow, or anything to do with your personal data.
          </p>
          <p className="mt-3 text-sm text-ink-3">
            Reporting an error? Include the link to the story, what is wrong, and a source that shows it.
          </p>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-bold tracking-[-0.02em]">Who runs Nuvoxsaga</h2>
          <p className="mt-4 text-lg leading-relaxed text-ink-2">
            Nuvoxsaga is published and edited by Pratyush Kumar Singh, an independent publisher based in India. The
            editor is responsible for what the site publishes, for the rules the stories are checked against, and
            for corrections.
          </p>
          <p className="mt-4 text-lg leading-relaxed text-ink-2">
            Stories are drafted with AI language models and checked against their sources by an automated process
            before publication. How that works, and what we do not publish, is set out in our{' '}
            <Link href="/standards" className="text-ink underline underline-offset-4">
              editorial standards
            </Link>
            .
          </p>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-bold tracking-[-0.02em]">More</h2>
          <ul className="mt-4 grid gap-3 text-lg text-ink-2">
            <li>
              <Link href="/corrections" className="text-ink underline underline-offset-4">
                Corrections
              </Link>
              : every correction we have published.
            </li>
            <li>
              <Link href="/privacy" className="text-ink underline underline-offset-4">
                Privacy
              </Link>
              : what we collect and how to have it deleted.
            </li>
            <li>
              <Link href="/about" className="text-ink underline underline-offset-4">
                About
              </Link>
              : what the three desks cover.
            </li>
          </ul>
        </section>
      </div>
    </article>
  );
}
