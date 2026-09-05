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
  '/money/car-loan',
  '/money/investment',
  '/money/retirement',
  '/money/amortization',
  '/money/cd',
  '/money/interest',
  '/money/roth-ira',
  '/money/401k',
  '/money/mortgage-payoff',
  '/money/credit-card-payoff',
  '/home/electricity-cost',
  '/home/appliance-electricity-cost',
  '/home/concrete-calculator',
  '/home/square-footage',
  '/car/ev-vs-gas',
  '/car/road-trip-fuel',
  '/car/car-affordability',
    '/everyday/business-days',
    '/everyday/per-diem',
    '/everyday/tip',
  '/everyday/age',
  '/everyday/time',
  '/everyday/random-number',
  '/everyday/time-card',
  '/everyday/date',
  '/everyday/days-from-today',
  '/health/bmi',
  '/health/calorie',
  '/health/tdee',
  '/health/bmr',
  '/health/body-fat',
  '/math/percentage',
  '/math/percent-change',
  '/math/scientific',
  '/math/fraction',
  '/math/unit-conversion',
  '/education/grade',
  '/education/gpa',
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
  // June 2026 is the newest Electric Power Monthly release, so the callout says
  // which period it covers and adds no staleness warning.
  await expect(page.locator('.data-callout')).not.toContainText('Latest available official data');
  await expect(page.locator('.result-audit')).toContainText('Method appliance-energy-v1.0.0');
  await expect(page.locator('.result-audit')).toContainText('eia-electricity-residential');
  await page.locator('#appliance-custom-rate').fill('10');
  // The air-conditioner preset counts 60% of its on-hours, because a compressor
  // cycles rather than drawing nameplate watts continuously: 1500 W x 8 h x 7 d
  // x 0.6 at 10c/kWh.
  await expect(page.locator('#appliance-duty')).toHaveValue('60');
  await expect(page.locator('.primary-result strong')).toHaveText('$21.84');
  await page.locator('#appliance-duty').fill('100');
  await expect(page.locator('.primary-result strong')).toHaveText('$36.40');
  await expect(page.locator('.result-stat-grid')).toContainText('Manual electricity rate');
  await expect(page.locator('.data-footnote')).toContainText('The EIA state average is not used');
  await expect(page.locator('.result-audit')).toContainText('Data Manual inputs / fixed rules');
  await expect(page.locator('.result-audit')).not.toContainText('eia-electricity-residential');
});

test('car affordability prices the whole vehicle and tracks which data it used', async ({ page }) => {
  await page.goto('/car/car-affordability');
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

  await expect(page.locator('.decision-note')).toContainText('Cut the price by about $11,000');
  await expect(page.locator('.decision-note')).toContainText('planning defaults for insurance and upkeep');

  await page.getByRole('button', { name: 'Electric' }).click();
  await expect(page.locator('.data-callout')).toContainText('EIA · June 2026');
  await expect(page.locator('.data-callout')).not.toContainText('Latest available official data');
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
  await expect(page.locator('.primary-result strong')).toHaveText('n/a');
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
  test.setTimeout(120_000);
  const paths = [
    '/', '/money/hourly-to-salary', '/money/salary-after-tax', '/money/paycheck', '/money/mortgage-payment', '/money/loan', '/money/compound-interest', '/money/debt-payoff', '/money/home-affordability', '/money/cost-of-living', '/money/inflation', '/money/car-loan', '/home/electricity-cost', '/home/appliance-electricity-cost', '/home/concrete-calculator', '/home/square-footage',
    '/car/ev-vs-gas', '/car/road-trip-fuel', '/car/car-affordability', '/everyday/business-days', '/everyday/time-card', '/shopping/unit-price', '/shopping/where-cheaper', '/food/recipe-scaler',
    '/health/bmi', '/math/scientific', '/education/gpa',
    '/topics/money', '/topics/home', '/topics/car', '/topics/everyday', '/topics/food', '/topics/shopping', '/topics/health', '/topics/math', '/topics/education',
    '/search?q=concrete', '/methodology', '/methodology/data', '/about', '/privacy', '/terms', '/contact', '/faq', '/sitemap.xml',
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
    expect(html, path).toContain('data-ad-placement="header-leaderboard"');
    expect(html, path).toContain('data-ad-placement="in-content"');
    expect(html, path).toContain('data-ad-status="empty"');
    expect(html, path).toContain('editorial-section');
    expect(html, path).toContain('Terms used here');
  }
  const search = await (await request.get('/search?q=concrete')).text();
  expect(search).toMatch(/<meta[^>]+name="robots"[^>]+content="noindex, follow"/i);
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).not.toContain('Disallow: /search');
  const topicSitemap = await (await request.get('/sitemaps/topics/1.xml')).text();
  expect(topicSitemap).toContain('/topics/home');
  expect(topicSitemap).toContain('/topics/shopping');
  expect(topicSitemap).toContain('/topics/money');
  expect(topicSitemap).toContain('/topics/car');
  expect(topicSitemap).toContain('/topics/everyday');
  expect(topicSitemap).toContain('/topics/health');
  expect(topicSitemap).toContain('/topics/math');
  expect(topicSitemap).toContain('/topics/education');
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

  await page.goto('/car/ev-vs-gas');
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
  await expect(page.locator('.editorial-section')).toContainText('How this U.S. mortgage payment is calculated');
  await expect(page.locator('[data-affiliate-slot]')).toHaveCount(0);
  await expect(page.getByText('Some links on this page may be advertisements')).toHaveCount(0);
  await expect(page.locator('[data-ad-placement="header-leaderboard"]')).toHaveAttribute('data-ad-status', 'empty');
  await expect(page.locator('[data-ad-placement="header-leaderboard"]')).not.toContainText('728');
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

  await page.goto('/car/road-trip-fuel');
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

test('desktop IAB slots stay reserved and empty ads do not crowd a phone calculator', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/money/mortgage-payment');
  await expect(page.locator('.calculator-panel')).toHaveAttribute('data-hydrated', 'true');
  await expect(page.locator('[data-ad-placement="header-leaderboard"]')).toBeVisible();
  await expect(page.locator('[data-ad-placement="desktop-rail"]')).toBeVisible();
  await expect(page.locator('[data-ad-placement="in-content"]')).toBeVisible();
  await expect(page.locator('.editorial-section')).toContainText('How this U.S. mortgage payment is calculated');
  await expect(page.locator('[data-affiliate-slot]')).toHaveCount(0);
  await expect(page.locator('.primary-result')).toBeVisible();
  const calcTop = await page.locator('.calculator-panel').evaluate((node) => node.getBoundingClientRect().top);
  expect(calcTop).toBeLessThan(900);

  await page.goto('/about');
  await expect(page.getByRole('heading', { name: 'Who maintains this' })).toBeVisible();
  await expect(page.locator('#who-maintains')).toBeVisible();
  await expect(page.getByText('the same people')).toHaveCount(0);
  await page.goto('/contact');
  await expect(page.getByRole('heading', { name: 'Write' })).toBeVisible();
  await page.goto('/faq');
  await expect(page.getByRole('heading', { name: /Are you financial advisors/ })).toBeVisible();
  await page.goto('/health/bmi');
  await expect(page.locator('.editorial-faq details')).toHaveCount(3);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/money/mortgage-payment');
  await expect(page.locator('.calculator-panel')).toBeVisible();
  await expect(page.locator('#mortgage-price')).toBeVisible();
  await expect(page.locator('[data-ad-placement="header-leaderboard"]')).toBeHidden();
  await expect(page.locator('[data-ad-placement="desktop-rail"]')).toBeHidden();
  await expect(page.locator('[data-ad-placement="in-content"]')).toBeHidden();
  await expect(page.locator('[data-affiliate-slot]')).toHaveCount(0);
  await expect(page.locator('.editorial-section')).toContainText('Practical tips');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});

test('header navigation at 390px with the mobile menu open stays inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.top-nav')).toBeHidden();
  await expect(page.locator('.header-search')).toBeHidden();
  const menu = page.locator('.mobile-menu');
  await expect(menu.locator('summary')).toBeVisible();
  await menu.locator('summary').click();
  await expect(menu).toHaveJSProperty('open', true);
  await expect(menu.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link')).toHaveCount(10);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});

test('homepage at 390px with the menu closed stays inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.mobile-menu nav')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});

test('mobile skip link and recipe editor work without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();

  await page.goto('/food/recipe-scaler');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  const editor = page.locator('.ingredient-editor');
  expect(await editor.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  await expect(editor.locator('.ingredient-mobile-label').first()).toBeVisible();

  await page.goto('/money/debt-payoff');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  const debtEditor = page.locator('.debt-editor');
  expect(await debtEditor.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  await expect(debtEditor.locator('.ingredient-mobile-label').first()).toBeVisible();
});

test('small phones keep home, search, and calculators inside the viewport', async ({ page }) => {
  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({ width, height: 720 });
    for (const path of ['/', '/search', '/money/cost-of-living', '/topics/money', '/car/ev-vs-gas', '/health/bmi', '/math/scientific', '/everyday/time-card']) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} at ${width}px overflowed by ${overflow}px`).toBeLessThanOrEqual(1);
    }
  }
});

test('representative pages have no automated WCAG A/AA violations', async ({ page }) => {
  test.setTimeout(240_000);
  for (const path of ['/', '/search', '/shopping/unit-price', '/food/recipe-scaler', '/everyday/business-days', '/topics/home', '/about', '/money/mortgage-payment', '/money/home-affordability', '/money/cost-of-living', '/money/inflation', '/money/loan', '/car/road-trip-fuel', '/car/car-affordability', '/home/appliance-electricity-cost', '/health/bmi', '/math/scientific', '/math/unit-conversion', '/everyday/time-card', '/everyday/date', '/education/gpa', '/methodology', '/methodology/data', '/privacy', '/terms', '/contact', '/faq', '/education/grade', '/money/car-loan', '/money/investment', '/money/retirement', '/money/401k', '/money/mortgage-payoff', '/money/credit-card-payoff', '/money/amortization', '/home/square-footage']) {
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

test('homepage color-contrast is measured on the same axe config as the catalog', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.addScriptTag({ content: axeSource });
  const report = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (options: unknown) => Promise<{
      violations: Array<{
        id: string;
        impact: string | null;
        nodes: Array<{ target: string[]; html: string }>;
      }>;
    }> } }).axe;
    const result = await axe.run({ runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
    return result.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.map((node) => ({ target: node.target, html: node.html.slice(0, 180) })),
    }));
  });
  const contrast = report.find((violation) => violation.id === 'color-contrast');
  expect(contrast, JSON.stringify(report)).toBeUndefined();
  expect(report, JSON.stringify(report)).toEqual([]);
});

test('phase 7.5 calculators calculate across each family', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/health/bmi');
  await expect(page.getByRole('heading', { name: 'BMI Calculator' })).toBeVisible();
  await expect(page.locator('.calculator-panel')).toHaveAttribute('data-hydrated', 'true');
  await expect(page.locator('.primary-result p')).toHaveText('Estimated BMI');
  await expect(page.locator('.primary-result strong')).toHaveText('22.86');
  await expect(page.locator('.primary-result strong')).not.toHaveText(/healthy/i);

  await page.goto('/health/calorie');
  await expect(page.locator('.primary-result strong')).toHaveText('2,136 kcal/day');

  await page.goto('/math/scientific');
  await expect(page.locator('.primary-result strong')).toHaveText('14');
  await page.locator('#sci-expression').fill('(2 + 3) × 4');
  await expect(page.locator('.primary-result strong')).toHaveText('20');
  await page.getByRole('button', { name: 'Degrees' }).click();
  await page.locator('#sci-expression').fill('sin(90)');
  await expect(page.locator('.primary-result strong')).toHaveText(/^1(\.0+)?$/);

  await page.goto('/math/unit-conversion');
  await page.locator('#conv-from').selectOption('in');
  await page.locator('#conv-to').selectOption('cm');
  await page.locator('#conv-value').fill('1');
  await expect(page.locator('.primary-result strong')).toContainText('2.54');

  await page.goto('/everyday/time-card');
  await expect(page.locator('.primary-result strong')).toHaveText('8.00 h');
  await page.getByRole('button', { name: 'Add a shift' }).click();
  await expect(page.locator('.time-card-editor .ingredient-row')).toHaveCount(2);

  await page.goto('/everyday/date');
  await expect(page.locator('.primary-result strong')).toHaveText('2026-02-28');

  await page.goto('/everyday/days-from-today');
  await expect(page.locator('.primary-result p')).toHaveText('Resulting calendar date');
  await expect(page.locator('.primary-result strong')).toHaveText(/^\d{4}-\d{2}-\d{2}$/);

  await page.goto('/education/gpa');
  await expect(page.locator('.primary-result strong')).toHaveText('3.50');

  await page.goto('/home/square-footage');
  await expect(page.locator('.primary-result strong')).toHaveText('120 ft²');

  await page.goto('/money/car-loan');
  await expect(page.locator('.primary-result p')).toHaveText('Estimated monthly loan payment');
  await expect(page.locator('.primary-result strong')).toHaveText('$463.99');

  await page.goto('/money/investment');
  await page.locator('#inv-contrib').fill('0');
  await page.locator('#inv-comp').selectOption('annually');
  await page.locator('#inv-freq').selectOption('annually');
  await expect(page.locator('.primary-result strong')).toHaveText('$19,671.51');
  await page.locator('.result-details summary').filter({ hasText: 'What we assumed' }).click();
  await expect(page.locator('.result-details')).toContainText('not a forecast');

  await page.goto('/money/retirement');
  await expect(page.locator('.primary-result p')).toHaveText('Projected balance');
  await expect(page.locator('.primary-result')).not.toContainText(/on track/i);

  await page.goto('/money/401k');
  await expect(page.locator('.primary-result p')).toHaveText('Projected balance');
  await page.locator('.result-details summary').filter({ hasText: 'What we assumed' }).click();
  await expect(page.locator('.result-details')).toContainText('IRS tax year 2026 limits are applied');

  await page.goto('/money/mortgage-payoff');
  await expect(page.locator('.primary-result p')).toHaveText('Pay off sooner by');
  await expect(page.locator('.primary-result strong')).toHaveText(/years/);

  await page.goto('/money/credit-card-payoff');
  await expect(page.locator('.primary-result p')).toHaveText('Months to payoff');
  await expect(page.locator('.primary-result strong')).toHaveText(/^\d+$/);

  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['/money/amortization', '/math/scientific', '/everyday/time-card', '/education/grade']) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${path} overflowed by ${overflow}px`).toBeLessThanOrEqual(1);
  }
});

test('per diem splits lodging and meals, maps a ZIP, and checks a room against the ceiling', async ({ page }) => {
  await page.goto('/everyday/per-diem');
  await expect(page.getByRole('heading', { name: 'GSA Per Diem Trip Calculator' })).toBeVisible();
  await expect(page.locator('.calculator-panel')).toHaveAttribute('data-hydrated', 'true');
  await expect(page.locator('.primary-result p')).toHaveText('Trip total');
  await expect(page.locator('.result-stat-grid')).toContainText('Lodging');
  await expect(page.locator('.result-stat-grid')).toContainText('Meals and incidentals');
  await expect(page.locator('.result-stat-grid')).toContainText('Trip total');

  await page.locator('#perdiem-room-rate').fill('200');
  await expect(page.getByText('WITHIN LIMIT', { exact: true })).toBeVisible();
  await page.locator('#perdiem-room-rate').fill('400');
  await expect(page.getByText(/OVER BY \$/)).toBeVisible();

  await page.locator('#perdiem-destination').fill('36542');
  await expect(page.locator('.location-selected')).toContainText('Gulf Shores');
  await page.locator('#perdiem-destination').fill('36104');
  await expect(page.getByText('STANDARD CONUS RATE', { exact: true })).toBeVisible();
  await expect(page.getByText('GSA does not list this locality separately', { exact: true })).toBeVisible();
  await expect(page.getByText(/ZIP 36104 is in Montgomery County/)).toBeVisible();

  await page.locator('#perdiem-destination').fill('02138');
  await expect(page.getByText('COUNTY IS SPLIT', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Use Boston \/ Cambridge/ })).toBeVisible();
});
