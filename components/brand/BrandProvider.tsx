/**
 * BrandProvider — sets `data-brand` on the &lt;html&gt; element so per-brand
 * CSS variables in globals.css apply. Server-side only (uses headers in
 * a child server component, hydration-safe).
 *
 * Usage:
 *   <BrandProvider brand={brandId}>{children}</BrandProvider>
 *
 * Implementation note: this is a thin RSC wrapper that injects an inline
 * &lt;script&gt; updating documentElement.dataset.brand at runtime. Avoids
 * hydration mismatch when navigating between brand zones because the
 * attribute is set BEFORE React hydrates. The CSP nonce passed via
 * middleware allows this inline script.
 */
import 'server-only';
import { headers } from 'next/headers';
import type { BrandId } from '@/lib/brands';

interface Props {
  brand: BrandId;
  children: React.ReactNode;
}

export async function BrandProvider({ brand, children }: Props) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  // Phase 8 review M3: if middleware didn't set a nonce (e.g. a route the
  // matcher misses, or future static export), the inline script would be
  // blocked by strict-CSP without a useful error. Skip emitting the script
  // entirely — the root layout already sets data-brand="nuvox_ai" so the
  // user just sees default colours instead of broken styles. The cost is
  // a brief mis-coloured paint on /[brand] before client navigation; this
  // is preferable to a CSP violation.
  if (!nonce) return <>{children}</>;

  return (
    <>
      <script
        nonce={nonce}
        // Inline script runs before hydration. Setting data-brand on html so
        // the per-brand CSS vars apply on first paint (no flash).
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.dataset.brand=${JSON.stringify(brand)};`,
        }}
      />
      {children}
    </>
  );
}
