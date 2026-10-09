/** /standards: how Nuvoxsaga reports, checks and corrects. Plain copy, no em-dashes. */
import Link from 'next/link';
import type { Metadata } from 'next';
import { og } from '@/lib/og';

export const metadata: Metadata = {
  title: 'Editorial standards',
  description: 'How Nuvoxsaga writes, checks and corrects its stories, and how AI is used in the newsroom.',
  alternates: { canonical: '/standards' },
  openGraph: og({ url: '/standards' }),
};

const SECTIONS: { id?: string; title: string; body: string[] }[] = [
  {
    title: 'Who we are',
    body: [
      'Nuvoxsaga is a small independent newsroom with three desks: AI, Space and World. It is owned and edited by Pratyush Kumar Singh, who sets the sources and the checking rules, and owns the corrections.',
      'Our stories are drafted with AI language models. An automated verification process checks them before anything is published, and this page explains how it works.',
    ],
  },
  {
    // Every story's "Here's how we know" line links here.
    id: 'checks',
    title: 'How every story is checked',
    body: [
      'Each story names the sources it was written from, and each factual claim in it is listed with the source that confirms it. Before publication, every name, number and date is matched against the source text, and a separate, independent check has to confirm each claim, the headline included.',
      'A claim that cannot be confirmed is rewritten or removed. If the story still does not hold up, it is not published. The claims list under every story is the record of that check.',
    ],
  },
  {
    title: 'News briefs',
    body: [
      'A brief is written from one primary source: a space agency, a research lab, a company announcement, a government office or an international body such as the UN or WHO. The source is linked at the end of every brief.',
      'The draft may only use facts that appear in that source. Before publication every name, number and date in the brief is matched against the source text, and a separate check has to confirm each claim. If anything fails, the brief is not published.',
      'Figures and statements are attributed ("according to NASA"). A brief reports what the source says and adds no opinion.',
    ],
  },
  {
    title: 'Features',
    body: [
      "Features are researched with live web search, and a model's memory is never used as a source. An independent search-based check then has to confirm every factual claim, including the headline. A story that cannot be confirmed after one revision is dropped.",
      'Each feature lists its sources and the claims that were checked.',
    ],
  },
  {
    title: 'What we do not do',
    body: [
      "We do not rewrite other outlets' reporting, use anonymous sources, or publish opinion on the World desk. We do not publish casualty figures, election results or allegations unless an official source states them, and we attribute them when we do.",
    ],
  },
  {
    title: 'Images',
    body: [
      'Photos from agencies such as NASA or ESA are credited under each image. Where no suitable photo exists we use an AI illustration, and the caption says so. Illustrations are never presented as photographs of real events.',
    ],
  },
  {
    title: 'Corrections',
    body: [
      'When we get something wrong we fix it in public: the story carries a dated correction note, and the correction is listed on our corrections page.',
    ],
  },
  {
    id: 'advertising',
    title: 'Advertising',
    body: [
      'Nuvoxsaga is self-funded and will carry display advertising served by Google. Every ad is labelled as an advertisement and is kept apart from the stories. Advertisers have no say in what we cover or how a story is written, checked or corrected, and they never see a story before it is published.',
      'We do not publish sponsored content, advertorials or paid links, and no story is written to carry an ad. Who owns and funds the site is set out on the about page.',
    ],
  },
];

export default function StandardsPage() {
  return (
    <article data-pagefind-body className="container-page pb-24 pt-10 md:pt-14">
      <div className="mx-auto max-w-[46rem]">
        <h1 className="display text-[clamp(2.5rem,6vw,4.5rem)]">Editorial standards</h1>
        <p className="mt-5 text-xl leading-snug text-ink-2">How we write, check and correct every story.</p>
        <div className="mt-12 grid gap-12">
          {SECTIONS.map((s) => (
            <section key={s.title} id={s.id} className={s.id ? 'scroll-mt-20' : undefined}>
              <h2 className="text-2xl font-bold tracking-[-0.02em]">{s.title}</h2>
              {s.body.map((p, i) => (
                <p key={i} className="mt-4 text-lg leading-relaxed text-ink-2">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>
        <p className="mt-14 text-ink-2">
          Found an error?{' '}
          <Link href="/corrections" className="text-ink underline underline-offset-4">
            Tell us
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
