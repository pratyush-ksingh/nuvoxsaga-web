'use client';

/**
 * The AdSense loader, added late: on the first scroll or pointer, or when the browser
 * reports idle time (4 s at most). The same shape as the Turnstile script in
 * NewsletterForm.tsx: the server HTML carries no third-party script, so the lead image
 * and hydration are never competing with Google's ~300-500 KB for the main thread
 * (Lighthouse TBT budget 200 ms, .lighthouserc.json). Units queue their own push() and
 * fill once this script arrives. No integrity attribute: Google's loader has no stable hash.
 */
import { useEffect, useState } from 'react';
import Script from 'next/script';
import { ADS_ON, ADSENSE_LOADER } from '@/lib/ads';

export function AdsScript() {
  const [wanted, setWanted] = useState(false);

  useEffect(() => {
    if (!ADS_ON || wanted) return;
    const want = () => setWanted(true);
    const idle =
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback(want, { timeout: 4000 })
        : window.setTimeout(want, 2000);
    window.addEventListener('scroll', want, { once: true, passive: true });
    window.addEventListener('pointerdown', want, { once: true, passive: true });
    return () => {
      if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      window.removeEventListener('scroll', want);
      window.removeEventListener('pointerdown', want);
    };
  }, [wanted]);

  if (!ADS_ON || !wanted) return null;
  return <Script src={ADSENSE_LOADER} strategy="afterInteractive" crossOrigin="anonymous" />;
}
