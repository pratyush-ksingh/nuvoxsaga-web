/**
 * Public-site shell: skip link, sticky header, page, newsletter + footer.
 * Native scrolling (the Lenis smooth-scroll hijack was removed: it fought
 * keyboard/anchor navigation and reduced-motion users).
 */
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { SkipToContent } from '@/components/SkipToContent';

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SkipToContent />
      <SiteHeader />
      <main id="main" className="min-h-[60vh]">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
