'use client';

/**
 * The one client island behind every <TimeAgo>: rewrites `time[data-rel]` elements to
 * "3h ago" for stories from the last 24 hours, every minute and after each client-side
 * navigation. Renders nothing. Older stories keep their absolute date from the HTML.
 */
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { relative } from '@/lib/timeago';

function update() {
  const now = Date.now();
  document.querySelectorAll<HTMLTimeElement>('time[data-rel]').forEach((el) => {
    const rel = relative(el.dateTime, now);
    if (rel && el.textContent !== rel) el.textContent = rel;
  });
}

export function RelativeTimes() {
  const pathname = usePathname();
  useEffect(() => {
    update();
    const id = window.setInterval(update, 60000);
    return () => window.clearInterval(id);
  }, [pathname]);
  return null;
}
