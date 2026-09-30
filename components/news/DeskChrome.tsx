/**
 * Desk masthead (desk name + section tabs), river pagination and the empty state.
 */
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { BRAND_BY_ID, type BrandId } from '@/lib/brands';
import { BRAND_CONTENT } from '@/lib/brand-content';
import { DESKS } from '@/lib/desks';

export function DeskHeader({ brand, active, title }: { brand: BrandId; active?: string; title?: string }) {
  const desk = DESKS[brand];
  const b = BRAND_BY_ID[brand];
  return (
    <header className="border-b border-hairline">
      <div className="container-page pt-10 md:pt-14">
        <span aria-hidden="true" className="mb-4 block h-[3px] w-10 rounded-full bg-brand" />
        {title ? (
          <>
            <p className="text-sm font-medium">
              <Link href={`/${b.slug}`} className="hover:underline hover:underline-offset-4" style={{ color: desk.accent }}>
                {desk.name}
              </Link>
            </p>
            <h1 className="display mt-2 text-[clamp(2.25rem,5vw,3.75rem)]">{title}</h1>
          </>
        ) : (
          <>
            <h1 className="display text-[clamp(2.75rem,7vw,5rem)]">{desk.name}</h1>
            <p className="mt-3 max-w-[60ch] text-ink-2">{BRAND_CONTENT[brand].publicationLine}</p>
          </>
        )}
        <nav aria-label={`${desk.name} sections`} className="-mx-6 mt-8 overflow-x-auto px-6 md:mx-0 md:px-0">
          <ul className="flex gap-2 pb-4">
            <li>
              <Link
                href={`/${b.slug}`}
                aria-current={!active ? 'page' : undefined}
                className="block whitespace-nowrap rounded-full border border-hairline px-4 py-2 text-sm text-ink-2 transition-colors duration-150 hover:text-ink aria-[current=page]:border-transparent aria-[current=page]:bg-ink aria-[current=page]:text-canvas"
              >
                Top stories
              </Link>
            </li>
            {desk.sections.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/${b.slug}/${s.slug}`}
                  aria-current={active === s.slug ? 'page' : undefined}
                  className="block whitespace-nowrap rounded-full border border-hairline px-4 py-2 text-sm text-ink-2 transition-colors duration-150 hover:text-ink aria-[current=page]:border-transparent aria-[current=page]:bg-ink aria-[current=page]:text-canvas"
                >
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}

/** Newer/older links for a paginated river. Page 1 lives at `base` itself. */
export function Pager({ base, page, pages }: { base: string; page: number; pages: number }) {
  if (pages <= 1) return null;
  const href = (n: number) => (n === 1 ? base : `${base}/page/${n}`);
  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-between gap-6 text-sm">
      {page > 1 ? (
        <Link href={href(page - 1)} className="link-arrow">
          <ArrowLeft aria-hidden="true" size={16} /> Newer stories
        </Link>
      ) : (
        <span />
      )}
      <span className="text-ink-3">
        Page {page} of {pages}
      </span>
      {page < pages ? (
        <Link href={href(page + 1)} className="link-arrow">
          Older stories <ArrowRight aria-hidden="true" size={16} />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

export function EmptyDesk({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-8 md:p-12">
      <p className="max-w-[30ch] text-2xl font-bold leading-snug tracking-[-0.02em]">No {label} stories yet.</p>
      <p className="mt-3 max-w-[52ch] text-ink-2">
        Every story is checked against its sources before it is published, so this page fills as stories pass.
        Subscribe to get them by email.
      </p>
      <div className="mt-7">
        <a href="#newsletter" className="btn-primary">
          Subscribe
        </a>
      </div>
    </div>
  );
}
