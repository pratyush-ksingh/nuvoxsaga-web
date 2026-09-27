'use client';

/**
 * Pagefind search client. The index is built at deploy time by `pagefind --site out`
 * (package.json "build"), which writes it to out/pagefind/, served at /pagefind/.
 * pagefind-ui.js finds its index next to its own URL, so only the script path is set.
 * Only story pages, About and Standards are indexed (see the --glob in package.json).
 */
import { useState } from 'react';
import Script from 'next/script';

declare global {
  interface Window {
    PagefindUI?: new (opts: {
      element: string;
      showImages?: boolean;
      resetStyles?: boolean;
      showSubResults?: boolean;
      processResult?: (r: PagefindResult) => PagefindResult;
    }) => unknown;
  }
}

interface PagefindResult {
  url: string;
  sub_results?: { url: string }[];
}

// Pagefind indexes the built files (story.html); link to the clean URL the site serves.
const clean = (url: string) => url.replace(/\.html(?=#|$)/, '');

export function SearchClient() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  return (
    <>
      <link rel="stylesheet" href="/pagefind/pagefind-ui.css" />
      <Script
        src="/pagefind/pagefind-ui.js"
        strategy="afterInteractive"
        onLoad={() => {
          if (!window.PagefindUI) return setError(true);
          try {
            new window.PagefindUI({
              element: '#search-mount',
              showImages: false,
              resetStyles: false,
              showSubResults: true,
              processResult: (r) => ({
                ...r,
                url: clean(r.url),
                sub_results: r.sub_results?.map((s) => ({ ...s, url: clean(s.url) })),
              }),
            });
            setReady(true);
          } catch {
            setError(true);
          }
        }}
        onError={() => setError(true)}
      />
      <div id="search-mount" />
      {!ready && !error && <p className="text-sm text-ink-3">Loading search…</p>}
      {error && <p className="text-sm text-ink-3">Search is unavailable right now. Please try again in a moment.</p>}
    </>
  );
}
