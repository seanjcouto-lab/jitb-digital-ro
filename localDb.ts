import Dexie, { Table } from 'dexie';
import { RepairOrder, Part, VesselHistory, ClipboardEntry, Company, Contact, Vessel, Engine, MediaRecord } from './types';
// import { MASTER_INVENTORY, VESSEL_DNA_HISTORY } from './seedData';

export class LocalDatabase extends Dexie {
  repairOrders!: Table<RepairOrder, string>; // string is the type of the primary key 'id'
  masterInventory!: Table<Part, [string, string]>; // [string, string] is the type of the compound primary key [shopId, partNumber]
  vesselDnaHistory!: Table<VesselHistory, string>; // string is the type of the primary key 'vesselHIN'
  clipboard!: Table<ClipboardEntry, number>; // number is the type of the primary key 'id'
  companies!: Dexie.Table<Company, string>;
  contacts!: Dexie.Table<Contact, string>;
  vessels!: Dexie.Table<Vessel, string>;
  engines!: Dexie.Table<Engine, string>;
  mediaStore!: Dexie.Table<MediaRecord, string>;

  constructor() {
    super('sccDatabase');
    (this as Dexie).version(11).stores({
      repairOrders: 'id, status, technicianId, shopId, scheduledDate, arrivalDate, estimatedPickupDate, [shopId+status]',
      masterInventory: '[shopId+partNumber], partNumber, description, category, shopId',
      vesselDnaHistory: 'vesselHIN, customerName, engineSerial, boatMake, boatModel',
      clipboard: '++id, partNumber, timestamp',
      companies: 'companyId, shopId, companyName',
      contacts: 'contactId, companyId, shopId',
      vessels: 'vesselId, companyId, shopId',
      engines: 'engineId, vesselId, shopId',
      mediaStore: 'id, roId, directiveId, shopId, type, createdAt, syncStatus, [roId+directiveId]'
    });
  }
}

export const db = new LocalDatabase();

export async function seedDatabase() {
  // seeding disabled
}

