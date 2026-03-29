import { test, expect } from '@playwright/test';

test('Selector Discovery: Service Manager flow', async ({ page }) => {
  test.setTimeout(60000);
  
  // Step 1: Login screen
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  await page.goto('/');
  
  // Wait for the login screen to appear
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible({ timeout: 10000 });

  console.log('=== LOGIN SCREEN BUTTONS ===');
  console.log(await page.locator('button').allTextContents());

  // Step 2: Login as Danny (Service Manager) using the dev bypass
  await page.getByRole('button', { name: 'Danny (SM)' }).click();
  
  // Wait for the Service Manager page (The Dock)
  await expect(page.getByRole('heading', { name: 'The Dock' })).toBeVisible({ timeout: 15000 });
  
  // Step 3: Create a new RO
  console.log('Initiating New RO flow...');
  await page.fill('#oracle-search', 'Test Customer');
  await page.getByRole('button', { name: 'New Customer' }).click();

  // Fill Profile Onboarding
  await expect(page.getByText('New Customer')).toBeVisible();
  await page.fill('#customerName', 'Test Customer');
  await page.fill('#engineSerial', 'TEST-SN-123');
  await page.getByRole('button', { name: 'SAVE & GENERATE RO' }).click();
  
  // Fill RO Generation
  await expect(page.getByText('New Repair Order Generation')).toBeVisible();
  await page.fill('input[placeholder="Add custom directive..."]', 'Test Directive 1');
  await page.getByRole('button', { name: 'Add' }).first().click();
  
  // Authorize
  await page.getByLabel('I Certify Verbal Authorization').check();
  await page.getByRole('button', { name: 'Authorize & Stage Job' }).click();
  
  // Wait for the RO to appear in the Staged Queue (it might go to Staged first if no tech assigned)
  console.log('RO Created. Waiting for it to appear in Staged Queue...');
  await page.waitForTimeout(2000); // Give it a moment to sync and render
  
  console.log('=== STAGED QUEUE CONTENT ===');
  console.log(await page.locator('section').filter({ hasText: 'STAGED' }).innerText());

  // Assign Technician
  const assignButton = page.getByText(/Assign Tech/i).last();
  await expect(assignButton).toBeVisible({ timeout: 15000 });
  await assignButton.click();
  const modal = page.locator('div.fixed.inset-0').filter({ hasText: 'Assign Technician' });
  await modal.getByRole('button', { name: 'Pierre' }).click();
  
  console.log('=== SERVICE MANAGER PAGE AFTER ASSIGNMENT ===');
  console.log(await page.locator('body').innerText());

  // Step 4: Take screenshot
  await page.screenshot({ path: 'tests/screenshots/dashboard.png', fullPage: true });
});
