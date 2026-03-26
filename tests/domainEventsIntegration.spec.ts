import { test, expect } from '@playwright/test';
import { domainEventService } from '../services/domainEventService';
import { repairOrderService } from '../services/repairOrderService';
import { inventoryService } from '../services/inventoryService';
import { TechnicianService } from '../services/technicianService';
import { ROStatus, PartStatus, Technician } from '../types';
import { vesselService } from '../services/vesselService';
import { inventoryStore } from '../data/inventoryStore';

test.describe('Domain Events Integration', () => {
  test.beforeEach(() => {
    domainEventService.clearAll();
    
    // Mock IndexedDB dependencies
    vesselService.getVesselByHIN = async () => undefined;
    vesselService.createVessel = async () => {};
    vesselService.addPastRO = async () => {};
    vesselService.flagUnresolvedIssues = async () => {};
    inventoryStore.updateQuantity = async () => {};
  });

  test('repairOrderService emits events', async () => {
    const events: { name: string, payload: any }[] = [];
    const handler = (name: string) => (payload: any) => events.push({ name, payload });

    domainEventService.subscribe('repair-order:created', handler('repair-order:created'));
    domainEventService.subscribe('repair-order:status-updated', handler('repair-order:status-updated'));
    domainEventService.subscribe('repair-order:authorized', handler('repair-order:authorized'));
    domainEventService.subscribe('repair-order:completed', handler('repair-order:completed'));

    // 1. Create RO
    const ro = repairOrderService.createRepairOrder(
      { 
        customerName: 'Test',
        customerPhones: [],
        customerEmails: [],
        customerAddress: { street: '', city: '', state: '', zip: '' },
        customerNotes: null,
        vesselHIN: '123',
        vesselName: 'Test',
        boatMake: 'Test',
        boatModel: null,
        boatYear: null,
        boatLength: null,
        engineMake: null,
        engineModel: null,
        engineYear: null,
        engineHorsepower: null,
        engineSerial: '123',
        selectedPackages: [],
        manualParts: [],
        manualDirectives: [],
        shopId: 'shop-1'
      },
      []
    );
    expect(events.find(e => e.name === 'repair-order:created')).toBeTruthy();

    // 2. Authorize RO
    const authorizedRo = repairOrderService.finalizeAuthorization(ro, 'verbal', 'Test');
    expect(events.find(e => e.name === 'repair-order:authorized')).toBeTruthy();

    // 3. Assign Technician
    const tech: Technician = { id: 't1', name: 'Tech 1' };
    const assignedRo = repairOrderService.assignTechnician(authorizedRo, tech);
    expect(events.filter(e => e.name === 'repair-order:status-updated').length).toBeGreaterThan(0);

    // 4. Complete RO
    await repairOrderService.finalizeInvoice(assignedRo, 100);
    expect(events.find(e => e.name === 'repair-order:completed')).toBeTruthy();
  });

  test('inventoryService emits events', async () => {
    const events: { name: string, payload: any }[] = [];
    const handler = (name: string) => (payload: any) => events.push({ name, payload });

    domainEventService.subscribe('inventory:adjusted', handler('inventory:adjusted'));
    domainEventService.subscribe('inventory:low-stock', handler('inventory:low-stock'));

    const masterInventory = [
      { partNumber: 'P1', description: 'Part 1', quantityOnHand: 5, reorderPoint: 2, category: 'test', binLocation: 'A1', msrp: 10, dealerPrice: 5, cost: 4, supersedesPart: null, status: PartStatus.IN_BOX, shopId: 'shop1' }
    ];

    await inventoryService.adjustInventory(masterInventory, 'P1', -4, 'Test', 'ro1', 'shop1');
    
    expect(events.find(e => e.name === 'inventory:adjusted')).toBeTruthy();
    expect(events.find(e => e.name === 'inventory:low-stock')).toBeTruthy();
  });

  test('technicianService emits events', async () => {
    const events: { name: string, payload: any }[] = [];
    const handler = (name: string) => (payload: any) => events.push({ name, payload });

    domainEventService.subscribe('technician:labor-started', handler('technician:labor-started'));
    domainEventService.subscribe('technician:labor-ended', handler('technician:labor-ended'));

    const ro: any = {
      id: 'ro1',
      technicianId: 't1',
      status: ROStatus.READY_FOR_TECH,
      directives: [{ id: 'd1', title: 'Test', isCompleted: false, isApproved: true }],
      workSessions: [],
      parts: []
    };

    // 1. Start labor
    const activeRo = TechnicianService.completeDirective(ro, ro.directives[0]);
    expect(events.find(e => e.name === 'technician:labor-started')).toBeTruthy();

    // 2. Halt job
    TechnicianService.haltJob(activeRo, 'Need parts');
    expect(events.find(e => e.name === 'technician:labor-ended')?.payload.reason).toBe('halted');

    // 3. Complete job
    await TechnicianService.finalizeJob(activeRo, 'Done');
    expect(events.find(e => e.name === 'technician:labor-ended' && e.payload.reason === 'completed')).toBeTruthy();
  });
});
