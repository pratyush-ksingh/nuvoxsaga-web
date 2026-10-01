/**
 * The "page not found" body, shared by the (frontend) segment and the root not-found page.
 * The root one is what Cloudflare serves as 404.html for any unknown URL, so it also renders
 * the site header and footer (app/not-found.tsx).
 */
import Link from 'next/link';
import { BRANDS } from '@/lib/brands';
import { DESKS } from '@/lib/desks';

export function NotFoundContent() {
  return (
    <section className="container-page py-24 md:py-32">
      <p className="data text-sm text-ink-3">404 · Page not found</p>
      <h1 className="display mt-3 max-w-[16ch] text-[clamp(2.5rem,6vw,4.5rem)]">This page does not exist.</h1>
      <p className="mt-6 max-w-[48ch] text-lg text-ink-2">
        The link may be old or mistyped. Start from the latest stories, search, or pick a desk.
      </p>
      <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-4">
        <Link href="/latest" className="btn-primary">
          Read the latest
        </Link>
        <Link href="/search" className="link-arrow text-ink-2">
          Search
        </Link>
        {BRANDS.map((b) => (
          <Link key={b.id} href={`/${b.slug}`} className="link-arrow" style={{ color: DESKS[b.id].accent }}>
            {DESKS[b.id].name}
          </Link>
        ))}
      </div>
    </section>
  );
}
