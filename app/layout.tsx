import type { Metadata, Viewport } from 'next';
import { Fraunces, Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { DEFAULT_OG_IMAGE, SITE_NAME } from '@/lib/og';
import { THEME_SCRIPT } from '@/lib/theme';
import { X_HANDLE } from '@/lib/social';
import { ADS_ON, ADSENSE_CLIENT, CONSENT_LOADER, CONSENT_SIGNAL_SCRIPT } from '@/lib/ads';
import { AdsScript } from '@/components/ads/AdsScript';

/**
 * Root layout. Fonts are self-hosted by next/font at build time (no runtime CDN
 * request). Fraunces (variable, optical size) for headlines, Geist for text and UI,
 * Geist Mono for times, dates and data labels (DESIGN.md §4).
 */
const fraunces = Fraunces({ variable: '--font-fraunces', subsets: ['latin'], display: 'swap', axes: ['opsz'] });
// The italic only sets standfirsts and the nameplate, so it is not preloaded: it would
// compete with the lead image for bandwidth on every story page.
const frauncesItalic = Fraunces({
  variable: '--font-fraunces-italic',
  subsets: ['latin'],
  display: 'swap',
  style: 'italic',
  axes: ['opsz'],
  preload: false,
});
const geist = Geist({ variable: '--font-geist', subsets: ['latin'], display: 'swap' });
// Mono only sets small labels and times: not preloaded, so it never competes with the lead image.
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'], display: 'swap', preload: false });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nuvoxsaga.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Nuvoxsaga: AI, space and world news',
    template: '%s · Nuvoxsaga',
  },
  description:
    'AI, space and world news, written with AI and checked claim by claim against the sources before publication.',
  applicationName: 'Nuvoxsaga',
  authors: [{ name: 'Nuvoxsaga' }],
  keywords: ['AI', 'technology', 'space', 'astronomy', 'world', 'science news'],
  referrer: 'strict-origin-when-cross-origin',
  robots: { index: true, follow: true, 'max-image-preview': 'large' },
  // Pages that set their own openGraph build it with og() (lib/og.ts): Next replaces
  // this object wholesale, it does not merge into it.
  openGraph: { type: 'website', siteName: SITE_NAME, locale: 'en_US', images: [DEFAULT_OG_IMAGE] },
  twitter: { card: 'summary_large_image', site: `@${X_HANDLE}` },
  // Proves the site to AdSense without ads on (a verification method on its own, like
  // /ads.txt): it follows the publisher id, not the ads flag.
  ...(ADSENSE_CLIENT ? { other: { 'google-adsense-account': ADSENSE_CLIENT } } : {}),
};

export const viewport: Viewport = {
  themeColor: '#fbfbf9',
  colorScheme: 'light dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // BrandProvider rewrites data-brand before hydration on non-default desks.
    <html
      lang="en"
      data-brand="nuvox_ai"
      className={`${fraunces.variable} ${frauncesItalic.variable} ${geist.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Applies a saved dark choice before first paint (CSP allows inline scripts; see public/_headers). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {ADS_ON && (
          <>
            {/* Google's consent tool (Privacy & messaging) goes before the ad loader: it holds
                ad requests in the EEA, UK and Switzerland until the reader has chosen, and
                targets those regions itself, so no per-view code runs at the edge. */}
            <script async src={CONSENT_LOADER} />
            <script dangerouslySetInnerHTML={{ __html: CONSENT_SIGNAL_SCRIPT }} />
          </>
        )}
      </head>
      <body className="grain min-h-[100dvh] antialiased">
        {children}
        {/* The AdSense loader itself is added by the island, late (components/ads/AdsScript.tsx). */}
        {ADS_ON && <AdsScript />}
      </body>
    </html>
  );
}
