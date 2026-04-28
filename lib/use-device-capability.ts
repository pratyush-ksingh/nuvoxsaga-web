'use client';

/**
 * Device capability detection — gate heavy 3D scenes off when the device
 * can't render them comfortably.
 *
 * Triggers:
 *   - prefers-reduced-motion: reduce         (a11y, mandatory respect)
 *   - navigator.deviceMemory < 4             (low-RAM device)
 *   - navigator.connection?.saveData         (user opted in)
 *   - navigator.connection?.effectiveType    ('slow-2g' | '2g' | '3g')
 *   - touch-only + mobile viewport           (heuristic: mobile = static)
 *
 * Returns a single `degraded` boolean — components decide what to do.
 *
 * Phase 11 follow-up: integrate with @next/font font-loaded events to also
 * skip 3D until critical fonts are ready (LCP discipline).
 */
import { useEffect, useState } from 'react';

interface NavigatorWithMemory extends Navigator {
  deviceMemory?: number;
  connection?: {
    saveData?: boolean;
    effectiveType?: string;
  };
}

export function useDeviceCapability(): { degraded: boolean; reason: string | null } {
  const [degraded, setDegraded] = useState(true); // SSR + first-paint default = degraded
  const [reason, setReason] = useState<string | null>('first-paint');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    function evaluate() {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reducedMotion) {
        setDegraded(true);
        setReason('prefers-reduced-motion');
        return;
      }

      const nav = navigator as NavigatorWithMemory;
      const lowMem = typeof nav.deviceMemory === 'number' && nav.deviceMemory < 4;
      if (lowMem) {
        setDegraded(true);
        setReason(`deviceMemory=${nav.deviceMemory}`);
        return;
      }

      const saveData = nav.connection?.saveData === true;
      if (saveData) {
        setDegraded(true);
        setReason('save-data');
        return;
      }

      const slowConn =
        nav.connection?.effectiveType && /^(slow-2g|2g|3g)$/.test(nav.connection.effectiveType);
      if (slowConn) {
        setDegraded(true);
        setReason(`effectiveType=${nav.connection?.effectiveType}`);
        return;
      }

      const isMobile = window.matchMedia('(max-width: 768px)').matches;
      if (isMobile) {
        setDegraded(true);
        setReason('mobile-viewport');
        return;
      }

      setDegraded(false);
      setReason(null);
    }

    evaluate();

    // Phase 11 / Phase 9 review M4: live-listen for changes so toggling
    // OS reduced-motion or rotating to a narrow viewport propagates without
    // a page reload.
    const reducedMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobileMq = window.matchMedia('(max-width: 768px)');
    reducedMq.addEventListener('change', evaluate);
    mobileMq.addEventListener('change', evaluate);
    return () => {
      reducedMq.removeEventListener('change', evaluate);
      mobileMq.removeEventListener('change', evaluate);
    };
  }, []);

  return { degraded, reason };
}
