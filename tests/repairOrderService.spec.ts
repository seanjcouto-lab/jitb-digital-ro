import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ROStatus, PartStatus, PaymentStatus } from '../types';

// --- Mocks (must be hoisted before service import) ---
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
    addToClipboard: vi.fn(),
    bulkAddToClipboard: vi.fn(),
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

import { repairOrderService } from '../services/repairOrderService';
import { vesselService } from '../services/vesselService';
import { RepairOrderCreateInput } from '../types/RepairOrderCreateInput';

// --- Shared fixtures ---

const baseAddress = { street: '1 Main St', city: 'Newport', state: 'RI', zip: '02840' };

const makeRO = (overrides: any = {}) => ({
  id: 'RO-TEST-001',
  shopId: '00000000-0000-0000-0000-000000000001',
  customerName: 'Test Customer',
  customerPhones: ['4015550000'],
  customerEmails: ['test@test.com'],
  customerAddress: baseAddress,
  customerNotes: null,
  vesselName: 'Test Vessel',
  vesselHIN: 'HIN-TEST-001',
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
  boatMake: 'Boston Whaler',
  boatModel: 'Dauntless 17',
  boatYear: '2002',
  boatLength: '17',
  engineMake: 'Honda',
  engineModel: 'BF130',
  engineYear: '2002',
  engineHorsepower: '130',
  technicianId: null,
  technicianName: null,
  ...overrides,
});

const baseInput: RepairOrderCreateInput = {
  customerName: 'Test Customer',
  customerPhones: ['4015550000'],
  customerEmails: ['test@test.com'],
  customerAddress: baseAddress,
  customerNotes: null,
  vesselHIN: 'HIN-TEST-001',
  vesselName: 'Test Vessel',
  boatMake: 'Boston Whaler',
  boatModel: 'Dauntless 17',
  boatYear: '2002',
  boatLength: '17',
  engineMake: 'Honda',
  engineModel: null,
  engineYear: null,
  engineHorsepower: null,
  engineSerial: 'ENG-001',
  selectedPackages: [],
  manualParts: [],
  manualDirectives: [],
  shopId: '00000000-0000-0000-0000-000000000001',
};

// ---

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================
// createRepairOrder
// ============================================================

describe('repairOrderService.createRepairOrder', () => {
  it('sets status to READY_FOR_TECH when no parts', () => {
    const ro = repairOrderService.createRepairOrder({ ...baseInput, manualParts: [], selectedPackages: [] }, []);
    expect(ro.status).toBe(ROStatus.READY_FOR_TECH);
    expect(ro.parts).toHaveLength(0);
  });

  it('sets status to AUTHORIZED when required parts are present', () => {
    const inventory = [{
      partNumber: 'P-001', description: 'Test Part', category: 'General',
      binLocation: 'A1', msrp: 50, dealerPrice: 40, cost: 30,
      quantityOnHand: 5, reorderPoint: 2, supersedesPart: null,
      status: PartStatus.REQUIRED, isCustom: false, shopId: '00000000-0000-0000-0000-000000000001',
    }];
    const input = { ...baseInput, manualParts: [{ partNumber: 'P-001', description: 'Test Part' }] };
    const ro = repairOrderService.createRepairOrder(input, inventory);
    expect(ro.status).toBe(ROStatus.AUTHORIZED);
    expect(ro.parts).toHaveLength(1);
    expect(ro.parts[0].status).toBe(PartStatus.REQUIRED);
  });

  it('assigns an RO id with RO- prefix', () => {
    const ro = repairOrderService.createRepairOrder(baseInput, []);
    expect(ro.id).toMatch(/^RO-\d+$/);
  });
});

// ============================================================
// holdJob
// ============================================================

describe('repairOrderService.holdJob', () => {
  it('sets status to HOLD', () => {
    const ro = makeRO({ status: ROStatus.ACTIVE });
    const result = repairOrderService.holdJob(ro);
    expect(result.status).toBe(ROStatus.HOLD);
  });

  it('closes an open work session', () => {
    const ro = makeRO({
      status: ROStatus.ACTIVE,
      workSessions: [{ startTime: Date.now() - 60000 }], // no endTime
    });
    const result = repairOrderService.holdJob(ro);
    expect(result.workSessions[0].endTime).toBeDefined();
  });

  it('appends hold reason to customerNotes', () => {
    const ro = makeRO({ customerNotes: null });
    const result = repairOrderService.holdJob(ro, 'Waiting on parts');
    expect(result.customerNotes).toContain('Waiting on parts');
  });
});

// ============================================================
// finalizeInvoice
// ============================================================

describe('repairOrderService.finalizeInvoice', () => {
  it('sets status to COMPLETED and records invoiceTotal', async () => {
    (vesselService.getVesselByHIN as any).mockResolvedValue({ vesselHIN: 'HIN-TEST-001', pastROs: [] });
    (vesselService.addPastRO as any).mockResolvedValue(undefined);

    const ro = makeRO({ workSessions: [{ startTime: Date.now() - 3600000, endTime: Date.now() }] });
    const result = await repairOrderService.finalizeInvoice(ro, 100, 250);

    expect(result.status).toBe(ROStatus.COMPLETED);
    expect(result.invoiceTotal).toBe(250);
    expect(result.paymentStatus).toBe(PaymentStatus.UNPAID);
  });

  it('calls addPastRO when vessel already exists', async () => {
    (vesselService.getVesselByHIN as any).mockResolvedValue({ vesselHIN: 'HIN-TEST-001', pastROs: [] });
    (vesselService.addPastRO as any).mockResolvedValue(undefined);

    const ro = makeRO();
    await repairOrderService.finalizeInvoice(ro, 100, 300);

    expect(vesselService.addPastRO).toHaveBeenCalledWith('HIN-TEST-001', expect.objectContaining({ id: ro.id }));
    expect(vesselService.createVessel).not.toHaveBeenCalled();
  });

  it('calls createVessel when vessel does not exist', async () => {
    (vesselService.getVesselByHIN as any).mockResolvedValue(undefined);
    (vesselService.createVessel as any).mockResolvedValue(undefined);

    const ro = makeRO();
    await repairOrderService.finalizeInvoice(ro, 100, 300);

    expect(vesselService.createVessel).toHaveBeenCalledWith(expect.objectContaining({
      vesselHIN: 'HIN-TEST-001',
      customerName: 'Test Customer',
    }));
    expect(vesselService.addPastRO).not.toHaveBeenCalled();
  });

  it('falls back to engineSerial as vessel key when HIN is empty', async () => {
    (vesselService.getVesselByHIN as any).mockResolvedValue(undefined);
    (vesselService.createVessel as any).mockResolvedValue(undefined);

    const ro = makeRO({ vesselHIN: '' });
    await repairOrderService.finalizeInvoice(ro, 100, 300);

    expect(vesselService.getVesselByHIN).toHaveBeenCalledWith('ENG-001');
  });
});

// ============================================================
// processReviewRequest
// ============================================================

describe('repairOrderService.processReviewRequest', () => {
  const pendingPartRequest = {
    id: 'req-001',
    roId: 'RO-TEST-001',
    type: 'PART' as const,
    payload: { partNumber: 'P-001', description: 'Test Part' },
    status: 'PENDING' as const,
    requestedBy: 'TECHNICIAN' as const,
    timestamp: Date.now(),
  };

  it('APPROVED PART — sets part status to REQUIRED', () => {
    const ro = makeRO({
      parts: [{ partNumber: 'P-001', status: PartStatus.APPROVAL_PENDING }],
      requests: [pendingPartRequest],
    });
    const result = repairOrderService.processReviewRequest(ro, pendingPartRequest, 'APPROVED');
    const part = result.parts.find(p => p.partNumber === 'P-001');
    expect(part?.status).toBe(PartStatus.REQUIRED);
    expect(result.requests[0].status).toBe('APPROVED');
  });

  it('REJECTED PART — sets part status to DECLINED', () => {
    const ro = makeRO({
      parts: [{ partNumber: 'P-001', status: PartStatus.APPROVAL_PENDING }],
      requests: [pendingPartRequest],
    });
    const result = repairOrderService.processReviewRequest(ro, pendingPartRequest, 'REJECTED');
    const part = result.parts.find(p => p.partNumber === 'P-001');
    expect(part?.status).toBe(PartStatus.DECLINED);
    expect(result.requests[0].status).toBe('REJECTED');
  });

  it('APPROVED DIRECTIVE — sets isApproved to true', () => {
    const directiveRequest = {
      ...pendingPartRequest,
      id: 'req-002',
      type: 'DIRECTIVE' as const,
      payload: { title: 'REPLACE OIL FILTER' },
    };
    const ro = makeRO({
      directives: [{ id: 'd-tech-1', title: 'REPLACE OIL FILTER', isCompleted: false, isApproved: false }],
      requests: [directiveRequest],
    });
    const result = repairOrderService.processReviewRequest(ro, directiveRequest, 'APPROVED');
    const directive = result.directives.find(d => d.title === 'REPLACE OIL FILTER');
    expect(directive?.isApproved).toBe(true);
  });

  it('REJECTED DIRECTIVE — removes the directive', () => {
    const directiveRequest = {
      ...pendingPartRequest,
      id: 'req-003',
      type: 'DIRECTIVE' as const,
      payload: { title: 'REPLACE OIL FILTER' },
    };
    const ro = makeRO({
      directives: [{ id: 'd-tech-2', title: 'REPLACE OIL FILTER', isCompleted: false, isApproved: false }],
      requests: [directiveRequest],
    });
    const result = repairOrderService.processReviewRequest(ro, directiveRequest, 'REJECTED');
    expect(result.directives.find(d => d.title === 'REPLACE OIL FILTER')).toBeUndefined();
  });
});

// ============================================================
// confirmMissingPart
// ============================================================

describe('repairOrderService.confirmMissingPart', () => {
  it('sets part status to MISSING', () => {
    const ro = makeRO({
      parts: [{ partNumber: 'P-001', status: PartStatus.REQUIRED }],
    });
    const { updatedRO } = repairOrderService.confirmMissingPart(ro, 0, 'NOT_IN_STOCK', 'Out of stock');
    expect(updatedRO.parts[0].status).toBe(PartStatus.MISSING);
    expect(updatedRO.parts[0].missingReason).toBe('NOT_IN_STOCK');
  });

  it('sets RO status to PARTS_PENDING when RO was ACTIVE', () => {
    const ro = makeRO({
      status: ROStatus.ACTIVE,
      parts: [{ partNumber: 'P-001', status: PartStatus.REQUIRED }],
    });
    const { updatedRO } = repairOrderService.confirmMissingPart(ro, 0, 'NOT_IN_STOCK', '');
    expect(updatedRO.status).toBe(ROStatus.PARTS_PENDING);
  });

  it('preserves RO status when not ACTIVE', () => {
    const ro = makeRO({
      status: ROStatus.READY_FOR_TECH,
      parts: [{ partNumber: 'P-001', status: PartStatus.REQUIRED }],
    });
    const { updatedRO } = repairOrderService.confirmMissingPart(ro, 0, 'NOT_IN_STOCK', '');
    expect(updatedRO.status).toBe(ROStatus.READY_FOR_TECH);
  });

  it('returns an alert object with correct partNumber and roId', () => {
    const ro = makeRO({
      parts: [{ partNumber: 'P-001', description: 'Test Part', status: PartStatus.REQUIRED }],
    });
    const { alert } = repairOrderService.confirmMissingPart(ro, 0, 'NOT_IN_STOCK', '');
    expect(alert.partNumber).toBe('P-001');
    expect(alert.roId).toBe('RO-TEST-001');
  });
});
