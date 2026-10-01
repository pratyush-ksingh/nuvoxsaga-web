/**
 * Newsletter band + footer. The band is the #newsletter anchor every "Subscribe"
 * action points to (one label for one intent across the site).
 */
import Link from 'next/link';
import { CirclePlay } from 'lucide-react';
import { X_HANDLE, X_URL } from '@/lib/social';
import { BRANDS } from '@/lib/brands';
import { DESKS } from '@/lib/desks';

const MORE = [
  { href: '/latest', label: 'Latest' },
  { href: '/about', label: 'About' },
  { href: '/standards', label: 'Editorial standards' },
  { href: '/corrections', label: 'Corrections' },
  { href: '/contact', label: 'Contact' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/archive', label: 'Archive' },
  { href: '/feed.xml', label: 'RSS' },
];
import { NewsletterForm } from '@/components/NewsletterForm';

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-hairline">
      <section id="newsletter" aria-labelledby="newsletter-title" className="container-page scroll-mt-20 py-20 md:py-28">
        <div className="grid gap-10 md:grid-cols-[1.1fr_1fr] md:items-end">
          <h2 id="newsletter-title" className="display reveal max-w-[14ch] text-[clamp(2.25rem,4.5vw,3.75rem)]">
            One email. The week across three frontiers.
          </h2>
          <NewsletterForm />
        </div>
      </section>

      <div className="container-page flex flex-col gap-8 border-t border-hairline py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <Link href="/" className="font-serif text-2xl font-bold tracking-[-0.035em] [&_em]:font-normal [&_em]:[font-family:var(--font-fraunces-italic),serif]" translate="no">
            Nuvox<em>saga</em>
          </Link>
          <p className="deck mt-1 text-ink-2">News you can check.</p>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-7 gap-y-3 text-ink-2">
            {BRANDS.map((b) => (
              <li key={b.id}>
                <Link href={`/${b.slug}`} className="transition-colors duration-150 hover:text-ink">
                  {DESKS[b.id].name}
                </Link>
              </li>
            ))}
            {MORE.map((l) => (
              <li key={l.href}>
                {l.href.endsWith('.xml') ? (
                  // A feed is a file, not a page: plain link, no client-side navigation.
                  <a href={l.href} className="transition-colors duration-150 hover:text-ink">
                    {l.label}
                  </a>
                ) : (
                  <Link href={l.href} className="transition-colors duration-150 hover:text-ink">
                    {l.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="container-page flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-hairline py-6 text-sm">
        <p className="flex items-center gap-2 text-ink-2">
          <CirclePlay aria-hidden="true" size={16} strokeWidth={1.75} />
          Watch on YouTube
        </p>
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {BRANDS.map((b) => (
            <li key={b.id}>
              <a
                href={`https://www.youtube.com/${b.handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors duration-150 hover:underline hover:underline-offset-4"
                style={{ color: DESKS[b.id].accent }}
              >
                {b.name} <span className="data text-ink-3">{b.handle}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div className="container-page flex flex-wrap items-center gap-x-6 gap-y-3 pb-6 text-sm">
        <p className="flex items-center gap-2 text-ink-2">
          <XLogo />
          Follow on X
        </p>
        <a
          href={X_URL}
          target="_blank"
          rel="noopener noreferrer me"
          className="text-ink transition-colors duration-150 hover:underline hover:underline-offset-4"
        >
          Nuvoxsaga <span className="data text-ink-3">@{X_HANDLE}</span>
        </a>
      </div>
      <div className="container-page pb-10 text-sm text-ink-3">
        <p>© {year} Nuvoxsaga. Stories are drafted with AI and checked against their sources before publication. Illustrations are AI-generated and labelled.</p>
      </div>
    </footer>
  );
}

/** The X logo (lucide ships no brand marks), sized to match the 16px line icons. */
function XLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M18.9 2H22l-6.8 7.8L23 22h-6.2l-4.8-6.3L6.4 22H3.3l7.3-8.3L1 2h6.3l4.4 5.8L18.9 2Zm-1.1 18.1h1.7L6.3 3.8H4.5l13.3 16.3Z" />
    </svg>
  );
}
