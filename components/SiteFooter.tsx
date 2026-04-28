import Link from 'next/link';
import { BRANDS } from '@/lib/brands';
import { NewsletterForm } from '@/components/NewsletterForm';

export function SiteFooter() {
  return (
    <footer className="mt-32 border-t border-white/5">
      <div className="mx-auto max-w-7xl px-6 py-16 grid gap-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <h3 className="text-2xl">Nuvoxsaga</h3>
          <p className="mt-3 text-sm text-foreground/60 max-w-md">
            A media house at the intersection of AI, space, and the world. Long-form essays
            and daily shorts across three brands.
          </p>
          <div className="mt-8 max-w-md">
            <NewsletterForm />
          </div>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-wider text-foreground/40">Brands</h4>
          <ul className="mt-3 space-y-2 text-sm">
            {BRANDS.map((b) => (
              <li key={b.id}>
                <Link href={`/${b.slug}`} className="hover:text-[var(--brand)]">
                  {b.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-wider text-foreground/40">Site</h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/about" className="hover:text-[var(--brand)]">
                About
              </Link>
            </li>
            <li>
              <Link href="/labs" className="hover:text-[var(--brand)]">
                Labs
              </Link>
            </li>
            <li>
              <Link href="/shorts" className="hover:text-[var(--brand)]">
                Shorts
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-6 pb-8 flex justify-between text-xs text-foreground/40">
        <span>© {new Date().getFullYear()} Nuvoxsaga</span>
        <span>Built with restraint</span>
      </div>
    </footer>
  );
}
