import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ROStatus, PartStatus } from '../types';

// --- Mocks ---
vi.mock('../services/vesselService', () => ({
  vesselService: {
    getVesselByHIN: vi.fn(),
    addPastRO: vi.fn(),
    createVessel: vi.fn(),
    flagUnresolvedIssues: vi.fn(),
  },
}));

vi.mock('../services/inventoryService', () => ({
  inventoryService: {
    adjustInventory: vi.fn(),
    addToClipboard: vi.fn().mockResolvedValue(undefined),
    bulkAddToClipboard: vi.fn().mockResolvedValue(undefined),
    checkReorderPoints: vi.fn(),
  },
}));

vi.mock('../services/domainEventService', () => ({
  domainEventService: {
    publish: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    clearAll: vi.fn(),
  },
}));

vi.mock('../services/shopContextService', () => ({
  shopContextService: {
    getActiveShopId: vi.fn(() => '00000000-0000-0000-0000-000000000001'),
    getDefaultShopId: vi.fn(() => '00000000-0000-0000-0000-000000000001'),
  },
}));

import { TechnicianService } from '../services/technicianService';
import { inventoryService } from '../services/inventoryService';
import { domainEventService } from '../services/domainEventService';

// --- Shared fixture ---

const makeRO = (overrides: any = {}) => ({
  id: 'RO-TEST-001',
  shopId: '00000000-0000-0000-0000-000000000001',
  customerName: 'Test Customer',
  customerPhones: [],
  customerEmails: [],
  customerAddress: { street: '', city: '', state: '', zip: '' },
  customerNotes: null,
  vesselName: 'Test Vessel',
  vesselHIN: 'HIN-001',
  engineSerial: 'ENG-001',
  status: ROStatus.READY_FOR_TECH,
  parts: [],
  directives: [],
  workSessions: [],
  requests: [],
  laborDescription: null,
  authorizationType: null,
  authorizationData: null,
  authorizationTimestamp: null,
  invoiceTotal: null,
  paymentStatus: null,
  payments: null,
  dateInvoiced: null,
  datePaid: null,
  collectionsStatus: 'NONE',
  boatMake: null, boatModel: null, boatYear: null, boatLength: null,
  engineMake: null, engineModel: null, engineYear: null, engineHorsepower: null,
  technicianId: 'tech-1',
  technicianName: 'Pierre',
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================
// startJob
// ============================================================

describe('TechnicianService.startJob', () => {
  it('sets RO status to ACTIVE', () => {
    const ro = makeRO({ status: ROStatus.READY_FOR_TECH, workSessions: [] });
    const result = TechnicianService.startJob(ro);
    expect(result.status).toBe(ROStatus.ACTIVE);
  });

  it('adds a new work session with a startTime', () => {
    const ro = makeRO({ workSessions: [] });
    const result = TechnicianService.startJob(ro);
    expect(result.workSessions).toHaveLength(1);
    expect(result.workSessions[0].startTime).toBeDefined();
    expect(result.workSessions[0].endTime).toBeUndefined();
  });

  it('publishes technician:labor-started event', () => {
    const ro = makeRO();
    TechnicianService.startJob(ro);
    expect(domainEventService.publish).toHaveBeenCalledWith(
      'technician:labor-started',
      expect.objectContaining({ roId: ro.id, technicianId: ro.technicianId })
    );
  });
});

// ============================================================
// completeDirective
// ============================================================

describe('TechnicianService.completeDirective', () => {
  it('marks the directive as completed', () => {
    const ro = makeRO({
      directives: [
        { id: 'dir-1', title: 'CHECK ENGINE', isCompleted: false, isApproved: true },
        { id: 'dir-2', title: 'TEST FUEL', isCompleted: false, isApproved: true },
      ],
    });
    const result = TechnicianService.completeDirective(ro, ro.directives[1]);
    expect(result.directives[1].isCompleted).toBe(true);
    expect(result.directives[0].isCompleted).toBe(false);
  });

  it('sets a completionTimestamp on the completed directive', () => {
    const ro = makeRO({
      directives: [{ id: 'dir-1', title: 'CHECK ENGINE', isCompleted: false, isApproved: true }],
    });
    const result = TechnicianService.completeDirective(ro, ro.directives[0]);
    expect(result.directives[0].completionTimestamp).toBeDefined();
  });
});

// ============================================================
// finalizeJob
// ============================================================

/**
 * ARCHITECTURAL NOTE — Known gap:
 * TechnicianService.finalizeJob does NOT enforce a service-level gate against
 * APPROVAL_PENDING parts. If a part is in APPROVAL_PENDING state, finalization
 * is not blocked here — the guard exists only in the UI (TechnicianPage).
 *
 * This is a known risk: the service layer can be called programmatically
 * (Parker, tests, future API) and will complete without enforcing part-state rules.
 *
 * Recommended fix (separate task): add a guard in technicianFinalizeJob or
 * completeJob in repairOrderService that throws if any part is APPROVAL_PENDING.
 */

describe('TechnicianService.finalizeJob', () => {
  it('sets RO status to PENDING_INVOICE', async () => {
    const ro = makeRO({
      status: ROStatus.ACTIVE,
      workSessions: [{ startTime: Date.now() - 3600000, endTime: Date.now() }],
    });
    const result = await TechnicianService.finalizeJob(ro, 'Job completed successfully.');
    expect(result.status).toBe(ROStatus.PENDING_INVOICE);
  });

  it('records the labor note', async () => {
    const ro = makeRO({ workSessions: [] });
    const result = await TechnicianService.finalizeJob(ro, 'All directives completed.');
    expect(result.laborDescription).toBe('All directives completed.');
  });

  it('closes any open work session', async () => {
    const ro = makeRO({
      workSessions: [{ startTime: Date.now() - 3600000 }], // no endTime
    });
    const result = await TechnicianService.finalizeJob(ro, 'Done.');
    expect(result.workSessions[0].endTime).toBeDefined();
  });

  it('APPROVAL_PENDING parts do NOT block finalization at service level — UI-only gate', async () => {
    const ro = makeRO({
      parts: [{ partNumber: 'P-001', status: PartStatus.APPROVAL_PENDING }],
      workSessions: [],
    });
    // This should complete without throwing — the gate is UI-enforced only
    const result = await TechnicianService.finalizeJob(ro, 'Done.');
    expect(result.status).toBe(ROStatus.PENDING_INVOICE);
  });
});

// ============================================================
// haltJob
// ============================================================

describe('TechnicianService.haltJob', () => {
  it('sets RO status to HOLD', () => {
    const ro = makeRO({ status: ROStatus.ACTIVE });
    const result = TechnicianService.haltJob(ro, 'Waiting for parts');
    expect(result.status).toBe(ROStatus.HOLD);
  });

  it('publishes technician:labor-ended event with reason halted', () => {
    const ro = makeRO();
    TechnicianService.haltJob(ro, 'Reason');
    expect(domainEventService.publish).toHaveBeenCalledWith(
      'technician:labor-ended',
      expect.objectContaining({ roId: ro.id, reason: 'halted' })
    );
  });
});

// ============================================================
// requestDirective
// ============================================================

describe('TechnicianService.requestDirective', () => {
  it('adds a pending directive with isApproved false', () => {
    const ro = makeRO({ directives: [], requests: [] });
    const result = TechnicianService.requestDirective(ro, 'replace impeller');
    const pending = result.directives.find(d => d.title === 'REPLACE IMPELLER');
    expect(pending).toBeDefined();
    expect(pending?.isApproved).toBe(false);
  });

  it('uppercases the directive title', () => {
    const ro = makeRO({ directives: [], requests: [] });
    const result = TechnicianService.requestDirective(ro, 'flush coolant system');
    expect(result.directives.some(d => d.title === 'FLUSH COOLANT SYSTEM')).toBe(true);
  });

  it('adds a PENDING request entry', () => {
    const ro = makeRO({ directives: [], requests: [] });
    const result = TechnicianService.requestDirective(ro, 'test throttle');
    expect(result.requests).toHaveLength(1);
    expect(result.requests[0].status).toBe('PENDING');
    expect(result.requests[0].type).toBe('DIRECTIVE');
  });
});

// ============================================================
// requestPart
// ============================================================

describe('TechnicianService.requestPart', () => {
  it('adds part to RO with APPROVAL_PENDING status', async () => {
    const ro = makeRO({ parts: [], requests: [] });
    const part = {
      partNumber: 'P-001', description: 'Oil Filter', category: 'Filters',
      binLocation: 'A1', msrp: 25, dealerPrice: 20, cost: 15,
      quantityOnHand: 3, reorderPoint: 1, supersedesPart: null,
      isCustom: false, status: PartStatus.REQUIRED,
      shopId: '00000000-0000-0000-0000-000000000001',
    };
    const result = await TechnicianService.requestPart(ro, part);
    const added = result.parts.find(p => p.partNumber === 'P-001');
    expect(added?.status).toBe(PartStatus.APPROVAL_PENDING);
  });

  it('calls inventoryService.addToClipboard', async () => {
    const ro = makeRO({ parts: [], requests: [] });
    const part = {
      partNumber: 'P-002', description: 'Fuel Filter', category: 'Filters',
      binLocation: 'B2', msrp: 30, dealerPrice: 25, cost: 18,
      quantityOnHand: 2, reorderPoint: 1, supersedesPart: null,
      isCustom: false, status: PartStatus.REQUIRED,
      shopId: '00000000-0000-0000-0000-000000000001',
    };
    await TechnicianService.requestPart(ro, part);
    expect(inventoryService.addToClipboard).toHaveBeenCalledWith(
      expect.objectContaining({ partNumber: 'P-002', roId: ro.id })
    );
  });
});
