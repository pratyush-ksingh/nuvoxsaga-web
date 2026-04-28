/**
 * SiteHeader — sticky top, transparent over hero, blur on scroll.
 * Server component (no client state needed for v1).
 */
import Link from 'next/link';
import { BRANDS } from '@/lib/brands';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-background/60 border-b border-white/5">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="size-2 rounded-full bg-[var(--brand)] shadow-[0_0_20px_var(--brand)] transition-transform group-hover:scale-125" />
          <span className="text-sm font-medium tracking-tight">Nuvoxsaga</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {BRANDS.map((b) => (
            <Link
              key={b.id}
              href={`/${b.slug}`}
              className="px-3 py-1.5 rounded-md text-foreground/70 hover:text-foreground hover:bg-white/5 transition-colors"
            >
              {b.name.replace('Nuvox ', '')}
            </Link>
          ))}
          <span className="mx-2 h-4 w-px bg-white/10" />
          <Link
            href="/about"
            className="px-3 py-1.5 rounded-md text-foreground/70 hover:text-foreground transition-colors"
          >
            About
          </Link>
        </nav>
      </div>
    </header>
  );
}
