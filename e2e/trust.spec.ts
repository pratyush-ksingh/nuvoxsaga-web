/**
 * Trust layer (AdSense plan, Phase 2): the editor is on every story, the policy pages say
 * what the site does, thin pages are noindex, feeds carry what a reader needs, and the
 * JSON-LD parses into the shapes Google's Rich Results test expects.
 */
import { test, expect, type Page } from '@playwright/test';

const SITE = 'https://nuvoxsaga.com';

async function jsonLd(page: Page): Promise<Record<string, unknown>[]> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.flatMap((b) => {
    const v = JSON.parse(b) as Record<string, unknown> | Record<string, unknown>[];
    return Array.isArray(v) ? v : [v];
  });
}

async function firstStoryPath(page: Page): Promise<string | null> {
  const res = await page.request.get('/sitemap.xml');
  const m = (await res.text()).match(/<loc>https?:\/\/[^<]+?(\/(?:ai|space|world)\/news\/[^<]+)<\/loc>/);
  return m ? m[1] : null;
}

test.describe('editor and story trust signals', () => {
  test('editor page renders with ProfilePage + Person JSON-LD and no placeholder photo', async ({ page }) => {
    const res = await page.goto('/about/pratyush-kumar-singh');
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pratyush Kumar Singh');
    const ld = await jsonLd(page);
    const profile = ld.find((s) => s['@type'] === 'ProfilePage') as { mainEntity: Record<string, unknown> } | undefined;
    expect(profile).toBeTruthy();
    expect(profile!.mainEntity['@type']).toBe('Person');
    expect(profile!.mainEntity.jobTitle).toBe('Editor');
    expect(profile!.mainEntity.worksFor).toMatchObject({ name: 'Nuvoxsaga' });
    // Either a real portrait or no <img> in the header at all: nothing placeholder-like.
    const imgs = page.locator('header img');
    if ((await imgs.count()) > 0) await expect(imgs.first()).toHaveAttribute('alt', /Pratyush Kumar Singh/);
    await expect(page.locator('body')).not.toContainText(/placeholder|coming soon/i);
  });

  test('a story credits the editor and carries editor + NewsArticle JSON-LD with the title card', async ({ page }) => {
    const path = await firstStoryPath(page);
    test.skip(!path, 'no published story in this build');
    const res = await page.goto(path!);
    expect(res?.status()).toBe(200);
    const byline = page.getByRole('link', { name: 'Pratyush Kumar Singh' }).first();
    await expect(byline).toHaveAttribute('href', '/about/pratyush-kumar-singh');
    // The story itself; the "More from" cards below it are <article>s too.
    const story = page.locator('article[data-pagefind-body]');
    await expect(story).toContainText(/Edited by/);
    // One line, not the old 75-word paragraph; the method link; claims collapsed and nosnippet.
    await expect(story).not.toContainText('This brief was written from the source above');
    await expect(story).not.toContainText('Spotted a mistake?');
    await expect(story.getByRole('link', { name: /How we check/ })).toHaveAttribute('href', '/standards#checks');
    await expect(story.locator('details[data-nosnippet]')).toHaveCount(1);
    const ld = await jsonLd(page);
    const article = ld.find((s) => /NewsArticle$/.test(String(s['@type']))) as Record<string, unknown>;
    expect(article).toBeTruthy();
    expect(article.author).toMatchObject({ '@type': 'Organization', name: 'Nuvoxsaga' });
    expect(article.editor).toMatchObject({ '@type': 'Person', name: 'Pratyush Kumar Singh', url: `${SITE}/about/pratyush-kumar-singh` });
    const images = article.image as string[];
    expect(images[0]).toMatch(/\/og\/nuvox_(ai|space|world)\/.+\.png$/);
    const card = await page.request.get(images[0].replace(SITE, ''));
    expect(card.status()).toBe(200);
    expect(card.headers()['content-type']).toContain('image/png');
    // Every chip leads to an indexable topic page.
    for (const href of await page.locator('ul[aria-label="Topics"] a').evaluateAll((as) => as.map((a) => a.getAttribute('href')))) {
      const topic = await page.request.get(href!);
      expect(topic.status()).toBe(200);
      expect(await topic.text()).not.toMatch(/name="robots" content="noindex/);
    }
  });

  test('home carries NewsMediaOrganization with its policy links', async ({ page }) => {
    await page.goto('/');
    const ld = await jsonLd(page);
    const org = ld.find((s) => s['@type'] === 'NewsMediaOrganization') as Record<string, unknown>;
    expect(org).toBeTruthy();
    expect(org.ethicsPolicy).toBe(`${SITE}/standards`);
    expect(org.correctionsPolicy).toBe(`${SITE}/corrections`);
    expect(org.masthead).toBe(`${SITE}/about#masthead`);
    expect(org.ownershipFundingInfo).toBe(`${SITE}/about#ownership`);
    expect(org.actionableFeedbackPolicy).toBe(`${SITE}/contact`);
    expect(org.foundingDate).toBe('2026-09-27');
    for (const p of ['/standards', '/corrections', '/about', '/contact']) expect((await page.request.get(p)).status()).toBe(200);
  });
});

test.describe('policy pages', () => {
  test('/about has the masthead and the ownership and funding block', async ({ page }) => {
    await page.goto('/about');
    await expect(page.locator('#masthead')).toContainText('Pratyush Kumar Singh');
    await expect(page.locator('#ownership')).toContainText(/self-funded/);
    await expect(page.locator('#ownership')).toContainText(/display advertising served by Google/);
    await expect(page.locator('#ownership')).toContainText(/Advertisers do not/);
    await expect(page.locator('body')).not.toContainText('researched with live web search');
  });

  test('/privacy carries the four Google statements and no longer denies advertising', async ({ page }) => {
    await page.goto('/privacy');
    const body = page.locator('body');
    await expect(body).not.toContainText('We do not run advertising');
    await expect(body).toContainText(/Third-party vendors, including Google, use cookies/);
    await expect(body).toContainText(/advertising cookies enables it and its partners/);
    await expect(page.getByRole('link', { name: 'Ads Settings' })).toHaveAttribute('href', /adssettings\.google\.com/);
    await expect(page.getByRole('link', { name: 'www.aboutads.info' })).toHaveAttribute('href', /aboutads\.info/);
    await expect(page.getByRole('link', { name: /policies\.google\.com/ })).toHaveAttribute('href', 'https://policies.google.com/technologies/ads');
    await expect(body).toContainText(/European Economic Area/);
  });

  test('/terms renders and is linked from the footer', async ({ page }) => {
    const res = await page.goto('/terms');
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Terms of use');
    await expect(page.locator('body')).toContainText(/laws of India/);
    await page.goto('/');
    await expect(page.locator('footer').getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms');
    await expect(page.locator('footer').getByRole('link', { name: 'The editor' })).toHaveAttribute('href', '/about/pratyush-kumar-singh');
    await expect(page.locator('footer').getByRole('link', { name: 'Archive' })).toHaveAttribute('href', '/archive');
    await expect(page.locator('header').getByRole('link', { name: 'Archive' })).toHaveCount(0);
  });

  test('/standards has the checks and advertising anchors; /contact shows a plain email', async ({ page }) => {
    await page.goto('/standards');
    await expect(page.locator('#checks')).toBeVisible();
    await expect(page.locator('#advertising')).toContainText(/labelled/);
    await page.goto('/contact');
    expect(await page.content()).toContain('<!--email_off-->corrections@nuvoxsaga.com<!--/email_off-->');
  });
});

test.describe('thin pages and feeds', () => {
  test('sections outside the sitemap are noindex,follow; those inside are indexable', async ({ page }) => {
    const sitemap = await (await page.request.get('/sitemap.xml')).text();
    expect(sitemap).toContain('/terms');
    expect(sitemap).toContain('/about/pratyush-kumar-singh');
    expect(sitemap).not.toMatch(/\/page\/\d+</);
    for (const section of ['/ai/models', '/ai/policy', '/space/launch', '/world/asia', '/world/health-climate']) {
      const html = await (await page.request.get(section)).text();
      const listed = sitemap.includes(`${SITE}${section}<`);
      expect(html.includes('content="noindex, follow"'), `${section} listed=${listed}`).toBe(!listed);
      // Every section carries its own description.
      expect(html).toMatch(/<h1[^>]*>[^<]+<\/h1><p[^>]*>[^<]{150,}/);
    }
  });

  test('older river pages are noindex,follow', async ({ page }) => {
    const res = await page.request.get('/ai/page/2');
    test.skip(res.status() === 404, 'the AI desk fits one page in this build');
    expect(await res.text()).toContain('content="noindex, follow"');
  });

  test('/corrections and /latest have an intro paragraph', async ({ page }) => {
    for (const p of ['/corrections', '/latest']) {
      await page.goto(p);
      const intro = await page.locator('main p, section p, article p').first().textContent();
      expect(intro!.split(/\s+/).length).toBeGreaterThanOrEqual(10);
    }
  });

  test('feeds carry author, enclosure and body; /feed redirects to /feed.xml', async ({ request }) => {
    for (const path of ['/feed.xml', '/ai/feed.xml', '/space/feed.xml', '/world/feed.xml']) {
      const r = await request.get(path);
      expect(r.status(), path).toBe(200);
      const body = await r.text();
      expect(body).toContain('<rss');
      if (body.includes('<item>')) {
        expect(body).toMatch(/<dc:creator>Nuvoxsaga (AI|Space|World) desk<\/dc:creator>/);
        expect(body).toMatch(/<enclosure url="https:\/\/[^"]+" type="image\/(png|webp|jpeg)"/);
        expect(body).toContain('<content:encoded><![CDATA[');
      }
    }
    const redirect = await request.get('/feed', { maxRedirects: 0 });
    // wrangler pages dev honours public/_redirects (301); a plain static server has no redirects.
    test.skip(redirect.status() === 404, 'static server without _redirects');
    expect(redirect.status()).toBe(301);
    expect(redirect.headers()['location']).toMatch(/\/feed\.xml$/);
  });
});
