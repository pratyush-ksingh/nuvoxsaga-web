'use client';

/**
 * "Privacy and cookie settings" (the privacy page promises this link in the footer):
 * reopens Google's consent message so a reader can change or withdraw a choice. The
 * queue pattern is Google's: the callback runs once the consent tool has loaded, and
 * does nothing where no message applies (outside the EEA, UK and Switzerland the tool
 * shows none). Renders nothing while ads are off.
 */
import { ADS_ON } from '@/lib/ads';

declare global {
  interface Window {
    googlefc?: {
      callbackQueue?: Record<string, () => void>[];
      showRevocationMessage?: () => void;
    };
  }
}

export function ConsentLink({ className }: { className?: string }) {
  if (!ADS_ON) return null;
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        const fc = (window.googlefc = window.googlefc ?? {});
        fc.callbackQueue = fc.callbackQueue ?? [];
        fc.callbackQueue.push({ CONSENT_DATA_READY: () => window.googlefc?.showRevocationMessage?.() });
      }}
    >
      Privacy and cookie settings
    </button>
  );
}
