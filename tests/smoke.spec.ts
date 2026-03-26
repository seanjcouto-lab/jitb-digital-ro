import { test, expect } from '@playwright/test';

test('Smoke Test: Service Manager Login', async ({ page }) => {
  await page.goto('/');

  // Verify login screen loads
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();

  // Click the Danny (SM) dev shortcut button
  await page.getByRole('button', { name: 'Danny (SM)' }).click();

  // Verify Service Manager page renders
  await expect(page.getByText('Service Manager Command Console')).toBeVisible();
});

test('Smoke Test: Technician Login', async ({ page }) => {
  await page.goto('/');

  // Click the Pierre (Tech) dev shortcut button
  await page.getByRole('button', { name: 'Pierre (Tech)' }).click();

  // Verify Technician page renders
  await expect(page.getByRole('heading', { name: 'Active Bay Deck' })
    .or(page.getByText('No Active Job'))).toBeVisible();
});

test('Smoke Test: Parts Manager Login', async ({ page }) => {
  await page.goto('/');

  // No Parts Manager dev button — login as Admin (Danny) then impersonate via role switcher
  await page.getByRole('button', { name: 'Danny (Admin)' }).click();
  await expect(page.getByText('White-Label Configuration')).toBeVisible();

  // Click the Parts Manager button in the dev role switcher at the bottom
  await page.getByTitle('PARTS MANAGER').click();

  // Verify Parts Manager page renders
  await expect(page.getByText('Parts Command')).toBeVisible();
});

test('Smoke Test: Admin Login & Page Render', async ({ page }) => {
  await page.goto('/');

  // Click the Danny (Admin) dev shortcut button
  await page.getByRole('button', { name: 'Danny (Admin)' }).click();

  // Verify Admin page renders
  await expect(page.getByText('White-Label Configuration')).toBeVisible();
});

test('Smoke Test: Billing Page Render (via Impersonation)', async ({ page }) => {
  await page.goto('/');

  // Login as Admin (Danny) who has Developer privileges
  await page.getByRole('button', { name: 'Danny (Admin)' }).click();
  await expect(page.getByText('White-Label Configuration')).toBeVisible();

  // Click the Billing button in the dev role switcher at the bottom
  await page.getByTitle('BILLING').click();

  // Verify Billing page renders
  await expect(page.getByText('Billing & Collections')).toBeVisible();
});

test('Smoke Test: Inventory Page Render (via Impersonation)', async ({ page }) => {
  await page.goto('/');

  // Login as Admin (Danny)
  await page.getByRole('button', { name: 'Danny (Admin)' }).click();
  await expect(page.getByText('White-Label Configuration')).toBeVisible();

  // Click the Inventory Manager button in the dev role switcher at the bottom
  await page.getByTitle('INVENTORY MANAGER').click();

  // Verify Inventory page renders
  await expect(page.getByText('Inventory Command Module')).toBeVisible();
});

test('Smoke Test: Metrics Page Render (via Impersonation)', async ({ page }) => {
  await page.goto('/');

  // Login as Admin (Danny)
  await page.getByRole('button', { name: 'Danny (Admin)' }).click();
  await expect(page.getByText('White-Label Configuration')).toBeVisible();

  // Click the Metrics button in the dev role switcher at the bottom
  await page.getByTitle('METRICS').click();

  // Verify Metrics page renders
  await expect(page.getByText('Metrics & Reporting Hub')).toBeVisible();
});
