import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { DEFAULT_OG_IMAGE, SITE_NAME } from '@/lib/og';

/**
 * Root layout. Fonts are self-hosted by next/font at build time (no runtime CDN
 * request). Geist for display + UI, Geist Mono for timeline dates only (DESIGN.md §4).
 */
const geist = Geist({ variable: '--font-geist', subsets: ['latin'], display: 'swap' });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'], display: 'swap' });

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
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  themeColor: '#111214',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // BrandProvider rewrites data-brand before hydration on non-default desks.
    <html
      lang="en"
      data-brand="nuvox_ai"
      className={`${geist.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-[100dvh] antialiased">{children}</body>
    </html>
  );
}
