'use client';

/**
 * One ad unit: a surface panel (DESIGN.md §6) with its "Advertisement" label in the data
 * voice, present before anything loads, and an <ins> whose size is fixed per breakpoint
 * in globals.css (.ad-unit--*). Fixed sizes, set with media queries, are the AdSense
 * method that never puts a 728px unit on a 390px phone; the reserved height keeps CLS
 * at zero whether or not an ad fills it. Renders nothing while ads are off.
 *
 * Shapes: banner (320x100 / 468x60) for a story column, leaderboard (adds 728x90) for a
 * full-width band, rectangle (300x250) for the rail and in-article.
 */
import { useEffect, useRef } from 'react';
import { ADS_ON, ADSENSE_CLIENT } from '@/lib/ads';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export type AdShape = 'banner' | 'leaderboard' | 'rectangle';

export function AdSlot({ slot, shape = 'banner', className = '' }: { slot: string; shape?: AdShape; className?: string }) {
  // One push per unit, including under React's development double-invoke.
  const pushed = useRef(false);

  useEffect(() => {
    if (!ADS_ON || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // The loader reports its own problems in the console; a unit never breaks the page.
    }
  }, []);

  if (!ADS_ON) return null;
  return (
    <aside aria-label="Advertisement" data-pagefind-ignore className={`ad-slot ad-slot--${shape} ${className}`.trim()}>
      <p className="data text-xs text-ink-3">Advertisement</p>
      <ins className={`adsbygoogle ad-unit ad-unit--${shape}`} data-ad-client={ADSENSE_CLIENT} data-ad-slot={slot} />
    </aside>
  );
}
