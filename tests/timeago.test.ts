import { describe, expect, it } from 'vitest';
import { relative } from '@/lib/timeago';

const NOW = Date.parse('2026-10-01T12:00:00Z');
const ago = (mins: number) => new Date(NOW - mins * 60000).toISOString();

describe('relative story times', () => {
  it('reads like a news site', () => {
    expect(relative(ago(0), NOW)).toBe('Just now');
    expect(relative(ago(7), NOW)).toBe('7m ago');
    expect(relative(ago(59), NOW)).toBe('59m ago');
    expect(relative(ago(60), NOW)).toBe('1h ago');
    expect(relative(ago(23 * 60 + 59), NOW)).toBe('23h ago');
  });

  it('keeps the absolute date for older, future and bad timestamps', () => {
    expect(relative(ago(24 * 60), NOW)).toBeNull();
    expect(relative(ago(-5), NOW)).toBeNull();
    expect(relative('not a date', NOW)).toBeNull();
  });
});
