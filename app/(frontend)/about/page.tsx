/**
 * /about: what the desks cover, how stories are made and checked, who is behind the site
 * (masthead) and who pays for it (ownership and funding). The two anchors, #masthead and
 * #ownership, are the NewsMediaOrganization's masthead and ownershipFundingInfo links
 * (lib/seo.ts). Plain copy, no em-dashes.
 */
import type { Metadata } from 'next';
import { og } from '@/lib/og';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Picture } from '@/components/Picture';
import { PlainEmail } from '@/components/PlainEmail';
import { BRANDS } from '@/lib/brands';
import { DESKS } from '@/lib/desks';
import { EDITOR } from '@/lib/editor';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Nuvoxsaga is a news site with three desks: AI, Space and World. Stories are written with AI and checked against their sources before publication. Owned and edited by Pratyush Kumar Singh.',
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
      </section>

      <section id="masthead" aria-labelledby="masthead-title" data-pagefind-body className="scroll-mt-20 border-t border-hairline">
        <div className="container-page grid gap-10 py-20 md:grid-cols-[0.9fr_1.1fr] md:py-28">
          <div>
            <h2 id="masthead-title" className="display text-[clamp(2rem,4vw,3.25rem)]">
              Masthead
            </h2>
            <p className="mt-4 max-w-[40ch] text-ink-2">Who is responsible for what Nuvoxsaga publishes.</p>
          </div>
          <dl className="grid gap-8">
            <div>
              <dt className="text-sm font-medium text-ink-3">Editor and publisher</dt>
              <dd className="mt-1 text-xl font-bold">
                <Link href={EDITOR.path} className="transition-colors duration-150 hover:text-ink-2">
                  {EDITOR.name}
                </Link>
              </dd>
              <dd className="mt-2 max-w-[52ch] text-ink-2">
                Sets the sources each desk draws on, reviews the checks every story goes through, and owns the corrections
                log. Based in {EDITOR.location}.{' '}
                <Link href={EDITOR.path} className="link-arrow text-ink">
                  Read more <ArrowRight aria-hidden="true" size={14} />
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-ink-3">Desks</dt>
              <dd className="mt-1 flex flex-wrap gap-x-6 gap-y-2 text-lg font-semibold">
                {BRANDS.map((b) => (
                  <Link key={b.id} href={`/${b.slug}`} className="hover:underline hover:underline-offset-4" style={{ color: DESKS[b.id].accent }}>
                    {DESKS[b.id].name}
                  </Link>
                ))}
              </dd>
              <dd className="mt-2 max-w-[52ch] text-ink-2">
                Each desk&apos;s stories are drafted with AI from primary sources, checked claim by claim by an automated
                process, and published under the editor&apos;s rules. No desk has staff writers.
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-ink-3">Contact</dt>
              <dd className="mt-1 text-ink-2">
                <PlainEmail address={EDITOR.email} /> for stories, corrections and anything about your data. See the{' '}
                <Link href="/contact" className="text-ink underline underline-offset-4">
                  contact page
                </Link>
                .
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section id="ownership" aria-labelledby="ownership-title" data-pagefind-body className="scroll-mt-20 border-t border-hairline">
        <div className="container-page grid gap-10 py-20 md:grid-cols-[0.9fr_1.1fr] md:py-28">
          <div>
            <h2 id="ownership-title" className="display text-[clamp(2rem,4vw,3.25rem)]">
              Ownership and funding
            </h2>
            <p className="mt-4 max-w-[40ch] text-ink-2">Who owns the site and where the money comes from.</p>
          </div>
          <div className="grid gap-5 text-lg leading-relaxed text-ink-2">
            <p>
              Nuvoxsaga is owned and edited by {EDITOR.name}, an independent publisher based in {EDITOR.location}. It is not
              part of any media group, and no other person or company holds a stake in it.
            </p>
            <p>
              The site is self-funded by its owner. It has no sponsors, no investors and no paid partnerships, and it does
              not publish sponsored content. It will carry display advertising served by Google. Advertisers do not see
              stories before publication and have no say in what the desks cover or how a story is written, checked or
              corrected.
            </p>
            <p>
              Our{' '}
              <Link href="/standards" className="text-ink underline underline-offset-4">
                editorial standards
              </Link>{' '}
              set out how stories are made and checked, and our{' '}
              <Link href="/privacy" className="text-ink underline underline-offset-4">
                privacy policy
              </Link>{' '}
              explains what advertising means for your data.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-hairline">
        <div className="container-page py-16 md:py-20">
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
