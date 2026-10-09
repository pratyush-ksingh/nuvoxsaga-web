/**
 * /privacy: what the site collects and why. Every statement here describes something the
 * code actually does (functions/api/newsletter/*, components/NewsletterForm.tsx,
 * public/_headers) or, for advertising, what will start on the day Google accepts the
 * site and NEXT_PUBLIC_ADS is switched on (lib/ads.ts). If that behaviour changes, change
 * this page in the same commit. Plain copy, no em-dashes.
 *
 * The Advertising section carries the four statements Google requires of AdSense
 * publishers (third-party cookies, the advertising cookie, Ads Settings, aboutads.info).
 */
import type { ReactNode } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { og } from '@/lib/og';

export const metadata: Metadata = {
  title: 'Privacy',
  description:
    'What Nuvoxsaga collects, why, who processes it, how advertising cookies work, how long data is kept and how to have it deleted.',
  alternates: { canonical: '/privacy' },
  openGraph: og({ url: '/privacy' }),
};

const CONTACT_EMAIL = 'corrections@nuvoxsaga.com';
const UPDATED = '9 October 2026';

function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-ink underline underline-offset-4">
      {children}
    </a>
  );
}

const SECTIONS: { id?: string; title: string; body: ReactNode[] }[] = [
  {
    title: 'The short version',
    body: [
      'You can read Nuvoxsaga without an account. The only personal data we ask for is an email address, and only if you choose to subscribe to the newsletter. We do not sell personal data.',
      <>
        The site will carry display advertising served by Google. Ads start only once Google has accepted the site into its
        advertising programme; until that day no advertising cookie is set. What happens from then on is set out under{' '}
        <a href="#advertising" className="text-ink underline underline-offset-4">
          Advertising
        </a>{' '}
        below.
      </>,
    ],
  },
  {
    title: 'Who is responsible',
    body: [
      <>
        Nuvoxsaga is published by{' '}
        <Link href="/about/pratyush-kumar-singh" className="text-ink underline underline-offset-4">
          Pratyush Kumar Singh
        </Link>
        , an independent publisher based in India, who decides how and why personal data is used on this site.
      </>,
    ],
  },
  {
    title: 'Newsletter',
    body: [
      'If you subscribe, we store your email address and the desks you chose (AI, Space, World). We use them only to send you the newsletter. We rely on your consent, which you give by confirming the link we email you.',
      'Your address is encrypted before it is stored, with a key that is kept off the server. The database holds only the encrypted address and a keyed fingerprint used to recognise a repeat signup. The website itself cannot read your address back.',
      'We keep your address until you unsubscribe. Every email has an unsubscribe link, and it takes effect at once. A signup that is never confirmed is not sent any newsletter, and you can ask us to delete it.',
    ],
  },
  {
    title: 'Spam check',
    body: [
      'The signup form uses Cloudflare Turnstile to tell people from bots. When the check runs, Cloudflare processes your IP address, browser details such as the user agent, and signals from the page, and tells us only whether the check passed. We do not store that data.',
    ],
  },
  {
    title: 'Hosting and visit statistics',
    body: [
      'The site is hosted on Cloudflare. Like any web host, Cloudflare processes your IP address and browser details in order to deliver pages and to protect the site from abuse, and it may set a short-lived security cookie to tell visitors from bots.',
      'Visit statistics also come from Cloudflare. They are counted without cookies or local storage and without fingerprinting visitors, and they give us totals such as page views and referrers, not information about you.',
    ],
  },
  {
    id: 'advertising',
    title: 'Advertising',
    body: [
      'Nuvoxsaga is self-funded and will show display advertising served by Google (Google AdSense) to pay for the site. Ads start only when Google has accepted the site; nothing in this section applies before that day, and we will update the date at the top of this page when it does.',
      "Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website or to other websites.",
      "Google's use of advertising cookies enables it and its partners to serve ads to our users based on their visit to this site and other sites on the internet.",
      <>
        Users may opt out of personalised advertising by visiting Google&apos;s{' '}
        <Ext href="https://adssettings.google.com/">Ads Settings</Ext>.
      </>,
      <>
        Alternatively, users can opt out of some third-party vendors&apos; use of cookies for personalised advertising by
        visiting <Ext href="https://www.aboutads.info/choices/">www.aboutads.info</Ext>.
      </>,
      <>
        If you are in the European Economic Area, the United Kingdom or Switzerland, you will be asked for your consent
        through Google&apos;s consent tool before any advertising cookie is set, and ads shown without consent will not be
        personalised. You can change or withdraw that choice at any time: the consent tool can be reopened from the
        &quot;Privacy and cookie settings&quot; link that will appear in the footer of every page once ads are running.
        Elsewhere, the ad settings and opt-out links above apply.
      </>,
      <>
        How Google uses data when you visit a site that shows its ads is explained at{' '}
        <Ext href="https://policies.google.com/technologies/ads">policies.google.com/technologies/ads</Ext>. Ads are always
        labelled, and advertisers have no influence on what we publish (see our{' '}
        <Link href="/standards#advertising" className="text-ink underline underline-offset-4">
          editorial standards
        </Link>
        ).
      </>,
    ],
  },
  {
    title: 'Who processes data for us',
    body: [
      'Cloudflare (hosting, the spam check, visit statistics and the subscriber database) and Resend (delivery of the confirmation email and the newsletter) act on our instructions. Google will serve the advertising described above and, as an advertising vendor, decides for itself how it uses the data its cookies collect, within the limits of its own policies and your choices.',
      'All three operate internationally, so your data may be processed outside your country, including in the United States.',
    ],
  },
  {
    title: 'Your choices and rights',
    body: [
      'You can unsubscribe at any time with the link in any email. You can ask us for a copy of the data we hold about you, to correct it, or to delete it, and you can withdraw your consent at any time.',
      'If you are in the European Union or the United Kingdom, you also have the right to complain to your local data protection authority.',
      'Because addresses are stored encrypted, tell us the address you subscribed with when you write, so that we can find your record.',
    ],
  },
  {
    title: 'Changes',
    body: [
      'If we start doing something new with personal data, this page will be updated before it starts, and any consent the law requires will be asked for first. The date at the top of the page shows when it last changed.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <article className="container-page pb-24 pt-10 md:pt-14">
      <div className="mx-auto max-w-[46rem]">
        <h1 className="display text-[clamp(2.5rem,6vw,4.5rem)]">Privacy</h1>
        <p className="mt-5 text-xl leading-snug text-ink-2">What we collect, why, and how to have it deleted.</p>
        <p className="mt-3 text-sm text-ink-3">Last updated {UPDATED}</p>
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
          <section>
            <h2 className="text-2xl font-bold tracking-[-0.02em]">Contact</h2>
            <p className="mt-4 text-lg leading-relaxed text-ink-2">
              For anything about your data, email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-ink underline underline-offset-4">
                {CONTACT_EMAIL}
              </a>
              . See also the{' '}
              <Link href="/contact" className="text-ink underline underline-offset-4">
                contact page
              </Link>{' '}
              and our{' '}
              <Link href="/terms" className="text-ink underline underline-offset-4">
                terms of use
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
