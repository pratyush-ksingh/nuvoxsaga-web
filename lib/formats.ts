/**
 * Story formats (DESIGN.md §6, Formats): a brief reports one primary source, a feature is
 * researched from several. These helpers give the length and source cue shown beside the
 * "Brief" / "Feature" label on every card and story. Pure, so they are unit-tested.
 */
import type { PublicPost } from './content';

type FormatFields = Pick<PublicPost, 'kind' | 'source' | 'sources' | 'checkedClaims' | 'readingTimeMin'>;

/** Distinct sources behind a story: the brief's primary source, or the feature's research sources. */
export function sourceCount(post: FormatFields): number {
  if (post.kind === 'brief') return post.source ? 1 : 0;
  const names = new Set<string>();
  for (const s of post.sources ?? []) if (s.trim()) names.add(s.trim().toLowerCase());
  if (names.size === 0) for (const c of post.checkedClaims ?? []) if (c.source?.trim()) names.add(c.source.trim().toLowerCase());
  return names.size;
}

/** The length and source cue: "1 min read · Source: NASA" or "6 min read · 6 sources". */
export function formatLine(post: FormatFields): string {
  const mins = `${post.readingTimeMin ?? 1} min read`;
  if (post.kind === 'brief') return post.source ? `${mins} · Source: ${post.source.name}` : mins;
  const n = sourceCount(post);
  return n > 0 ? `${mins} · ${n} ${n === 1 ? 'source' : 'sources'}` : mins;
}

