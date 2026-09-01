import { expect, test } from '@playwright/test';

test('hourly-pay inputs hydrate and recalculate the audited result', async ({ page }) => {
  await page.goto('/money/hourly-to-salary');
  await expect(page.getByRole('heading', { name: 'Hourly to Salary Calculator' })).toBeVisible();
  await expect(page.locator('.calculator-panel')).toHaveAttribute('data-hydrated', 'true');
  await page.locator('#hourly-rate').fill('35');
  await expect(page.locator('.primary-result strong')).toHaveText('$72,800');
  await expect(page.locator('.result-audit')).toContainText('Method compensation-v1.0.0');
  await expect(page.locator('.result-audit')).toContainText('Data Manual inputs / fixed rules');
});

test('manual electricity input removes the EIA snapshot claim', async ({ page }) => {
  await page.goto('/home/electricity-cost');
  await expect(page.locator('.calculator-panel')).toHaveAttribute('data-hydrated', 'true');
  await page.locator('#monthly-kwh').fill('900');
  await page.locator('#custom-electricity-rate').fill('10');
  await expect(page.locator('.primary-result strong')).toHaveText('$90.00');
  await expect(page.locator('.result-stat-grid')).toContainText('Your rate');
  await expect(page.locator('.result-audit')).toContainText('Data Manual inputs / fixed rules');
  await expect(page.locator('.result-audit')).not.toContainText('eia-electricity-residential');
});

test('critical routes, metadata, sitemap gates, and security headers stay coherent', async ({ request }) => {
  const paths = [
    '/', '/money/hourly-to-salary', '/home/electricity-cost', '/home/concrete-calculator',
    '/auto/ev-vs-gas', '/everyday/business-days', '/shopping/unit-price', '/food/recipe-scaler',
    '/topics/home', '/search?q=concrete', '/methodology/data', '/sitemap.xml',
    '/sitemaps/pages/1.xml', '/sitemaps/topics/1.xml', '/sitemaps/tools/1.xml', '/robots.txt',
  ];
  for (const path of paths) expect((await request.get(path)).status(), path).toBe(200);

  const root = await request.get('/');
  expect(root.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
  const search = await (await request.get('/search?q=concrete')).text();
  expect(search).toContain('noindex');
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).not.toContain('Disallow: /search');
  const topicSitemap = await (await request.get('/sitemaps/topics/1.xml')).text();
  expect(topicSitemap).toContain('/topics/home');
  expect(topicSitemap).not.toContain('/topics/money');
});
