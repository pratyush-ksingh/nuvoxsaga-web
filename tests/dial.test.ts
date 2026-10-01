import { describe, expect, it } from 'vitest';
import { angleOf, dialData, MIN_DOTS, type DialStory } from '@/components/home/dial';

const NOW = new Date('2026-10-01T12:00:00Z');
const story = (i: number, hoursAgo: number, brand: DialStory['brand'] = 'nuvox_ai'): DialStory => ({
  id: `s${i}`,
  title: `Story ${i}`,
  href: `/ai/news/s${i}`,
  brand,
  publishedAt: new Date(NOW.getTime() - hoursAgo * 36e5).toISOString(),
});

describe('frontier dial', () => {
  it('puts 00:00 UTC at the top and runs clockwise', () => {
    expect(angleOf(new Date('2026-10-01T00:00:00Z'))).toBe(0);
    expect(angleOf(new Date('2026-10-01T06:00:00Z'))).toBe(90);
    expect(angleOf(new Date('2026-10-01T18:00:00Z'))).toBe(270);
  });

  it('keeps the 24-hour window when it has enough stories', () => {
    const d = dialData(Array.from({ length: MIN_DOTS }, (_, i) => story(i, i * 3)), NOW);
    expect(d.label).toBe('Last 24 hours');
    expect(d.dots).toHaveLength(MIN_DOTS);
  });

  it('widens to 3 days, then 7, when the day is thin', () => {
    const threeDays = dialData(Array.from({ length: MIN_DOTS }, (_, i) => story(i, 10 + i * 10)), NOW);
    expect(threeDays.label).toBe('Last 3 days');
    const week = dialData(Array.from({ length: MIN_DOTS }, (_, i) => story(i, 30 + i * 20)), NOW);
    expect(week.label).toBe('Last 7 days');
  });

  it('puts each desk on its own orbit and counts it', () => {
    const d = dialData([story(1, 1, 'nuvox_ai'), story(2, 2, 'nuvox_space'), story(3, 3, 'nuvox_world')], NOW);
    expect(d.dots.map((x) => x.ring)).toEqual([0, 1, 2]);
    expect(d.counts).toEqual({ nuvox_ai: 1, nuvox_space: 1, nuvox_world: 1 });
  });

  it('nudges stories published minutes apart so they do not overlap', () => {
    const d = dialData([story(1, 1), story(2, 1.05), story(3, 1.1)], NOW);
    expect(new Set(d.dots.map((x) => x.nudge)).size).toBe(3);
  });

  it('ignores stories dated in the future or without a date', () => {
    const bad = { ...story(9, 1), publishedAt: 'not a date' };
    const d = dialData([story(1, -2), bad, story(2, 1)], NOW);
    expect(d.dots.map((x) => x.id)).toEqual(['s2']);
  });
});
