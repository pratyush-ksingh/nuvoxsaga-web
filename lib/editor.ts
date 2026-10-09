/**
 * The editor: the one accountable human behind every story. Stories are drafted with AI,
 * so the editor is credited as `editor` (schema.org CreativeWork.editor), never as the
 * author; the byline says "Edited by" for the same reason. Facts here are the ones already
 * stated on /contact and /privacy; nothing is invented.
 *
 * The photo is optional: it renders only when the file exists under public/, so the page
 * never shows a placeholder.
 */
import fs from 'node:fs';
import path from 'node:path';
import { INSTAGRAM_URL, X_URL } from './social';

export const EDITOR = {
  name: 'Pratyush Kumar Singh',
  slug: 'pratyush-kumar-singh',
  path: '/about/pratyush-kumar-singh',
  jobTitle: 'Editor',
  /** Where the editor is based, as stated on /contact and /privacy. */
  location: 'India',
  email: 'corrections@nuvoxsaga.com',
  /** Site-relative path of the portrait, once the owner supplies it (JPEG, square, >= 800px). */
  photo: '/images/editor/pratyush-kumar-singh.jpg',
  /** The publication's accounts the editor runs; personal profiles can be added here. */
  sameAs: [X_URL, INSTAGRAM_URL],
  /** 60-80 words, drawn from /contact and /privacy. */
  bio: [
    'Pratyush Kumar Singh is the editor and publisher of Nuvoxsaga, an independent news site based in India. He runs the newsroom alone: he decides which primary sources the three desks draw on, writes the rules every story is checked against, reads the daily check reports, pulls any story that fails on a second look, and owns the corrections log.',
    'Stories are drafted with AI; the decision about what runs, and what gets fixed, is his. He is also responsible for how the site uses personal data.',
  ],
} as const;

let photoExists: boolean | null = null;

/** The portrait's site path when the file is present under public/, else undefined. */
export function editorPhoto(): string | undefined {
  photoExists ??= fs.existsSync(path.join(process.cwd(), 'public', EDITOR.photo));
  return photoExists ? EDITOR.photo : undefined;
}
