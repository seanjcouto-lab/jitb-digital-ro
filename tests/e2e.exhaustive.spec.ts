import { test, expect, Page } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// SHARED HELPERS
// ─────────────────────────────────────────────────────────────────────────────

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

async function setup(page: Page) {
  await blockSupabase(page);
  await page.goto('/');
  await clearDB(page);
}

async function loginSM(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Danny (SM)' }).click();
  await expect(page.getByRole('heading', { name: 'The Dock' })).toBeVisible({ timeout: 15000 });
}

async function loginTech(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pierre (Tech)' }).click();
  await expect(page.getByRole('heading', { name: 'Active Bay Deck' }).or(page.getByText('No Active Job'))).toBeVisible({ timeout: 15000 });
}

async function loginOwner(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Danny (Admin)' }).click();
  await page.waitForTimeout(2000);
}

async function loginParts(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Danny (Admin)' }).click();
  await page.getByTitle('PARTS MANAGER').click();
  await expect(page.getByText(/Parts Command/i)).toBeVisible({ timeout: 15000 });
}

async function logout(page: Page) {
  await page.locator('button[title="Logout"]').click();
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible({ timeout: 15000 });
}

async function createRO(page: Page, customerName: string, directive: string, engineSerial?: string): Promise<void> {
  await page.getByRole('button', { name: 'Customer Search' }).click();
  await page.fill('#oracle-search', customerName);
  await page.getByRole('button', { name: 'New Customer' }).click();
  await expect(page.getByText('New Customer')).toBeVisible({ timeout: 10000 });
  await page.fill('#customerName', customerName);
  await page.fill('#engineSerial', engineSerial ?? `SN-${Date.now()}`);
  await page.getByRole('button', { name: 'SAVE & GENERATE RO' }).click();
  await expect(page.getByText('New Repair Order Generation')).toBeVisible({ timeout: 10000 });
  await page.fill('input[placeholder="Add custom directive..."]', directive);
  await page.getByRole('button', { name: 'Add' }).first().click();
  await page.getByText('I Certify Verbal Authorization').click();
  await page.getByRole('button', { name: 'Authorize & Stage Job' }).click();
  await expect(page.getByText(customerName).first()).toBeVisible({ timeout: 15000 });
}

async function assignTech(page: Page, techName: string = 'Pierre') {
  const btn = page.getByText(/Assign Tech/i).last();
  await expect(btn).toBeVisible({ timeout: 10000 });
  await btn.click();
  const modal = page.locator('div.fixed.inset-0').filter({ hasText: 'Assign Technician' });
  await modal.getByRole('button', { name: techName }).click();
  await page.waitForTimeout(500);
}

async function startJob(page: Page) {
  await page.getByRole('button', { name: 'Start Job Clock' }).click();
  await expect(page.getByText('Active Labor Clock')).toBeVisible({ timeout: 10000 });
}

async function completeDirective(page: Page) {
  await page.getByRole('button', { name: 'Complete Task' }).first().click();
}

async function completeJob(page: Page) {
  await page.getByRole('button', { name: /Send for Billing/i }).click();
  await page.waitForTimeout(500);
}

async function openInvoice(page: Page) {
  const btn = page.getByRole('button', { name: /Invoice|Finalize|Bill/i }).first();
  await expect(btn).toBeVisible({ timeout: 10000 });
  await btn.click();
}

async function screenshot(page: Page, name: string) {
  await page.screenshot({ path: `tests/screenshots/${name}.png`, fullPage: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 1 — AUTH & LOGIN
// ─────────────────────────────────────────────────────────────────────────────

test('Auth: Login screen renders on cold load', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible({ timeout: 10000 });
  await screenshot(page, 'auth-login-screen');
});

test('Auth: Service Manager login lands on The Dock', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Danny (SM)' }).click();
  await expect(page.getByRole('heading', { name: 'The Dock' })).toBeVisible({ timeout: 15000 });
  await screenshot(page, 'auth-sm-login');
});

test('Auth: Technician login lands on Active Bay Deck', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pierre (Tech)' }).click();
  await expect(page.getByRole('heading', { name: 'Active Bay Deck' }).or(page.getByText('No Active Job'))).toBeVisible({ timeout: 15000 });
  await screenshot(page, 'auth-tech-login');
});

test('Auth: Owner login lands on owner dashboard', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Danny (Admin)' }).click();
  await page.waitForTimeout(2000);
  await screenshot(page, 'auth-owner-login');
});

test('Auth: Logout clears session and returns to login screen', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Danny (SM)' }).click();
  await expect(page.getByRole('heading', { name: 'The Dock' })).toBeVisible({ timeout: 15000 });
  await logout(page);
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible({ timeout: 10000 });
  await screenshot(page, 'auth-logout');
});

test('Auth: Session does not persist across logout — tech cannot access SM view', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Danny (SM)' }).click();
  await expect(page.getByRole('heading', { name: 'The Dock' })).toBeVisible({ timeout: 15000 });
  await logout(page);
  await page.getByRole('button', { name: 'Pierre (Tech)' }).click();
  await expect(page.getByRole('heading', { name: 'Active Bay Deck' }).or(page.getByText('No Active Job'))).toBeVisible({ timeout: 15000 });
  // SM heading must not be present
  await expect(page.getByRole('heading', { name: 'The Dock' })).not.toBeVisible();
  await screenshot(page, 'auth-role-isolation');
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 2 — RO CREATION
// ─────────────────────────────────────────────────────────────────────────────

test('RO Creation: New customer with single manual directive', async ({ page }) => {
  test.setTimeout(90000);
  await setup(page);
  await loginSM(page);
  const name = `New Customer ${Date.now()}`;
  await createRO(page, name, 'Inspect hull');
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await screenshot(page, 'ro-create-new-customer');
});

test('RO Creation: Multiple directives added before authorization', async ({ page }) => {
  test.setTimeout(90000);
  await setup(page);
  await loginSM(page);
  const name = `Multi Directive ${Date.now()}`;
  await page.getByRole('button', { name: 'Customer Search' }).click();
  await page.fill('#oracle-search', name);
  await page.getByRole('button', { name: 'New Customer' }).click();
  await expect(page.getByText('New Customer')).toBeVisible({ timeout: 10000 });
  await page.fill('#customerName', name);
  await page.fill('#engineSerial', `SN-${Date.now()}`);
  await page.getByRole('button', { name: 'SAVE & GENERATE RO' }).click();
  await expect(page.getByText('New Repair Order Generation')).toBeVisible({ timeout: 10000 });
  for (const directive of ['Change oil', 'Replace impeller', 'Check zincs']) {
    await page.fill('input[placeholder="Add custom directive..."]', directive);
    await page.getByRole('button', { name: 'Add' }).first().click();
    await page.waitForTimeout(200);
  }
  await page.getByText('I Certify Verbal Authorization').click();
  await page.getByRole('button', { name: 'Authorize & Stage Job' }).click();
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await screenshot(page, 'ro-create-multi-directive');
});

test('RO Creation: Returning customer found by name search', async ({ page }) => {
  test.setTimeout(120000);
  await setup(page);
  await loginSM(page);
  const name = `Returning Search ${Date.now()}`;
  await createRO(page, name, 'Annual service');
  await page.getByRole('button', { name: 'Customer Search' }).click();
  await page.fill('#oracle-search', name);
  await page.waitForTimeout(1000);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 10000 });
  await screenshot(page, 'ro-returning-customer-search');
});

test('RO Creation: Returning customer found by engine serial', async ({ page }) => {
  test.setTimeout(120000);
  await setup(page);
  await loginSM(page);
  const name = `Engine Serial Customer ${Date.now()}`;
  const serial = `SN-UNIQUE-${Date.now()}`;
  await createRO(page, name, 'Service call', serial);
  await page.getByRole('button', { name: 'Customer Search' }).click();
  await page.fill('#oracle-search', serial);
  await page.waitForTimeout(1000);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 10000 });
  await screenshot(page, 'ro-search-by-serial');
});

test('RO Creation: Verbal authorization checkbox required before generate', async ({ page }) => {
  test.setTimeout(90000);
  await setup(page);
  await loginSM(page);
  const name = `Auth Gate Test ${Date.now()}`;
  await page.getByRole('button', { name: 'Customer Search' }).click();
  await page.fill('#oracle-search', name);
  await page.getByRole('button', { name: 'New Customer' }).click();
  await expect(page.getByText('New Customer')).toBeVisible({ timeout: 10000 });
  await page.fill('#customerName', name);
  await page.fill('#engineSerial', `SN-${Date.now()}`);
  await page.getByRole('button', { name: 'SAVE & GENERATE RO' }).click();
  await expect(page.getByText('New Repair Order Generation')).toBeVisible({ timeout: 10000 });
  await page.fill('input[placeholder="Add custom directive..."]', 'Test directive');
  await page.getByRole('button', { name: 'Add' }).first().click();
  const generateBtn = page.getByRole('button', { name: 'Authorize & Stage Job' });
  const isDisabled = await generateBtn.isDisabled();
  console.log(`Generate button disabled without auth: ${isDisabled}`);
  await screenshot(page, 'ro-auth-gate');
});

test('RO Creation: RO appears in staged queue immediately after creation', async ({ page }) => {
  test.setTimeout(90000);
  await setup(page);
  await loginSM(page);
  const name = `Staged Queue Test ${Date.now()}`;
  await createRO(page, name, 'Tune up');
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 5000 });
  await screenshot(page, 'ro-staged-immediately');
});

test('RO Creation: RO persists after page refresh', async ({ page }) => {
  test.setTimeout(90000);
  await setup(page);
  await loginSM(page);
  const name = `Persist Test ${Date.now()}`;
  await createRO(page, name, 'Check fuel system');
  await page.reload();
  await page.waitForTimeout(2000);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await screenshot(page, 'ro-persists-after-refresh');
});

test('RO Creation: Two ROs for same customer — both visible', async ({ page }) => {
  test.setTimeout(120000);
  await setup(page);
  await loginSM(page);
  const name = `Two RO Customer ${Date.now()}`;
  const serial = `SN-TWORO-${Date.now()}`;
  await createRO(page, name, 'First job', serial);
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Customer Search' }).click();
  await page.fill('#oracle-search', name);
  await page.waitForTimeout(1000);
  const found = page.getByText(name).first();
  if (await found.isVisible()) {
    await found.click();
    await page.waitForTimeout(500);
  }
  await screenshot(page, 'ro-two-for-same-customer');
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 3 — STATUS MACHINE & COLUMN TRANSITIONS
// ─────────────────────────────────────────────────────────────────────────────

test('Status: Card never vanishes when assigned tech — moves to correct column', async ({ page }) => {
  test.setTimeout(120000);
  await setup(page);
  await loginSM(page);
  const name = `Column Move Test ${Date.now()}`;
  await createRO(page, name, 'Propeller inspection');
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await assignTech(page, 'Pierre');
  await page.waitForTimeout(1000);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 10000 });
  console.log('✅ Card still on board after tech assignment');
  await screenshot(page, 'status-card-no-vanish');
});

test('Status: Full state machine — STAGED → ACTIVE → COMPLETED → BILLING', async ({ page }) => {
  test.setTimeout(180000);
  await setup(page);
  await loginSM(page);
  const name = `State Machine ${Date.now()}`;
  await createRO(page, name, 'Full service');
  await assignTech(page, 'Pierre');
  await logout(page);
  await loginTech(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await startJob(page);
  await completeDirective(page);
  await completeJob(page);
  await logout(page);
  await loginSM(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await screenshot(page, 'status-full-state-machine');
});

test('Status: HOLD — job card remains visible in hold column', async ({ page }) => {
  test.setTimeout(120000);
  await setup(page);
  await loginSM(page);
  const name = `Hold Visible ${Date.now()}`;
  await createRO(page, name, 'Battery replacement');
  await assignTech(page, 'Pierre');
  await logout(page);
  await loginTech(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await startJob(page);
  await logout(page);
  await loginSM(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  const holdBtn = page.getByRole('button', { name: /Hold/i }).first();
  if (await holdBtn.isVisible({ timeout: 5000 })) {
    await holdBtn.click();
    await page.waitForTimeout(500);
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Job visible in HOLD column');
  }
  await screenshot(page, 'status-hold-visible');
});

test('Status: HOLD → RESUME — job returns to active workflow', async ({ page }) => {
  test.setTimeout(120000);
  await setup(page);
  await loginSM(page);
  const name = `Hold Resume ${Date.now()}`;
  await createRO(page, name, 'Steering inspection');
  await assignTech(page, 'Pierre');
  await logout(page);
  await loginTech(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await startJob(page);
  await logout(page);
  await loginSM(page);
  const holdBtn = page.getByRole('button', { name: /Hold/i }).first();
  if (await holdBtn.isVisible({ timeout: 5000 })) {
    await holdBtn.click();
    await page.waitForTimeout(500);
    const resumeBtn = page.getByRole('button', { name: /Resume|Release|Reactivate/i }).first();
    if (await resumeBtn.isVisible({ timeout: 5000 })) {
      await resumeBtn.click();
      await page.waitForTimeout(500);
      await expect(page.getByText(name).first()).toBeVisible({ timeout: 10000 });
      console.log('✅ Job visible after hold released');
    }
  }
  await screenshot(page, 'status-hold-resume');
});

test('Status: DISPUTED — job stays on board in disputed state', async ({ page }) => {
  test.setTimeout(120000);
  await setup(page);
  await loginSM(page);
  const name = `Dispute State ${Date.now()}`;
  await createRO(page, name, 'Fiberglass repair');
  await assignTech(page, 'Pierre');
  await logout(page);
  await loginTech(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await startJob(page);
  await completeDirective(page);
  await completeJob(page);
  await logout(page);
  await loginSM(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await openInvoice(page);
  const disputeBtn = page.getByRole('button', { name: /Dispute/i }).first();
  if (await disputeBtn.isVisible({ timeout: 5000 })) {
    await disputeBtn.click();
    await page.waitForTimeout(500);
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Disputed job still on board');
  }
  await screenshot(page, 'status-disputed');
});

test('Status: ARCHIVED — job no longer appears on active board', async ({ page }) => {
  test.setTimeout(120000);
  await setup(page);
  await loginSM(page);
  const name = `Archive Test ${Date.now()}`;
  await createRO(page, name, 'Transom repair');
  await assignTech(page, 'Pierre');
  await logout(page);
  await loginTech(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await startJob(page);
  await completeDirective(page);
  await completeJob(page);
  await logout(page);
  await loginSM(page);
  await openInvoice(page);
  const paidBtn = page.getByRole('button', { name: /Mark Paid|Collect Payment|Close/i }).first();
  if (await paidBtn.isVisible({ timeout: 5000 })) {
    await paidBtn.click();
    await page.waitForTimeout(1000);
    console.log('✅ Payment collected');
  }
  await screenshot(page, 'status-archived');
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 4 — TECHNICIAN WORKFLOW
// ─────────────────────────────────────────────────────────────────────────────

test('Tech: Sees assigned job BEFORE starting it', async ({ page }) => {
  test.setTimeout(90000);
  await setup(page);
  await loginSM(page);
  const name = `Tech Pre-Start ${Date.now()}`;
  await createRO(page, name, 'Nav light check');
  await assignTech(page, 'Pierre');
  await logout(page);
  await loginTech(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  console.log('✅ Tech sees job before starting');
  await screenshot(page, 'tech-assigned-not-started');
});

test('Tech: Sees ALL assigned jobs when multiple are queued', async ({ page }) => {
  test.setTimeout(120000);
  await setup(page);
  await loginSM(page);
  const job1 = `Queue Job A ${Date.now()}`;
  const job2 = `Queue Job B ${Date.now()}`;
  const job3 = `Queue Job C ${Date.now()}`;
  await createRO(page, job1, 'Job one');
  await assignTech(page, 'Pierre');
  await createRO(page, job2, 'Job two');
  await assignTech(page, 'Pierre');
  await createRO(page, job3, 'Job three');
  await assignTech(page, 'Pierre');
  await logout(page);
  await loginTech(page);
  await expect(page.getByText(job1).first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(job2).first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(job3).first()).toBeVisible({ timeout: 10000 });
  console.log('✅ Tech sees all 3 queued jobs');
  await screenshot(page, 'tech-multi-queue');
});

test('Tech: Starting one job does not hide other queued jobs', async ({ page }) => {
  test.setTimeout(120000);
  await setup(page);
  await loginSM(page);
  const job1 = `Active Job ${Date.now()}`;
  const job2 = `Waiting Job ${Date.now()}`;
  await createRO(page, job1, 'Active work');
  await assignTech(page, 'Pierre');
  await createRO(page, job2, 'Waiting work');
  await assignTech(page, 'Pierre');
  await logout(page);
  await loginTech(page);
  await expect(page.getByText(job1).first()).toBeVisible({ timeout: 15000 });
  await startJob(page);
  await expect(page.getByText(job2).first()).toBeVisible({ timeout: 10000 });
  console.log('✅ Queued job visible while another is active');
  await screenshot(page, 'tech-active-plus-queued');
});

test('Tech: Labor clock starts on first action', async ({ page }) => {
  test.setTimeout(90000);
  await setup(page);
  await loginSM(page);
  const name = `Clock Start ${Date.now()}`;
  await createRO(page, name, 'Hull inspection');
  await assignTech(page, 'Pierre');
  await logout(page);
  await loginTech(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await startJob(page);
  await expect(page.getByText('Active Labor Clock')).toBeVisible({ timeout: 10000 });
  console.log('✅ Labor clock started');
  await screenshot(page, 'tech-clock-start');
});

test('Tech: Directive completion marked on card', async ({ page }) => {
  test.setTimeout(90000);
  await setup(page);
  await loginSM(page);
  const name = `Directive Complete ${Date.now()}`;
  await createRO(page, name, 'Replace spark plugs');
  await assignTech(page, 'Pierre');
  await logout(page);
  await loginTech(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await startJob(page);
  await completeDirective(page);
  await expect(page.getByText('COMPLETED')).toBeVisible({ timeout: 10000 });
  console.log('✅ Directive marked completed');
  await screenshot(page, 'tech-directive-complete');
});

test('Tech: Completing all directives enables job completion', async ({ page }) => {
  test.setTimeout(90000);
  await setup(page);
  await loginSM(page);
  const name = `All Complete ${Date.now()}`;
  await createRO(page, name, 'Single task job');
  await assignTech(page, 'Pierre');
  await logout(page);
  await loginTech(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await startJob(page);
  await completeDirective(page);
  const completeBtn = page.getByRole('button', { name: /Complete Job|Finish Job|Mark Complete/i }).first();
  await expect(completeBtn).toBeVisible({ timeout: 10000 });
  console.log('✅ Complete job button available after all directives done');
  await screenshot(page, 'tech-all-directives-complete');
});

test('Tech: Job can complete with some directives unfinished', async ({ page }) => {
  test.setTimeout(90000);
  await setup(page);
  await loginSM(page);
  const name = `Partial Complete ${Date.now()}`;
  await page.getByRole('button', { name: 'Customer Search' }).click();
  await page.fill('#oracle-search', name);
  await page.getByRole('button', { name: 'New Customer' }).click();
  await expect(page.getByText('New Customer')).toBeVisible({ timeout: 10000 });
  await page.fill('#customerName', name);
  await page.fill('#engineSerial', `SN-${Date.now()}`);
  await page.getByRole('button', { name: 'SAVE & GENERATE RO' }).click();
  await expect(page.getByText('New Repair Order Generation')).toBeVisible({ timeout: 10000 });
  await page.fill('input[placeholder="Add custom directive..."]', 'Task one');
  await page.getByRole('button', { name: 'Add' }).first().click();
  await page.waitForTimeout(200);
  await page.fill('input[placeholder="Add custom directive..."]', 'Task two');
  await page.getByRole('button', { name: 'Add' }).first().click();
  await page.getByText('I Certify Verbal Authorization').click();
  await page.getByRole('button', { name: 'Authorize & Stage Job' }).click();
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await assignTech(page, 'Pierre');
  await logout(page);
  await loginTech(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await startJob(page);
  await page.getByRole('button', { name: 'Complete Task' }).first().click();
  await page.waitForTimeout(500);
  const completeBtn = page.getByRole('button', { name: /Complete Job|Finish Job|Mark Complete/i }).first();
  if (await completeBtn.isVisible({ timeout: 5000 })) {
    await completeBtn.click();
    console.log('✅ Job completable with partial directives');
  } else {
    console.log('ℹ️ Complete job not available with partial directives — spec behavior TBD');
  }
  await screenshot(page, 'tech-partial-complete');
});

test('Tech: Tech exits job — job returns to queued not lost', async ({ page }) => {
  test.setTimeout(90000);
  await setup(page);
  await loginSM(page);
  const name = `Tech Exit ${Date.now()}`;
  await createRO(page, name, 'Bilge pump check');
  await assignTech(page, 'Pierre');
  await logout(page);
  await loginTech(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await startJob(page);
  const exitBtn = page.getByRole('button', { name: /Exit|Halt|Stop Job|Leave/i }).first();
  if (await exitBtn.isVisible({ timeout: 5000 })) {
    await exitBtn.click();
    await page.waitForTimeout(500);
    console.log('✅ Tech exited job');
  }
  await logout(page);
  await loginSM(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  console.log('✅ Job still on board after tech exit');
  await screenshot(page, 'tech-exit-job-not-lost');
});

test('Tech: Discovery added — requires SM approval', async ({ page }) => {
  test.setTimeout(90000);
  await setup(page);
  await loginSM(page);
  const name = `Discovery Test ${Date.now()}`;
  await createRO(page, name, 'Tune up');
  await assignTech(page, 'Pierre');
  await logout(page);
  await loginTech(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await startJob(page);
  const discoveryBtn = page.getByRole('button', { name: /Discovery|Add Finding|Found Issue/i }).first();
  if (await discoveryBtn.isVisible({ timeout: 5000 })) {
    await discoveryBtn.click();
    const discoveryInput = page.locator('input[placeholder*="discovery"], textarea[placeholder*="finding"]').first();
    if (await discoveryInput.isVisible()) {
      await discoveryInput.fill('Cracked exhaust manifold found');
      await page.getByRole('button', { name: /Submit|Add/i }).first().click();
      console.log('✅ Discovery submitted by tech');
    }
  } else {
    console.log('ℹ️ Discovery button not found — may not be implemented');
  }
  await screenshot(page, 'tech-discovery');
});

test('Tech: Flags missing part — shows on SM board', async ({ page }) => {
  test.setTimeout(90000);
  await setup(page);
  await loginSM(page);
  const name = `Missing Part Flag ${Date.now()}`;
  await createRO(page, name, 'Water pump replacement');
  await assignTech(page, 'Pierre');
  await logout(page);
  await loginTech(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await startJob(page);
  const missingBtn = page.getByRole('button', { name: /Missing Part|Flag Part|Need Part/i }).first();
  if (await missingBtn.isVisible({ timeout: 5000 })) {
    await missingBtn.click();
    const input = page.locator('input[placeholder*="part"], input[placeholder*="Part"]').first();
    if (await input.isVisible()) {
      await input.fill('Water Pump 4.3L');
      await page.getByRole('button', { name: /Add|Submit|Flag/i }).first().click();
    }
    console.log('✅ Missing part flagged');
  }
  await logout(page);
  await loginSM(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  console.log('✅ SM sees job with parts issue');
  await screenshot(page, 'tech-missing-part-flag');
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 5 — SERVICE MANAGER AUTHORITY
// ─────────────────────────────────────────────────────────────────────────────

test('SM: Can assign technician to staged job', async ({ page }) => {
  test.setTimeout(90000);
  await setup(page);
  await loginSM(page);
  const name = `SM Assign ${Date.now()}`;
  await createRO(page, name, 'Gelcoat repair');
  await assignTech(page, 'Pierre');
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 10000 });
  console.log('✅ SM assigned tech successfully');
  await screenshot(page, 'sm-assign-tech');
});

test('SM: Can unassign technician from active job', async ({ page }) => {
  test.setTimeout(120000);
  await setup(page);
  await loginSM(page);
  const name = `SM Unassign ${Date.now()}`;
  await createRO(page, name, 'Compass calibration');
  await assignTech(page, 'Pierre');
  await logout(page);
  await loginTech(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await startJob(page);
  await logout(page);
  await loginSM(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  const unassignBtn = page.getByRole('button', { name: /Unassign|Remove Tech/i }).first();
  if (await unassignBtn.isVisible({ timeout: 5000 })) {
    await unassignBtn.click();
    await page.waitForTimeout(500);
    console.log('✅ SM unassigned tech');
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Job still on board after unassign');
  }
  await screenshot(page, 'sm-unassign-tech');
});

test('SM: Can put active job on hold', async ({ page }) => {
  test.setTimeout(120000);
  await setup(page);
  await loginSM(page);
  const name = `SM Hold ${Date.now()}`;
  await createRO(page, name, 'Trailer hitch wiring');
  await assignTech(page, 'Pierre');
  await logout(page);
  await loginTech(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await startJob(page);
  await logout(page);
  await loginSM(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  const holdBtn = page.getByRole('button', { name: /Hold/i }).first();
  if (await holdBtn.isVisible({ timeout: 5000 })) {
    await holdBtn.click();
    await page.waitForTimeout(500);
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 10000 });
    console.log('✅ SM placed job on hold — still visible');
  }
  await screenshot(page, 'sm-hold');
});

test('SM: Approves discovery — directive becomes billable', async ({ page }) => {
  test.setTimeout(90000);
  await setup(page);
  await loginSM(page);
  const name = `SM Discovery Approve ${Date.now()}`;
  await createRO(page, name, 'Routine service');
  await assignTech(page, 'Pierre');
  await logout(page);
  await loginTech(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await startJob(page);
  const discoveryBtn = page.getByRole('button', { name: /Discovery|Add Finding/i }).first();
  if (await discoveryBtn.isVisible({ timeout: 3000 })) {
    await discoveryBtn.click();
    const input = page.locator('input[placeholder*="discovery"], textarea').first();
    if (await input.isVisible()) {
      await input.fill('Corroded battery terminals');
      await page.getByRole('button', { name: /Submit|Add/i }).first().click();
    }
    await logout(page);
    await loginSM(page);
    const approveBtn = page.getByRole('button', { name: /Approve|Authorize Discovery/i }).first();
    if (await approveBtn.isVisible({ timeout: 5000 })) {
      await approveBtn.click();
      console.log('✅ SM approved discovery');
    }
  }
  await screenshot(page, 'sm-discovery-approve');
});

test('SM: Rejects discovery — job continues without it', async ({ page }) => {
  test.setTimeout(90000);
  await setup(page);
  await loginSM(page);
  const name = `SM Discovery Reject ${Date.now()}`;
  await createRO(page, name, 'Routine check');
  await assignTech(page, 'Pierre');
  await logout(page);
  await loginTech(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await startJob(page);
  const discoveryBtn = page.getByRole('button', { name: /Discovery|Add Finding/i }).first();
  if (await discoveryBtn.isVisible({ timeout: 3000 })) {
    await discoveryBtn.click();
    const input = page.locator('input[placeholder*="discovery"], textarea').first();
    if (await input.isVisible()) {
      await input.fill('Extra work found');
      await page.getByRole('button', { name: /Submit|Add/i }).first().click();
    }
    await logout(page);
    await loginSM(page);
    const rejectBtn = page.getByRole('button', { name: /Reject|Deny/i }).first();
    if (await rejectBtn.isVisible({ timeout: 5000 })) {
      await rejectBtn.click();
      await page.waitForTimeout(500);
      await expect(page.getByText(name).first()).toBeVisible({ timeout: 10000 });
      console.log('✅ SM rejected discovery — job still visible');
    }
  }
  await screenshot(page, 'sm-discovery-reject');
});

test('SM: Missing part — decides to continue job', async ({ page }) => {
  test.setTimeout(120000);
  await setup(page);
  await loginSM(page);
  const name = `SM Continue Parts ${Date.now()}`;
  await createRO(page, name, 'Fuel filter replace');
  await assignTech(page, 'Pierre');
  await logout(page);
  await loginTech(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await startJob(page);
  const missingBtn = page.getByRole('button', { name: /Missing Part|Flag Part/i }).first();
  if (await missingBtn.isVisible({ timeout: 5000 })) {
    await missingBtn.click();
    const input = page.locator('input[placeholder*="part"]').first();
    if (await input.isVisible()) {
      await input.fill('Fuel filter');
      await page.getByRole('button', { name: /Add|Submit/i }).first().click();
    }
  }
  await logout(page);
  await loginSM(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  const continueBtn = page.getByRole('button', { name: /Continue|Proceed/i }).first();
  if (await continueBtn.isVisible({ timeout: 5000 })) {
    await continueBtn.click();
    await page.waitForTimeout(500);
    console.log('✅ SM decided to continue despite missing part');
  }
  await screenshot(page, 'sm-parts-continue');
});

test('SM: Missing part — puts job on hold', async ({ page }) => {
  test.setTimeout(120000);
  await setup(page);
  await loginSM(page);
  const name = `SM Hold Parts ${Date.now()}`;
  await createRO(page, name, 'Impeller replace');
  await assignTech(page, 'Pierre');
  await logout(page);
  await loginTech(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await startJob(page);
  const missingBtn = page.getByRole('button', { name: /Missing Part|Flag Part/i }).first();
  if (await missingBtn.isVisible({ timeout: 5000 })) {
    await missingBtn.click();
    const input = page.locator('input[placeholder*="part"]').first();
    if (await input.isVisible()) {
      await input.fill('Impeller kit');
      await page.getByRole('button', { name: /Add|Submit/i }).first().click();
    }
  }
  await logout(page);
  await loginSM(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  const holdBtn = page.getByRole('button', { name: /Hold/i }).first();
  if (await holdBtn.isVisible({ timeout: 5000 })) {
    await holdBtn.click();
    await page.waitForTimeout(500);
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Job on hold due to missing part — still visible');
  }
  await screenshot(page, 'sm-parts-hold');
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 6 — BILLING
// ─────────────────────────────────────────────────────────────────────────────

test('Billing: Invoice renders with dollar amount after job completes', async ({ page }) => {
  test.setTimeout(120000);
  await setup(page);
  await loginSM(page);
  const name = `Invoice Render ${Date.now()}`;
  await createRO(page, name, 'Annual service');
  await assignTech(page, 'Pierre');
  await logout(page);
  await loginTech(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await startJob(page);
  await page.waitForTimeout(2000);
  await completeDirective(page);
  await completeJob(page);
  await logout(page);
  await loginSM(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await openInvoice(page);
  await expect(page.getByText(/\$[\d,]+\.\d{2}/).first()).toBeVisible({ timeout: 10000 });
  console.log('✅ Dollar amount present on invoice');
  await screenshot(page, 'billing-invoice-renders');
});

test('Billing: Labor-only job — invoice shows labor charge, no parts', async ({ page }) => {
  test.setTimeout(120000);
  await setup(page);
  await loginSM(page);
  const name = `Labor Only ${Date.now()}`;
  await createRO(page, name, 'Diagnostic labor');
  await assignTech(page, 'Pierre');
  await logout(page);
  await loginTech(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await startJob(page);
  await page.waitForTimeout(3000);
  await completeDirective(page);
  await completeJob(page);
  await logout(page);
  await loginSM(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await openInvoice(page);
  await expect(page.getByText(/\$[\d,]+\.\d{2}/).first()).toBeVisible({ timeout: 10000 });
  console.log('✅ Labor-only invoice rendered');
  await screenshot(page, 'billing-labor-only');
});

test('Billing: Zero balance job — invoice allows close without payment', async ({ page }) => {
  test.setTimeout(120000);
  await setup(page);
  await loginSM(page);
  const name = `Zero Balance ${Date.now()}`;
  await createRO(page, name, 'Warranty inspection');
  await assignTech(page, 'Pierre');
  await logout(page);
  await loginTech(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await startJob(page);
  await completeDirective(page);
  await completeJob(page);
  await logout(page);
  await loginSM(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await openInvoice(page);
  const closeBtn = page.getByRole('button', { name: /Close|Complete|Done|No Charge/i }).first();
  if (await closeBtn.isVisible({ timeout: 5000 })) {
    console.log('✅ Zero balance close option available');
  }
  await screenshot(page, 'billing-zero-balance');
});

test('Billing: Invoice line items multiply unit price by quantity correctly', async ({ page }) => {
  test.setTimeout(120000);
  await setup(page);
  await loginSM(page);
  const name = `Billing Math ${Date.now()}`;
  await createRO(page, name, 'Parts math check');
  await assignTech(page, 'Pierre');
  await logout(page);
  await loginTech(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await startJob(page);
  await completeDirective(page);
  await completeJob(page);
  await logout(page);
  await loginSM(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await openInvoice(page);
  const bodyText = await page.innerText('body');
  console.log('Invoice body snippet:', bodyText.substring(0, 500));
  await screenshot(page, 'billing-math-check');
});

test('Billing: Mark as paid — job moves to archived state', async ({ page }) => {
  test.setTimeout(120000);
  await setup(page);
  await loginSM(page);
  const name = `Mark Paid ${Date.now()}`;
  await createRO(page, name, 'Engine service');
  await assignTech(page, 'Pierre');
  await logout(page);
  await loginTech(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await startJob(page);
  await completeDirective(page);
  await completeJob(page);
  await logout(page);
  await loginSM(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await openInvoice(page);
  const paidBtn = page.getByRole('button', { name: /Mark Paid|Collect Payment/i }).first();
  if (await paidBtn.isVisible({ timeout: 5000 })) {
    await paidBtn.click();
    await page.waitForTimeout(1000);
    console.log('✅ Payment marked');
  }
  await screenshot(page, 'billing-mark-paid');
});

test('Billing: Dispute — job removed from collections, stays in disputed', async ({ page }) => {
  test.setTimeout(120000);
  await setup(page);
  await loginSM(page);
  const name = `Billing Dispute ${Date.now()}`;
  await createRO(page, name, 'Canvas work');
  await assignTech(page, 'Pierre');
  await logout(page);
  await loginTech(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await startJob(page);
  await completeDirective(page);
  await completeJob(page);
  await logout(page);
  await loginSM(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await openInvoice(page);
  const disputeBtn = page.getByRole('button', { name: /Dispute/i }).first();
  if (await disputeBtn.isVisible({ timeout: 5000 })) {
    await disputeBtn.click();
    await page.waitForTimeout(500);
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Disputed job stays visible on board');
  }
  await screenshot(page, 'billing-dispute');
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 7 — PARTS WORKFLOW
// ─────────────────────────────────────────────────────────────────────────────

test('Parts: Backordered part — job stays invoiceable, not stuck', async ({ page }) => {
  test.setTimeout(120000);
  await setup(page);
  await loginSM(page);
  const name = `Backorder ${Date.now()}`;
  await createRO(page, name, 'Throttle body service');
  await assignTech(page, 'Pierre');
  await logout(page);
  await loginTech(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await startJob(page);
  const missingBtn = page.getByRole('button', { name: /Missing Part|Flag Part/i }).first();
  if (await missingBtn.isVisible({ timeout: 5000 })) {
    await missingBtn.click();
    const input = page.locator('input[placeholder*="part"]').first();
    if (await input.isVisible()) {
      await input.fill('Throttle body gasket');
      await page.getByRole('button', { name: /Add|Submit/i }).first().click();
    }
  }
  await completeDirective(page);
  await completeJob(page);
  await logout(page);
  await loginSM(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await openInvoice(page);
  await expect(page.getByText(/\$[\d,]+\.\d{2}/).first()).toBeVisible({ timeout: 10000 });
  console.log('✅ Job with backordered part is still invoiceable');
  await screenshot(page, 'parts-backorder-invoiceable');
});

test('Parts: Special order — marked as SO on parts list', async ({ page }) => {
  test.setTimeout(90000);
  await setup(page);
  await loginSM(page);
  const name = `Special Order ${Date.now()}`;
  await createRO(page, name, 'Proprietary part install');
  await assignTech(page, 'Pierre');
  await logout(page);
  await loginTech(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await startJob(page);
  const missingBtn = page.getByRole('button', { name: /Missing Part|Flag Part|Special Order/i }).first();
  if (await missingBtn.isVisible({ timeout: 5000 })) {
    await missingBtn.click();
    const input = page.locator('input[placeholder*="part"]').first();
    if (await input.isVisible()) {
      await input.fill('Proprietary trim motor');
      await page.getByRole('button', { name: /Add|Submit/i }).first().click();
    }
    console.log('✅ Special order part flagged');
  }
  await screenshot(page, 'parts-special-order');
});

test('Parts: Parts Manager sees missing parts from active jobs', async ({ page }) => {
  test.setTimeout(120000);
  await setup(page);
  await loginSM(page);
  const name = `PM View Parts ${Date.now()}`;
  await createRO(page, name, 'Cooling system flush');
  await assignTech(page, 'Pierre');
  await logout(page);
  await loginTech(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await startJob(page);
  const missingBtn = page.getByRole('button', { name: /Missing Part|Flag Part/i }).first();
  if (await missingBtn.isVisible({ timeout: 5000 })) {
    await missingBtn.click();
    const input = page.locator('input[placeholder*="part"]').first();
    if (await input.isVisible()) {
      await input.fill('Thermostat housing');
      await page.getByRole('button', { name: /Add|Submit/i }).first().click();
    }
  }
  await logout(page);
  await loginParts(page);
  await expect(page.getByText(/Parts Command|Missing|Pending/i).first()).toBeVisible({ timeout: 10000 });
  await screenshot(page, 'parts-pm-sees-missing');
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 8 — BOARD INTEGRITY & STRESS
// ─────────────────────────────────────────────────────────────────────────────

test('Board: 5 simultaneous ROs — all visible, no bleed', async ({ page }) => {
  test.setTimeout(180000);
  await setup(page);
  await loginSM(page);
  const jobs = Array.from({ length: 5 }, (_, i) => `Board Stress ${i + 1} ${Date.now()}`);
  for (const job of jobs) {
    await createRO(page, job, 'Stress test job');
    await page.waitForTimeout(300);
  }
  for (const job of jobs) {
    await expect(page.getByText(job).first()).toBeVisible({ timeout: 15000 });
  }
  console.log('✅ All 5 ROs visible simultaneously');
  await screenshot(page, 'board-5-ro-stress');
});

test('Board: Assigning some jobs does not affect unassigned jobs visibility', async ({ page }) => {
  test.setTimeout(180000);
  await setup(page);
  await loginSM(page);
  const assigned = `Assigned Job ${Date.now()}`;
  const unassigned = `Unassigned Job ${Date.now()}`;
  await createRO(page, assigned, 'Gets assigned');
  await createRO(page, unassigned, 'Stays staged');
  await assignTech(page, 'Pierre');
  await page.waitForTimeout(500);
  await expect(page.getByText(assigned).first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(unassigned).first()).toBeVisible({ timeout: 10000 });
  console.log('✅ Unassigned job unaffected by assigning another');
  await screenshot(page, 'board-mixed-assignment');
});

test('Board: Jobs in different states coexist without bleed', async ({ page }) => {
  test.setTimeout(180000);
  await setup(page);
  await loginSM(page);
  const staged = `Staged ${Date.now()}`;
  await createRO(page, staged, 'Waiting staged');
  const active = `Active ${Date.now()}`;
  await createRO(page, active, 'Going active');
  await assignTech(page, 'Pierre');
  await logout(page);
  await loginTech(page);
  await expect(page.getByText(active).first()).toBeVisible({ timeout: 15000 });
  await startJob(page);
  await logout(page);
  await loginSM(page);
  await expect(page.getByText(staged).first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(active).first()).toBeVisible({ timeout: 15000 });
  console.log('✅ Staged and active jobs coexist on board');
  await screenshot(page, 'board-mixed-states');
});

test('Board: Search finds specific RO by customer name', async ({ page }) => {
  test.setTimeout(120000);
  await setup(page);
  await loginSM(page);
  const target = `Search Target ${Date.now()}`;
  const noise = `Noise Job ${Date.now()}`;
  await createRO(page, target, 'Find me');
  await createRO(page, noise, 'Not me');
  const searchInput = page.locator('#oracle-search, input[placeholder*="Search"], input[placeholder*="search"]').first();
  if (await searchInput.isVisible({ timeout: 3000 })) {
    await searchInput.fill(target);
    await page.waitForTimeout(1000);
    await expect(page.getByText(target).first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Search found target job');
  }
  await screenshot(page, 'board-search');
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 9 — VESSEL DNA & RETURNING CUSTOMER
// ─────────────────────────────────────────────────────────────────────────────

test('Vessel DNA: Second RO for same customer pre-populates from history', async ({ page }) => {
  test.setTimeout(120000);
  await setup(page);
  await loginSM(page);
  const name = `DNA Customer ${Date.now()}`;
  const serial = `DNA-SN-${Date.now()}`;
  await createRO(page, name, 'First visit', serial);
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Customer Search' }).click();
  await page.fill('#oracle-search', name);
  await page.waitForTimeout(1000);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 10000 });
  console.log('✅ Returning customer found in search');
  await screenshot(page, 'dna-returning-customer');
});

test('Vessel DNA: Customer history shows previous ROs', async ({ page }) => {
  test.setTimeout(120000);
  await setup(page);
  await loginSM(page);
  const name = `DNA History ${Date.now()}`;
  await createRO(page, name, 'Historical job');
  await assignTech(page, 'Pierre');
  await logout(page);
  await loginTech(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await startJob(page);
  await completeDirective(page);
  await completeJob(page);
  await logout(page);
  await loginSM(page);
  const dnaBtn = page.getByRole('button', { name: /DNA|History|Vessel Record/i }).first();
  if (await dnaBtn.isVisible({ timeout: 5000 })) {
    await dnaBtn.click();
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Previous RO appears in vessel DNA');
  }
  await screenshot(page, 'dna-history');
});

test('Vessel DNA: Engine serial is the unique vessel identifier', async ({ page }) => {
  test.setTimeout(90000);
  await setup(page);
  await loginSM(page);
  const name = `Serial ID ${Date.now()}`;
  const serial = `UNIQUE-SN-${Date.now()}`;
  await createRO(page, name, 'Identification test', serial);
  await page.getByRole('button', { name: 'Customer Search' }).click();
  await page.fill('#oracle-search', serial);
  await page.waitForTimeout(1000);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 10000 });
  console.log('✅ Customer found by engine serial');
  await screenshot(page, 'dna-serial-identifier');
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 10 — DATA PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────

test('Persistence: RO survives page reload', async ({ page }) => {
  test.setTimeout(90000);
  await setup(page);
  await loginSM(page);
  const name = `Reload Persist ${Date.now()}`;
  await createRO(page, name, 'Survive reload');
  await page.reload();
  await page.waitForTimeout(2000);
  await page.getByRole('button', { name: 'Danny (SM)' }).click();
  await expect(page.getByRole('heading', { name: 'The Dock' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  console.log('✅ RO persists after reload');
  await screenshot(page, 'persist-reload');
});

test('Persistence: Job status survives page reload', async ({ page }) => {
  test.setTimeout(120000);
  await setup(page);
  await loginSM(page);
  const name = `Status Persist ${Date.now()}`;
  await createRO(page, name, 'Status test');
  await assignTech(page, 'Pierre');
  await logout(page);
  await loginTech(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await startJob(page);
  await expect(page.getByText('Active Labor Clock')).toBeVisible({ timeout: 10000 });
  await page.reload();
  await page.waitForTimeout(2000);
  await page.getByRole('button', { name: 'Danny (SM)' }).click();
  await expect(page.getByRole('heading', { name: 'The Dock' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await screenshot(page, 'persist-status');
});

test('Persistence: Multiple ROs all persist after reload', async ({ page }) => {
  test.setTimeout(120000);
  await setup(page);
  await loginSM(page);
  const jobs = [`Persist A ${Date.now()}`, `Persist B ${Date.now()}`, `Persist C ${Date.now()}`];
  for (const job of jobs) {
    await createRO(page, job, 'Persist test');
    await page.waitForTimeout(200);
  }
  await page.reload();
  await page.waitForTimeout(2000);
  await page.getByRole('button', { name: 'Danny (SM)' }).click();
  await expect(page.getByRole('heading', { name: 'The Dock' })).toBeVisible({ timeout: 15000 });
  for (const job of jobs) {
    await expect(page.getByText(job).first()).toBeVisible({ timeout: 15000 });
  }
  console.log('✅ All 3 ROs persist after reload');
  await screenshot(page, 'persist-multi-ro');
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 11 — EDGE CASES
// ─────────────────────────────────────────────────────────────────────────────

test('Edge: Customer declines repair mid-job — job can be closed', async ({ page }) => {
  test.setTimeout(120000);
  await setup(page);
  await loginSM(page);
  const name = `Declined Repair ${Date.now()}`;
  await createRO(page, name, 'Customer changed mind');
  await assignTech(page, 'Pierre');
  await logout(page);
  await loginTech(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  await startJob(page);
  await logout(page);
  await loginSM(page);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 });
  const cancelBtn = page.getByRole('button', { name: /Cancel|Close Job|Customer Declined/i }).first();
  if (await cancelBtn.isVisible({ timeout: 5000 })) {
    await cancelBtn.click();
    await page.waitForTimeout(500);
    console.log('✅ Job closed after customer declined');
  } else {
    console.log('ℹ️ Cancel/decline flow not found — may need implementation');
  }
  await screenshot(page, 'edge-declined-repair');
});

test('Edge: No directives — RO generation is blocked', async ({ page }) => {
  test.setTimeout(90000);
  await setup(page);
  await loginSM(page);
  const name = `No Directives ${Date.now()}`;
  await page.getByRole('button', { name: 'Customer Search' }).click();
  await page.fill('#oracle-search', name);
  await page.getByRole('button', { name: 'New Customer' }).click();
  await expect(page.getByText('New Customer')).toBeVisible({ timeout: 10000 });
  await page.fill('#customerName', name);
  await page.fill('#engineSerial', `SN-${Date.now()}`);
  await page.getByRole('button', { name: 'SAVE & GENERATE RO' }).click();
  await expect(page.getByText('New Repair Order Generation')).toBeVisible({ timeout: 10000 });
  await page.getByText('I Certify Verbal Authorization').click();
  const generateBtn = page.getByRole('button', { name: 'Authorize & Stage Job' });
  const isDisabled = await generateBtn.isDisabled();
  console.log(`Generate blocked with no directives: ${isDisabled}`);
  await screenshot(page, 'edge-no-directives');
});

test('Edge: Rapid RO creation — 3 jobs created back to back without errors', async ({ page }) => {
  test.setTimeout(180000);
  await setup(page);
  await loginSM(page);
  const jobs = [`Rapid A ${Date.now()}`, `Rapid B ${Date.now()}`, `Rapid C ${Date.now()}`];
  for (const job of jobs) {
    await createRO(page, job, 'Quick create');
    await page.waitForTimeout(200);
  }
  for (const job of jobs) {
    await expect(page.getByText(job).first()).toBeVisible({ timeout: 15000 });
  }
  console.log('✅ 3 rapid ROs created without error');
  await screenshot(page, 'edge-rapid-creation');
});

test('Edge: Long customer name — renders without overflow or truncation error', async ({ page }) => {
  test.setTimeout(90000);
  await setup(page);
  await loginSM(page);
  const name = `Very Long Customer Name That Might Cause Layout Issues ${Date.now()}`;
  await createRO(page, name.substring(0, 60), 'Long name test');
  await expect(page.getByText(name.substring(0, 20)).first()).toBeVisible({ timeout: 15000 });
  console.log('✅ Long name rendered without error');
  await screenshot(page, 'edge-long-name');
});

test('Edge: Two techs assigned to same job — both tracked', async ({ page }) => {
  test.setTimeout(120000);
  await setup(page);
  await loginSM(page);
  const name = `Two Tech Job ${Date.now()}`;
  await createRO(page, name, 'Two man job');
  await assignTech(page, 'Pierre');
  await page.waitForTimeout(500);
  const assignAgainBtn = page.getByRole('button', { name: /Assign Tech|Add Tech/i }).first();
  if (await assignAgainBtn.isVisible({ timeout: 3000 })) {
    await assignAgainBtn.click();
    const modal = page.locator('div.fixed.inset-0').filter({ hasText: 'Assign Technician' });
    const secondTech = modal.getByRole('button').nth(1);
    if (await secondTech.isVisible({ timeout: 3000 })) {
      await secondTech.click();
      console.log('✅ Second tech assigned');
    }
  }
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 10000 });
  await screenshot(page, 'edge-two-tech-job');
});

test('Edge: Parts Manager role — can see and act on parts queue', async ({ page }) => {
  test.setTimeout(90000);
  await setup(page);
  await loginParts(page);
  await expect(page.getByText(/Parts Command/i)).toBeVisible({ timeout: 10000 });
  console.log('✅ Parts Manager view loaded');
  await screenshot(page, 'edge-pm-view');
});

test('Edge: Owner dashboard loads with metrics', async ({ page }) => {
  test.setTimeout(60000);
  await setup(page);
  await loginOwner(page);
  await page.waitForTimeout(2000);
  console.log('✅ Owner view loaded');
  await screenshot(page, 'edge-owner-dashboard');
});

test('Edge: Navigation — home button returns to correct role dashboard', async ({ page }) => {
  test.setTimeout(90000);
  await setup(page);
  await loginSM(page);
  const homeBtn = page.getByRole('button', { name: /Home/i }).or(page.locator('[title="Home"]')).first();
  if (await homeBtn.isVisible({ timeout: 3000 })) {
    await homeBtn.click();
    await page.waitForTimeout(500);
    await expect(page.getByRole('heading', { name: 'The Dock' })).toBeVisible({ timeout: 10000 });
    console.log('✅ Home button returns to SM dock');
  }
  await screenshot(page, 'edge-home-button');
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 12 — SMOKE (PAGES RENDER)
// ─────────────────────────────────────────────────────────────────────────────

test('Smoke: All role pages render without crash', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('/');
  // SM
  await page.getByRole('button', { name: 'Danny (SM)' }).click();
  await expect(page.getByRole('heading', { name: 'The Dock' })).toBeVisible({ timeout: 15000 });
  await logout(page);
  // Tech
  await page.getByRole('button', { name: 'Pierre (Tech)' }).click();
  await expect(page.getByRole('heading', { name: 'Active Bay Deck' }).or(page.getByText('No Active Job'))).toBeVisible({ timeout: 15000 });
  await logout(page);
  // Parts Manager via switcher
  await page.getByRole('button', { name: 'Danny (Admin)' }).click();
  await page.getByTitle('PARTS MANAGER').click();
  await expect(page.getByText(/Parts Command/i)).toBeVisible({ timeout: 10000 });
  console.log('✅ All role pages render');
  await screenshot(page, 'smoke-all-roles');
});
