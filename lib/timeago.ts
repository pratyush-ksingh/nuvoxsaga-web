/**
 * Relative story times ("3h ago") for stories from the last 24 hours. Pure, so it is
 * unit-tested and shared by the server-rendered <TimeAgo> and the one client updater.
 */
export function relative(iso: string, nowMs: number): string | null {
  const mins = Math.floor(nowMs / 60000) - Math.floor(Date.parse(iso) / 60000);
  if (Number.isNaN(mins) || mins < 0 || mins >= 24 * 60) return null;
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}
