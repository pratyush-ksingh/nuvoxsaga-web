/**
 * Per-brand editorial copy that doesn't live in Python brand_config.py.
 *
 * The codegen registry (lib/brands.ts) carries the operational fields:
 * id, slug, palette, niche keyword. This file holds the editorial layer:
 * the tagline you read on the brand landing page, the publication
 * descriptor used in blog index. Different "voice" per brand — what
 * makes the three feel like three different publications, not one with
 * a colour picker.
 *
 * Add new brands here when web-brands.config.json adds them; the
 * fallback is the niche keyword which still works.
 */
import type { BrandId } from './brands';

export interface BrandContent {
  /** One-sentence editorial tagline. Used as the headline subtitle. */
  tagline: string;
  /** Publication descriptor — what the blog "is". */
  publicationLine: string;
}

export const BRAND_CONTENT: Record<BrandId, BrandContent> = {
  nuvox_ai: {
    tagline: 'Decoding signal in machine intelligence.',
    publicationLine:
      'Long-form essays on what AI actually does, who builds it, and where it fails. Plus daily shorts.',
  },
  nuvox_space: {
    tagline: 'Between atmosphere and the unknown.',
    publicationLine:
      'Reporting from the edge of the solar system to the centre of a black hole. Mission briefs, deep-time histories, and a daily short.',
  },
  nuvox_world: {
    tagline: 'Earth, decoded one frame at a time.',
    publicationLine:
      'Geography, history, and the weird mechanics of how the world actually works. Long-form essays plus a daily short.',
  },
};
