/**
 * Newsletter band + footer. The band is the #newsletter anchor every "Subscribe"
 * action points to (one label for one intent across the site).
 */
import Link from 'next/link';
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
        <Link href="/" className="text-[1.05rem] font-extrabold tracking-[-0.03em]" translate="no">
          NUVOXSAGA
        </Link>
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
      <div className="container-page pb-10 text-sm text-ink-3">
        <p>© {year} Nuvoxsaga. Stories are drafted with AI and checked against their sources before publication; illustrations are AI-generated and labelled.</p>
      </div>
    </footer>
  );
}
