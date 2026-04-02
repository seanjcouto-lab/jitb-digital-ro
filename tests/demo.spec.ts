import { test, Page } from '@playwright/test';
import { humanClick, humanType, humanHover, humanDelay, scenePause, slowSweep } from './demo-helpers';

const BASE = 'http://localhost:3000';
const SHOP_ID = '00000000-0000-0000-0000-000000000001';

test.use({
  viewport: { width: 1280, height: 800 },
  launchOptions: { slowMo: 50 },
});

// ─── SEED DATA ───────────────────────────────────────────────────────────────

function makeDemoRO(overrides: Record<string, any>) {
  const now = Date.now();
  return {
    id: `RO-${now}-${Math.random().toString(36).slice(2, 8)}`,
    customerName: 'Demo Customer',
    customerPhones: ['555-0100'],
    customerEmails: ['demo@jaxtr.dev'],
    customerAddress: { street: '100 Demo Marina Blvd', city: 'Demoport', state: 'FL', zip: '33101' },
    customerNotes: null,
    jobComplaint: null,
    vesselName: 'Demo Vessel',
    vesselHIN: `DEMO-HIN-${Math.random().toString(36).slice(2, 8)}`,
    engineSerial: `ENG-${Math.random().toString(36).slice(2, 8)}`,
    status: 'READY_FOR_TECH',
    parts: [],
    directives: [{ id: `d-${Date.now()}`, title: 'General service inspection', isCompleted: false }],
    workSessions: [],
    laborDescription: null,
    authorizationType: 'verbal',
    authorizationTimestamp: now - 3600000,
    authorizationData: null,
    invoiceTotal: null,
    paymentStatus: null,
    payments: null,
    dateInvoiced: null,
    datePaid: null,
    collectionsStatus: 'NONE',
    taxExempt: null,
    taxExemptId: null,
    boatMake: 'Grady-White',
    boatModel: 'Freedom 235',
    boatYear: '2021',
    boatLength: '23',
    engineMake: 'Yamaha',
    engineModel: 'F200',
    engineYear: '2021',
    engineHours: 420,
    engineHorsepower: '200',
    requests: [],
    technicianId: null,
    technicianName: null,
    shopId: SHOP_ID,
    scheduledDate: null,
    arrivalDate: null,
    ...overrides,
  };
}

async function seedDemoData(page: Page) {
  const now = Date.now();
  const ros = [
    makeDemoRO({
      customerName: 'Rivera Marine Group',
      vesselName: 'Sea Breeze',
      boatMake: 'Boston Whaler', boatModel: 'Montauk 190', boatYear: '2022',
      engineMake: 'Mercury', engineModel: 'FourStroke 150', engineSerial: 'MER-RVR-4401',
      status: 'READY_FOR_TECH',
      directives: [{ id: 'd-1', title: 'Lower unit service + gear oil change', isCompleted: false }],
      authorizationTimestamp: now - 7200000,
    }),
    makeDemoRO({
      customerName: 'Coastal Craft Services',
      vesselName: 'Tide Runner',
      boatMake: 'Robalo', boatModel: 'R230', boatYear: '2020',
      engineMake: 'Yamaha', engineModel: 'F250', engineSerial: 'YAM-CCS-8812',
      status: 'READY_FOR_TECH',
      directives: [
        { id: 'd-2a', title: 'Impeller replacement', isCompleted: false },
        { id: 'd-2b', title: 'Zinc anode inspection', isCompleted: false },
      ],
      authorizationTimestamp: now - 5400000,
    }),
    makeDemoRO({
      customerName: 'Anchor Point Charters',
      vesselName: 'Blue Marlin',
      boatMake: 'Pursuit', boatModel: 'S 328', boatYear: '2021',
      engineMake: 'Yamaha', engineModel: 'F300', engineSerial: 'YAM-APC-2207',
      status: 'AUTHORIZED',
      parts: [
        { partNumber: 'YAM-10W30-QT', description: 'Yamalube 4M 10W-30 (1 Qt)', category: 'Fluids', binLocation: 'B-12', msrp: 12.99, dealerPrice: 9.50, cost: 7.00, quantityOnHand: 24, reorderPoint: 6, quantity: 4, supersedesPart: null, status: 'REQUIRED', shopId: SHOP_ID },
        { partNumber: 'YAM-OIL-FILT', description: 'Yamaha Oil Filter Element', category: 'Filters', binLocation: 'C-04', msrp: 18.50, dealerPrice: 13.00, cost: 9.50, quantityOnHand: 8, reorderPoint: 3, quantity: 1, supersedesPart: null, status: 'REQUIRED', shopId: SHOP_ID },
        { partNumber: 'YAM-ANOD-KIT', description: 'Zinc Anode Kit (Lower Unit)', category: 'Anodes', binLocation: 'A-22', msrp: 45.00, dealerPrice: 32.00, cost: 22.00, quantityOnHand: 0, reorderPoint: 2, quantity: 1, supersedesPart: null, status: 'MISSING', missingReason: 'Out of stock', shopId: SHOP_ID },
      ],
      directives: [
        { id: 'd-parts-1', title: '300-hour service — oil + filter change', isCompleted: false },
        { id: 'd-parts-2', title: 'Replace lower unit anodes', isCompleted: false },
      ],
      authorizationTimestamp: now - 7200000,
    }),
    makeDemoRO({
      customerName: 'Palmetto Bay Yacht Club',
      vesselName: 'Island Time',
      boatMake: 'Cobia', boatModel: '280 CC', boatYear: '2023',
      engineMake: 'Suzuki', engineModel: 'DF300', engineSerial: 'SUZ-PBY-3309',
      status: 'ACTIVE',
      technicianId: 'tech-2', technicianName: 'Johnny',
      directives: [{ id: 'd-3', title: 'Trim tab hydraulic rebuild', isCompleted: false }],
      workSessions: [{ startTime: now - 1800000 }],
      authorizationTimestamp: now - 10800000,
    }),
    makeDemoRO({
      customerName: 'Harbor Freight Marina',
      vesselName: 'Gulf Star',
      boatMake: 'Yellowfin', boatModel: '36 Offshore', boatYear: '2019',
      engineMake: 'Mercury', engineModel: 'Verado 350', engineSerial: 'MER-HFM-7750',
      status: 'HOLD',
      technicianId: 'tech-3', technicianName: 'Isaiah',
      directives: [{ id: 'd-4', title: 'Steering cable replacement', isCompleted: false }],
      workSessions: [{ startTime: now - 86400000, endTime: now - 82800000 }],
      authorizationTimestamp: now - 172800000,
    }),
    makeDemoRO({
      customerName: 'Tidewater Holdings',
      vesselName: 'Salt Life',
      boatMake: 'Sea Hunt', boatModel: 'Gamefish 27', boatYear: '2022',
      engineMake: 'Yamaha', engineModel: 'F300', engineSerial: 'YAM-TWH-6621',
      status: 'PENDING_INVOICE',
      technicianId: 'tech-1', technicianName: 'Pierre',
      directives: [{ id: 'd-5', title: 'Full engine winterization', isCompleted: true, completionTimestamp: now - 3600000 }],
      workSessions: [{ startTime: now - 14400000, endTime: now - 7200000 }],
      laborDescription: 'Winterization complete. All fluids flushed, fogging oil applied, battery disconnected.',
      authorizationTimestamp: now - 259200000,
    }),
  ];

  await page.evaluate((data) => {
    return new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('sccDatabase', 9);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('repairOrders')) {
          db.createObjectStore('repairOrders', { keyPath: 'id' });
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('repairOrders', 'readwrite');
        const store = tx.objectStore('repairOrders');
        for (const ro of data) {
          store.put(ro);
        }
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
      };
      req.onerror = () => reject(req.error);
    });
  }, ros);
}

// ─── THE DEMO ────────────────────────────────────────────────────────────────

test('Jaxtr Demo — 4:30 Timed Walkthrough', async ({ page }) => {
  test.setTimeout(360_000); // 6-minute safety buffer

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENE 1 — OPEN (0:00 – 0:20)
  // Board loads with pre-seeded data. No clicks after login.
  // ═══════════════════════════════════════════════════════════════════════════

  await page.goto(BASE);
  // Clear any stale data, seed fresh demo data
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('sccDatabase');
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  });
  await seedDemoData(page);
  await page.reload();
  await page.waitForSelector('text=Test SM', { timeout: 15000 });
  await humanClick(page, 'text=Test SM');
  await page.waitForSelector('text=The Dock', { timeout: 15000 });

  // Let the board fully render — "This is JAXTR. This is the entire service operation in one screen."
  await scenePause(10000);

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENE 2 — ORIENTATION (0:20 – 0:50)
  // Slow cursor hover across each of the 5 column headers, left to right.
  // "Work flows left to right."
  // ═══════════════════════════════════════════════════════════════════════════

  await humanHover(page, 'text=STAGED', 5000);
  await humanHover(page, 'text=PARTS DEPT', 5000);
  await humanHover(page, 'text=DEPLOYMENT DECK', 5000);
  await humanHover(page, 'text=ON HOLD', 5000);
  await humanHover(page, 'h2:has-text("BILLING")', 5000);

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENE 3 — SCAN POWER (0:50 – 1:10)
  // Hover cards in DEPLOYMENT, PARTS, and HOLD to show details.
  // "I don't have to open anything."
  // ═══════════════════════════════════════════════════════════════════════════

  await humanHover(page, 'text=Palmetto Bay Yacht Club', 5500);
  await humanHover(page, 'text=Anchor Point Charters', 5000);
  await humanHover(page, 'text=Harbor Freight Marina', 5500);

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENE 4 — INTAKE (1:10 – 1:40)
  // Create a new RO for "Captain Marsh" through Customer Search.
  // ═══════════════════════════════════════════════════════════════════════════

  await humanClick(page, 'text=Customer Search');
  await page.waitForSelector('input[placeholder*="earch"]', { timeout: 8000 });
  await humanType(page, 'input[placeholder*="earch"]', 'NEWDEMO');
  await page.waitForSelector('text=New Customer', { timeout: 10000 });
  await humanClick(page, 'text=New Customer');
  await page.waitForSelector('text=SAVE & GENERATE RO', { timeout: 8000 });
  await scenePause(800);

  // ── CUSTOMER / ACCOUNT ──
  // Company Name
  const companyInput = page.locator('#companyName');
  if (await companyInput.isVisible()) {
    await companyInput.click();
    await page.keyboard.type('Marsh Marine Services', { delay: 65 });
    await scenePause(400);
  }

  // Full Name — clear pre-filled search term first
  await page.locator('#customerName').click({ clickCount: 3 });
  await humanDelay(200);
  await page.keyboard.type('Captain James Marsh', { delay: 65 });
  await scenePause(400);

  // Phone
  const phoneInput = page.locator('input[placeholder*="555-123"]').first();
  if (await phoneInput.isVisible()) {
    await phoneInput.click();
    await page.keyboard.type('305-555-0177', { delay: 65 });
    await scenePause(400);
  }

  // Email
  const emailInput = page.locator('input[placeholder*="user@example"]').first();
  if (await emailInput.isVisible()) {
    await emailInput.click();
    await page.keyboard.type('jmarsh@marshmarine.com', { delay: 55 });
    await scenePause(400);
  }

  // Address — Street
  const streetInput = page.locator('input[placeholder="Street"]').first();
  if (await streetInput.isVisible()) {
    await streetInput.scrollIntoViewIfNeeded();
    await streetInput.click();
    await page.keyboard.type('2800 Marina Mile Blvd', { delay: 60 });
    await scenePause(300);
  }

  // City, State, ZIP
  const cityInput = page.locator('input[placeholder="City"]').first();
  if (await cityInput.isVisible()) {
    await cityInput.click();
    await page.keyboard.type('Fort Lauderdale', { delay: 60 });
  }
  const stateInput = page.locator('input[placeholder="State"]').first();
  if (await stateInput.isVisible()) {
    await stateInput.click();
    await page.keyboard.type('FL', { delay: 80 });
  }
  const zipInput = page.locator('input[placeholder="ZIP"]').first();
  if (await zipInput.isVisible()) {
    await zipInput.click();
    await page.keyboard.type('33312', { delay: 80 });
    await scenePause(500);
  }

  // ── VESSEL ──
  const vesselNameInput = page.locator('input[placeholder*="Sea Breeze"]').first();
  if (await vesselNameInput.isVisible()) {
    await vesselNameInput.scrollIntoViewIfNeeded();
    await vesselNameInput.click();
    await page.keyboard.type('Reel Therapy', { delay: 70 });
    await scenePause(400);
  }

  const hinInput = page.locator('#vesselHin');
  if (await hinInput.isVisible()) {
    await hinInput.click();
    await page.keyboard.type('YFN32019H920', { delay: 50 });
    await scenePause(300);
  }

  // Boat Make / Model / Year — use evaluate to fill via DOM (visible typing for name fields above, fast fill for technical fields)
  // The form has duplicate labels (Make, Model, Year for both vessel and engine)
  // Use page.evaluate to reliably target by walking the form structure
  await page.evaluate(() => {
    const inputs = document.querySelectorAll('input');
    const arr = Array.from(inputs);
    // Find vessel fields by scanning labels near each input
    for (const input of arr) {
      const label = input.closest('div')?.querySelector('label');
      const section = input.closest('.bg-slate-800\\/40, [class*="bg-slate-800"]');
      if (!label || !section) continue;
      const labelText = label.textContent?.trim() || '';
      const sectionHeader = section.closest('.space-y-6')?.previousElementSibling?.textContent || '';

      // Vessel section fields
      if (sectionHeader.includes('Vessels')) {
        if (labelText === 'Make' && !input.value) { (input as HTMLInputElement).dispatchEvent(new Event('focus')); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, 'Yellowfin'); input.dispatchEvent(new Event('input', { bubbles: true })); }
        if (labelText === 'Model' && !input.value) { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, '32 Offshore'); input.dispatchEvent(new Event('input', { bubbles: true })); }
        if (labelText === 'Year' && !input.value) { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, '2019'); input.dispatchEvent(new Event('input', { bubbles: true })); }
        if (labelText === 'Length' && !input.value) { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, '32'); input.dispatchEvent(new Event('input', { bubbles: true })); }
      }
    }
  });
  await scenePause(600);

  // ── ENGINE — type visually for key fields ──
  // Engine S/N has a unique ID
  const serialInput = page.locator('#engineSerial');
  if (await serialInput.isVisible()) {
    await serialInput.scrollIntoViewIfNeeded();
    await serialInput.click();
    await page.keyboard.type('6CS-1042877', { delay: 55 });
    await scenePause(400);
  }

  // Fill remaining engine fields via evaluate (Make, Model, Year, HP, Hours)
  await page.evaluate(() => {
    const inputs = document.querySelectorAll('input');
    const arr = Array.from(inputs);
    let inEngineSection = false;
    for (const input of arr) {
      const label = input.closest('div')?.querySelector('label');
      const labelText = label?.textContent?.trim() || '';
      // Engine section is inside a bg-slate-900 container
      const isEngine = input.closest('.bg-slate-900\\/60, [class*="bg-slate-900/60"]') !== null;
      if (!isEngine) continue;
      if (labelText === 'Make' && !input.value) { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, 'Yamaha'); input.dispatchEvent(new Event('input', { bubbles: true })); }
      if (labelText === 'Model' && !input.value) { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, 'F300'); input.dispatchEvent(new Event('input', { bubbles: true })); }
      if (labelText === 'Year' && !input.value) { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, '2019'); input.dispatchEvent(new Event('input', { bubbles: true })); }
      if (labelText === 'Horsepower' && !input.value) { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, '300'); input.dispatchEvent(new Event('input', { bubbles: true })); }
      if (labelText === 'Engine Hours' && !input.value) { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, '847'); input.dispatchEvent(new Event('input', { bubbles: true })); }
    }
  });
  await scenePause(500);

  // ── SAVE & AUTHORIZE ──
  await humanClick(page, 'text=SAVE & GENERATE RO');
  await page.waitForSelector('text=Authorize & Stage Job', { timeout: 10000 });
  await scenePause(1500);

  // Verbal authorization
  const verbalCheckbox = page.locator('#verbalAuth');
  if (await verbalCheckbox.count() > 0) {
    await verbalCheckbox.scrollIntoViewIfNeeded();
    await verbalCheckbox.check({ force: true });
  }
  await scenePause(800);

  const authBtn = page.locator('button:has-text("Authorize & Stage Job")');
  await authBtn.scrollIntoViewIfNeeded();
  await authBtn.click();

  await page.waitForSelector('text=Customer Search', { timeout: 15000 });
  await scenePause(3000); // "We create a job once… and it never leaves the system."

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENE 5 — ASSIGN TECH (1:40 – 2:10)
  // Assign Pierre to the new RO. Card moves to DEPLOYMENT.
  // "Assign a technician… and it moves directly into active workflow."
  // ═══════════════════════════════════════════════════════════════════════════

  // Find Captain Marsh card and click ASSIGN TECH
  await page.locator('text=Captain James Marsh').first().scrollIntoViewIfNeeded();
  await humanHover(page, 'text=Captain James Marsh', 2500);

  await page.locator('button:has-text("ASSIGN TECH")').first().waitFor({ state: 'visible', timeout: 15000 });
  await humanClick(page, 'button:has-text("ASSIGN TECH")');
  await page.waitForSelector('text=Assign Technician', { timeout: 8000 });
  await scenePause(2000); // viewer sees the tech modal
  await humanClick(page, 'button:has-text("Pierre")');
  await scenePause(3000); // viewer sees card move to DEPLOYMENT with TECH: PIERRE

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENE 6 — ACTIVE WORK (2:10 – 2:40)
  // Switch to technician view. Show Active Bay Deck.
  // ═══════════════════════════════════════════════════════════════════════════

  await humanClick(page, 'button[title="TECHNICIAN"]');
  await scenePause(1000);

  // Handle bay selection if prompted
  if (await page.locator('text=Select Technician Bay').isVisible()) {
    await humanClick(page, 'button:has-text("Pierre")');
    await scenePause(1000);
  }

  // Click the queued job to start it
  const queueCard = page.locator('text=Captain James Marsh').first();
  if (await queueCard.isVisible()) {
    await humanClick(page, 'text=Captain James Marsh');
    await scenePause(500);
  }

  const startJobBtn = page.locator('button:has-text("START JOB")').first();
  if (await startJobBtn.count() > 0 && await startJobBtn.isVisible()) {
    await humanClick(page, 'button:has-text("START JOB")');
    await scenePause(500);
  }

  const startClockBtn = page.locator('button:has-text("Start Job Clock")').first();
  if (await startClockBtn.count() > 0 && await startClockBtn.isVisible()) {
    await humanClick(page, 'button:has-text("Start Job Clock")');
    await scenePause(500);
  }

  // Dwell on the Active Bay Deck — "This is where the shop actually makes money."
  await humanHover(page, 'text=Active Bay Deck', 4500);
  await humanHover(page, 'text=Service Directives', 4500);
  await scenePause(2000);

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENE 7 — PARTS ISSUE (2:40 – 3:05)
  // Hover the parts/requisition section to show it exists.
  // "The system surfaces the problem immediately."
  // ═══════════════════════════════════════════════════════════════════════════

  await humanHover(page, 'text=Log Requisitions', 4500);
  await humanHover(page, 'text=Add Directive Request', 4000);
  await scenePause(2500);

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENE 8 — HOLD (3:05 – 3:30)
  // Halt the job. Switch back to SM. Card now in ON HOLD.
  // ═══════════════════════════════════════════════════════════════════════════

  const haltBtn = page.locator('button:has-text("Halt")').first();
  if (await haltBtn.count() > 0 && await haltBtn.isEnabled()) {
    await haltBtn.scrollIntoViewIfNeeded();
    await humanClick(page, 'button:has-text("Halt")');
    await page.waitForSelector('text=Halt Job Protocol', { timeout: 10000 });
    await scenePause(1500);
    await humanType(page, 'textarea[placeholder*="Waiting on special tool"]', 'Waiting on special order impeller — ETA 3 days');
    await scenePause(1000);
    await humanClick(page, 'button:has-text("Confirm Halt")');
    await scenePause(2000);
  }

  // Switch back to SM board — "I don't lose it… I control it."
  await humanClick(page, 'button[title="SERVICE MANAGER"]');
  await page.waitForSelector('text=The Dock', { timeout: 10000 });
  await scenePause(5000);

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENE 9 — CONTROL STATEMENT (3:30 – 3:55)
  // Panoramic slow cursor sweep across the entire board.
  // ═══════════════════════════════════════════════════════════════════════════

  await scenePause(2500);
  // "What's being worked on? What's stuck? What's making me money?"
  await slowSweep(page, 80, 1200, 400, 14000);
  await scenePause(4000);

  // Quick re-hover of each column — one per question
  await humanHover(page, 'text=DEPLOYMENT DECK', 4000);
  await humanHover(page, 'text=ON HOLD', 4000);
  await humanHover(page, 'h2:has-text("BILLING")', 4000);

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENE 10 — BILLING (3:55 – 4:15)
  // Show the BILLING column with the pre-seeded Tidewater Holdings card.
  // ═══════════════════════════════════════════════════════════════════════════

  // "Once the work is done… it moves straight to billing."
  await humanHover(page, 'h2:has-text("BILLING")', 4000);
  await humanHover(page, 'text=Tidewater Holdings', 4000);

  // Expand the billing card
  const billingCard = page.locator('text=Tidewater Holdings').first();
  if (await billingCard.isVisible()) {
    await humanClick(page, 'text=Tidewater Holdings');
    await scenePause(3500);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENE 11 — SEARCH + CLOSE (4:15 – 4:40)
  // Quick customer search, return to board, hold on final frame.
  // "And if I need anything… I can find any job instantly."
  // ═══════════════════════════════════════════════════════════════════════════

  await humanClick(page, 'text=Customer Search');
  await page.waitForSelector('input[placeholder*="earch"]', { timeout: 8000 });
  await humanType(page, 'input[placeholder*="earch"]', 'Rivera');
  await scenePause(2000);

  // Hover the search result
  const searchResult = page.locator('text=Rivera Marine Group').first();
  if (await searchResult.isVisible()) {
    await humanHover(page, 'text=Rivera Marine Group', 2500);
  }

  // Return to full board
  const homeBtn = page.locator('button[title="SERVICE MANAGER"]').first();
  if (await homeBtn.count() > 0) {
    await humanClick(page, 'button[title="SERVICE MANAGER"]');
  }
  await scenePause(2000);

  // ═══════════════════════════════════════════════════════════════════════════
  // FINAL HOLD — "That's JAXTR."
  // "The entire shop runs from this screen."
  // ═══════════════════════════════════════════════════════════════════════════

  // Slow sweep to center of board — "The entire shop runs from this screen."
  await slowSweep(page, 1200, 640, 400, 5000);
  // Pause. "That's JAXTR."
  await scenePause(10000); // final hold — recording ends here
});
