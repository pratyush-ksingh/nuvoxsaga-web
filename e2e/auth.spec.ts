/**
 * /login render tests — magic-link flow happy paths and surface checks.
 *
 * Stops short of the actual email round-trip; that needs a mock SMTP
 * (Mailpit etc.) which is out of scope for launch-prep. Real Resend
 * round-trip validation happens in Phase 0 step 4 ("verify domain DKIM
 * + send a test email").
 *
 * What this spec covers:
 *   - Login form renders with the right controls + ARIA labels
 *   - ?check-email=1 query renders the confirmation banner (not the form)
 *   - ?error=1 renders the error banner
 *   - Empty submit doesn't dispatch (HTML5 required gate)
 */
import { test, expect } from '@playwright/test';

test.describe('/login', () => {
  test('renders form with email + submit', async ({ page }) => {
    const res = await page.goto('/login');
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Sign in to Nuvoxsaga/i);
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /send magic link/i })).toBeVisible();
  });

  test('?check-email=1 shows confirmation banner instead of form', async ({ page }) => {
    const res = await page.goto('/login?check-email=1');
    expect(res?.status()).toBe(200);
    // Status banner (role="status") visible.
    await expect(page.getByRole('status')).toContainText(/Check your inbox/i);
    // Form is hidden in check-email state.
    await expect(page.getByRole('button', { name: /send magic link/i })).toBeHidden();
  });

  test('?error=1 shows error banner', async ({ page }) => {
    const res = await page.goto('/login?error=1');
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('alert')).toContainText(/Sign-in failed/i);
  });

  test('submit with empty email is blocked by required-field validation', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /send magic link/i }).click();
    // Stay on /login because HTML5 required validation blocks submit.
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
  });
});

test.describe('/admin gate (unauthenticated)', () => {
  test('redirects to /login with next=', async ({ page }) => {
    await page.goto('/admin');
    // Either /login (dev/prod) or /403 (preview deploys — admin disabled).
    await expect(page).toHaveURL(/\/login\?next=|\/403|forbidden/i);
  });

  test('/admin/setup-mfa redirects when not signed in', async ({ page }) => {
    await page.goto('/admin/setup-mfa');
    await expect(page).toHaveURL(/\/login|\/403/i);
  });
});
