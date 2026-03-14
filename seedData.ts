import { Part, VesselHistory } from './types';
import { shopContextService } from './services/shopContextService';

export const MASTER_INVENTORY: Part[] = [
  { partNumber: '16510-87J02', description: 'Oil Filter (Suzuki DF)', category: 'Filters', binLocation: 'A-12', msrp: 18.50, dealerPrice: 12.00, cost: 10.50, quantityOnHand: 24, reorderPoint: 5, supersedesPart: null, shopId: shopContextService.getActiveShopId() },
  { partNumber: '17400-92J23', description: 'Water Pump Repair Kit', category: 'Cooling', binLocation: 'B-04', msrp: 85.00, dealerPrice: 55.00, cost: 48.00, quantityOnHand: 8, reorderPoint: 3, supersedesPart: null, shopId: shopContextService.getActiveShopId() },
  { partNumber: 'BTM-PAINT-BL', description: 'Bottom Paint - SeaBlue 1qt', category: 'Supplies', binLocation: 'P-01', msrp: 125.00, dealerPrice: 90.00, cost: 82.00, quantityOnHand: 15, reorderPoint: 4, supersedesPart: null, shopId: shopContextService.getActiveShopId() },
];

export const VESSEL_DNA_HISTORY: VesselHistory[] = [
  {
    vesselHIN: 'PLM67890F626',
    customerName: 'Alice Williams',
    customerPhones: ['555-0199'],
    customerEmails: ['alice@sea.com'],
    customerAddress: { street: '123 Harbor Ln', city: 'Charleston', state: 'SC', zip: '29401' },
    customerNotes: 'Frequent visitor, needs quick turnarounds.',
    status: 'COMPLETE',
    unresolvedNotes: '',
    boatMake: 'Sea Hunt',
    boatModel: 'Ultra 229',
    boatYear: '2021',
    boatLength: '22ft',
    engineMake: 'Suzuki',
    engineModel: 'DF150',
    engineYear: '2021',
    engineHorsepower: '150',
    engineSerial: 'S-DF150-555666',
    pastROs: [{ id: 'RO-882', date: '2023-05-12', summary: 'Annual Maintenance', partsUsed: [] }]
  },
  {
    vesselHIN: 'HIN-992233-Z',
    customerName: 'James "Cap" Sterling',
    customerPhones: ['555-9088'],
    customerEmails: ['cap.sterling@marina.net'],
    customerAddress: { street: '55 Ocean View', city: 'Mount Pleasant', state: 'SC', zip: '29464' },
    customerNotes: 'Owner is very particular about gelcoat finish.',
    status: 'INCOMPLETE',
    unresolvedNotes: 'Port side trim tab is intermittently unresponsive. Needs hydraulic seal check.',
    boatMake: 'Grady White',
    boatModel: 'Canyon 306',
    boatYear: '2022',
    boatLength: '30ft',
    engineMake: 'Yamaha',
    engineModel: 'F300',
    engineYear: '2022',
    engineHorsepower: '300',
    engineSerial: 'Y-300-STERLING',
    pastROs: [{ id: 'RO-901', date: '2024-01-15', summary: 'Oil Change & Gear Lube', partsUsed: [] }]
  },
  {
    vesselHIN: 'BOS-WHALER-88',
    customerName: 'Wendy Darling',
    customerPhones: ['555-1122'],
    customerEmails: ['wendy@neverland.com'],
    customerAddress: { street: '1 Second Star Way', city: 'Charleston', state: 'SC', zip: '29403' },
    customerNotes: 'Stored in dry stack.',
    status: 'COMPLETE',
    unresolvedNotes: '',
    boatMake: 'Boston Whaler',
    boatModel: 'Montauk 170',
    boatYear: '2020',
    boatLength: '17ft',
    engineMake: 'Mercury',
    engineModel: 'FourStroke 90',
    engineYear: '2020',
    engineHorsepower: '90',
    engineSerial: 'M-90-NEVERLAND',
    pastROs: []
  }
];

export const MOCK_NEW_CUSTOMER = {
  customerName: 'John Doe',
  customerPhones: ['555-0101'],
  customerEmails: ['john.doe@example.com'],
  customerAddress: { street: '456 Marina Way', city: 'Charleston', state: 'SC', zip: '29401' },
  customerNotes: 'Frequent visitor, needs quick turnarounds.',
  vesselName: '',
  vesselHIN: 'XYZ123456789',
  boatMake: 'Boston Whaler',
  boatModel: 'Montauk 170',
  boatYear: '2022',
  boatLength: '17ft',
  engineMake: 'Mercury',
  engineModel: 'FourStroke 90',
  engineYear: '2022',
  engineHorsepower: '90',
  engineSerial: 'M-1234567-Q',
};
