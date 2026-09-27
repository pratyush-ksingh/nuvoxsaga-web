/**
 * Per-brand editorial copy and imagery (the operational fields such as id, slug and
 * palette are generated into lib/brands.ts from the Python brand config).
 *
 * Copy rules (DESIGN.md + taste-skill): plain, specific, no em-dashes, no hype verbs.
 */
import type { BrandId } from './brands';

export interface BrandContent {
  /** One-sentence tagline under the brand name. */
  tagline: string;
  /** What the publication covers, one sentence. */
  publicationLine: string;
  /** Short caption on the home-page brand tile. */
  tileCaption: string;
  /** Base name of the responsive image set in public/images (see <Picture>). */
  image: string;
  /** Alt text. Images are AI illustrations, and the alt says so. */
  imageAlt: string;
}

export const BRAND_CONTENT: Record<BrandId, BrandContent> = {
  nuvox_ai: {
    tagline: 'What AI actually does, and who builds it.',
    publicationLine: 'Explainers and news on artificial intelligence: new models, real capabilities, and where they fail.',
    tileCaption: 'Models, chips and the people shipping them.',
    image: 'brand-ai',
    imageAlt: 'Illustration: macro view of a processor die with glowing copper traces',
  },
  nuvox_space: {
    tagline: 'Between the atmosphere and the unknown.',
    publicationLine: 'Launches, missions and discoveries, from low Earth orbit to the edge of the observable universe.',
    tileCaption: 'Missions, telescopes and what they found.',
    image: 'brand-space',
    imageAlt: 'Illustration: an unbranded rocket lifting off at night',
  },
  nuvox_world: {
    tagline: 'What is happening around the world, and why.',
    publicationLine: 'World news from official sources: governments, the UN and global agencies, with a close eye on Asia and India.',
    tileCaption: 'Global news from official sources, India-aware.',
    image: 'brand-world',
    imageAlt: 'Illustration: aerial view of a river delta winding through mountains',
  },
};
