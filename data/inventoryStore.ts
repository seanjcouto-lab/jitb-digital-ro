import { db } from '../localDb';
import { Part, InventoryAlert } from '../types';
import { shopContextService } from '../services/shopContextService';

export const inventoryStore = {
  getAll: async (shopId: string = shopContextService.getActiveShopId()) => {
    // Migration: ensure all records have a shopId
    const legacyCount = await db.masterInventory.filter(p => !p.shopId).count();
    if (legacyCount > 0) {
      await db.masterInventory.filter(p => !p.shopId).modify({ shopId: shopContextService.getDefaultShopId() });
    }
    return await db.masterInventory.where('shopId').equals(shopId).toArray();
  },
  updateQuantity: async (shopId: string, partNumber: string, newQuantity: number) => {
    await db.masterInventory.update([shopId, partNumber], { quantityOnHand: newQuantity });
  },
  makeAlert: (input: Omit<InventoryAlert, 'id' | 'timestamp'>) => ({
    ...input,
    id: `alert-${Date.now()}`,
    timestamp: Date.now(),
  }),
};
