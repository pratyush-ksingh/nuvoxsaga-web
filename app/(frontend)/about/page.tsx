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
    body: 'The AI desk follows models, research, chips and policy. Space tracks launches, missions and discoveries. World handles international news, with a close eye on Asia and India.',
  },
  {
    title: 'How stories are made',
    body: 'AI drafts our stories. We say that up front, because you should know how your news gets made. A news brief starts from one primary source, such as a space agency, a research lab or a government, and every brief links to that source. Longer features and weekly round-ups are checked the same way, claim by claim, before they are published.',
  },
  {
    title: 'How we check them',
    body: 'Before anything is published, we match every name, number and date against the source, and a separate check then has to confirm each claim, the headline included. A story that fails stays unpublished.',
  },
  {
    title: 'When we get it wrong',
    body: "Checks cut errors down, though a mistake can still get through. If you spot one, email corrections@nuvoxsaga.com and we'll fix the story and say what changed.",
  },
];

export default function AboutPage() {
  return (
    <>
      <section data-pagefind-body className="container-page grid gap-10 pb-16 pt-14 md:grid-cols-[1.1fr_0.9fr] md:items-end md:pb-24 md:pt-20">
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

      <section aria-label="About Nuvoxsaga" data-pagefind-body className="border-t border-hairline">
        <dl className="container-page grid gap-x-16 gap-y-12 py-20 md:grid-cols-2 md:py-28">
          {FACTS.map((f) => (
            <div key={f.title} className="reveal">
              <dt className="font-serif text-2xl font-bold tracking-[-0.02em]">{f.title}</dt>
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
