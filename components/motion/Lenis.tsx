'use client';

/**
 * Lenis smooth-scroll provider — client-side, mounts after hydration.
 *
 * Honours `prefers-reduced-motion` — does NOT smooth-scroll for users who've
 * opted out (accessibility + Phase 11 audit gate).
 *
 * One Lenis instance per document. Multi-instance on a single page breaks
 * scroll math.
 */
import { useEffect } from 'react';
import LenisCls from 'lenis';

export function Lenis() {
  useEffect(() => {
    // SSR-safe: only run client-side.
    if (typeof window === 'undefined') return;

    // Respect user preference — early-out if reduced motion is on.
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const lenis = new LenisCls({
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    let rafId = 0;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return null;
}
