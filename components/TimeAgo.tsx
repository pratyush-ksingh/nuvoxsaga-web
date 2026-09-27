'use client';

/**
 * Story timestamp. The static HTML carries an absolute date (the page may be hours
 * old when read); after hydration, stories from the last 24 hours switch to a
 * relative "3h ago", which is what news readers scan for.
 */
import { useEffect, useState } from 'react';

const dateFmt = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' });

function relative(iso: string): string | null {
  const mins = Math.floor((Date.now() - Date.parse(iso)) / 60000);
  if (Number.isNaN(mins) || mins < 0 || mins >= 24 * 60) return null;
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export function TimeAgo({ iso, className }: { iso: string; className?: string }) {
  const [rel, setRel] = useState<string | null>(null);
  useEffect(() => {
    setRel(relative(iso));
    const id = window.setInterval(() => setRel(relative(iso)), 60000);
    return () => window.clearInterval(id);
  }, [iso]);
  return (
    <time dateTime={iso} className={className} title={new Date(iso).toUTCString()}>
      {rel ?? dateFmt.format(new Date(iso))}
    </time>
  );
}
