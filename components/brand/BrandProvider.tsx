/**
 * BrandProvider — sets `data-brand` on the <html> element so per-brand CSS
 * variables in globals.css apply from the first paint.
 *
 * Usage:
 *   <BrandProvider brand={brandId}>{children}</BrandProvider>
 *
 * Emits a tiny inline <script> that runs before hydration, so there is no flash of
 * default colours when landing on /[brand]. On the static site there is no
 * per-request CSP nonce; public/_headers allows inline scripts instead. The only
 * interpolated value is a typed BrandId (never user input), JSON-encoded.
 */
import 'server-only';
import type { BrandId } from '@/lib/brands';

interface Props {
  brand: BrandId;
  children: React.ReactNode;
}

export function BrandProvider({ brand, children }: Props) {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.dataset.brand=${JSON.stringify(brand)};`,
        }}
      />
      {children}
    </>
  );
}
