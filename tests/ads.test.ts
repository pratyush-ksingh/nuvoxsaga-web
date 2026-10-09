/**
 * Display ads (lib/ads.ts): the eligibility rule, the in-article body split, word counts
 * and the ads.txt line. The module reads its flags at import time; this test file runs
 * with none set, so ADS_ON is false here and the islands render nothing.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ADS_ON,
  adsEligible,
  adsTxtLine,
  countParagraphs,
  countWords,
  inArticleSplit,
  splitBodyAfterParagraph,
} from '@/lib/ads';
import { syncAdsTxt } from '@/scripts/gen-ads-txt';

const p = (n: number, text = 'Paragraph') => Array.from({ length: n }, (_, i) => `<p>${text} ${i + 1}</p>`).join('');

describe('flags', () => {
  it('ads are off in this environment', () => {
    expect(ADS_ON).toBe(false);
  });
});

describe('adsEligible', () => {
  it('story: a feature always, a brief from 300 words', () => {
    expect(adsEligible({ kind: 'story', wordCount: 144 })).toBe(false);
    expect(adsEligible({ kind: 'story', wordCount: 299 })).toBe(false);
    expect(adsEligible({ kind: 'story', wordCount: 300 })).toBe(true);
    expect(adsEligible({ kind: 'story', wordCount: 120, isFeature: true })).toBe(true);
    expect(adsEligible({ kind: 'story' })).toBe(false);
  });

  it('desk, section and topic pages from 5 stories', () => {
    for (const kind of ['desk', 'section', 'topic'] as const) {
      expect(adsEligible({ kind, storyCount: 4 })).toBe(false);
      expect(adsEligible({ kind, storyCount: 5 })).toBe(true);
      expect(adsEligible({ kind })).toBe(false);
    }
  });

  it('home and latest yes; search, utility, archive and 404 never', () => {
    expect(adsEligible({ kind: 'home' })).toBe(true);
    expect(adsEligible({ kind: 'latest' })).toBe(true);
    for (const kind of ['utility', 'search', 'archive', 'notfound'] as const) {
      expect(adsEligible({ kind, wordCount: 5000, storyCount: 500, isFeature: true })).toBe(false);
    }
  });
});

describe('countWords', () => {
  it('counts prose, not tags or entities', () => {
    expect(countWords('<p>One two <strong>three</strong>&nbsp;four.</p><ul><li>five</li></ul>')).toBe(5);
    expect(countWords('')).toBe(0);
    expect(countWords('<p>A&amp;B</p>')).toBe(1);
    // "." after </em> and a lone "-" are not words; "2026." is.
    expect(countWords('<p>Ends with <em>emphasis</em>. Then a dash: - and 2026.</p>')).toBe(8);
  });
});

describe('splitBodyAfterParagraph', () => {
  it('refuses a body under six top-level paragraphs', () => {
    expect(splitBodyAfterParagraph(p(5), 2)).toBeNull();
    expect(countParagraphs(p(5))).toBe(5);
  });

  it('cuts after the n-th top-level paragraph and keeps both halves whole', () => {
    const html = p(6);
    const r = splitBodyAfterParagraph(html, 2)!;
    expect(r.before).toBe('<p>Paragraph 1</p><p>Paragraph 2</p>');
    expect(r.after).toBe(p(6).slice(r.before.length));
    expect(r.before + r.after).toBe(html);
  });

  it('never cuts after the last paragraph, or at n < 1', () => {
    expect(splitBodyAfterParagraph(p(6), 6)).toBeNull();
    expect(splitBodyAfterParagraph(p(6), 0)).toBeNull();
    expect(splitBodyAfterParagraph(p(6), 1.5)).toBeNull();
  });

  it('ignores paragraphs nested in lists, blockquotes and figures', () => {
    const html =
      '<p>One</p>' +
      '<blockquote><p>Quoted</p><p>Again</p></blockquote>' +
      '<p>Two</p>' +
      '<ul><li><p>Item</p></li><li>Plain</li></ul>' +
      '<figure><img src="/media/x.webp" alt="x"><figcaption><p>Cap</p></figcaption></figure>' +
      '<p>Three</p><p>Four</p><p>Five</p><p>Six</p>';
    expect(countParagraphs(html)).toBe(6);
    const r = splitBodyAfterParagraph(html, 2)!;
    expect(r.before).toBe('<p>One</p><blockquote><p>Quoted</p><p>Again</p></blockquote><p>Two</p>');
    expect(r.after.startsWith('<ul>')).toBe(true);
    // Both halves are balanced: every opening tag has its close on the same side.
    for (const half of [r.before, r.after]) {
      const opens = (half.match(/<(?!\/|img)[a-z]+/g) ?? []).length;
      const closes = (half.match(/<\/[a-z]+>/g) ?? []).length;
      expect(opens).toBe(closes);
    }
  });

  it('treats void and self-closing tags as leaves and skips comments', () => {
    const html = '<p>A<br>B<hr/></p><!-- <p>not a paragraph</p> -->' + p(5);
    expect(countParagraphs(html)).toBe(6);
    expect(splitBodyAfterParagraph(html, 1)!.before).toBe('<p>A<br>B<hr/></p>');
  });

  it('refuses unbalanced markup instead of cutting it', () => {
    expect(splitBodyAfterParagraph('<div>' + p(6), 2)).toBeNull();
    expect(splitBodyAfterParagraph('</div>' + p(6), 2)).toBeNull();
  });
});

describe('inArticleSplit', () => {
  it('cuts after the 2nd paragraph in a 6-8 paragraph body and the 3rd from 9', () => {
    expect(inArticleSplit(p(5))).toBeNull();
    expect(inArticleSplit(p(6))!.before).toBe(p(2));
    expect(inArticleSplit(p(8))!.before).toBe(p(2));
    expect(inArticleSplit(p(9))!.before).toBe(p(3));
  });
});

describe('ads.txt', () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nuvoxsaga-ads-'));
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('builds the one AdSense line from a ca-pub id only', () => {
    expect(adsTxtLine('ca-pub-1234567890123456')).toBe('google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0');
    expect(adsTxtLine(' ca-pub-1234567890123456 ')).toBe('google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0');
    expect(adsTxtLine('')).toBeNull();
    expect(adsTxtLine('pub-1234567890123456')).toBeNull();
    expect(adsTxtLine('ca-pub-123')).toBeNull();
  });

  it('writes the file with an id, removes a stale one without, and refuses ADS=1 without an id', () => {
    const file = path.join(dir, 'ads.txt');
    expect(syncAdsTxt(dir, '', '0', adsTxtLine)).toBe('absent');
    expect(fs.existsSync(file)).toBe(false);
    expect(syncAdsTxt(dir, 'ca-pub-1234567890123456', '0', adsTxtLine)).toBe('written');
    expect(fs.readFileSync(file, 'utf8')).toBe('google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n');
    expect(syncAdsTxt(dir, '', '0', adsTxtLine)).toBe('removed');
    expect(fs.existsSync(file)).toBe(false);
    expect(() => syncAdsTxt(dir, '', '1', adsTxtLine)).toThrow(/NEXT_PUBLIC_ADS=1/);
    expect(() => syncAdsTxt(dir, 'ca-pub-1', '1', adsTxtLine)).toThrow(/ca-pub-/);
  });
});
