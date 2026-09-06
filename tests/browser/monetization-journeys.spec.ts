import { expect, test } from '@playwright/test';

/**
 * Monetization in the browser.
 *
 * The most important test in this file is the first one: with everything
 * switched off — which is the default and the state the site launches in —
 * every calculator works and nothing commercial renders. That is the check that
 * says monetization has not been welded into the product.
 */

test.describe('with all monetization disabled', () => {
  test('a calculator still answers, and renders no commercial module', async ({ page }) => {
    await page.goto('/home/concrete-calculator');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // The calculator produces its answer with no commercial code involved.
    await expect(page.locator('.primary-result')).toBeVisible();

    // Nothing commercial rendered.
    await expect(page.locator('[data-next-action]')).toHaveCount(0);
    await expect(page.locator('.affiliate-module')).toHaveCount(0);
    await expect(page.locator('.lead-cta')).toHaveCount(0);
  });

  test('leaves no broken or filled ad slot behind', async ({ page }) => {
    await page.goto('/money/mortgage-payment');
    const slots = page.locator('.ad-slot');
    const count = await slots.count();
    for (let index = 0; index < count; index += 1) {
      // Empty, not "reserved" and certainly not "live", when advertising is off.
      await expect(slots.nth(index)).toHaveAttribute('data-ad-status', 'empty');
    }
  });

  test('renders no ad slot at all on a restricted page', async ({ page }) => {
    await page.goto('/health/bmi');
    await expect(page.locator('.primary-result')).toBeVisible();
    await expect(page.locator('.ad-slot')).toHaveCount(0);
    await expect(page.locator('[data-next-action]')).toHaveCount(0);
  });
});

test.describe('ad placement', () => {
  test('no ad slot sits between a calculator input and its answer', async ({ page }) => {
    await page.goto('/money/mortgage-payment');

    const order = await page.evaluate(() => {
      const marks: Array<{ kind: string; top: number }> = [];
      const input = document.querySelector('.calc-panel, form');
      const result = document.querySelector('.primary-result');
      if (input) marks.push({ kind: 'input', top: input.getBoundingClientRect().top + window.scrollY });
      if (result) marks.push({ kind: 'result', top: result.getBoundingClientRect().top + window.scrollY });
      for (const slot of document.querySelectorAll('.ad-slot')) {
        const placement = slot.getAttribute('data-ad-placement') ?? 'ad';
        marks.push({ kind: `ad:${placement}`, top: slot.getBoundingClientRect().top + window.scrollY });
      }
      return marks.sort((left, right) => left.top - right.top);
    });

    const inputTop = order.find((mark) => mark.kind === 'input')?.top ?? 0;
    const resultTop = order.find((mark) => mark.kind === 'result')?.top ?? Number.POSITIVE_INFINITY;
    const between = order.filter((mark) =>
      mark.kind.startsWith('ad:')
      && !mark.kind.includes('leaderboard')
      && !mark.kind.includes('rail')
      && mark.top > inputTop && mark.top < resultTop);

    expect(between, 'An ad slot sits between the calculator input and its answer').toEqual([]);
  });
});

test.describe('the coverage endpoint', () => {
  test('never asks for contact details before it knows there is a buyer', async ({ request }) => {
    const response = await request.post('/api/monetization/coverage', {
      data: { vertical: 'roofing', zip: '75201', pageId: 'job-roof-replacement', locale: 'en-US' },
    });
    const body = await response.json();
    // With leads disabled and no database bound, the honest answer is "no
    // coverage" — and crucially the response carries no partner and no fields
    // to collect.
    expect(body.covered ?? false).toBe(false);
    expect(body.partnerName).toBeUndefined();
  });

  test('refuses a cross-origin submission', async ({ request }) => {
    const response = await request.post('/api/monetization/lead', {
      headers: { origin: 'https://attacker.example.com', 'content-type': 'application/json' },
      data: { vertical: 'roofing', pageId: 'x', locale: 'en-US', zip: '75201', contact: { phone: '2145551234' } },
    });
    expect(response.status()).toBe(403);
  });

  test('hides the admin endpoint rather than advertising it', async ({ request }) => {
    const response = await request.get('/api/monetization/admin');
    expect(response.status()).toBe(404);
  });

  test('rejects an admin call with the wrong token', async ({ request }) => {
    const response = await request.get('/api/monetization/admin', {
      headers: { authorization: 'Bearer wrong-token-that-is-long-enough-to-try' },
    });
    expect(response.status()).toBe(404);
  });
});

test.describe('the disclosure page', () => {
  test('explains compensation and carries no commercial module itself', async ({ page }) => {
    await page.goto('/disclosure');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/compensation/i);
    await expect(page.locator('.ad-slot')).toHaveCount(0);
    await expect(page.locator('.affiliate-module')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /what it never affects/i })).toBeVisible();
  });

  test('is reachable from the footer of an ordinary page', async ({ page }) => {
    await page.goto('/money/mortgage-payment');
    await expect(page.locator('footer a[href="/disclosure"]').first()).toBeVisible();
  });
});
