import type { Metadata } from 'next';
import { SearchClient } from './SearchClient';

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search every Nuvoxsaga story.',
  alternates: { canonical: '/search' },
  // Search results pages shouldn't be indexed (avoid duplicate-content issues).
  robots: { index: false, follow: true },
};

export default function SearchPage() {
  return (
    <section className="container-page max-w-4xl pb-24 pt-14 md:pt-20">
      <h1 className="display text-[clamp(2.5rem,5vw,4rem)]">Search</h1>
      <p className="mt-4 max-w-[52ch] text-lg text-ink-2">
        Search every published story. It runs in your browser, so nothing you type is sent anywhere.
      </p>
      <div className="mt-12">
        <SearchClient />
      </div>
    </section>
  );
}
