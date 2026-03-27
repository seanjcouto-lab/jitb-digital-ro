import { Part, InventoryAlert, ClipboardEntry } from '../types';
import { db } from '../localDb';
import { inventoryStore } from '../data/inventoryStore';
import { domainEventService } from './domainEventService';
import { syncInventoryToSupabase } from '../utils/supabaseSync';

export const inventoryService = {
  getFilteredInventory: (inventory: Part[], query: string): Part[] => {
    if (!query) return inventory;
    const q = query.toLowerCase();
    return inventory.filter(p => p.description.toLowerCase().includes(q) || p.partNumber.toLowerCase().includes(q));
  },

  getLowStockItems: (inventory: Part[]): Part[] => {
    return inventory.filter(p => p.quantityOnHand <= p.reorderPoint && p.reorderPoint > 0);
  },

  fetchMasterInventory: async (): Promise<Part[]> => {
    return await db.masterInventory.toArray();
  },

  updateQuantity: async (
    shopId: string,
    partNumber: string,
    newQuantity: number
  ): Promise<void> => {
    await inventoryStore.updateQuantity(shopId, partNumber, newQuantity);
  },

  adjustInventory: async (
    masterInventory: Part[],
    partNumber: string,
    quantityChange: number,
    reason: string,
    roId: string,
    shopId: string
  ): Promise<{ updatedInventory: Part[], alertToAdd?: Omit<InventoryAlert, 'id' | 'timestamp'> } | null> => {
    const partToUpdate = masterInventory.find(p => p.partNumber === partNumber);
    if (!partToUpdate) return null;
    
    const newQuantity = partToUpdate.quantityOnHand + quantityChange;

    await inventoryStore.updateQuantity(shopId, partNumber, newQuantity);

    const updatedPart = { ...partToUpdate, quantityOnHand: newQuantity };
    syncInventoryToSupabase(updatedPart).catch(err => console.warn('Supabase inventory sync failed:', err));

    const updatedInventory = masterInventory.map(part =>
      part.partNumber === partNumber ? { ...part, quantityOnHand: newQuantity } : part
    );

    domainEventService.publish('inventory:adjusted', { partNumber, newQuantity, reason, roId, shopId });

    let alertToAdd: Omit<InventoryAlert, 'id' | 'timestamp'> | undefined;
    if (newQuantity <= partToUpdate.reorderPoint) {
      alertToAdd = {
        partNumber, 
        message: `Low stock: ${partToUpdate.description}`, 
        roId, 
        reason
      };
      domainEventService.publish('inventory:low-stock', alertToAdd);
    }

    return { updatedInventory, alertToAdd };
  },

  createAlert: (
    alertInput: Omit<InventoryAlert, 'id' | 'timestamp'>
  ) => {
    return inventoryStore.makeAlert(alertInput);
  },

  // Clipboard Management
  addToClipboard: async (entry: Omit<ClipboardEntry, 'id'>): Promise<void> => {
    await db.clipboard.add({
      ...entry,
      timestamp: entry.timestamp || Date.now()
    });
  },

  bulkAddToClipboard: async (entries: Omit<ClipboardEntry, 'id'>[]): Promise<void> => {
    await db.clipboard.bulkAdd(entries as ClipboardEntry[]);
  },

  getClipboardEntries: async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaysEntries = await db.clipboard.where('timestamp').aboveOrEqual(today.getTime()).toArray();
    
    type AggregatedEntry = { partNumber: string; description: string; quantity: number };
    const aggregated = todaysEntries.reduce<Record<string, AggregatedEntry>>((acc, entry) => {
        const partNum = entry.partNumber;
        if (!acc[partNum]) {
            acc[partNum] = {
                partNumber: partNum,
                description: entry.description,
                quantity: 0
            };
        }
        const current = acc[partNum];
        if (current) {
            current.quantity += entry.quantity;
        }
        return acc;
    }, {});
    
    return (Object.values(aggregated) as AggregatedEntry[]).filter(e => e.quantity > 0);
  },

  clearClipboard: async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await db.clipboard.where('timestamp').aboveOrEqual(today.getTime()).delete();
  }
};
