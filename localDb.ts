import Dexie, { Table } from 'dexie';
import { RepairOrder, Part, VesselHistory, ClipboardEntry, Company, Contact, Vessel, Engine } from './types';
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

  constructor() {
    super('sccDatabase');
    (this as Dexie).version(9).stores({
      repairOrders: 'id, status, technicianId, shopId, scheduledDate, [shopId+status]',
      masterInventory: '[shopId+partNumber], partNumber, description, category, shopId',
      vesselDnaHistory: 'vesselHIN, customerName, engineSerial, boatMake, boatModel',
      clipboard: '++id, partNumber, timestamp',
      companies: 'companyId, shopId, companyName',
      contacts: 'contactId, companyId, shopId',
      vessels: 'vesselId, companyId, shopId',
      engines: 'engineId, vesselId, shopId'
    });
  }
}

export const db = new LocalDatabase();

export async function seedDatabase() {
  // seeding disabled
}

