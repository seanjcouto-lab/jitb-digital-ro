import { RepairOrder, ROStatus, PartStatus, Part, InventoryAlert, ClipboardEntry, RORequest } from '../types';
import { repairOrderService } from './repairOrderService';
import { inventoryService } from './inventoryService';
import { SERVICE_PACKAGES } from '../constants';
import { shopContextService } from './shopContextService';

export const PartsManagerService = {
  getOracleResults: (query: string, existingParts: Part[], masterInventory: Part[]) => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    const addedPartNumbers = existingParts.map(p => p.partNumber);
    
    const partResults = masterInventory.filter(part => 
        !addedPartNumbers.includes(part.partNumber) &&
        (part.partNumber.toLowerCase().includes(q) || part.description.toLowerCase().includes(q))
    ).map(p => ({ type: 'PART', payload: p }));

    const packageResults = Object.keys(SERVICE_PACKAGES)
        .filter(pkgName => pkgName.toLowerCase().includes(q))
        .map(pkgName => ({ type: 'PACKAGE', payload: { name: pkgName, parts: SERVICE_PACKAGES[pkgName as keyof typeof SERVICE_PACKAGES].parts } }));

    return [...partResults, ...packageResults].slice(0, 5);
  },

  addPartToRO: async (ro: RepairOrder, partData: Part, masterInventory: Part[]): Promise<RepairOrder | null> => {
    return await repairOrderService.addPartToRO(ro, partData, masterInventory);
  },

  addPackageToRO: async (ro: RepairOrder, pkg: { name: string, parts: { partNumber: string, qty: number }[] }, masterInventory: Part[]): Promise<RepairOrder> => {
    const newParts = pkg.parts
        .map(pInfo => masterInventory.find(m => m.partNumber === pInfo.partNumber))
        .filter((p): p is Part => !!p && !ro.parts.some(existing => existing.partNumber === p.partNumber))
        .map(p => ({ ...p, status: PartStatus.REQUIRED }));
    
    const clipboardEntriesToAdd = newParts.map(p => ({
        partNumber: p.partNumber,
        description: p.description,
        quantity: 1,
        timestamp: Date.now(),
        roId: ro.id,
    }));
    if (clipboardEntriesToAdd.length > 0) {
        await inventoryService.bulkAddToClipboard(clipboardEntriesToAdd);
    }
    
    const updatedParts = [...ro.parts, ...newParts];
    return { ...ro, parts: updatedParts };
  },

  addCustomPartToRO: async (ro: RepairOrder, query: string): Promise<RepairOrder | null> => {
    if (query.trim() === '') return null;
    const newCustomPart: Part = {
      partNumber: `CUSTOM-${Date.now()}`,
      description: query.trim(),
      category: 'CUSTOM',
      binLocation: 'N/A',
      msrp: 0,
      dealerPrice: 0,
      cost: 0,
      quantityOnHand: 0,
      reorderPoint: 0,
      supersedesPart: null,
      isCustom: true,
      status: PartStatus.REQUIRED,
      shopId: shopContextService.getActiveShopId(),
    };

    await inventoryService.addToClipboard({
        partNumber: newCustomPart.partNumber,
        description: newCustomPart.description,
        quantity: 1,
        timestamp: Date.now(),
        roId: ro.id
    });

    const updatedParts = [...ro.parts, newCustomPart];
    return { ...ro, parts: updatedParts };
  },

  approveRequest: async (
    masterInventory: Part[], 
    ro: RepairOrder, 
    requestId: string, 
    decision: 'FILL_FROM_STOCK' | 'SPECIAL_ORDER' | 'REJECT'
  ) => {
    return await repairOrderService.approvePartRequest(masterInventory, ro, requestId, decision);
  },

  fulfillRequest: async (
    ro: RepairOrder,
    requestId: string,
    masterInventory: Part[]
  ) => {
    return await repairOrderService.fulfillPartRequest(ro, requestId, masterInventory);
  },

  flagRequest: (
    ro: RepairOrder,
    requestId: string,
    status: 'MISSING' | 'SPECIAL_ORDER'
  ) => {
    return repairOrderService.flagPartRequestForApproval(ro, requestId, status);
  },

  updatePartStatus: async (
    ro: RepairOrder, 
    partIndex: number, 
    status: PartStatus, 
    masterInventory: Part[]
  ): Promise<{ updatedRO: RepairOrder, updatedInventory?: Part[], alertToAdd?: Omit<InventoryAlert, 'id' | 'timestamp'> }> => {
    return await repairOrderService.updatePartStatus(ro, partIndex, status, masterInventory);
  },

  confirmMissingPart: (
    ro: RepairOrder, 
    partIndex: number, 
    missingReason: string, 
    missingReasonNotes: string
  ): { updatedRO: RepairOrder, alert: Omit<InventoryAlert, 'id' | 'timestamp'> } => {
    return repairOrderService.confirmMissingPart(ro, partIndex, missingReason, missingReasonNotes);
  },

  removePart: async (
    ro: RepairOrder, 
    partIndex: number, 
    masterInventory: Part[]
  ): Promise<{ updatedRO: RepairOrder, updatedInventory?: Part[], alertToAdd?: Omit<InventoryAlert, 'id' | 'timestamp'> }> => {
    return await repairOrderService.removePartFromRO(ro, partIndex, masterInventory);
  },

  checkFulfillmentComplete: (ro: RepairOrder): { updatedRO: RepairOrder, soParts: Part[] } => {
    // Collect all special order parts
    const soParts = ro.parts.filter(p => p.status === PartStatus.SPECIAL_ORDER);
    
    if (soParts.length > 0) {
        return { updatedRO: ro, soParts };
    } else {
        // When PM clicks FULFILL: The job always returns to SM.
       return { updatedRO: { ...ro, status: ROStatus.READY_FOR_TECH }, soParts: [] };
    }
  },

  finalizeSpecialOrders: (ro: RepairOrder): RepairOrder => {
    // JOBS with S/O parts also return to SM for review
    return { ...ro, status: ROStatus.PARTS_REVIEWED };
  },

  returnPartToStock: async (
    ro: RepairOrder, 
    partIndex: number, 
    masterInventory: Part[]
  ): Promise<{ updatedRO: RepairOrder, updatedInventory?: Part[], alertToAdd?: Omit<InventoryAlert, 'id' | 'timestamp'> } | null> => {
    return await repairOrderService.returnPartToStock(ro, partIndex, masterInventory);
  },

  confirmNotUsed: (ro: RepairOrder, partIndex: number, reason: string, notes: string): RepairOrder => {
    return repairOrderService.confirmPartNotUsed(ro, partIndex, reason, notes);
  },

  getClipboardEntries: async () => {
    return await inventoryService.getClipboardEntries();
  },

  clearClipboard: async () => {
    await inventoryService.clearClipboard();
  },
  
  fetchMasterInventory: async (): Promise<Part[]> => {
      return await inventoryService.fetchMasterInventory();
  },

  updatePartDetails: (ro: RepairOrder, partIndex: number, updates: Partial<Part>): RepairOrder => {
    return repairOrderService.updatePartDetails(ro, partIndex, updates);
  }
};
