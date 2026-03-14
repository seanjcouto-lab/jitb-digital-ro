import { test, expect } from '@playwright/test';

test('Smoke Test: Service Manager Login', async ({ page }) => {
  await page.goto('/');
  
  // Verify login screen loads
  await expect(page.getByText('Personnel Authentication')).toBeVisible();
  
  // Click Service Manager (Danny)
  await page.getByRole('button', { name: 'Danny Service Manager' }).click();
  
  // Verify modal opens
  await expect(page.getByText('Auth Required')).toBeVisible();
  
  // Enter password
  await page.fill('input[type="password"]', 'Danny');
  
  // Click Login
  await page.getByRole('button', { name: 'Login' }).click();
  
  // Verify Service Manager page renders
  await expect(page.getByText('Service Manager Command Console')).toBeVisible();
});

test('Smoke Test: Technician Login', async ({ page }) => {
  await page.goto('/');
  
  // Click Technician (Pierre)
  // Note: The button text contains "Pierre" and "Technician" in spans.
  // Playwright's getByRole('button', { name: ... }) matches accessible name which usually concatenates text content.
  await page.getByRole('button', { name: 'Pierre Technician' }).click();
  
  // Enter password
  await page.fill('input[type="password"]', 'Pierre');
  
  // Click Login
  await page.getByRole('button', { name: 'Login' }).click();
  
  // Verify Technician page renders
  // It might show "Active Bay Deck" or "No Active Job" depending on state
  await expect(page.getByText('Active Bay Deck').or(page.getByText('No Active Job'))).toBeVisible();
});

test('Smoke Test: Parts Manager Login', async ({ page }) => {
  await page.goto('/');
  
  // Click Parts Manager (Sean)
  await page.getByRole('button', { name: 'Sean Parts Manager' }).click();
  
  // Enter password
  await page.fill('input[type="password"]', 'Sean');
  
  // Click Login
  await page.getByRole('button', { name: 'Login' }).click();
  
  // Verify Parts Manager page renders
  await expect(page.getByText('Parts Command')).toBeVisible();
});

test('Smoke Test: Admin Login & Page Render', async ({ page }) => {
  await page.goto('/');

  // Click Executive Command (Mike)
  await page.getByRole('button', { name: 'Mike Owner' }).click();

  // Enter password
  await page.fill('input[type="password"]', 'Mike');

  // Click Login
  await page.getByRole('button', { name: 'Login' }).click();

  // Verify Admin page renders (default for Admin role)
  await expect(page.getByText('White-Label Configuration')).toBeVisible();
});

test('Smoke Test: Billing Page Render (via Impersonation)', async ({ page }) => {
  await page.goto('/');

  // Login as Admin (Mike) who has Developer privileges
  await page.getByRole('button', { name: 'Mike Owner' }).click();
  await page.fill('input[type="password"]', 'Mike');
  await page.getByRole('button', { name: 'Login' }).click();

  // Wait for Admin page to load first
  await expect(page.getByText('White-Label Configuration')).toBeVisible();

  // Click Billing Impersonation Button
  await page.getByTitle('BILLING').click();

  // Verify Billing page renders
  await expect(page.getByText('Billing & Collections')).toBeVisible();
});

test('Smoke Test: Inventory Page Render (via Impersonation)', async ({ page }) => {
  await page.goto('/');

  // Login as Admin (Mike)
  await page.getByRole('button', { name: 'Mike Owner' }).click();
  await page.fill('input[type="password"]', 'Mike');
  await page.getByRole('button', { name: 'Login' }).click();

  // Wait for Admin page
  await expect(page.getByText('White-Label Configuration')).toBeVisible();

  // Click Inventory Manager Impersonation Button
  await page.getByTitle('INVENTORY MANAGER').click();

  // Verify Inventory page renders
  await expect(page.getByText('Inventory Command Module')).toBeVisible();
});

test('Smoke Test: Metrics Page Render (via Impersonation)', async ({ page }) => {
  await page.goto('/');

  // Login as Admin (Mike)
  await page.getByRole('button', { name: 'Mike Owner' }).click();
  await page.fill('input[type="password"]', 'Mike');
  await page.getByRole('button', { name: 'Login' }).click();

  // Wait for Admin page
  await expect(page.getByText('White-Label Configuration')).toBeVisible();

  // Click Metrics Impersonation Button
  await page.getByTitle('METRICS').click();

  // Verify Metrics page renders
  await expect(page.getByText('Metrics & Reporting Hub')).toBeVisible();
});
