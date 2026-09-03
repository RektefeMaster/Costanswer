import { expect, test } from '@playwright/test';
import axe from 'axe-core';

const axeSource = axe.source;

const toolPaths = [
  '/money/hourly-to-salary',
  '/money/salary-after-tax',
  '/money/paycheck',
  '/money/mortgage-payment',
  '/money/loan',
  '/money/compound-interest',
  '/money/debt-payoff',
  '/money/home-affordability',
  '/money/cost-of-living',
  '/money/inflation',
  '/home/electricity-cost',
  '/home/appliance-electricity-cost',
  '/home/concrete-calculator',
  '/auto/ev-vs-gas',
  '/auto/road-trip-fuel',
  '/auto/car-affordability',
  '/everyday/business-days',
  '/shopping/unit-price',
  '/shopping/where-cheaper',
  '/food/recipe-scaler',
] as const;

test('hourly-pay inputs hydrate and recalculate the audited result', async ({ page }) => {
  await page.goto('/money/hourly-to-salary');
  await expect(page.getByRole('heading', { name: 'Hourly to Salary Calculator' })).toBeVisible();
  await expect(page.locator('.calculator-panel')).toHaveAttribute('data-hydrated', 'true');
  await page.locator('#hourly-rate').fill('35');
  await expect(page.locator('.primary-result strong')).toHaveText('$72,800');
  await expect(page.locator('.result-audit')).toContainText('Method compensation-v1.1.0');
  await expect(page.locator('.result-audit')).toContainText('Data Manual inputs / fixed rules');
});

test('salary after tax and paycheck use the tax snapshot and stay estimates', async ({ page }) => {
  await page.goto('/money/salary-after-tax');
  await expect(page.getByRole('heading', { name: 'Salary After Tax Calculator' })).toBeVisible();
  await expect(page.locator('.calculator-panel')).toHaveAttribute('data-hydrated', 'true');
  await expect(page.locator('.primary-result strong')).toHaveText('$79,180.00');
  await expect(page.locator('.result-audit')).toContainText('Method salary-after-tax-v1.0.0');
  await expect(page.locator('.result-audit')).toContainText('us-tax-2026-v1');
  await page.locator('#salary-state').selectOption('NY');
  await expect(page.locator('.data-callout')).toContainText('federal and FICA only');
  await expect(page.locator('.result-details')).toContainText('Omitted (unsupported state)');

  await page.goto('/money/paycheck');
  await expect(page.getByRole('heading', { name: 'Paycheck Calculator' })).toBeVisible();
  await expect(page.locator('.calculator-panel')).toHaveAttribute('data-hydrated', 'true');
  await expect(page.locator('.data-callout')).toContainText('not IRS withholding tables');
  await page.getByRole('button', { name: 'Annual' }).click();
  await page.locator('#paycheck-amount').fill('100000');
  await expect(page.locator('.primary-result strong')).toHaveText('$79,180.00');
  await expect(page.locator('.result-audit')).toContainText('Method paycheck-v1.0.0');
  await expect(page.locator('.result-details')).toContainText('not employer payroll withholding');
});

test('manual electricity input removes the EIA snapshot claim', async ({ page }) => {
  await page.goto('/home/electricity-cost');
  await expect(page.locator('.calculator-panel')).toHaveAttribute('data-hydrated', 'true');
  await expect(page.locator('.result-audit')).toContainText('eia-electricity-residential');
  await page.locator('#monthly-kwh').fill('900');
  await page.locator('#custom-electricity-rate').fill('10');
  await expect(page.locator('.primary-result strong')).toHaveText('$90.00');
  await expect(page.locator('.result-stat-grid')).toContainText('Your rate');
  await expect(page.locator('.result-audit')).toContainText('Data Manual inputs / fixed rules');
  await expect(page.locator('.result-audit')).not.toContainText('eia-electricity-residential');
});

test('appliance electricity uses the EIA snapshot until a manual rate replaces it', async ({ page }) => {
  await page.goto('/home/appliance-electricity-cost');
  await expect(page.getByRole('heading', { name: 'Appliance Electricity Cost Calculator' })).toBeVisible();
  await expect(page.locator('.calculator-panel')).toHaveAttribute('data-hydrated', 'true');
  await expect(page.locator('.data-callout')).toContainText('EIA · June 2026');
  await expect(page.locator('.data-callout')).toContainText('Latest available official data');
  await expect(page.locator('.result-audit')).toContainText('Method appliance-energy-v1.0.0');
  await expect(page.locator('.result-audit')).toContainText('eia-electricity-residential');
  await page.locator('#appliance-custom-rate').fill('10');
  await expect(page.locator('.primary-result strong')).toHaveText('$36.40');
  await expect(page.locator('.result-stat-grid')).toContainText('Manual electricity rate');
  await expect(page.locator('.data-footnote')).toContainText('The EIA state average is not used');
  await expect(page.locator('.result-audit')).toContainText('Data Manual inputs / fixed rules');
  await expect(page.locator('.result-audit')).not.toContainText('eia-electricity-residential');
});

test('car affordability prices the whole vehicle and tracks which data it used', async ({ page }) => {
  await page.goto('/auto/car-affordability');
  await expect(page.getByRole('heading', { name: 'Car Affordability Calculator' })).toBeVisible();
  await expect(page.locator('.calculator-panel')).toHaveAttribute('data-hydrated', 'true');
  await expect(page.locator('.data-callout')).toContainText('EIA · Aug 31, 2026');
  await expect(page.locator('.result-audit')).toContainText('Method car-affordability-v1.0.0');
  await expect(page.locator('.result-audit')).toContainText('eia-gasoline-regular-weekly');

  await page.locator('#car-take-home').fill('4000');
  await page.locator('#car-price').fill('30000');
  await page.locator('#car-down').fill('6000');
  await page.locator('#car-rate').fill('0');
  await page.locator('#car-term').fill('60');
  await page.locator('#car-miles').fill('12000');
  await page.locator('#car-mpg').fill('25');
  await page.locator('#car-insurance').fill('150');
  await page.locator('#car-maintenance').fill('75');
  await page.locator('#car-registration').fill('240');
  await page.locator('#car-gas-price').fill('3.50');

  await expect(page.locator('.primary-result p')).toHaveText('Total estimated monthly car cost');
  await expect(page.locator('.primary-result strong')).toHaveText('$785.00');
  await expect(page.locator('.primary-result span')).toContainText('19.6% of monthly take-home pay');
  await expect(page.locator('.primary-result span')).toContainText('loan payment alone is 10%');
  await expect(page.locator('.primary-result')).not.toContainText('Stretch');
  await expect(page.locator('.decision-note').first()).toContainText('affordability guideline');
  await expect(page.locator('.decision-note').first()).toContainText('Stretch');
  await expect(page.locator('.decision-note').first()).toContainText('CostAnswer planning thresholds on take-home pay');
  await expect(page.locator('.result-stat-grid').first()).toContainText('Loan payment');
  await expect(page.locator('.result-stat-grid').first()).toContainText('$400.00');
  await expect(page.locator('.result-stat-grid').first()).toContainText('Insurance, upkeep, fees');
  await expect(page.locator('.result-details')).toContainText('Depreciation and resale value are not included');
  await expect(page.locator('.data-footnote')).toContainText('No EIA average is used in this result');
  await expect(page.locator('.result-audit')).toContainText('Data Manual inputs / fixed rules');
  await expect(page.locator('.result-audit')).not.toContainText('eia-gasoline-regular-weekly');

  await expect(page.locator('.decision-note')).toContainText('Cut the price by $11,100');

  await page.getByRole('button', { name: 'Electric' }).click();
  await expect(page.locator('.data-callout')).toContainText('EIA · June 2026');
  await expect(page.locator('.data-callout')).toContainText('Latest available official data');
  await expect(page.locator('.result-audit')).toContainText('eia-electricity-residential');

  await page.getByRole('button', { name: 'How much car?' }).click();
  await expect(page.locator('.primary-result p')).toHaveText('Estimated maximum vehicle price');
  await expect(page.locator('.primary-result strong')).toHaveText(/^\$[\d,]+$/);
  await expect(page.locator('.result-stat-grid').first()).toContainText('Comfortable range');
  await expect(page.locator('.decision-note').first()).toContainText('planning thresholds on take-home pay');

  await page.getByRole('button', { name: 'Estimate from salary' }).click();
  await page.locator('#car-state').selectOption('NY');
  await expect(page.locator('.result-audit')).toContainText('us-tax-2026-v1');
  await expect(page.locator('.result-details')).toContainText('New York wage income tax is omitted');
});

test('cost of living stays dollar-first and keeps HUD as a gross-rent benchmark', async ({ page }) => {
  await page.goto('/money/cost-of-living');
  await expect(page.getByRole('heading', { name: 'Cost of Living Calculator' })).toBeVisible();
  await expect(page.locator('.calculator-panel')).toHaveAttribute('data-hydrated', 'true');
  await expect(page.locator('.primary-result p')).toHaveText('Estimated modeled monthly living cost');
  await expect(page.locator('.primary-result strong')).toHaveText(/^\$[\d,]+$/);
  await expect(page.locator('.data-callout')).toContainText('Austin, TX');
  await expect(page.locator('.result-details')).toContainText('HUD Fair Market Rent');
  await expect(page.locator('.result-details')).toContainText('gross-rent');
  await expect(page.locator('.result-audit')).toContainText('Method cost-of-living-v1.0.0');
  await page.locator('#col-location').fill('New York, NY');
  await page.getByRole('button', { name: 'New York, NY city' }).click();
  await expect(page.locator('.location-selected')).toContainText('New York, NY');
  await expect(page.getByText('INCOMPLETE', { exact: true })).toBeVisible();
  await expect(page.locator('.primary-result p')).toHaveText('Modeled monthly living cost is not comparable');
  await expect(page.locator('.primary-result strong')).toHaveText('—');
  await page.locator('#col-location').fill('Springfield');
  await expect(page.locator('.location-results')).toContainText('Springfield, IL');
  await expect(page.locator('.location-results')).toContainText('Springfield, MO');
  await page.getByRole('button', { name: 'Springfield, IL city' }).click();
  await expect(page.locator('.location-selected')).toContainText('Springfield, IL');
  await page.locator('#col-housing-mode').selectOption('manual');
  await page.locator('#col-manual-housing').fill('1800');
  await expect(page.locator('.result-details')).toContainText('Manual monthly housing');
  await expect(page.locator('.result-audit')).not.toContainText('hud-fmr-fy');
  await page.addScriptTag({ content: axeSource });
  const colViolations = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (options: unknown) => Promise<{ violations: Array<{ id: string; impact: string | null; nodes: unknown[] }> }> } }).axe;
    const result = await axe.run({ runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
    return result.violations.map((violation) => ({ id: violation.id, impact: violation.impact, nodes: violation.nodes.length }));
  });
  expect(colViolations, JSON.stringify(colViolations)).toEqual([]);
});

test('critical routes, metadata, sitemap gates, and security headers stay coherent', async ({ request }) => {
  test.setTimeout(90_000);
  const paths = [
    '/', '/money/hourly-to-salary', '/money/salary-after-tax', '/money/paycheck', '/money/mortgage-payment', '/money/loan', '/money/compound-interest', '/money/debt-payoff', '/money/home-affordability', '/money/cost-of-living', '/money/inflation', '/home/electricity-cost', '/home/appliance-electricity-cost', '/home/concrete-calculator',
    '/auto/ev-vs-gas', '/auto/road-trip-fuel', '/auto/car-affordability', '/everyday/business-days', '/shopping/unit-price', '/shopping/where-cheaper', '/food/recipe-scaler',
    '/topics/money', '/topics/home', '/topics/auto', '/topics/everyday', '/topics/food', '/topics/shopping',
    '/search?q=concrete', '/methodology', '/methodology/data', '/about', '/privacy', '/sitemap.xml',
    '/sitemaps/pages/1.xml', '/sitemaps/topics/1.xml', '/sitemaps/tools/1.xml', '/robots.txt',
    '/manifest.webmanifest', '/favicon.svg',
  ];
  for (const path of paths) expect((await request.get(path)).status(), path).toBe(200);

  for (const path of ['/', '/about', '/money/hourly-to-salary', '/sitemap.xml', '/manifest.webmanifest', '/definitely-missing']) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(path === '/definitely-missing' ? 404 : 200);
    const headers = response.headers();
    expect(headers['content-security-policy'], path).toContain("frame-ancestors 'none'");
    expect(headers['strict-transport-security'], path).toBe('max-age=31536000; includeSubDomains');
    expect(headers['x-content-type-options'], path).toBe('nosniff');
    expect(headers['x-frame-options'], path).toBe('DENY');
    expect(headers['cross-origin-opener-policy'], path).toBe('same-origin');
  }

  for (const path of toolPaths) {
    const html = await (await request.get(path)).text();
    expect(html, path).not.toMatch(/<meta[^>]+name="robots"[^>]+content="noindex/i);
    expect(html, path).toContain('data-ad-placement="desktop-rail"');
    expect(html, path).toContain('data-ad-status="empty"');
  }
  const search = await (await request.get('/search?q=concrete')).text();
  expect(search).toMatch(/<meta[^>]+name="robots"[^>]+content="noindex, follow"/i);
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).not.toContain('Disallow: /search');
  const topicSitemap = await (await request.get('/sitemaps/topics/1.xml')).text();
  expect(topicSitemap).toContain('/topics/home');
  expect(topicSitemap).toContain('/topics/shopping');
  expect(topicSitemap).toContain('/topics/money');
  expect(topicSitemap).toContain('/topics/auto');
  expect(topicSitemap).not.toContain('/topics/food');
  const toolSitemap = await (await request.get('/sitemaps/tools/1.xml')).text();
  for (const path of toolPaths) expect(toolSitemap).toContain(path);
  expect(toolSitemap).not.toContain('/search');
  expect(toolSitemap).toContain('<lastmod>2026-09-02T00:00:00.000Z</lastmod>');

  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest.icons).toContainEqual({ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' });
  const rootHtml = await (await request.get('/')).text();
  expect(rootHtml).toContain('href="/favicon.svg"');
});

test('the remaining calculator classes recalculate and explain their results', async ({ page }) => {
  await page.goto('/home/concrete-calculator');
  await expect(page.locator('.calculator-panel')).toHaveAttribute('data-hydrated', 'true');
  await page.locator('#concrete-length').fill('12');
  await expect(page.locator('.primary-result strong')).toContainText('80 lb bags');
  await expect(page.locator('.result-audit')).toContainText('material-volume-v1.1.0');
  await expect(page.locator('.result-audit')).toContainText('quikrete-packaged-concrete-yields-2026-09');

  await page.goto('/auto/ev-vs-gas');
  await expect(page.locator('.calculator-panel')).toHaveAttribute('data-hydrated', 'true');
  const gasBadge = page.locator('.gas-label');
  const evBadge = page.locator('.ev-label');
  await expect(gasBadge).toHaveText('Gas vehicle');
  await expect(evBadge).toHaveText('Electric vehicle');
  const gasBox = await gasBadge.boundingBox();
  const evBox = await evBadge.boundingBox();
  expect(gasBox, 'gas badge should render').toBeTruthy();
  expect(evBox, 'ev badge should render').toBeTruthy();
  expect(gasBox!.width).toBeGreaterThan(gasBox!.height * 1.8);
  expect(Math.abs(gasBox!.height - evBox!.height)).toBeLessThan(2);
  await expect(page.locator('#gas-mpg')).toHaveValue('28');
  await page.getByRole('button', { name: 'Increase gas mpg' }).click();
  await expect(page.locator('#gas-mpg')).toHaveValue('28.1');
  await page.getByRole('button', { name: 'Decrease gas mpg' }).click();
  await expect(page.locator('#gas-mpg')).toHaveValue('28');
  await page.locator('#gas-price').fill('3.50');
  await expect(page.locator('.calc-prompt')).toHaveCount(0);
  await expect(page.locator('.primary-result')).toContainText('Estimated annual EV energy savings');
  await expect(page.locator('.result-audit')).toContainText('vehicle-energy-v1.1.0');

  await page.goto('/everyday/business-days');
  const between = page.getByRole('button', { name: 'Between two dates' });
  const add = page.getByRole('button', { name: 'Add or subtract days' });
  await expect(between).toHaveAttribute('aria-pressed', 'true');
  await expect(add).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.result-audit')).toContainText('opm-federal-holiday-rules-2026-09');
  await add.click();
  await expect(add).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#business-start').fill('2026-07-02');
  await page.locator('#business-add').fill('1');
  await expect(page.locator('.primary-result strong')).toHaveText('July 6, 2026');

  await page.goto('/shopping/unit-price');
  await page.getByRole('spinbutton', { name: 'Option A package price' }).fill('10');
  await page.getByRole('spinbutton', { name: 'Option A quantity' }).fill('1');
  await page.getByRole('combobox', { name: 'Option A unit' }).selectOption('kg');
  await page.getByRole('spinbutton', { name: 'Option B package price' }).fill('10');
  await page.getByRole('spinbutton', { name: 'Option B quantity' }).fill('1000');
  await page.getByRole('combobox', { name: 'Option B unit' }).selectOption('g');
  await expect(page.locator('.primary-result')).toContainText('Same lowest unit price');

  await page.goto('/shopping/where-cheaper');
  await expect(page.locator('.calculator-panel')).toHaveAttribute('data-hydrated', 'true');
  await expect(page.locator('#grocery-products')).toContainText('Bacon, sliced');
  await expect(page.locator('#grocery-products')).toContainText('Texas vs California');
  await expect(page.locator('.staple-national')).toContainText('U.S. city averages with no state split');
  await expect(page.locator('.primary-result')).toContainText('Texas is cheaper than California');
  await expect(page.locator('.result-audit')).toContainText('where-cheaper-v1.0.0');
  await expect(page.locator('.result-audit')).toContainText('bls-apu-grocery');
  await page.getByRole('button', { name: 'Electricity' }).click();
  await expect(page.locator('#grocery-products')).toHaveCount(0);
  await expect(page.locator('.result-audit')).toContainText('eia-electricity-residential');
  await page.getByRole('button', { name: 'Gasoline' }).click();
  await expect(page.locator('#grocery-products')).toHaveCount(0);
  await expect(page.locator('.result-audit')).toContainText('eia-gasoline-regular-weekly');
  await page.getByRole('button', { name: 'Groceries' }).click();
  await expect(page.locator('#grocery-products')).toContainText('Bacon, sliced');
  await expect(page.locator('#grocery-products')).toContainText('Coffee, 100%, ground roast');
  await expect(page.locator('#grocery-products')).toContainText('Some example products');

  await page.goto('/food/recipe-scaler');
  await page.locator('#desired-servings').fill('8');
  await expect(page.locator('.primary-result strong')).toHaveText('2×');
  const ingredientCount = await page.locator('.ingredient-row').count();
  await page.getByRole('button', { name: 'Add an ingredient' }).click();
  await expect(page.locator('.ingredient-row')).toHaveCount(ingredientCount + 1);

  await page.goto('/money/mortgage-payment');
  await expect(page.locator('.calculator-panel')).toHaveAttribute('data-hydrated', 'true');
  await expect(page.locator('.result-audit')).toContainText('freddie-mac-pmms');
  await page.getByRole('button', { name: '15-year fixed' }).click();
  await expect(page.locator('#mortgage-rate')).toHaveValue('5.98');
  await page.getByRole('button', { name: '30-year fixed' }).click();
  await page.locator('#mortgage-price').fill('200000');
  await page.locator('#mortgage-down').fill('0');
  await page.getByRole('checkbox', { name: /PMI estimate/ }).uncheck();
  await page.locator('#mortgage-rate').fill('6');
  await expect(page.locator('.primary-result strong')).toHaveText('$1,199.10');
  await expect(page.locator('.result-audit')).toContainText('mortgage-amortization-v1.0.0');
  await expect(page.locator('.result-audit')).toContainText('Data Manual inputs / fixed rules');
  await page.locator('#mortgage-rate').fill('');
  await expect(page.locator('.calc-error')).toContainText('Interest rate must be a number.');

  await page.goto('/money/inflation');
  await expect(page.locator('.calculator-panel')).toHaveAttribute('data-hydrated', 'true');
  await expect(page.locator('#inflation-amount')).toHaveValue('100');
  await expect(page.locator('.primary-result strong')).toContainText('$197.82');
  await expect(page.locator('.result-audit')).toContainText('cpi-u-inflation-v1.0.0');
  await expect(page.locator('.result-audit')).toContainText('bls-cpi-u-nsa');
  await page.locator('#inflation-start-month').selectOption('10');
  await page.locator('#inflation-start-year').selectOption('2025');
  await expect(page.locator('#inflation-start-month')).toHaveValue('12');
  await expect(page.locator('#inflation-start-month')).not.toContainText('October');
  await page.locator('#inflation-end-year').selectOption('2025');
  await expect(page.locator('#inflation-end-month option[value="10"]')).toHaveCount(0);

  await page.goto('/auto/road-trip-fuel');
  await expect(page.locator('.calculator-panel')).toHaveAttribute('data-hydrated', 'true');
  await expect(page.locator('.data-callout')).toContainText('$3.577');
  await page.locator('#trip-state').selectOption('AL');
  await expect(page.locator('.data-callout')).toContainText('regional average');
  await page.locator('#trip-miles').fill('300');
  await page.locator('#trip-mpg').fill('25');
  await page.locator('#trip-gas-price').fill('3.50');
  await expect(page.locator('.primary-result strong')).toHaveText('$42.00');
  await expect(page.locator('.result-audit')).toContainText('road-trip-fuel-v1.0.0');
  await expect(page.locator('.result-audit')).toContainText('Data Manual inputs / fixed rules');

  await page.goto('/money/home-affordability');
  await expect(page.locator('.calculator-panel')).toHaveAttribute('data-hydrated', 'true');
  await expect(page.locator('.result-audit')).toContainText('freddie-mac-pmms');
  await expect(page.locator('.primary-result strong')).toHaveText(/Comfortable|Stretch|Risky/);
  await expect(page.locator('.result-audit')).toContainText('home-affordability-v1.0.0');
  await page.getByRole('button', { name: 'How much house?' }).click();
  await expect(page.locator('.primary-result strong')).toContainText('$');
  await expect(page.locator('.result-stat-grid')).toContainText('Aggressive');
  await page.getByRole('button', { name: 'Can I buy this house?' }).click();
  await page.locator('.decision-stress summary').click();
  await expect(page.locator('.decision-stress')).toContainText('Rate +1 point');
});

test('loan, compound interest, and debt payoff calculators use the shared shell', async ({ page }) => {
  await page.goto('/money/loan');
  await expect(page.getByRole('heading', { name: 'Loan Calculator' })).toBeVisible();
  await expect(page.locator('.calculator-panel')).toHaveAttribute('data-hydrated', 'true');
  await expect(page.locator('.primary-result strong')).toHaveText('$405.53');
  await expect(page.locator('.result-audit')).toContainText('Method loan-v1.0.0');
  await expect(page.locator('.result-audit')).toContainText('Data Manual inputs / fixed rules');
  await page.locator('#loan-amount').fill('200000');
  await page.locator('#loan-rate').fill('6');
  await page.locator('#loan-term').fill('30');
  await expect(page.locator('.primary-result strong')).toHaveText('$1,199.10');

  await page.goto('/money/compound-interest');
  await expect(page.locator('.calculator-panel')).toHaveAttribute('data-hydrated', 'true');
  await expect(page.locator('.primary-result strong')).toHaveText('$16,288.95');
  await expect(page.locator('.result-audit')).toContainText('Method compound-interest-v1.0.0');
  await page.locator('.result-details summary').filter({ hasText: 'What we assumed' }).click();
  await expect(page.locator('.result-details')).toContainText('end of each contribution period');
  await page.locator('#compound-contribution').fill('100');
  await expect(page.locator('.primary-result strong')).not.toHaveText('$16,288.95');
  await expect(page.locator('.result-stat-grid')).toContainText('Total contributions');

  await page.goto('/money/debt-payoff');
  await expect(page.locator('.calculator-panel')).toHaveAttribute('data-hydrated', 'true');
  await expect(page.locator('.primary-result')).toContainText('Avalanche saves');
  await expect(page.locator('.result-audit')).toContainText('Method debt-payoff-v1.0.0');
  await expect(page.locator('.result-audit')).toContainText('Data Manual inputs / fixed rules');
  const debtCount = await page.locator('.debt-editor .ingredient-row').count();
  await page.getByRole('button', { name: 'Add a debt' }).click();
  await expect(page.locator('.debt-editor .ingredient-row')).toHaveCount(debtCount + 1);
});

test('intent search rejects unsupported pages and tracks only supported tools', async ({ page }) => {
  await page.goto('/search?q=how%20much%20paint%20do%20I%20need');
  await expect(page.getByRole('heading', { name: 'No calculator matches that yet.' })).toBeVisible();
  await expect(page.locator('.search-results > a')).toHaveCount(0);
  await expect(page.locator('.search-experience')).toHaveAttribute('data-hydrated', 'true');
  await page.locator('#site-search').fill('how much concrete do I need');
  await expect(page.locator('.search-results > a')).toHaveCount(1);
  await expect(page.locator('.search-results > a')).toHaveAttribute('href', '/home/concrete-calculator');

  await page.goto('/');
  await expect(page.locator('.search-hint')).not.toContainText('paint');
  await expect(page.locator('.search-hint')).toContainText('afford this house');
});

test('mobile navigation, skip link, and recipe editor work without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.top-nav')).toBeHidden();
  await expect(page.locator('.header-search')).toBeHidden();
  const menu = page.locator('.mobile-menu');
  await expect(menu.locator('summary')).toBeVisible();
  await menu.locator('summary').click();
  await expect(menu.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link')).toHaveCount(7);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();

  await page.goto('/food/recipe-scaler');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  const editor = page.locator('.ingredient-editor');
  expect(await editor.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
  await expect(editor.locator('.ingredient-mobile-label').first()).toBeVisible();

  await page.goto('/money/debt-payoff');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  const debtEditor = page.locator('.debt-editor');
  expect(await debtEditor.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
  await expect(debtEditor.locator('.ingredient-mobile-label').first()).toBeVisible();
});

test('representative pages have no automated WCAG A/AA violations', async ({ page }) => {
  for (const path of ['/', '/search', '/shopping/unit-price', '/food/recipe-scaler', '/everyday/business-days', '/topics/home', '/about', '/money/mortgage-payment', '/money/home-affordability', '/money/cost-of-living', '/money/inflation', '/money/loan', '/auto/road-trip-fuel', '/auto/car-affordability', '/home/appliance-electricity-cost']) {
    await page.goto(path);
    await page.addScriptTag({ content: axeSource });
    const violations = await page.evaluate(async () => {
      const axe = (window as unknown as { axe: { run: (options: unknown) => Promise<{ violations: Array<{ id: string; impact: string | null; nodes: unknown[] }> }> } }).axe;
      const result = await axe.run({ runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
      return result.violations.map((violation) => ({ id: violation.id, impact: violation.impact, nodes: violation.nodes.length }));
    });
    expect(violations, `${path}: ${JSON.stringify(violations)}`).toEqual([]);
  }
});
