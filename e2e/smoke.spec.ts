/**
 * Smoke tests — every key public route returns 200 with expected anchor text.
 * Visual regression snapshots happen in a separate spec when we have a
 * stable deployed URL.
 */
import { test, expect } from '@playwright/test';

test.describe('public routes', () => {
  test('parent landing renders', async ({ page }) => {
    const res = await page.goto('/');
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Three frontiers/i);
  });

  for (const slug of ['nuvoxai', 'nuvoxspace', 'nuvoxworld']) {
    test(`/${slug} renders with its primary CTA`, async ({ page }) => {
      const res = await page.goto(`/${slug}`);
      expect(res?.status()).toBe(200);
      await expect(page.getByRole('link', { name: /Read the latest/i })).toBeVisible();
    });

    test(`/${slug}/blog returns 200`, async ({ page }) => {
      const res = await page.goto(`/${slug}/blog`);
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
  });

  test('/labs renders', async ({ page }) => {
    const res = await page.goto('/labs');
    expect(res?.status()).toBe(200);
  });

  test('/admin redirects when unauthenticated', async ({ page }) => {
    await page.goto('/admin');
    // Middleware redirects to /login or returns 403 (preview deploys).
    await expect(page).toHaveURL(/\/login|\/403/);
  });

  test('robots.txt blocks /admin and /api', async ({ request }) => {
    const r = await request.get('/robots.txt');
    expect(r.status()).toBe(200);
    const body = await r.text();
    expect(body).toContain('Disallow: /admin');
    expect(body).toContain('Disallow: /api');
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
