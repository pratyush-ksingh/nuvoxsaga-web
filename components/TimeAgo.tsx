'use client';

/**
 * Story timestamp. The static HTML carries an absolute date (the page may be hours
 * old when read); after hydration, stories from the last 24 hours switch to a
 * relative "3h ago", which is what news readers scan for.
 */
import { useSyncExternalStore } from 'react';

const dateFmt = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' });

// A minute-resolution clock. The server snapshot is null, so hydration renders the
// absolute date (matching the static HTML) and React then re-renders with the time.
function subscribe(onTick: () => void) {
  const id = window.setInterval(onTick, 60000);
  return () => window.clearInterval(id);
}
const currentMinute = () => Math.floor(Date.now() / 60000);
const noMinute = () => null;

function relative(iso: string, nowMinute: number): string | null {
  const mins = nowMinute - Math.floor(Date.parse(iso) / 60000);
  if (Number.isNaN(mins) || mins < 0 || mins >= 24 * 60) return null;
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export function TimeAgo({ iso, className }: { iso: string; className?: string }) {
  const minute = useSyncExternalStore(subscribe, currentMinute, noMinute);
  const rel = minute === null ? null : relative(iso, minute);
  return (
    <time dateTime={iso} className={className} title={new Date(iso).toUTCString()}>
      {rel ?? dateFmt.format(new Date(iso))}
    </time>
  );
}
