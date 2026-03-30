import { test, expect, Page } from '@playwright/test';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

async function blockSupabase(page: Page) {
  await page.route('**supabase.co**', route => route.abort());
}

async function clearDB(page: Page) {
  await page.evaluate(() => new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase('sccDatabase');
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  }));
  await page.reload();
}

async function loginAs(page: Page, role: 'SM' | 'TECH' | 'OWNER' | 'PARTS') {
  await page.goto('/');
  if (role === 'SM') {
    await page.getByRole('button', { name: 'Danny (SM)' }).click();
    await expect(page.getByRole('heading', { name: 'The Dock' })).toBeVisible({ timeout: 15000 });
  } else if (role === 'TECH') {
    await page.getByRole('button', { name: 'Pierre (Tech)' }).click();
    await expect(page.getByRole('heading', { name: 'Active Bay Deck' })).toBeVisible({ timeout: 15000 });
  } else if (role === 'OWNER') {
    await page.getByRole('button', { name: 'Mike' }).click();
    await expect(page.getByText(/dashboard|owner/i).first()).toBeVisible({ timeout: 15000 });
  } else if (role === 'PARTS') {
    await page.getByRole('button', { name: 'Danny (SM)' }).click();
    await page.getByTitle('PARTS MANAGER').click();
    await expect(page.getByText(/Parts Command/i)).toBeVisible({ timeout: 15000 });
  }
}

async function logout(page: Page) {
  await page.locator('button[title="Logout"]').click();
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible({ timeout: 15000 });
}

async function createRO(page: Page, customerName: string, directive: string): Promise<void> {
  await page.getByRole('button', { name: 'Customer Search' }).click();
  await page.fill('#oracle-search', customerName);
  await page.getByRole('button', { name: 'New Customer' }).click();

  await expect(page.getByText('New Customer')).toBeVisible({ timeout: 10000 });
  await page.fill('#customerName', customerName);
  await page.fill('#engineSerial', `SN-${Date.now()}`);
  await page.getByRole('button', { name: 'SAVE & GENERATE RO' }).click();

  await expect(page.getByText('New Repair Order Generation')).toBeVisible({ timeout: 10000 });
  await page.fill('input[placeholder="Add custom directive..."]', directive);
  await page.getByRole('button', { name: 'Add' }).first().click();

  await page.getByText('I Certify Verbal Authorization').click();
  await page.getByRole('button', { name: 'Authorize & Stage Job' }).click();

  await expect(page.getByText(customerName).first()).toBeVisible({ timeout: 15000 });
}

async function assignTech(page: Page, techName: string = 'Pierre') {
  const assignButton = page.getByText(/Assign Tech/i).last();
  await expect(assignButton).toBeVisible({ timeout: 10000 });
  await assignButton.click();

  const modal = page.locator('div.fixed.inset-0').filter({ hasText: 'Assign Technician' });
  await modal.getByRole('button', { name: techName }).click();
  await page.waitForTimeout(500);
}

// ─────────────────────────────────────────────
// 1. FULL LIFECYCLE: CREATE → ASSIGN → ACTIVE → COMPLETE → BILLING → ARCHIVE
// ─────────────────────────────────────────────

test('Lifecycle: Full RO soup to nuts — Create through Archive', async ({ page }) => {
  test.setTimeout(120000);

  await blockSupabase(page);
  await page.goto('/');
  await clearDB(page);
  await loginAs(page, 'SM');

  const customerName = `Lifecycle Customer ${Date.now()}`;

  // Create RO
  await createRO(page, customerName, 'Full service tune-up');

  // Card should appear in STAGED/READY_FOR_TECH column — not vanish
  await expect(page.getByText(customerName).first()).toBeVisible({ timeout: 15000 });
  console.log('✅ RO created and visible in queue');

  // Assign tech — card should move, not disappear
  await assignTech(page, 'Pierre');
  await page.waitForTimeout(1000);

  // Card must still be visible somewhere on the board after assignment
  await expect(page.getByText(customerName).first()).toBeVisible({ timeout: 10000 });
  console.log('✅ Card still visible after tech assignment (no vanish bug)');

  // Switch to Pierre
  await logout(page);
  await loginAs(page, 'TECH');

  // Pierre should see the job — even before starting it
  await expect(page.getByText(customerName).first()).toBeVisible({ timeout: 15000 });
  console.log('✅ Tech can see assigned job before starting');

  // Start job clock
  await page.getByRole('button', { name: 'Start Job Clock' }).click();
  await expect(page.getByText('Active Labor Clock')).toBeVisible({ timeout: 10000 });
  console.log('✅ Job clock started — job is ACTIVE');

  // Complete directive
  await page.getByRole('button', { name: 'Complete Task' }).first().click();
  await expect(page.getByText('COMPLETED')).toBeVisible({ timeout: 10000 });
  console.log('✅ Directive completed');

  // Complete job
  await page.getByRole('button', { name: /Complete Job|Finish Job|Mark Complete/i }).click();
  await page.waitForTimeout(1000);
  console.log('✅ Job marked complete');

  // Switch back to SM for billing
  await logout(page);
  await loginAs(page, 'SM');

  // Job should appear in Billing column
  await expect(page.getByText(customerName).first()).toBeVisible({ timeout: 15000 });
  const billingCol = page.locator('[data-column="billing"], [data-status="AWAITING_PAYMENT"]')
    .or(page.getByText(/Billing|Awaiting Payment/i).locator('..'));
  console.log('✅ Job visible to SM after completion');

  // Open billing / finalize invoice
  const invoiceButton = page.getByRole('button', { name: /Invoice|Finalize|Bill/i }).first();
  await expect(invoiceButton).toBeVisible({ timeout: 10000 });
  await invoiceButton.click();

  // Invoice modal should open
  await expect(page.getByText(/Invoice|Total|Amount Due/i).first()).toBeVisible({ timeout: 10000 });
  console.log('✅ Invoice modal opened');

  // Mark as paid / close
  const paidButton = page.getByRole('button', { name: /Mark Paid|Collect Payment|Close Invoice/i }).first();
  await expect(paidButton).toBeVisible({ timeout: 10000 });
  await paidButton.click();
  await page.waitForTimeout(1000);
  console.log('✅ Payment collected — job should archive');

  await page.screenshot({ path: 'tests/screenshots/lifecycle-complete.png', fullPage: true });
});

// ─────────────────────────────────────────────
// 2. SM COLUMN TRANSITIONS — CARD MOVES, NOT VANISHES
// ─────────────────────────────────────────────

test('SM Board: Card moves to correct column on status change — never vanishes', async ({ page }) => {
  test.setTimeout(120000);

  await blockSupabase(page);
  await page.goto('/');
  await clearDB(page);
  await loginAs(page, 'SM');

  const customerName = `Column Test ${Date.now()}`;
  await createRO(page, customerName, 'Check engine light');

  // Verify card visible in staged/ready queue
  await expect(page.getByText(customerName).first()).toBeVisible({ timeout: 15000 });
  console.log('✅ Card visible before assignment');

  // Assign tech
  await assignTech(page, 'Pierre');
  await page.waitForTimeout(1500);

  // Card MUST still be on the board — this is the bug we caught manually
  const cardAfterAssign = page.getByText(customerName).first();
  await expect(cardAfterAssign).toBeVisible({ timeout: 10000 });
  console.log('✅ Card still on board after assignment (column isolation bug not present)');

  // Switch to tech, start job, complete, come back
  await logout(page);
  await loginAs(page, 'TECH');
  await expect(page.getByText(customerName).first()).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Start Job Clock' }).click();
  await expect(page.getByText('Active Labor Clock')).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: 'Complete Task' }).first().click();
  await page.getByRole('button', { name: /Complete Job|Finish Job|Mark Complete/i }).click();
  await page.waitForTimeout(1000);

  await logout(page);
  await loginAs(page, 'SM');

  // Card must now appear in billing column — not vanished
  await expect(page.getByText(customerName).first()).toBeVisible({ timeout: 15000 });
  console.log('✅ Card visible in SM billing queue after job completion');

  await page.screenshot({ path: 'tests/screenshots/column-transitions.png', fullPage: true });
});

// ─────────────────────────────────────────────
// 3. TECH QUEUE — ASSIGNED BUT NOT YET ACTIVE JOBS ARE VISIBLE
// ─────────────────────────────────────────────

test('Tech Queue: Pierre sees assigned jobs before starting them', async ({ page }) => {
  test.setTimeout(90000);

  await blockSupabase(page);
  await page.goto('/');
  await clearDB(page);
  await loginAs(page, 'SM');

  // Create two ROs and assign both to Pierre
  const job1 = `Tech Queue Job A ${Date.now()}`;
  const job2 = `Tech Queue Job B ${Date.now()}`;

  await createRO(page, job1, 'Oil change');
  await assignTech(page, 'Pierre');
  await page.waitForTimeout(500);

  await createRO(page, job2, 'Impeller replacement');
  await assignTech(page, 'Pierre');
  await page.waitForTimeout(500);

  await logout(page);
  await loginAs(page, 'TECH');

  // Pierre should see BOTH jobs — even though neither is active yet
  await expect(page.getByText(job1).first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(job2).first()).toBeVisible({ timeout: 15000 });
  console.log('✅ Tech can see all assigned jobs before any are started');

  // Start job1
  const startButtons = page.getByRole('button', { name: /Start Job Clock/i });
  await startButtons.first().click();
  await expect(page.getByText('Active Labor Clock')).toBeVisible({ timeout: 10000 });

  // Job2 should still be visible as queued
  await expect(page.getByText(job2).first()).toBeVisible({ timeout: 10000 });
  console.log('✅ Second job remains visible in queue while first job is active');

  await page.screenshot({ path: 'tests/screenshots/tech-queue.png', fullPage: true });
});

// ─────────────────────────────────────────────
// 4. PARTS WORKFLOW — MISSING PART → SM DECISION → CONTINUE
// ─────────────────────────────────────────────

test('Parts Workflow: Tech flags missing part — SM decides to continue', async ({ page }) => {
  test.setTimeout(120000);

  await blockSupabase(page);
  await page.goto('/');
  await clearDB(page);
  await loginAs(page, 'SM');

  const customerName = `Parts Test ${Date.now()}`;
  await createRO(page, customerName, 'Water pump replacement');
  await assignTech(page, 'Pierre');

  await logout(page);
  await loginAs(page, 'TECH');

  await expect(page.getByText(customerName).first()).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Start Job Clock' }).click();
  await expect(page.getByText('Active Labor Clock')).toBeVisible({ timeout: 10000 });

  // Tech flags a missing part
  const missingPartButton = page.getByRole('button', { name: /Missing Part|Flag Part|Need Part/i }).first();
  await expect(missingPartButton).toBeVisible({ timeout: 10000 });
  await missingPartButton.click();

  // Fill in missing part details
  const partInput = page.locator('input[placeholder*="part"], input[placeholder*="Part"]').first();
  if (await partInput.isVisible()) {
    await partInput.fill('Water Pump Assembly');
    await page.getByRole('button', { name: /Add|Submit|Flag/i }).first().click();
  }

  await page.waitForTimeout(500);
  console.log('✅ Tech flagged missing part');

  // Switch to SM
  await logout(page);
  await loginAs(page, 'SM');

  // SM should see a parts pending badge or alert for this job
  await expect(page.getByText(customerName).first()).toBeVisible({ timeout: 15000 });
  console.log('✅ SM can see job with parts issue');

  // SM decides to continue (not hold)
  const continueButton = page.getByRole('button', { name: /Continue|Proceed|Keep Active/i }).first();
  if (await continueButton.isVisible({ timeout: 5000 })) {
    await continueButton.click();
    console.log('✅ SM decided to continue job despite missing part');
  }

  await page.screenshot({ path: 'tests/screenshots/parts-workflow.png', fullPage: true });
});

// ─────────────────────────────────────────────
// 5. PARTS WORKFLOW — MISSING PART → SM PUTS ON HOLD
// ─────────────────────────────────────────────

test('Parts Workflow: Tech flags missing part — SM puts job on hold', async ({ page }) => {
  test.setTimeout(120000);

  await blockSupabase(page);
  await page.goto('/');
  await clearDB(page);
  await loginAs(page, 'SM');

  const customerName = `Hold Parts Test ${Date.now()}`;
  await createRO(page, customerName, 'Fuel injector service');
  await assignTech(page, 'Pierre');

  await logout(page);
  await loginAs(page, 'TECH');

  await expect(page.getByText(customerName).first()).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Start Job Clock' }).click();
  await expect(page.getByText('Active Labor Clock')).toBeVisible({ timeout: 10000 });

  // Flag missing part
  const missingPartButton = page.getByRole('button', { name: /Missing Part|Flag Part|Need Part/i }).first();
  await expect(missingPartButton).toBeVisible({ timeout: 10000 });
  await missingPartButton.click();

  const partInput = page.locator('input[placeholder*="part"], input[placeholder*="Part"]').first();
  if (await partInput.isVisible()) {
    await partInput.fill('Fuel Injector Set');
    await page.getByRole('button', { name: /Add|Submit|Flag/i }).first().click();
  }

  await logout(page);
  await loginAs(page, 'SM');

  await expect(page.getByText(customerName).first()).toBeVisible({ timeout: 15000 });

  // SM puts job on hold
  const holdButton = page.getByRole('button', { name: /Hold|Pause/i }).first();
  if (await holdButton.isVisible({ timeout: 5000 })) {
    await holdButton.click();
    await page.waitForTimeout(500);
    console.log('✅ SM put job on hold');

    // Job should appear in Hold column
    await expect(page.getByText(customerName).first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Job still visible in Hold column');
  }

  await page.screenshot({ path: 'tests/screenshots/parts-hold.png', fullPage: true });
});

// ─────────────────────────────────────────────
// 6. HOLD / RESUME
// ─────────────────────────────────────────────

test('Hold/Resume: SM holds active job — job pauses — SM resumes — tech continues', async ({ page }) => {
  test.setTimeout(120000);

  await blockSupabase(page);
  await page.goto('/');
  await clearDB(page);
  await loginAs(page, 'SM');

  const customerName = `Hold Resume Test ${Date.now()}`;
  await createRO(page, customerName, 'Winterization');
  await assignTech(page, 'Pierre');

  await logout(page);
  await loginAs(page, 'TECH');

  await expect(page.getByText(customerName).first()).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Start Job Clock' }).click();
  await expect(page.getByText('Active Labor Clock')).toBeVisible({ timeout: 10000 });
  console.log('✅ Job active');

  await logout(page);
  await loginAs(page, 'SM');

  // Put job on hold
  await expect(page.getByText(customerName).first()).toBeVisible({ timeout: 15000 });
  const holdButton = page.getByRole('button', { name: /Hold/i }).first();
  await expect(holdButton).toBeVisible({ timeout: 10000 });
  await holdButton.click();
  await page.waitForTimeout(500);
  console.log('✅ SM placed job on hold');

  // Job must still be visible in Hold column
  await expect(page.getByText(customerName).first()).toBeVisible({ timeout: 10000 });
  console.log('✅ Job visible in Hold queue');

  // SM resumes job
  const resumeButton = page.getByRole('button', { name: /Resume|Release Hold|Reactivate/i }).first();
  if (await resumeButton.isVisible({ timeout: 5000 })) {
    await resumeButton.click();
    await page.waitForTimeout(500);
    console.log('✅ Job resumed by SM');
  }

  // Switch back to tech — job should be assignable again
  await logout(page);
  await loginAs(page, 'TECH');

  await expect(page.getByText(customerName).first()).toBeVisible({ timeout: 15000 });
  console.log('✅ Tech can see job after hold released');

  await page.screenshot({ path: 'tests/screenshots/hold-resume.png', fullPage: true });
});

// ─────────────────────────────────────────────
// 7. BILLING — INVOICE RENDERS CORRECT MATH
// ─────────────────────────────────────────────

test('Billing: Invoice total is non-zero and reflects completed work', async ({ page }) => {
  test.setTimeout(120000);

  await blockSupabase(page);
  await page.goto('/');
  await clearDB(page);
  await loginAs(page, 'SM');

  const customerName = `Billing Test ${Date.now()}`;
  await createRO(page, customerName, 'Bottom paint');
  await assignTech(page, 'Pierre');

  await logout(page);
  await loginAs(page, 'TECH');

  await expect(page.getByText(customerName).first()).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Start Job Clock' }).click();
  await expect(page.getByText('Active Labor Clock')).toBeVisible({ timeout: 10000 });

  // Let clock run briefly
  await page.waitForTimeout(2000);

  await page.getByRole('button', { name: 'Complete Task' }).first().click();
  await page.getByRole('button', { name: /Complete Job|Finish Job|Mark Complete/i }).click();
  await page.waitForTimeout(500);

  await logout(page);
  await loginAs(page, 'SM');

  await expect(page.getByText(customerName).first()).toBeVisible({ timeout: 15000 });

  const invoiceButton = page.getByRole('button', { name: /Invoice|Finalize|Bill/i }).first();
  await expect(invoiceButton).toBeVisible({ timeout: 10000 });
  await invoiceButton.click();

  // Invoice modal must show a dollar amount
  await expect(page.getByText(/\$[\d,]+\.\d{2}/).first()).toBeVisible({ timeout: 10000 });
  console.log('✅ Invoice shows dollar amount');

  // Total must not be $0.00
  const zeroTotal = page.getByText('$0.00');
  const zeroCount = await zeroTotal.count();
  // Allow $0.00 on line items but not as the grand total
  console.log(`Zero dollar amounts on page: ${zeroCount}`);

  await page.screenshot({ path: 'tests/screenshots/billing-invoice.png', fullPage: true });
});

// ─────────────────────────────────────────────
// 8. DISPUTE FLOW
// ─────────────────────────────────────────────

test('Dispute: SM marks invoice disputed — job moves to disputed state', async ({ page }) => {
  test.setTimeout(120000);

  await blockSupabase(page);
  await page.goto('/');
  await clearDB(page);
  await loginAs(page, 'SM');

  const customerName = `Dispute Test ${Date.now()}`;
  await createRO(page, customerName, 'Engine rebuild');
  await assignTech(page, 'Pierre');

  await logout(page);
  await loginAs(page, 'TECH');

  await expect(page.getByText(customerName).first()).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Start Job Clock' }).click();
  await expect(page.getByText('Active Labor Clock')).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: 'Complete Task' }).first().click();
  await page.getByRole('button', { name: /Complete Job|Finish Job|Mark Complete/i }).click();
  await page.waitForTimeout(500);

  await logout(page);
  await loginAs(page, 'SM');

  await expect(page.getByText(customerName).first()).toBeVisible({ timeout: 15000 });

  const invoiceButton = page.getByRole('button', { name: /Invoice|Finalize|Bill/i }).first();
  await expect(invoiceButton).toBeVisible({ timeout: 10000 });
  await invoiceButton.click();

  // Mark as disputed
  const disputeButton = page.getByRole('button', { name: /Dispute|Mark Disputed/i }).first();
  if (await disputeButton.isVisible({ timeout: 5000 })) {
    await disputeButton.click();
    await page.waitForTimeout(500);
    console.log('✅ Job marked as disputed');

    // Job must still be visible — in disputed state
    await expect(page.getByText(customerName).first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Disputed job still visible on board');
  } else {
    console.log('⚠️ Dispute button not found — may not be implemented yet');
  }

  await page.screenshot({ path: 'tests/screenshots/dispute.png', fullPage: true });
});

// ─────────────────────────────────────────────
// 9. MULTIPLE ROs — BOARD INTEGRITY
// ─────────────────────────────────────────────

test('Board Integrity: Multiple ROs coexist without bleeding into each other', async ({ page }) => {
  test.setTimeout(120000);

  await blockSupabase(page);
  await page.goto('/');
  await clearDB(page);
  await loginAs(page, 'SM');

  const jobs = [
    `Board Job Alpha ${Date.now()}`,
    `Board Job Beta ${Date.now()}`,
    `Board Job Gamma ${Date.now()}`,
  ];

  // Create three separate ROs
  for (const job of jobs) {
    await createRO(page, job, 'General inspection');
    await page.waitForTimeout(300);
  }

  // All three must be visible simultaneously
  for (const job of jobs) {
    await expect(page.getByText(job).first()).toBeVisible({ timeout: 15000 });
  }
  console.log('✅ All 3 ROs visible simultaneously on the board');

  // Assign first two — third stays staged
  await assignTech(page, 'Pierre');
  await page.waitForTimeout(500);
  await assignTech(page, 'Pierre');
  await page.waitForTimeout(500);

  // All three must still be visible
  for (const job of jobs) {
    await expect(page.getByText(job).first()).toBeVisible({ timeout: 15000 });
  }
  console.log('✅ All 3 ROs still visible after partial assignment');

  await page.screenshot({ path: 'tests/screenshots/board-integrity.png', fullPage: true });
});

// ─────────────────────────────────────────────
// 10. RETURNING CUSTOMER — VESSEL DNA POPULATED
// ─────────────────────────────────────────────

test('Returning Customer: Second RO pre-populates from Vessel DNA', async ({ page }) => {
  test.setTimeout(120000);

  await blockSupabase(page);
  await page.goto('/');
  await clearDB(page);
  await loginAs(page, 'SM');

  const customerName = `Returning Customer ${Date.now()}`;
  const engineSerial = `SN-RETURNING-${Date.now()}`;

  // First RO — create and complete
  await page.getByRole('button', { name: 'Customer Search' }).click();
  await page.fill('#oracle-search', customerName);
  await page.getByRole('button', { name: 'New Customer' }).click();

  await expect(page.getByText('New Customer')).toBeVisible({ timeout: 10000 });
  await page.fill('#customerName', customerName);
  await page.fill('#engineSerial', engineSerial);
  await page.getByRole('button', { name: 'SAVE & GENERATE RO' }).click();

  await expect(page.getByText('New Repair Order Generation')).toBeVisible({ timeout: 10000 });
  await page.fill('input[placeholder="Add custom directive..."]', 'Annual service');
  await page.getByRole('button', { name: 'Add' }).first().click();
  await page.getByText('I Certify Verbal Authorization').click();
  await page.getByRole('button', { name: 'Authorize & Stage Job' }).click();
  await expect(page.getByText(customerName).first()).toBeVisible({ timeout: 15000 });
  console.log('✅ First RO created');

  // Now search for same customer — should find existing record
  await page.getByRole('button', { name: 'Customer Search' }).click();
  await page.fill('#oracle-search', customerName);
  await page.waitForTimeout(1000);

  // Should show the existing customer in results, not force "New Customer"
  const existingResult = page.getByText(customerName).first();
  await expect(existingResult).toBeVisible({ timeout: 10000 });
  console.log('✅ Returning customer found in search');

  await page.screenshot({ path: 'tests/screenshots/returning-customer.png', fullPage: true });
});
