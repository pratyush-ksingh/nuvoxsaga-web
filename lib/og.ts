/**
 * Open Graph defaults shared by every page.
 *
 * Next.js merges metadata shallowly: a page that sets `openGraph` replaces the root
 * layout's whole object, so `siteName` and `locale` would silently disappear. Every
 * page builds its `openGraph` through og() instead, which keeps them.
 */
import type { Metadata } from 'next';

type OpenGraph = NonNullable<Metadata['openGraph']>;

export const SITE_NAME = 'Nuvoxsaga';
export const OG_CARD = { width: 1200, height: 630 } as const;
export const DEFAULT_OG_IMAGE = { url: '/og/nuvox_ai/default.png', ...OG_CARD };

export function og(page: OpenGraph & { url: string }): OpenGraph {
  return {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_US',
    images: [DEFAULT_OG_IMAGE],
    ...page,
  } as OpenGraph;
}
