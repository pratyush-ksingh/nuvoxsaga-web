/**
 * (frontend) route group — shared chrome for the public site
 * (NOT the admin or auth pages, which have their own group layouts).
 *
 * Provides: Lenis smooth scroll + site header + site footer.
 */
import { Lenis } from '@/components/motion/Lenis';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Lenis />
      <SiteHeader />
      <main className="grain min-h-[60vh]">{children}</main>
      <SiteFooter />
    </>
  );
}
