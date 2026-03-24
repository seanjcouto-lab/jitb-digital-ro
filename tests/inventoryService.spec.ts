import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * NOTE — checkReorderPoints:
 * There is no standalone checkReorderPoints function in inventoryService.
 * Reorder point checking is inline inside adjustInventory — when the new
 * quantity falls at or below reorderPoint, an alertToAdd is returned and
 * an 'inventory:low-stock' event is published.
 * Those paths are covered in the adjustInventory tests below.
 */

// --- Mocks ---

vi.mock('../data/inventoryStore', () => ({
  inventoryStore: {
    updateQuantity: vi.fn().mockResolvedValue(undefined),
    makeAlert: vi.fn((input: any) => ({ ...input, id: 'alert-1', timestamp: Date.now() })),
  },
}));

vi.mock('../services/domainEventService', () => ({
  domainEventService: {
    publish: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  },
}));

vi.mock('../localDb', () => ({
  db: {
    masterInventory: { toArray: vi.fn().mockResolvedValue([]) },
    clipboard: {
      add: vi.fn().mockResolvedValue(undefined),
      bulkAdd: vi.fn().mockResolvedValue(undefined),
      where: vi.fn(() => ({ aboveOrEqual: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]), delete: vi.fn().mockResolvedValue(undefined) })) })),
    },
  },
}));

import { inventoryService } from '../services/inventoryService';
import { domainEventService } from '../services/domainEventService';

// --- Shared fixture ---

const SHOP_ID = '00000000-0000-0000-0000-000000000001';

const makePart = (overrides: any = {}) => ({
  partNumber: 'P-001',
  description: 'Oil Filter',
  category: 'Filters',
  binLocation: 'A1',
  msrp: 25,
  dealerPrice: 20,
  cost: 15,
  quantityOnHand: 10,
  reorderPoint: 3,
  supersedesPart: null,
  isCustom: false,
  status: 'REQUIRED',
  shopId: SHOP_ID,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================
// getFilteredInventory
// ============================================================

describe('inventoryService.getFilteredInventory', () => {
  it('returns full inventory when query is empty', () => {
    const inventory = [makePart(), makePart({ partNumber: 'P-002', description: 'Fuel Filter' })];
    const result = inventoryService.getFilteredInventory(inventory, '');
    expect(result).toHaveLength(2);
  });

  it('filters by description (case-insensitive)', () => {
    const inventory = [
      makePart({ description: 'Oil Filter' }),
      makePart({ partNumber: 'P-002', description: 'Fuel Filter' }),
      makePart({ partNumber: 'P-003', description: 'Impeller Kit' }),
    ];
    const result = inventoryService.getFilteredInventory(inventory, 'filter');
    expect(result).toHaveLength(2);
    expect(result.every(p => p.description.toLowerCase().includes('filter'))).toBe(true);
  });

  it('filters by partNumber (case-insensitive)', () => {
    const inventory = [
      makePart({ partNumber: 'OIL-001', description: 'Oil Filter' }),
      makePart({ partNumber: 'FUEL-002', description: 'Fuel Filter' }),
    ];
    const result = inventoryService.getFilteredInventory(inventory, 'oil');
    expect(result).toHaveLength(1);
    expect(result[0].partNumber).toBe('OIL-001');
  });

  it('returns empty array when no matches', () => {
    const inventory = [makePart()];
    const result = inventoryService.getFilteredInventory(inventory, 'xyz-no-match');
    expect(result).toHaveLength(0);
  });
});

// ============================================================
// getLowStockItems (inline reorder check)
// ============================================================

describe('inventoryService.getLowStockItems', () => {
  it('returns parts at or below reorder point', () => {
    const inventory = [
      makePart({ partNumber: 'P-001', quantityOnHand: 2, reorderPoint: 3 }), // at threshold
      makePart({ partNumber: 'P-002', quantityOnHand: 1, reorderPoint: 3 }), // below threshold
      makePart({ partNumber: 'P-003', quantityOnHand: 5, reorderPoint: 3 }), // above threshold
    ];
    const result = inventoryService.getLowStockItems(inventory);
    expect(result).toHaveLength(2);
    expect(result.map(p => p.partNumber)).toContain('P-001');
    expect(result.map(p => p.partNumber)).toContain('P-002');
  });

  it('excludes parts with reorderPoint of 0 (no reorder configured)', () => {
    const inventory = [
      makePart({ quantityOnHand: 0, reorderPoint: 0 }),
    ];
    const result = inventoryService.getLowStockItems(inventory);
    expect(result).toHaveLength(0);
  });

  it('returns empty array when all stock is sufficient', () => {
    const inventory = [
      makePart({ quantityOnHand: 10, reorderPoint: 3 }),
    ];
    const result = inventoryService.getLowStockItems(inventory);
    expect(result).toHaveLength(0);
  });
});

// ============================================================
// adjustInventory
// ============================================================

describe('inventoryService.adjustInventory', () => {
  it('returns null when part is not found in inventory', async () => {
    const result = await inventoryService.adjustInventory([], 'P-MISSING', -1, 'Fulfillment', 'RO-001', SHOP_ID);
    expect(result).toBeNull();
  });

  it('returns updated inventory with new quantity', async () => {
    const inventory = [makePart({ quantityOnHand: 10 })];
    const result = await inventoryService.adjustInventory(inventory, 'P-001', -1, 'Fulfillment', 'RO-001', SHOP_ID);
    expect(result).not.toBeNull();
    const updated = result!.updatedInventory.find(p => p.partNumber === 'P-001');
    expect(updated?.quantityOnHand).toBe(9);
  });

  it('publishes inventory:adjusted event', async () => {
    const inventory = [makePart({ quantityOnHand: 10 })];
    await inventoryService.adjustInventory(inventory, 'P-001', -1, 'Fulfillment', 'RO-001', SHOP_ID);
    expect(domainEventService.publish).toHaveBeenCalledWith(
      'inventory:adjusted',
      expect.objectContaining({ partNumber: 'P-001', newQuantity: 9 })
    );
  });

  it('returns alertToAdd when new qty falls at or below reorderPoint', async () => {
    const inventory = [makePart({ quantityOnHand: 4, reorderPoint: 3 })];
    const result = await inventoryService.adjustInventory(inventory, 'P-001', -1, 'Fulfillment', 'RO-001', SHOP_ID);
    // new qty = 3, reorderPoint = 3 → triggers alert
    expect(result?.alertToAdd).toBeDefined();
    expect(result?.alertToAdd?.partNumber).toBe('P-001');
  });

  it('publishes inventory:low-stock event when reorder threshold is crossed', async () => {
    const inventory = [makePart({ quantityOnHand: 4, reorderPoint: 3 })];
    await inventoryService.adjustInventory(inventory, 'P-001', -1, 'Fulfillment', 'RO-001', SHOP_ID);
    expect(domainEventService.publish).toHaveBeenCalledWith(
      'inventory:low-stock',
      expect.objectContaining({ partNumber: 'P-001' })
    );
  });

  it('does NOT return alertToAdd when qty remains above reorderPoint', async () => {
    const inventory = [makePart({ quantityOnHand: 10, reorderPoint: 3 })];
    const result = await inventoryService.adjustInventory(inventory, 'P-001', -1, 'Fulfillment', 'RO-001', SHOP_ID);
    expect(result?.alertToAdd).toBeUndefined();
  });

  it('supports positive adjustments (restocking)', async () => {
    const inventory = [makePart({ quantityOnHand: 3 })];
    const result = await inventoryService.adjustInventory(inventory, 'P-001', 5, 'Restock', 'RO-001', SHOP_ID);
    const updated = result!.updatedInventory.find(p => p.partNumber === 'P-001');
    expect(updated?.quantityOnHand).toBe(8);
  });
});
