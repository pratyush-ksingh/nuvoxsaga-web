/**
 * The ledger: what the newsroom checked, from the stories' own fact-check records
 * (DESIGN.md §6, "Rail"). Every number on the rails is counted here from published
 * stories, never typed in by hand.
 */
import 'server-only';
import type { BrandId } from './brands';
import type { PublicPost } from './content';

export interface Ledger {
  /** Window the counts cover: "this week", or "so far" when the week is empty. */
  label: string;
  stories: number;
  claims: number;
  sources: number;
  /** Primary sources of briefs, most used first. */
  topSources: { name: string; count: number }[];
}

const WEEK = 7 * 864e5;

export function ledger(posts: PublicPost[], now: Date, brand?: BrandId): Ledger {
  const own = brand ? posts.filter((p) => p.brand === brand) : posts;
  const week = own.filter((p) => {
    const age = now.getTime() - Date.parse(p.publishedAt ?? '');
    return age >= 0 && age <= WEEK;
  });
  const pool = week.length > 0 ? week : own;
  const bySource = new Map<string, number>();
  const sourceNames = new Set<string>();
  let claims = 0;
  for (const p of pool) {
    claims += p.checkedClaims?.length ?? 0;
    if (p.source?.name) {
      bySource.set(p.source.name, (bySource.get(p.source.name) ?? 0) + 1);
      sourceNames.add(p.source.name.toLowerCase());
    }
    for (const s of p.sources ?? []) sourceNames.add(s.name.toLowerCase());
  }
  const topSources = [...bySource.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }));
  return {
    label: week.length > 0 ? 'this week' : 'so far',
    stories: pool.length,
    claims,
    sources: sourceNames.size,
    topSources,
  };
}
