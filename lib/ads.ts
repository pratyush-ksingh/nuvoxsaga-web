/**
 * Display advertising (Google AdSense), off by default.
 *
 * Two public build values decide everything (.env.production, inlined by next build):
 *   NEXT_PUBLIC_ADS=1                  renders the loader, the consent tool and ad units
 *   NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-… the publisher id; also drives ads.txt and the
 *                                      google-adsense-account meta tag on its own
 * With ADS off, no page carries a byte of ad markup. The CSP in public/_headers allows the
 * ad origins unconditionally: allowing an origin that never loads is harmless.
 *
 * This module is pure and client-safe: the islands in components/ads import it, and so
 * does the content layer (word counts).
 */

export const ADSENSE_CLIENT = (process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? '').trim();
const CLIENT_RE = /^ca-pub-\d{16}$/;
/** A well-formed publisher id: the meta tag, ads.txt and the loaders all key off this, so a typo cannot ship three disagreeing signals. */
export const CLIENT_VALID = CLIENT_RE.test(ADSENSE_CLIENT);
/** The flag alone is not enough: units without a publisher id would be broken markup. */
export const ADS_ON = process.env.NEXT_PUBLIC_ADS === '1' && CLIENT_VALID;
/** `pub-…`: the form Google's consent loader and ads.txt use. */
export const PUBLISHER_ID = ADSENSE_CLIENT.replace(/^ca-/, '');

/** Google's loaders (also listed in the CSP, public/_headers). */
export const ADSENSE_LOADER = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
export const CONSENT_LOADER = `https://fundingchoicesmessages.google.com/i/${PUBLISHER_ID}?ers=1`;

/**
 * Google's standard "signal" snippet for Privacy & messaging: a hidden iframe named
 * googlefcPresent tells ad requests that a consent tool is on the page. Inline (CSP
 * allows inline scripts, see public/_headers), in <head>, before the AdSense loader.
 */
export const CONSENT_SIGNAL_SCRIPT =
  "(function(){function s(){if(!window.frames['googlefcPresent']){if(document.body){var f=document.createElement('iframe');f.style='width:0;height:0;border:none;z-index:-1000;left:-1000px;top:-1000px';f.style.display='none';f.name='googlefcPresent';document.body.appendChild(f)}else{setTimeout(s,0)}}}s()})();";

/**
 * Ad unit ids, one per position. These are placeholders: the owner creates each unit in
 * AdSense (Ads > By ad unit > Display, fixed size) and pastes its data-ad-slot here.
 */
export const SLOTS = {
  storyTop: '1000000001',
  storyInArticle: '1000000002',
  storyEnd: '1000000003',
  deskRail: '1000000004',
  deskRiver: '1000000005',
  sectionTop: '1000000006',
  homeLatest: '1000000007',
} as const;

/** A story below this many words of prose carries no ad unit (ad weight must stay below content). */
export const STORY_MIN_WORDS = 300;
/** A list page below this many stories is a thin page: no ad unit. */
export const LIST_MIN_STORIES = 5;
/** An in-article unit needs this many top-level paragraphs around it. */
export const IN_ARTICLE_MIN_PARAGRAPHS = 6;
/** The desk river shows this many rows before its unit. */
export const RIVER_ROWS_BEFORE_AD = 5;

export type AdsPageKind =
  | 'story'
  | 'desk'
  | 'section'
  | 'home'
  | 'latest'
  | 'topic'
  | 'utility'
  | 'search'
  | 'archive'
  | 'notfound';

export interface AdsPage {
  kind: AdsPageKind;
  /** Story: words of prose in the body. */
  wordCount?: number;
  /** Story: a feature (explainer, analysis, round-up) is always long enough. */
  isFeature?: boolean;
  /** Desk, section, topic: stories on the page. */
  storyCount?: number;
}

/**
 * Where an ad unit may render (Publisher Policies: no ads on screens without publisher
 * content, on navigation or error screens, or where ads would outweigh the content).
 * Pure, so the rule is unit-tested rather than scattered over the pages.
 */
export function adsEligible(page: AdsPage): boolean {
  switch (page.kind) {
    case 'story':
      return page.isFeature === true || (page.wordCount ?? 0) >= STORY_MIN_WORDS;
    case 'desk':
    case 'section':
    case 'topic':
      return (page.storyCount ?? 0) >= LIST_MIN_STORIES;
    case 'home':
    case 'latest':
      return true;
    default:
      return false;
  }
}

/**
 * Words of prose in a fragment of HTML. Tags and entities do not count, and neither does
 * a token without a letter or digit (a full stop left behind by `</em>.`).
 */
export function countWords(html: string): number {
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&[a-z0-9#]+;/gi, '');
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

type Tag = { name: string; close: boolean; leaf: boolean; end: number };

const isNameChar = (c: string) => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c === '-';

/**
 * The tags of a body, in order, by a single forward pass. Hand-written rather than a regex
 * because the two things a regex got wrong here are both quadratic on hostile input: an
 * unclosed `<!--` (rescans to the end for each one) and an unclosed quote (same). Every
 * character is visited once. A quoted attribute value may hold `<` or `>` (DOMPurify keeps
 * them), so a `</p>` inside a title or alt never ends the tag. An unterminated tag or comment
 * ends the scan.
 */
function* scanTags(html: string): Generator<Tag> {
  let i = 0;
  for (;;) {
    const lt = html.indexOf('<', i);
    if (lt < 0) return;
    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt + 4);
      if (end < 0) return;
      i = end + 3;
      continue;
    }
    let j = lt + 1;
    const close = html[j] === '/';
    if (close) j++;
    const start = j;
    while (j < html.length && isNameChar(html[j])) j++;
    const name = html.slice(start, j);
    if (!name || !/^[a-zA-Z]/.test(name)) {
      i = lt + 1; // a bare `<` in text (DOMPurify escapes these, but stay linear if not)
      continue;
    }
    let quote = '';
    while (j < html.length) {
      const c = html[j];
      if (quote) {
        if (c === quote) quote = '';
      } else if (c === '"' || c === "'") {
        quote = c;
      } else if (c === '>') {
        break;
      }
      j++;
    }
    if (j >= html.length) return;
    const leaf = VOID_TAGS.has(name.toLowerCase()) || html[j - 1] === '/';
    yield { name: name.toLowerCase(), close, leaf, end: j + 1 };
    i = j + 1;
  }
}

/**
 * Split sanitised body HTML after its n-th top-level paragraph, for an in-article unit.
 * Returns null (render the body whole) unless the body has IN_ARTICLE_MIN_PARAGRAPHS
 * top-level paragraphs, the cut leaves paragraphs on both sides, and the markup is
 * balanced. Only a `</p>` at nesting depth 0 counts, so a paragraph inside a list,
 * blockquote or figure is never a cut point and both halves stay well-formed. The input
 * is DOMPurify output (lib/sanitize.ts): well-formed, lowercase tags, text already escaped.
 */
export function splitBodyAfterParagraph(html: string, n: number): { before: string; after: string } | null {
  if (!Number.isInteger(n) || n < 1) return null;
  let depth = 0;
  let closed = 0;
  let cut = -1;
  for (const t of scanTags(html)) {
    if (t.close) {
      if (depth === 0) return null; // a stray close: not balanced
      depth--;
      if (t.name === 'p' && depth === 0) {
        closed++;
        if (closed === n) cut = t.end;
      }
    } else if (!t.leaf) {
      depth++;
    }
  }
  if (depth !== 0 || cut < 0 || closed < IN_ARTICLE_MIN_PARAGRAPHS || n >= closed) return null;
  return { before: html.slice(0, cut), after: html.slice(cut) };
}

/** Top-level paragraphs in a body, the measure the in-article rule uses. */
export function countParagraphs(html: string): number {
  let depth = 0;
  let closed = 0;
  for (const t of scanTags(html)) {
    if (t.close) {
      depth = Math.max(0, depth - 1);
      if (t.name === 'p' && depth === 0) closed++;
    } else if (!t.leaf) {
      depth++;
    }
  }
  return closed;
}

/**
 * The in-article cut for a story: after the 3rd paragraph in a long body, after the 2nd
 * in a shorter one, never in a body under IN_ARTICLE_MIN_PARAGRAPHS paragraphs.
 */
export function inArticleSplit(html: string): { before: string; after: string } | null {
  return splitBodyAfterParagraph(html, countParagraphs(html) >= 9 ? 3 : 2);
}

/** The one ads.txt line AdSense asks for (https://support.google.com/adsense/answer/12171612). */
export function adsTxtLine(client: string): string | null {
  const c = client.trim();
  return CLIENT_RE.test(c) ? `google.com, ${c.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0` : null;
}
