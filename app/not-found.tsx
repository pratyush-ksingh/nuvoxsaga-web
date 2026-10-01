/**
 * Root not-found: exported as out/404.html, which Cloudflare Pages serves for every unknown
 * URL. Without it readers got Next's bare default page, with no header, footer or way back
 * (audit 2026-10-01). It sits outside the (frontend) layout, so it brings the chrome itself.
 */
import type { Metadata } from 'next';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { SkipToContent } from '@/components/SkipToContent';
import { NotFoundContent } from '@/components/NotFoundContent';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      <SkipToContent />
      <SiteHeader />
      <main id="main" className="min-h-[60vh]">
        <NotFoundContent />
      </main>
      <SiteFooter />
    </>
  );
}
