'use client';

/**
 * Pagefind search client — loads /_pagefind/pagefind-ui.js at runtime.
 *
 * Phase 10 review M-3: Next 16 with App Router does not produce static HTML
 * suitable for `pagefind --site .next/server/app/...`. Pagefind needs
 * rendered HTML files; RSC payloads in .next/server are not those. The
 * postbuild path was wrong and silently failed.
 *
 * Phase 11 plan: run pagefind as a deploy-time crawl against the live URL
 * (npx pagefind --site https://nuvoxsaga.com), then upload the index to
 * /public/_pagefind/. Until that lands, the fallback message below is the
 * user-facing state.
 *
 * Single onLoad init point — Phase 10 review L-7 dedup.
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
    }) => unknown;
  }
}

export function SearchClient() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <link rel="stylesheet" href="/_pagefind/pagefind-ui.css" />
      <Script
        src="/_pagefind/pagefind-ui.js"
        strategy="afterInteractive"
        onLoad={() => {
          if (!window.PagefindUI) return;
          try {
            new window.PagefindUI({
              element: '#search-mount',
              showImages: false,
              resetStyles: false,
              showSubResults: true,
            });
            setReady(true);
          } catch (e) {
            setError((e as Error).message);
          }
        }}
        onError={() => setError('search index not yet built')}
      />
      <div id="search-mount" />
      {!ready && !error && <p className="text-foreground/40 text-sm">Loading search…</p>}
      {error && (
        <p className="text-foreground/40 text-sm">
          Search isn&apos;t wired in this environment yet. Pagefind index ships in Phase 11
          via deploy-time crawl.
        </p>
      )}
    </>
  );
}
