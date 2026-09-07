import { expect, test } from '@playwright/test';
import { JOB_IDS } from '@/lib/job/catalog';

const COMPLETE_QUERIES: Record<string, string> = {
  'hvac-replacement': 'units=1&tons=3&efficiency=standard&access=normal&ducts=reuse',
  'water-heater-replacement': 'units=1&fuel=gas&location=garage&code=like-for-like',
  'electrical-panel-upgrade': 'units=1&service=to-200&location=easy',
  'tree-removal': 'units=1&height=medium&proximity=clear&access=normal&stump=leave',
  'deck-build': 'units=200&height=low&railing=wood&access=normal',
  'fence-install': 'units=150&height=six&slope=flat&gates=one',
  'concrete-driveway': 'units=400&thickness=four&finish=broom&access=normal',
  'interior-painting': 'rooms=4&roomFloorSqFt=144&prep=standard&coats=two&height=eight&occupied=empty',
  'bathroom-remodel': 'units=1&size=standard&finish=builder&layout=same',
  'heat-pump-replacement': 'units=1&tons=3&efficiency=standard&access=normal&ducts=reuse',
  'window-replacement': 'windows=8&typicalWindowSqFt=15&stories=one&removal=standard&access=normal',
  'exterior-door-replacement': 'units=1&material=fiberglass&access=normal&hardware=reuse',
  'siding-replacement': 'units=1200&material=vinyl&stories=one&access=normal',
  'drywall-install': 'units=400&location=walls&occupied=empty&access=normal',
};

test('job cost hub, estimate, and tree-removal complete range', async ({ page }) => {
  await page.goto('/cost');
  await expect(page.getByRole('heading', { level: 1, name: 'What should this job cost?' })).toBeVisible();
  const picker = page.locator('.job-picker-wrap[data-hydrated="true"]');
  await expect(picker).toBeVisible({ timeout: 15_000 });
  await expect(picker.locator('.job-picker-card')).toHaveCount(14);
  await expect(picker.locator('.job-picker-card', { hasText: 'Tree removal' })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Find a job' }).fill('tree');
  await expect(picker.locator('.job-picker-card', { hasText: 'Tree removal' })).toBeVisible();
  await expect(picker.locator('.job-picker-card', { hasText: 'Roof replacement' })).toHaveCount(0);

  await page.getByRole('searchbox', { name: 'Find a job' }).fill('roof');
  await expect(page.locator('.job-picker-empty')).toBeVisible();

  await page.getByRole('searchbox', { name: 'Find a job' }).fill('');
  await picker.locator('.job-picker-card', { hasText: 'Tree removal' }).click();
  await expect(page).toHaveURL(/\/cost\/tree-removal$/);
  await expect(page.locator('.calculator-panel[data-hydrated="true"]')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByLabel('ZIP code')).toHaveValue('75201');
  await expect(page.locator('.primary-result')).toContainText('$', { timeout: 15_000 });
  await expect(page.locator('.primary-result')).not.toContainText('Incomplete');
  const estimate = await page.request.get('/api/cost/estimate?job=tree-removal&zip=75201&units=1&height=medium&proximity=clear&access=normal&stump=leave');
  expect(estimate.ok()).toBeTruthy();
  const payload = await estimate.json() as { value: { status: string }; breakdown: Array<{ detail?: string }> };
  expect(payload.value.status).toBe('complete');
  // Engine stores 1.4415; the breakdown string uses toFixed(3) → 1.442.
  expect(payload.breakdown.some((step) => /1\.442 ECEC loading/.test(step.detail ?? ''))).toBe(true);
  expect(payload.breakdown.some((step) => /FEMA 8201 at \$29\.70/.test(step.detail ?? ''))).toBe(true);
  expect(payload.breakdown.some((step) => /FEMA 8801 at \$17\.51/.test(step.detail ?? ''))).toBe(true);
});

test('sourced-material jobs return a complete CostAnswer range', async ({ request }) => {
  expect(Object.keys(COMPLETE_QUERIES).sort()).toEqual([...JOB_IDS].sort());
  for (const [jobId, query] of Object.entries(COMPLETE_QUERIES)) {
    const response = await request.get(`/api/cost/estimate?job=${jobId}&zip=75201&${query}`);
    expect(response.ok(), jobId).toBeTruthy();
    const payload = await response.json() as { value: { status: string; unpricedCritical: string[] } };
    expect(payload.value.status, jobId).toBe('complete');
    expect(payload.value.unpricedCritical, jobId).toEqual([]);
  }

  const staleFence = await request.get('/api/cost/estimate?job=fence-install&zip=75201&units=150&height=six&slope=flat&gates=one&material=chain');
  expect(staleFence.ok()).toBeTruthy();
  const stalePayload = await staleFence.json() as { value: { status: string } };
  expect(stalePayload.value.status).toBe('complete');

  const unknown = await request.get('/api/cost/estimate?job=roof-replacement&zip=75201&units=20');
  expect(unknown.status()).toBe(400);

  const windowSmall = await request.get('/api/cost/estimate?job=window-replacement&zip=75201&windows=1&typicalWindowSqFt=6&stories=one&removal=standard&access=normal');
  const windowLarge = await request.get('/api/cost/estimate?job=window-replacement&zip=75201&windows=40&typicalWindowSqFt=40&stories=one&removal=standard&access=normal');
  expect(windowSmall.ok()).toBeTruthy();
  expect(windowLarge.ok()).toBeTruthy();
  expect((await windowSmall.json() as { value: { status: string } }).value.status).toBe('complete');
  expect((await windowLarge.json() as { value: { status: string } }).value.status).toBe('complete');
});

test('job pages remount the estimator and keep window extrema on screen', async ({ page }) => {
  await page.goto('/cost/window-replacement');
  await expect(page.locator('.calculator-panel[data-hydrated="true"]')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.primary-result')).toContainText('$', { timeout: 15_000 });
  await page.getByRole('spinbutton', { name: 'Windows' }).fill('1');
  await page.getByRole('spinbutton', { name: 'Typical window size' }).fill('6');
  await expect(page.locator('.primary-result')).toContainText('$', { timeout: 15_000 });
  await expect(page.locator('.primary-result')).not.toContainText('Incomplete');

  await page.locator('.job-picker-card', { hasText: 'Heat pump' }).click();
  await expect(page).toHaveURL(/\/cost\/heat-pump-replacement$/);
  await expect(page.getByLabel('System size')).toBeVisible();
  await expect(page.locator('.primary-result')).toContainText('$', { timeout: 15_000 });
  await expect(page.locator('.primary-result')).not.toContainText('Incomplete');
});

test('removed roof page is gone and fence has no chain-link option', async ({ page }) => {
  const missing = await page.goto('/cost/roof-replacement');
  expect(missing?.status()).toBe(404);

  await page.goto('/search?q=roof');
  await expect(page.locator('a[href="/cost/roof-replacement"]')).toHaveCount(0);

  await page.goto('/cost/fence-install');
  await expect(page.locator('.calculator-panel[data-hydrated="true"]')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByLabel('Height')).toBeVisible();
  await expect(page.locator('option', { hasText: 'Chain link' })).toHaveCount(0);
  await expect(page.locator('.primary-result')).toContainText('$', { timeout: 15_000 });
  await expect(page.locator('.primary-result')).not.toContainText('Incomplete');
});

test('quote checker uses the six-verdict vocabulary', async ({ page }) => {
  await page.goto('/cost/check-quote');
  await expect(page.getByRole('heading', { level: 1, name: 'Is this quote in our estimated range?' })).toBeVisible();
  await expect(page.locator('.job-picker-wrap[data-hydrated="true"]')).toBeVisible({ timeout: 15_000 });
  await page.locator('.job-picker-card', { hasText: 'Tree removal' }).click();
  await expect(page.getByLabel('Trees')).toBeVisible();
  await expect(page.locator('.calculator-panel[data-hydrated="true"]')).toBeVisible();
  await page.getByLabel('Contractor quote').fill('50000');
  await expect(page.locator('.quote-verdict')).toContainText(/our estimated range|outside what we can assess/i, { timeout: 15_000 });
  await expect(page.locator('.quote-verdict')).not.toContainText(/overcharge|rip off|ripoff|scam/i);
});
