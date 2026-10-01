import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
import { ledger } from '@/lib/ledger';
import type { PublicPost } from '@/lib/content';

const NOW = new Date('2026-10-01T12:00:00Z');
const post = (i: number, daysAgo: number, extra: Partial<PublicPost> = {}): PublicPost => ({
  id: `p${i}`,
  slug: `p${i}`,
  title: `Story ${i}`,
  brand: 'nuvox_space',
  kind: 'brief',
  publishedAt: new Date(NOW.getTime() - daysAgo * 864e5).toISOString(),
  checkedClaims: [{ claim: 'c', source: 's' }, { claim: 'd', source: 's' }],
  ...extra,
});

describe('ledger', () => {
  it('counts claims, stories and distinct sources over the last week', () => {
    const l = ledger(
      [
        post(1, 1, { source: { name: 'NASA', url: 'https://nasa.gov/a' } }),
        post(2, 2, { source: { name: 'NASA', url: 'https://nasa.gov/b' } }),
        post(3, 3, { source: { name: 'ESA', url: 'https://esa.int/c' }, sources: ['Reuters', 'nasa'] }),
        post(4, 10, { source: { name: 'JAXA', url: 'https://jaxa.jp/d' } }),
      ],
      NOW,
    );
    expect(l.label).toBe('this week');
    expect(l.stories).toBe(3);
    expect(l.claims).toBe(6);
    expect(l.sources).toBe(3); // NASA (any case), ESA, Reuters; JAXA is older than a week
    expect(l.topSources).toEqual([
      { name: 'NASA', count: 2 },
      { name: 'ESA', count: 1 },
    ]);
  });

  it('filters by desk', () => {
    const l = ledger([post(1, 1), post(2, 1, { brand: 'nuvox_ai' })], NOW, 'nuvox_ai');
    expect(l.stories).toBe(1);
  });

  it('falls back to everything when the week is empty', () => {
    const l = ledger([post(1, 20), post(2, 30)], NOW);
    expect(l.label).toBe('so far');
    expect(l.stories).toBe(2);
  });
});
