import { expect, test } from '@playwright/test';

test('salary hub search, sort, and occupation links work like a directory', async ({ page }) => {
  await page.goto('/salary');
  await expect(page.locator('.salary-hub[data-hydrated="true"]')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('heading', { name: 'What jobs pay in the U.S.' })).toBeVisible();
  await expect(page.getByText('U.S. median job')).toBeVisible();
  await expect(page.getByRole('searchbox', { name: 'Search occupations' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Registered Nurse/ }).first()).toContainText('$');
  await expect(page.getByRole('navigation', { name: 'Jump to a field' })).toBeVisible();

  const catalogCount = page.getByRole('status').filter({ hasText: /occupations$/ });
  await expect(catalogCount).toBeVisible();

  await page.getByRole('searchbox', { name: 'Search occupations' }).fill('RN');
  await expect(page.getByRole('status')).toContainText(/match/);
  await expect(page.getByRole('link', { name: /Registered Nurse/ }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Chief Executive/ })).toHaveCount(0);

  await page.getByRole('searchbox', { name: 'Search occupations' }).fill('');
  await expect(catalogCount).toBeVisible();
  await expect(page.getByRole('link', { name: /Chief Executive/ }).first()).toBeVisible();

  await page.getByRole('radio', { name: 'Highest pay' }).check();
  await expect(page.getByRole('heading', { name: 'What jobs pay most' })).toBeVisible();
  const topPay = page.locator('.salary-hub-jobs.is-ranked a').first();
  await expect(topPay).toContainText('$');

  await page.getByRole('radio', { name: 'By field' }).check();
  await expect(page.getByRole('heading', { name: 'Management Occupations' })).toBeVisible();

  await page.getByRole('link', { name: /Registered Nurse/ }).first().click();
  await expect(page).toHaveURL(/\/salary\/registered-nurse$/);
  await expect(page.getByRole('heading', { name: /Registered Nurse Salary/ })).toBeVisible();
});

test('salary hub stays usable on a phone and still shows pay', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/salary');
  await expect(page.locator('.salary-hub[data-hydrated="true"]')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('searchbox', { name: 'Search occupations' })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search occupations' }).fill('electrician');
  await expect(page.getByRole('status')).toContainText(/match/);
  const electrician = page.getByRole('link', { name: /Electrician/ }).first();
  await expect(electrician).toBeVisible();
  await expect(electrician).toContainText('$');
  await electrician.click();
  await expect(page).toHaveURL(/\/salary\/electrician$/);
});
