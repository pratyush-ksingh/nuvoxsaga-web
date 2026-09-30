/**
 * Smoke tests — every key public route returns 200 with expected anchor text.
 * Visual regression snapshots happen in a separate spec when we have a
 * stable deployed URL.
 */
import { test, expect } from '@playwright/test';

const DESKS = [
  { slug: 'ai', section: 'models' },
  { slug: 'space', section: 'launch' },
  { slug: 'world', section: 'asia' },
];

test.describe('public routes', () => {
  test('home renders', async ({ page }) => {
    const res = await page.goto('/');
    expect(res?.status()).toBe(200);
    // Launch composition before the first story, the news front after.
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Three frontiers|AI, space and world news/i);
  });

  for (const { slug, section } of DESKS) {
    test(`/${slug} desk front renders`, async ({ page }) => {
      const res = await page.goto(`/${slug}`);
      expect(res?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Top stories' })).toBeVisible();
    });

    test(`/${slug}/${section} section renders`, async ({ page }) => {
      const res = await page.goto(`/${slug}/${section}`);
      expect(res?.status()).toBe(200);
    });
  }

  test('unknown brand 404s', async ({ page }) => {
    const res = await page.goto('/unknown-brand');
    expect(res?.status()).toBe(404);
  });

  test('/about renders', async ({ page }) => {
    const res = await page.goto('/about');
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/shows its work/i);
    await expect(page.getByRole('link', { name: /Read the latest/i })).toBeVisible();
  });

  for (const path of ['/latest', '/standards', '/corrections', '/privacy', '/contact', '/archive']) {
    test(`${path} renders`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
    });
  }

  test('robots.txt blocks /api and Pagefind assets', async ({ request }) => {
    const r = await request.get('/robots.txt');
    expect(r.status()).toBe(200);
    const body = await r.text();
    expect(body).toContain('Disallow: /api');
    expect(body).toContain('Disallow: /pagefind/');
    // Training crawlers are refused; search and citation crawlers are not.
    expect(body).toMatch(/User-Agent: GPTBot\s+Disallow: \//i);
    expect(body).not.toMatch(/PerplexityBot|Google-Extended/);
  });

  test('sitemap.xml is valid XML', async ({ request }) => {
    const r = await request.get('/sitemap.xml');
    expect(r.status()).toBe(200);
    const body = await r.text();
    expect(body).toMatch(/^<\?xml/);
    expect(body).toContain('<urlset');
  });
});

test.describe('security headers', () => {
  test('HSTS + frame-options + content-type-options present on /', async ({ request }) => {
    const r = await request.get('/');
    expect(r.headers()['strict-transport-security']).toContain('max-age=63072000');
    expect(r.headers()['x-frame-options']).toBe('DENY');
    expect(r.headers()['x-content-type-options']).toBe('nosniff');
  });
});
