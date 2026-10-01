/**
 * Story timestamp, server-rendered. The static HTML carries the absolute date (the page may
 * be hours old when read); RelativeTimes (one client island in the layout) turns stories from
 * the last 24 hours into "3h ago" and keeps them current.
 *
 * Until 2026-10-01 every timestamp was its own client component with its own minute timer:
 * about 60 hydration roots on /latest. One updater for the whole page is cheaper on phones.
 */
const dateFmt = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' });

export function TimeAgo({ iso, className }: { iso: string; className?: string }) {
  return (
    <time dateTime={iso} data-rel="" className={className} title={new Date(iso).toUTCString()}>
      {dateFmt.format(new Date(iso))}
    </time>
  );
}
