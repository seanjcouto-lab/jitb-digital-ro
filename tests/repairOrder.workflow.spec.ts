import { test, expect } from '@playwright/test';

test('Repair Order Workflow: Creation to Directive Completion', async ({ page }) => {
  test.setTimeout(90000);

  // --- STEP 1: SERVICE MANAGER CREATES AND ASSIGNS RO ---
  await page.goto('/');
  
  // Login as Danny (SM)
  await page.getByRole('button', { name: 'Danny (SM)' }).click();
  await expect(page.getByRole('heading', { name: 'The Dock' })).toBeVisible({ timeout: 15000 });

  // Initiate New RO flow
  const customerName = `Test Customer ${Date.now()}`;
  await page.fill('#oracle-search', customerName);
  await page.getByRole('button', { name: 'Initialize Profile' }).click();
  
  // Fill Profile Onboarding
  await expect(page.getByText('New Service Profile Onboarding')).toBeVisible();
  await page.fill('#customerName', customerName);
  await page.fill('#engineSerial', 'TEST-SN-999');
  await page.getByRole('button', { name: 'SAVE & GENERATE RO' }).click();
  
  // Fill RO Generation
  await expect(page.getByText('New Repair Order Generation')).toBeVisible();
  await page.fill('input[placeholder="Add custom directive..."]', 'Fix the flux capacitor');
  await page.getByRole('button', { name: 'Add' }).first().click();
  
  // Authorize (Verbal)
  // Clicking the label text is often more reliable than the checkbox itself in some UI frameworks
  await page.getByText('I Certify Verbal Authorization').click();
  
  // Generate
  await page.getByRole('button', { name: 'Generate & Authorize RO' }).click();
  
  // Wait for it to appear in Deployment Deck or Staged Queue
  console.log(`Waiting for RO for ${customerName} to appear...`);
  await expect(page.getByText(customerName).first()).toBeVisible({ timeout: 15000 });
  
  // Assign Technician
  // We'll look for the button directly, assuming it's the one we just created
  console.log('=== FULL PAGE TEXT ===');
  console.log(await page.innerText('body'));
  
  const assignButton = page.getByText(/Assign Tech/i).last();
  await expect(assignButton).toBeVisible({ timeout: 15000 });
  await assignButton.click();
  
  // Select Pierre in the modal
  const modal = page.locator('div.fixed.inset-0').filter({ hasText: 'Assign Technician' });
  await modal.getByRole('button', { name: 'Pierre' }).click();
  console.log('RO assigned to Pierre.');
  
  await page.waitForTimeout(1000); // Wait for modal to close
  console.log('=== PAGE TEXT AFTER ASSIGNMENT ===');
  console.log(await page.innerText('body'));

  // --- STEP 2: TECHNICIAN COMPLETES DIRECTIVE ---
  
  // Logout and Login as Pierre
  console.log('Logging out and switching to Pierre...');
  // Open user menu
  await page.locator('header button').filter({ has: page.locator('svg') }).last().click();
  // Click logout
  await page.getByRole('button', { name: /Logout/i }).click();
  
  // Wait for login screen
  const loginHeading = page.getByRole('heading', { name: /Personnel Authentication/i });
  await expect(loginHeading).toBeVisible({ timeout: 20000 });
  
  console.log('=== LOGIN SCREEN BUTTONS ===');
  console.log(await page.locator('button').allTextContents());
  
  await page.getByRole('button', { name: 'Pierre (Tech)' }).click();
  await expect(page.getByRole('heading', { name: 'Technician Terminal' })).toBeVisible({ timeout: 20000 });
  
  // Find the RO in Pierre's list
  console.log(`Looking for RO for ${customerName} in technician view...`);
  const techRoCard = page.locator('div.glass').filter({ hasText: customerName }).first();
  await expect(techRoCard).toBeVisible({ timeout: 15000 });
  
  // Click "Complete" on the directive
  // In TechnicianPage, directives are listed. We'll find the first "Complete" button in this card.
  const completeButton = techRoCard.getByRole('button', { name: 'Complete' }).first();
  await expect(completeButton).toBeVisible();
  await completeButton.click();
  
  console.log('Directive completed by Pierre.');
  
  // Verify RO status is updated
  // In our implementation of completeDirective, it sets status to ACTIVE if it was READY_FOR_TECH.
  await expect(techRoCard.getByText('ACTIVE')).toBeVisible({ timeout: 10000 });
  
  await page.screenshot({ path: 'tests/screenshots/workflow-complete.png', fullPage: true });
});
