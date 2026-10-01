'use client';

/**
 * Site header: wordmark, Latest + the three desks + Archive + Search, one Subscribe action.
 * Desktop: single-line nav (64px). Mobile (< 768px): a disclosure menu, because five
 * inline links collided with the wordmark on phones.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { BRANDS } from '@/lib/brands';
import { DESKS } from '@/lib/desks';

const LINKS = [
  { href: '/latest', label: 'Latest' },
  ...BRANDS.map((b) => ({ href: `/${b.slug}`, label: DESKS[b.id].name })),
  { href: '/archive', label: 'Archive' },
  { href: '/search', label: 'Search' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the menu on navigation (adjusting state during render, not in an effect).
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setOpen(false);
  }
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-canvas md:bg-canvas/80 md:backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Link
          href="/"
          className="font-serif text-[1.45rem] font-bold leading-none tracking-[-0.035em] [&_em]:font-normal [&_em]:[font-family:var(--font-fraunces-italic),serif]"
          translate="no"
        >
          Nuvox<em>saga</em>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-8 text-[0.95rem] md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? 'page' : undefined}
              className="text-ink-2 transition-colors duration-150 hover:text-ink aria-[current=page]:text-ink aria-[current=page]:underline aria-[current=page]:underline-offset-8"
            >
              {l.label}
            </Link>
          ))}
          <ThemeToggle className="-mx-3" />
          <a href="#newsletter" className="btn-primary !h-10 !px-5 text-sm">
            Subscribe
          </a>
        </nav>

        <div className="flex items-center gap-1 md:hidden">
        <ThemeToggle />
        <button
          type="button"
          className="-mr-2 inline-flex size-11 items-center justify-center rounded-full text-ink hover:bg-surface"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X aria-hidden="true" size={22} strokeWidth={1.75} /> : <Menu aria-hidden="true" size={22} strokeWidth={1.75} />}
        </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-menu" aria-label="Primary" className="border-t border-hairline bg-canvas md:hidden">
          <ul className="container-page flex flex-col py-4">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={isActive(l.href) ? 'page' : undefined}
                  className="block py-3 text-2xl font-bold tracking-[-0.02em] text-ink-2 aria-[current=page]:text-ink"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="pt-4">
              <a href="#newsletter" onClick={() => setOpen(false)} className="btn-primary">
                Subscribe
              </a>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
