import type { Metadata } from 'next';
import { og } from '@/lib/og';
import Link from 'next/link';
import { Picture } from '@/components/Picture';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Nuvoxsaga is a news site with three desks: AI, Space and World. Stories are written with AI and checked against their sources before publication.',
  alternates: { canonical: '/about' },
  openGraph: og({ url: '/about' }),
};

const FACTS = [
  {
    title: 'What we cover',
    body: 'Three desks under one roof: AI (models, research, chips and policy), Space (launches, missions and discoveries) and World (international news, with a close eye on Asia and India).',
  },
  {
    title: 'How stories are made',
    body: 'Stories are drafted by AI. News briefs are written from one primary source, such as a space agency, a research lab or a government, which is linked on every brief. Longer features are researched with live web search. We say so plainly because readers deserve to know how their news is made.',
  },
  {
    title: 'How we check them',
    body: 'Before anything is published, every name, number and date is matched against the source, and a separate check has to confirm each claim, headline included. A story that fails is not published.',
  },
  {
    title: 'When we get it wrong',
    body: 'Checks reduce errors; they do not make them impossible. If you spot a mistake, email corrections@nuvoxsaga.com and we will correct the story and say what changed.',
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="container-page grid gap-10 pb-16 pt-14 md:grid-cols-[1.1fr_0.9fr] md:items-end md:pb-24 md:pt-20">
        <div className="hero-in">
          <h1 className="display text-[clamp(2.75rem,6vw,5rem)]">A newsroom that shows its work.</h1>
          <p className="mt-6 max-w-[40ch] text-lg text-ink-2 md:text-xl">
            Nuvoxsaga covers AI, space and the world, with every claim checked against its sources before it ships.
          </p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-hairline">
          <Picture
            name="newsroom"
            alt="Illustration: research papers and source documents on a desk"
            sizes="(min-width: 768px) 40vw, 100vw"
            priority
            className="aspect-[10/7] w-full object-cover"
          />
        </div>
      </section>

      <section aria-label="About Nuvoxsaga" className="border-t border-hairline">
        <dl className="container-page grid gap-x-16 gap-y-12 py-20 md:grid-cols-2 md:py-28">
          {FACTS.map((f) => (
            <div key={f.title} className="reveal">
              <dt className="text-2xl font-bold tracking-[-0.02em]">{f.title}</dt>
              <dd className="mt-3 max-w-[52ch] text-lg text-ink-2">{f.body}</dd>
            </div>
          ))}
        </dl>
        <div className="container-page pb-20 md:pb-28">
          <div className="flex flex-wrap items-center gap-x-7 gap-y-4">
            <Link href="/latest" className="btn-primary">
              Read the latest
            </Link>
            <Link href="/standards" className="link-arrow">
              Our editorial standards
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
