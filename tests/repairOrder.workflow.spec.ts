import { test, expect } from '@playwright/test';

test('Repair Order Workflow: Creation to Directive Completion', async ({ page }) => {
  test.setTimeout(90000);

  // --- STEP 1: SERVICE MANAGER CREATES AND ASSIGNS RO ---

  // Block Supabase sync so remote data can't repopulate local state during the test
  await page.route('**supabase.co**', route => route.abort());

  await page.goto('/');

  // Clear IndexedDB so previous test runs don't pollute state.
  // Wrap in a Promise — deleteDatabase returns an IDBOpenDBRequest, not a Promise.
  // onblocked fires when Dexie holds the connection open; we resolve immediately so
  // page.reload() can proceed. The reload closes Dexie's connection, the pending
  // delete completes, and the new page load starts with an empty database.
  await page.evaluate(() => new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase('sccDatabase');
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  }));
  await page.reload();

  // Login as Danny (SM)
  await page.getByRole('button', { name: 'Danny (SM)' }).click();
  await expect(page.getByRole('heading', { name: 'The Dock' })).toBeVisible({ timeout: 15000 });

  // Initiate New RO flow
  const customerName = `Test Customer ${Date.now()}`;
  await page.fill('#oracle-search', customerName);
  await page.getByRole('button', { name: 'New Customer' }).click();

  // Fill Profile Onboarding
  await expect(page.getByText('New Customer')).toBeVisible();
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
  await page.getByRole('button', { name: 'Authorize & Stage Job' }).click();
  
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
  await page.locator('button[title="Logout"]').click();

  // Wait for login screen
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible({ timeout: 20000 });
  
  console.log('=== LOGIN SCREEN BUTTONS ===');
  console.log(await page.locator('button').allTextContents());
  
  await page.getByRole('button', { name: 'Pierre (Tech)' }).click();
  await expect(page.getByRole('heading', { name: 'Active Bay Deck' })).toBeVisible({ timeout: 20000 });
  
  // Verify the RO is loaded for Pierre (customer name appears in the header)
  console.log(`Looking for RO for ${customerName} in technician view...`);
  await expect(page.getByText(customerName).first()).toBeVisible({ timeout: 15000 });

  // Start the job clock (RO arrives as READY_FOR_TECH; must activate before directives unlock)
  await page.getByRole('button', { name: 'Start Job Clock' }).click();

  // Verify job is now active
  await expect(page.getByText('Active Labor Clock')).toBeVisible({ timeout: 10000 });

  // Complete the first directive
  await page.getByRole('button', { name: 'Complete Task' }).first().click();

  console.log('Directive completed by Pierre.');

  // Verify directive is marked completed
  await expect(page.getByText('COMPLETED')).toBeVisible({ timeout: 10000 });
  
  await page.screenshot({ path: 'tests/screenshots/workflow-complete.png', fullPage: true });
});
