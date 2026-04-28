/**
 * lib/brands.ts integrity tests (Phase 11 gate 5).
 *
 * Validates the codegen output: 3 brands, no duplicates, no nuvox_sports,
 * palette completeness, slug↔id consistency.
 */
import { describe, it, expect } from 'vitest';
import { BRANDS, BRAND_BY_ID, BRAND_BY_SLUG } from '@/lib/brands';

describe('lib/brands.ts (codegen integrity)', () => {
  it('contains exactly 3 brands (sports dropped)', () => {
    expect(BRANDS).toHaveLength(3);
    const ids = BRANDS.map((b) => b.id);
    expect(ids.sort()).toEqual(['nuvox_ai', 'nuvox_space', 'nuvox_world']);
    expect(ids).not.toContain('nuvox_sports');
  });

  it('every brand has a complete palette', () => {
    for (const b of BRANDS) {
      const required = ['primary', 'cyan', 'purple', 'gold', 'dark', 'card', 'overlay'] as const;
      for (const k of required) {
        expect(b.palette[k]).toMatch(/^#[0-9A-Fa-f]{3,8}$/);
      }
    }
  });

  it('BRAND_BY_ID is a 1:1 lookup', () => {
    expect(Object.keys(BRAND_BY_ID).sort()).toEqual(BRANDS.map((b) => b.id).sort());
    for (const b of BRANDS) {
      expect(BRAND_BY_ID[b.id]).toEqual(b);
    }
  });

  it('BRAND_BY_SLUG is a 1:1 lookup', () => {
    expect(Object.keys(BRAND_BY_SLUG).sort()).toEqual(BRANDS.map((b) => b.slug).sort());
    for (const b of BRANDS) {
      expect(BRAND_BY_SLUG[b.slug]).toEqual(b);
    }
  });

  it('slugs are kebab-safe (no underscores, no leading slash)', () => {
    for (const b of BRANDS) {
      expect(b.slug).toMatch(/^[a-z0-9-]+$/);
      expect(b.slug).not.toContain('_');
    }
  });

  it('every brand has a non-empty name and handle', () => {
    for (const b of BRANDS) {
      expect(b.name).toBeTruthy();
      expect(b.handle).toMatch(/^@/);
    }
  });
});
