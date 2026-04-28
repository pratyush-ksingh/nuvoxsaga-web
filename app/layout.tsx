import type { Metadata } from 'next';
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

/**
 * Root layout — universal shell shared across (frontend), (auth), (payload)
 * route groups. Each group adds its own layout for additional providers.
 *
 * Fonts: next/font self-hosts WOFF2 in /public/_next/static/media/, no CDN
 * fetch. CSP-safe.
 *
 * Phase 11 follow-up: replace Fraunces with Pangram Pangram Migra +
 * PP Mondwest after license verification (per v6 visual direction).
 */
const display = Fraunces({
  variable: '--font-heading',
  subsets: ['latin'],
  display: 'swap',
  axes: ['SOFT', 'WONK', 'opsz'],
});

const body = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
});

const mono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nuvoxsaga.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Nuvoxsaga — AI, space, world',
    template: '%s · Nuvoxsaga',
  },
  description:
    'Nuvoxsaga is the saga of three frontiers: AI, space, and the world. Long-form essays, daily shorts, and a media house for what comes next.',
  applicationName: 'Nuvoxsaga',
  authors: [{ name: 'Nuvoxsaga Editorial' }],
  generator: 'Next.js',
  keywords: ['AI', 'tech', 'space', 'astronomy', 'world facts', 'long-form'],
  referrer: 'strict-origin-when-cross-origin',
  robots: { index: true, follow: true, 'max-image-preview': 'large' },
  openGraph: {
    type: 'website',
    siteName: 'Nuvoxsaga',
    locale: 'en_US',
  },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-brand="nuvox_ai"
      className={`${display.variable} ${body.variable} ${mono.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
