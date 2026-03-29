import { test, expect } from '@playwright/test';

const loginAsAdmin = async (page) => {
  await page.getByRole('button', { name: 'Danny (Admin)' }).click();
  await expect(page.getByText('White-Label Configuration')).toBeVisible({ timeout: 15000 });
};

const navigateToSM = async (page) => {
  await page.getByTitle('SERVICE MANAGER').click();
  await expect(page.getByRole('heading', { name: 'The Dock' })).toBeVisible({ timeout: 10000 });
};

const navigateToPM = async (page) => {
  await page.getByTitle('PARTS MANAGER').click();
  await expect(page.getByRole('heading', { name: /Fulfillment Queue/i })).toBeVisible({ timeout: 10000 });
};

const createROWithPackage = async (page, customerName: string, packageName: string) => {
  await page.fill('#oracle-search', customerName);
  await page.getByRole('button', { name: 'New Customer' }).click();
  await expect(page.getByText('New Customer')).toBeVisible();
  await page.fill('#customerName', customerName);
  await page.fill('#engineSerial', `TEST-${Date.now()}`);
  await page.getByRole('button', { name: 'SAVE & GENERATE RO' }).click();
  await expect(page.getByText('New Repair Order Generation')).toBeVisible();
  await page.getByText(packageName).click();
  await page.getByText('I Certify Verbal Authorization').click();
  await page.getByRole('button', { name: 'Authorize & Stage Job' }).click();
  await expect(page.getByText(customerName).first()).toBeVisible({ timeout: 15000 });
};

test.describe('Parts Manager Workflow', () => {

  test.beforeEach(async ({ page }) => {
    // Do NOT block Supabase — inventory must hydrate from cloud
    await page.goto('/');
    await page.evaluate(() => new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('sccDatabase');
      req.onsuccess = () => resolve();
      req.onerror   = () => resolve();
      req.onblocked = () => resolve();
    }));
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible({ timeout: 15000 });
  });

  test.skip('ACTIVE RO with MISSING part stays visible in PM Awaiting Parts', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToSM(page);

    const customerName = `Missing Part Test ${Date.now()}`;
    await createROWithPackage(page, customerName, '100-Hour Service');
    await page.locator('.bg-white\\/5').filter({ hasText: customerName }).getByRole('button', { name: 'Send to Parts Dept' }).click();
    await page.waitForTimeout(500);
    await navigateToPM(page);

    const roCard = page.locator('.bg-white\\/5').filter({ hasText: customerName }).first();
    await expect(roCard).toBeVisible({ timeout: 10000 });
    await roCard.click();
    await page.waitForTimeout(500);

    await roCard.getByRole('button', { name: /Missing/i }).first().click();
    await page.getByRole('combobox').selectOption({ index: 1 });
    await page.getByRole('button', { name: /Confirm/i }).click();
    await page.waitForTimeout(500);

    await expect(page.getByRole('heading', { name: /Awaiting Parts/i })).toBeVisible();
    await expect(page.getByText(customerName)).toBeVisible({ timeout: 10000 });
  });

  test.skip('ACTIVE RO with S/O part stays visible in PM Awaiting Parts after order placed', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToSM(page);

    const customerName = `SO Test ${Date.now()}`;
    await createROWithPackage(page, customerName, '300-Hour Service');
    await page.locator('.bg-white\\/5').filter({ hasText: customerName }).getByRole('button', { name: 'Send to Parts Dept' }).click();
    await page.waitForTimeout(500);
    await navigateToPM(page);

    const roCard = page.locator('.bg-white\\/5').filter({ hasText: customerName }).first();
    await expect(roCard).toBeVisible({ timeout: 10000 });
    await roCard.click();
    await page.waitForTimeout(500);

    await roCard.getByRole('button', { name: /S\/O|Special Order/i }).first().click();
    await page.waitForTimeout(500);

    await expect(page.getByRole('heading', { name: /Awaiting Parts/i })).toBeVisible();
    await expect(page.getByText(customerName)).toBeVisible({ timeout: 10000 });
  });

  test('Awaiting Parts queue is empty when no unresolved parts exist', async ({ page }) => {
    await page.route('**supabase.co**', route => route.abort());
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible({ timeout: 15000 });
    await loginAsAdmin(page);
    await navigateToPM(page);
    await expect(page.getByText('No jobs with missing or special order parts.')).toBeVisible({ timeout: 10000 });
  });

  test('Fulfillment queue heading visible on PM page', async ({ page }) => {
    await page.route('**supabase.co**', route => route.abort());
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible({ timeout: 15000 });
    await loginAsAdmin(page);
    await navigateToPM(page);
    await expect(page.getByRole('heading', { name: /Fulfillment Queue/i })).toBeVisible({ timeout: 10000 });
  });

});
