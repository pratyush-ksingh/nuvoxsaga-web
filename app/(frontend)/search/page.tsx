import type { Metadata } from 'next';
import { SearchClient } from './SearchClient';

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search across all Nuvoxsaga essays and shorts.',
  alternates: { canonical: '/search' },
  // Search results pages shouldn't be indexed (avoid duplicate-content issues).
  robots: { index: false, follow: true },
};

export default function SearchPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="text-5xl">Search</h1>
      <p className="mt-3 text-foreground/60">
        Static, on-device search powered by Pagefind. Indexed at build time —
        published posts only.
      </p>
      <div className="mt-12">
        <SearchClient />
      </div>
    </section>
  );
}
