import Dexie, { Table } from 'dexie';
import { RepairOrder, Part, VesselHistory, ClipboardEntry } from './types';
import { MASTER_INVENTORY, VESSEL_DNA_HISTORY } from './seedData';

export class LocalDatabase extends Dexie {
  repairOrders!: Table<RepairOrder, string>; // string is the type of the primary key 'id'
  masterInventory!: Table<Part, [string, string]>; // [string, string] is the type of the compound primary key [shopId, partNumber]
  vesselDnaHistory!: Table<VesselHistory, string>; // string is the type of the primary key 'vesselHIN'
  clipboard!: Table<ClipboardEntry, number>; // number is the type of the primary key 'id'

  constructor() {
    super('sccDatabase');
    (this as Dexie).version(7).stores({
      repairOrders: 'id, status, technicianId, shopId, [shopId+status]',
      masterInventory: '[shopId+partNumber], partNumber, description, category, shopId',
      vesselDnaHistory: 'vesselHIN, customerName, engineSerial, boatMake, boatModel',
      clipboard: '++id, partNumber, timestamp'
    });
  }
}

export const db = new LocalDatabase();

export async function seedDatabase() {
  const inventoryCount = await db.masterInventory.count();
  if (inventoryCount === 0) {
    console.log("Seeding master inventory...");
    await db.masterInventory.bulkAdd(MASTER_INVENTORY);
  }

  const dnaCount = await db.vesselDnaHistory.count();
  if (dnaCount === 0) {
    console.log("Seeding vessel DNA history...");
    await db.vesselDnaHistory.bulkAdd(VESSEL_DNA_HISTORY);
  }
}