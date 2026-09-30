/**
 * /privacy: what the site collects and why. Every statement here describes something the
 * code actually does (functions/api/newsletter/*, components/NewsletterForm.tsx,
 * public/_headers). If that behaviour changes, change this page in the same commit.
 * Plain copy, no em-dashes.
 */
import Link from 'next/link';
import type { Metadata } from 'next';
import { og } from '@/lib/og';

export const metadata: Metadata = {
  title: 'Privacy',
  description:
    'What Nuvoxsaga collects, why, who processes it, how long it is kept and how to have it deleted.',
  alternates: { canonical: '/privacy' },
  openGraph: og({ url: '/privacy' }),
};

const CONTACT_EMAIL = 'corrections@nuvoxsaga.com';
const UPDATED = '30 September 2026';

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: 'The short version',
    body: [
      'You can read Nuvoxsaga without an account. We do not run advertising, we do not set advertising or tracking cookies, and we do not sell or share personal data.',
      'The only personal data we ask for is an email address, and only if you choose to subscribe to the newsletter.',
    ],
  },
  {
    title: 'Who is responsible',
    body: [
      'Nuvoxsaga is published by Pratyush Kumar Singh, an independent publisher based in India, who decides how and why personal data is used on this site.',
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
      'We use Cloudflare Web Analytics to count visits. It does not use cookies or local storage, does not fingerprint visitors, and gives us totals such as page views and referrers, not information about you.',
    ],
  },
  {
    title: 'Who processes data for us',
    body: [
      'Cloudflare (hosting, the spam check, visit statistics and the subscriber database) and Resend (delivery of the confirmation email and the newsletter). Both act on our instructions. Both operate internationally, so your data may be processed outside your country, including in the United States.',
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
      'If we start doing something new with personal data, such as showing advertising, this page will be updated before it starts, and any consent the law requires will be asked for first.',
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
              For anything about your data, email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-ink underline underline-offset-4">
                {CONTACT_EMAIL}
              </a>
              . See also the{' '}
              <Link href="/contact" className="text-ink underline underline-offset-4">
                contact page
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
