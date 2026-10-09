import { describe, expect, it } from 'vitest';
import { formatLine, sourceCount } from '@/lib/formats';

describe('story formats', () => {
  it('a brief names its one primary source', () => {
    const b = { kind: 'brief' as const, readingTimeMin: 1, source: { name: 'NASA', url: 'https://nasa.gov/x' } };
    expect(sourceCount(b)).toBe(1);
    expect(formatLine(b)).toBe('1 min read · Source: NASA');
  });

  it('a feature counts distinct research sources, ignoring case', () => {
    const f = {
      kind: 'feature' as const,
      readingTimeMin: 6,
      sources: [{ name: 'NASA', url: 'https://www.nasa.gov/x' }, { name: 'nasa' }, { name: 'ESA' }, { name: ' ' }],
    };
    expect(sourceCount(f)).toBe(2);
    expect(formatLine(f)).toBe('6 min read · 2 sources');
  });

  it('falls back to the checked claims when a feature lists no sources', () => {
    const f = {
      kind: 'feature' as const,
      readingTimeMin: 4,
      checkedClaims: [{ claim: 'a', source: 'Reuters' }, { claim: 'b', source: 'reuters' }, { claim: 'c', source: 'AP' }],
    };
    expect(formatLine(f)).toBe('4 min read · 2 sources');
  });

  it('never invents a source', () => {
    expect(formatLine({ kind: 'brief' as const, readingTimeMin: 1 })).toBe('1 min read');
    expect(formatLine({ kind: 'feature' as const })).toBe('1 min read');
  });
});
