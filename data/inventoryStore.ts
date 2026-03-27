import { db } from '../localDb';
import { Part, InventoryAlert } from '../types';
import { shopContextService } from '../services/shopContextService';
import { supabase } from '../supabaseClient';

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

  loadFromSupabase: async (shopId: string): Promise<void> => {
    try {
      const { data: rows, error } = await supabase
        .from('master_inventory')
        .select('*')
        .eq('shop_id', shopId);

      if (error) { console.warn('Supabase inventory fetch failed:', error.message); return; }
      if (!rows || rows.length === 0) return;

      for (const row of rows) {
        const existing = await db.masterInventory.get([shopId, row.part_number]);
        if (!existing) {
          await db.masterInventory.put({
            shopId:          row.shop_id,
            partNumber:      row.part_number,
            description:     row.description ?? '',
            category:        row.category ?? '',
            binLocation:     row.bin_location ?? '',
            msrp:            row.msrp ?? 0,
            dealerPrice:     row.dealer_price ?? 0,
            cost:            row.cost ?? 0,
            quantityOnHand:  row.quantity_on_hand ?? 0,
            reorderPoint:    row.reorder_point ?? 0,
            supersedesPart:  row.supersedes_part ?? null,
          });
        }
      }
      console.log(`Hydrated ${rows.length} inventory records from Supabase`);
    } catch (err) {
      console.warn('Error in inventoryStore.loadFromSupabase:', err);
    }
  },
};
