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
      data: { vertical: 'roofing', zip: '75201', pageId: 'job-hvac-replacement', locale: 'en-US' },
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

test.describe('the admin surface', () => {
  test('shows a prompt and no data without a token', async ({ page }) => {
    await page.goto('/admin/monetization');
    await expect(page.getByRole('heading', { name: 'Monetization' })).toBeVisible();
    await expect(page.getByLabel('Admin token')).toBeVisible();
    // Nothing about the business is in the HTML before authentication.
    const html = await page.content();
    expect(html).not.toContain('Realized');
    expect(html).not.toContain('revenuePerThousandSessions');
  });

  test('is excluded from crawling', async ({ request }) => {
    const robots = await (await request.get('/robots.txt')).text();
    expect(robots).toContain('/admin/');
    expect(robots).toContain('/api/monetization/');
  });

  test('carries a noindex directive of its own', async ({ page }) => {
    await page.goto('/admin/monetization');
    const robots = page.locator('meta[name="robots"]');
    await expect(robots).toHaveAttribute('content', /noindex/);
  });

  test('rejects every write action without a token', async ({ request }) => {
    for (const action of ['upsert-campaign', 'import-conversions', 'process-deletion', 'lead-dossier']) {
      const response = await request.post('/api/monetization/admin', { data: { action } });
      expect(response.status(), action).toBe(404);
    }
  });
});

test.describe('privacy choices', () => {
  test('offers a do-not-sell control that persists in the browser', async ({ page }) => {
    await page.goto('/privacy');
    const optOut = page.getByLabel(/Do not sell or share/i);
    await expect(optOut).toBeVisible();
    // The control ships disabled and enables itself once its handler is real,
    // so waiting for that is also the assertion that the guard works.
    await expect(optOut).toBeEnabled();
    await expect(optOut).not.toBeChecked();

    await optOut.check();
    await expect(optOut).toBeChecked();

    // Choosing not to share necessarily withdraws personalisation; the two must
    // not be able to contradict each other.
    await expect(page.getByLabel(/Allow personalised advertising/i)).toBeDisabled();

    await page.reload();
    await expect(page.getByLabel(/Do not sell or share/i)).toBeChecked();
  });

  test('says plainly that the choice does not follow you to another device', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByText(/stored in this browser only/i)).toBeVisible();
  });
});

test.describe('attribution', () => {
  test('records a source in this tab without setting a cookie', async ({ page, context }) => {
    await page.goto('/money/mortgage-payment?utm_source=newsletter&utm_medium=email');
    await page.waitForFunction(() => sessionStorage.getItem('costanswer:attribution') !== null);

    const stored = await page.evaluate(() => JSON.parse(sessionStorage.getItem('costanswer:attribution') ?? '{}'));
    expect(stored.utmSource).toBe('newsletter');
    expect(stored.landingPath).toBe('/money/mortgage-payment');
    expect(stored.sessionId).toBeTruthy();

    // The privacy page promises no tracking cookies. That has to stay literally true.
    const cookies = await context.cookies();
    expect(cookies.filter((cookie) => cookie.name.includes('costanswer'))).toEqual([]);
  });

  test('keeps the landing page of the visit, not the last page seen', async ({ page }) => {
    await page.goto('/money/mortgage-payment');
    await page.waitForFunction(() => sessionStorage.getItem('costanswer:attribution') !== null);
    await page.goto('/money/car-loan');
    const stored = await page.evaluate(() => JSON.parse(sessionStorage.getItem('costanswer:attribution') ?? '{}'));
    expect(stored.landingPath).toBe('/money/mortgage-payment');
  });
});
