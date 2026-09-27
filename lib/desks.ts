/**
 * The three news desks and their sections. Brand ids, slugs and palettes come from the
 * generated lib/brands.ts; this file holds the editorial structure of the media house.
 *
 * A section slug is a URL segment under its desk (/space/launch), so it must never be
 * one of the desk's static route names (news, page, feed.xml).
 */
import type { BrandId } from './brands';

export interface Section {
  slug: string;
  name: string;
}

export interface Desk {
  /** Short desk name used in the masthead and labels ("Space"). */
  name: string;
  /** CSS custom property holding the desk accent. */
  accent: string;
  sections: readonly Section[];
}

export const DESKS: Record<BrandId, Desk> = {
  nuvox_ai: {
    name: 'AI',
    accent: 'var(--ai)',
    sections: [
      { slug: 'models', name: 'Models' },
      { slug: 'research', name: 'Research' },
      { slug: 'business', name: 'Business' },
      { slug: 'policy', name: 'Policy' },
      { slug: 'tools', name: 'Tools' },
    ],
  },
  nuvox_space: {
    name: 'Space',
    accent: 'var(--space)',
    sections: [
      { slug: 'launch', name: 'Launch' },
      { slug: 'missions', name: 'Missions' },
      { slug: 'science', name: 'Science' },
      { slug: 'industry', name: 'Industry' },
      { slug: 'policy', name: 'Policy' },
    ],
  },
  nuvox_world: {
    name: 'World',
    accent: 'var(--world)',
    sections: [
      { slug: 'asia', name: 'Asia' },
      { slug: 'americas', name: 'Americas' },
      { slug: 'europe', name: 'Europe' },
      { slug: 'middle-east-africa', name: 'Middle East & Africa' },
      { slug: 'health-climate', name: 'Health & climate' },
    ],
  },
};

const RESERVED = new Set(['news', 'page', 'feed.xml']);
for (const desk of Object.values(DESKS)) {
  for (const s of desk.sections) {
    if (RESERVED.has(s.slug)) throw new Error(`desk section "${s.slug}" collides with a route name`);
  }
}

export function findSection(brand: BrandId, slug: string | undefined): Section | undefined {
  return slug ? DESKS[brand].sections.find((s) => s.slug === slug) : undefined;
}

/** Number of stories per river page (desk fronts and their /page/N archives). */
export const PAGE_SIZE = 24;
