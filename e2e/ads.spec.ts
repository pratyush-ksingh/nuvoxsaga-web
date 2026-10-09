/**
 * Display ads (AdSense plan, Phase 4), one expectation set per build:
 *   E2E_ADS unset  the build was made with NEXT_PUBLIC_ADS=0: no ad markup anywhere
 *   E2E_ADS=1      the build was made with NEXT_PUBLIC_ADS=1 and a ca-pub id, from the
 *                  fixture content (scripts/make-fixtures.py), which has features: the loader
 *                  and consent tool in the HTML of every page, units on eligible pages only,
 *                  sized, labelled, below the headline
 * Google's hosts are stubbed so the run is hermetic. Chromium projects only (README).
 */
import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

const ADS = process.env.E2E_ADS === '1';
const CLIENT = process.env.E2E_ADSENSE_CLIENT ?? 'ca-pub-0000000000000000';
const GOOGLE = /googlesyndication\.com|doubleclick\.net|fundingchoicesmessages\.google\.com|adtrafficquality\.google|googletagservices\.com|googleadservices\.com/;
const UNIT = 'ins.adsbygoogle';
const LOADER = 'script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]';
const CONSENT = 'script[src^="https://fundingchoicesmessages.google.com/i/pub-"]';
const NEVER = ['/search', '/privacy', '/terms', '/contact', '/corrections', '/archive', '/no-such-page'];

async function stubGoogle(page: Page) {
  await page.route(GOOGLE, (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
}

interface Story {
  path: string;
  feature: boolean;
  words: number;
}

/** Every story in the sitemap, with its kind and word count read from its JSON-LD. */
async function stories(request: APIRequestContext): Promise<Story[]> {
  const xml = await (await request.get('/sitemap.xml')).text();
  const paths = [...xml.matchAll(/<loc>https?:\/\/[^<]+?(\/(?:ai|space|world)\/news\/[^<]+)<\/loc>/g)].map((m) => m[1]);
  const out: Story[] = [];
  for (const path of paths.slice(0, 60)) {
    const html = await (await request.get(path)).text();
    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      const v = JSON.parse(m[1]) as Record<string, unknown> | Record<string, unknown>[];
      const article = (Array.isArray(v) ? v : [v]).find((s) => /NewsArticle$/.test(String(s['@type'])));
      if (article) out.push({ path, feature: article['@type'] === 'BackgroundNewsArticle', words: Number(article.wordCount ?? 0) });
    }
  }
  return out;
}

/** Units are page-gated (lib/ads.ts); the consent tool and loader are site-wide once ads are on. */
async function noUnits(page: Page, path: string) {
  const res = await page.goto(path);
  expect(res, path).toBeTruthy();
  await expect(page.locator(UNIT), path).toHaveCount(0);
  await expect(page.locator('.ad-slot'), path).toHaveCount(0);
}

test.describe(ADS ? 'ads on' : 'ads off', () => {
  test.beforeEach(async ({ page }) => stubGoogle(page));

  test('pages that never carry a unit', async ({ page }) => {
    for (const path of NEVER) await noUnits(page, path);
    // Any story that is not eligible: every one in the ADS=0 build, the thin briefs in the other.
    const all = await stories(page.request);
    const thin = all.find((s) => !s.feature && s.words < 300);
    test.skip(!thin, 'no story under 300 words in this content set');
    await noUnits(page, thin!.path);
  });

  if (!ADS) {
    test('ads off: no loader, no consent tool, no footer control, no meta tag, no ads.txt, nowhere', async ({ page }) => {
      for (const path of ['/', '/ai', '/latest', '/space/launch', '/search', '/privacy']) {
        expect(await (await page.request.get(path)).text(), path).not.toMatch(/googlesyndication|fundingchoicesmessages|adsbygoogle/);
        await noUnits(page, path);
        await expect(page.locator(LOADER), path).toHaveCount(0);
        await expect(page.locator(CONSENT), path).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Privacy and cookie settings' }), path).toHaveCount(0);
        await expect(page.locator('meta[name="google-adsense-account"]'), path).toHaveCount(0);
      }
      expect((await page.request.get('/ads.txt')).status()).toBe(404);
    });
    return;
  }

  test('ads.txt and the meta tag name the publisher', async ({ page }) => {
    const r = await page.request.get('/ads.txt');
    expect(r.status()).toBe(200);
    expect((await r.text()).trim()).toBe(`google.com, ${CLIENT.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0`);
    await page.goto('/');
    await expect(page.locator('meta[name="google-adsense-account"]')).toHaveAttribute('content', CLIENT);
  });

  test('an eligible story carries labelled, sized units below the headline, with the consent tool and loader in <head>', async ({ page }) => {
    const all = await stories(page.request);
    const eligible = all.find((s) => s.feature || s.words >= 300);
    test.skip(!eligible, 'no feature or 300-word story in this content set (build from the fixtures)');
    await page.goto(eligible!.path);

    const units = page.locator(UNIT);
    expect(await units.count()).toBeGreaterThanOrEqual(1);
    for (const unit of await units.all()) {
      await expect(unit).toHaveAttribute('data-ad-client', CLIENT);
      await expect(unit).toHaveAttribute('data-ad-slot', /^\d+$/);
      const box = await unit.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(300);
      expect(box!.height).toBeGreaterThanOrEqual(60);
    }
    // The label is in the HTML before any ad loads, and the panel reserves its height.
    const slots = page.locator('.ad-slot');
    for (const slot of await slots.all()) {
      await expect(slot.getByText('Advertisement', { exact: true })).toBeVisible();
      expect(await slot.evaluate((el) => getComputedStyle(el).minHeight)).not.toBe('0px');
    }
    // Never above the h1: the first unit follows the headline in document order.
    expect(
      await page.evaluate(() => {
        const h1 = document.querySelector('h1')!;
        const first = document.querySelector('.ad-slot')!;
        return Boolean(h1.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING);
      }),
    ).toBe(true);
    // The in-article unit sits between the two halves of the body when the body is long enough.
    if ((await page.locator('article .article-body').count()) === 2) {
      await expect(page.locator('article .article-body + .ad-slot + .article-body')).toHaveCount(1);
    }
    // Consent tool first, then the AdSense loader, both in <head>.
    await expect(page.locator(`head ${CONSENT}`)).toHaveCount(1);
    await expect(page.locator(`head script[src="https://fundingchoicesmessages.google.com/i/${CLIENT.replace(/^ca-/, '')}?ers=1"]`)).toHaveCount(1);
    await expect(page.locator(`head ${LOADER}`)).toHaveCount(1);
    await expect(page.locator(LOADER)).toHaveAttribute('src', `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`);
    await expect(page.locator(LOADER)).toHaveAttribute('crossorigin', 'anonymous');
    expect(await page.evaluate(() => [...document.head.querySelectorAll('script[src]')].map((s) => (s as HTMLScriptElement).src)))
      .toEqual(expect.arrayContaining([expect.stringContaining('fundingchoicesmessages'), expect.stringContaining('adsbygoogle.js')]));
    await expect(page.locator('footer').getByRole('button', { name: 'Privacy and cookie settings' })).toBeVisible();
  });

  test('the loader is in the raw HTML of every page, eligible or not (Google reads the markup site-wide)', async ({ page }) => {
    const all = await stories(page.request);
    const tag = `<script async="" src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}" crossorigin="anonymous">`;
    for (const path of ['/', '/ai', '/latest', ...NEVER, ...all.slice(0, 3).map((s) => s.path)]) {
      const html = await (await page.request.get(path)).text();
      expect(html, path).toContain(tag);
      expect(html.indexOf('fundingchoicesmessages.google.com/i/'), path).toBeLessThan(html.indexOf('adsbygoogle.js?client='));
    }
  });

  test('no horizontal overflow at 390px on a story, a desk and the home page', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const all = await stories(page.request);
    const eligible = all.find((s) => s.feature || s.words >= 300);
    for (const path of [eligible?.path, '/ai', '/'].filter((p): p is string => Boolean(p))) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });

  test('desk fronts and home carry units; a thin section does not', async ({ page }) => {
    await page.goto('/ai');
    expect(await page.locator(UNIT).count()).toBeGreaterThanOrEqual(1);
    // In the rail and after the fifth river row, never above the desk headline.
    expect(
      await page.evaluate(() => {
        const h1 = document.querySelector('h1')!;
        return [...document.querySelectorAll('.ad-slot')].every((el) => h1.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
      }),
    ).toBe(true);
    await page.goto('/');
    await expect(page.locator(UNIT)).toHaveCount(1);
    // Sections and topics under five stories are thin pages: no unit.
    const thinSection = await page.request.get('/ai/models');
    if ((await thinSection.text()).includes('content="noindex, follow"')) await noUnits(page, '/ai/models');
  });
});
