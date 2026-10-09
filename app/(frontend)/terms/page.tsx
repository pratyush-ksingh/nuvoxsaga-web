/**
 * /terms: the terms of use. Same SECTIONS pattern as /privacy. Plain copy, no em-dashes.
 * Nothing here promises more than the site does: accuracy is covered by the corrections
 * policy, not a warranty, and the licence covers our own text only (sources and agency
 * images keep their owners' terms).
 */
import type { ReactNode } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { og } from '@/lib/og';

export const metadata: Metadata = {
  title: 'Terms of use',
  description: 'The terms for reading and reusing Nuvoxsaga: accuracy and corrections, copyright, third-party sources and images, advertising, and governing law.',
  alternates: { canonical: '/terms' },
  openGraph: og({ url: '/terms' }),
};

const CONTACT_EMAIL = 'corrections@nuvoxsaga.com';
const UPDATED = '9 October 2026';

function In({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-ink underline underline-offset-4">
      {children}
    </Link>
  );
}

const SECTIONS: { title: string; body: ReactNode[] }[] = [
  {
    title: 'Using the site',
    body: [
      'Nuvoxsaga (nuvoxsaga.com) is a news site published by Pratyush Kumar Singh. By reading it you agree to these terms. If you do not agree, please do not use the site.',
      'You may read, link to and share our pages freely. You may not use automated tools to copy the site in bulk, interfere with how it runs, or use it for anything unlawful. Training crawlers are refused in robots.txt; search and citation crawlers are welcome.',
    ],
  },
  {
    title: 'Accuracy and corrections',
    body: [
      <>
        Stories are drafted with AI and checked against their sources before publication, as described in our{' '}
        <In href="/standards">editorial standards</In>. We work to be accurate, and when we are wrong we correct the story in
        public and list the change on our <In href="/corrections">corrections page</In>.
      </>,
      'That correction process is the whole of our commitment. Beyond it we make no warranty, express or implied, that any story is complete, current or free of error, and nothing on the site is professional, financial, medical or legal advice. Decisions you take on the basis of what you read are your own.',
      'Posts under /archive predate the checking process, are marked as unverified, and are kept only so old links keep working.',
    ],
  },
  {
    title: 'Copyright and licence',
    body: [
      'The text we write, our headlines, our illustrations and the design of the site are copyright Nuvoxsaga unless a credit says otherwise. You may quote short passages with a link to the story and a credit to Nuvoxsaga. Republishing a whole story, or using our text to train a model, needs our written permission first; write to the address below.',
      'Facts are not owned by anyone. Nothing here stops you reporting the same news from the same primary sources.',
    ],
  },
  {
    title: 'Third-party sources and images',
    body: [
      'Every story names and links the primary sources it was written from: space agencies, research labs, companies, governments and international bodies. Those sources belong to their publishers and are quoted or summarised under their own terms.',
      'Photos from agencies such as NASA or ESA are credited under each image and remain under their owners’ terms, which usually allow reuse with credit. Images captioned "AI illustration" were made for Nuvoxsaga and are ours. If you believe something on the site infringes your rights, email us and we will look at it promptly.',
    ],
  },
  {
    title: 'Advertising',
    body: [
      <>
        The site will carry display advertising served by Google. Ads are labelled as advertisements, are chosen by the ad
        network and not by us, and do not imply any endorsement. Advertisers have no influence on our coverage (see our{' '}
        <In href="/standards#advertising">editorial standards</In>). How advertising cookies work and how to opt out is set
        out in our <In href="/privacy#advertising">privacy policy</In>.
      </>,
    ],
  },
  {
    title: 'Links',
    body: [
      'We link to the sources our stories rest on and to other sites we think useful. We are not responsible for their content or their handling of your data.',
    ],
  },
  {
    title: 'Changes to these terms',
    body: ['We may change these terms as the site changes. The date at the top of the page shows the latest version, and continuing to use the site after a change means you accept it.'],
  },
  {
    title: 'Governing law',
    body: [
      'These terms are governed by the laws of India. Any dispute about them or about the site is subject to the exclusive jurisdiction of the courts of India. If any part of these terms cannot be enforced, the rest still applies.',
    ],
  },
];

export default function TermsPage() {
  return (
    <article className="container-page pb-24 pt-10 md:pt-14">
      <div className="mx-auto max-w-[46rem]">
        <h1 className="display text-[clamp(2.5rem,6vw,4.5rem)]">Terms of use</h1>
        <p className="mt-5 text-xl leading-snug text-ink-2">What you can expect from us, and what we ask of you.</p>
        <p className="mt-3 text-sm text-ink-3">Last updated {UPDATED}</p>
        <div className="mt-12 grid gap-12">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="text-2xl font-bold tracking-[-0.02em]">{s.title}</h2>
              {s.body.map((p, i) => (
                <p key={i} className="mt-4 text-lg leading-relaxed text-ink-2">
                  {p}
                </p>
              ))}
            </section>
          ))}
          <section>
            <h2 className="text-2xl font-bold tracking-[-0.02em]">Contact</h2>
            <p className="mt-4 text-lg leading-relaxed text-ink-2">
              Questions about these terms, permissions and rights: email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-ink underline underline-offset-4">
                {CONTACT_EMAIL}
              </a>
              . See also the <In href="/contact">contact page</In>, the <In href="/privacy">privacy policy</In> and the{' '}
              <In href="/about#ownership">ownership and funding</In> statement.
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
