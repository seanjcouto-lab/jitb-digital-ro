import { test, expect } from '@playwright/test';
import { integrationGatewayService } from '../services/integrationGatewayService';
import { repairOrderService } from '../services/repairOrderService';
import { vesselService } from '../services/vesselService';
import { inventoryService } from '../services/inventoryService';
import { notificationService } from '../services/notificationService';
import { domainEventService } from '../services/domainEventService';
import { metricsEventHandlerService } from '../services/metricsEventHandlerService';
import { roStore } from '../data/roStore';
import { Part, RepairOrder, ROStatus, VesselHistory, PartStatus } from '../types';

test.describe('IntegrationGatewayService', () => {
  test('should delegate createRepairOrder to repairOrderService and roStore', async () => {
    const mockProfileData = {
      customerName: 'Test Customer',
      customerPhones: [],
      customerEmails: [],
      customerAddress: { street: '', city: '', state: '', zip: '' },
      customerNotes: '',
      vesselName: '',
      vesselHIN: 'TESTHIN123',
      boatMake: '',
      boatModel: '',
      boatYear: '',
      boatLength: '',
      engineMake: '',
      engineModel: '',
      engineYear: '',
      engineHorsepower: '',
      engineSerial: '',
    };
    
    const mockPart: Part = {
      partNumber: 'TEST-PART',
      description: 'Test Part',
      category: 'TEST',
      binLocation: 'A1',
      msrp: 10,
      dealerPrice: 5,
      cost: 5,
      quantityOnHand: 10,
      reorderPoint: 5,
      supersedesPart: null,
      isCustom: false,
      status: PartStatus.REQUIRED,
      shopId: 'test-shop'
    };

    // Mock inventoryService
    const originalFetchMasterInventory = inventoryService.fetchMasterInventory;
    inventoryService.fetchMasterInventory = async () => [mockPart];

    // Mock roStore
    const originalRoStoreAdd = roStore.add;
    let addedRO: RepairOrder | null = null;
    roStore.add = async (ro: RepairOrder) => {
      addedRO = ro;
      return ro;
    };

    const newRO = await integrationGatewayService.createRepairOrder(
      mockProfileData,
      [],
      [mockPart],
      ['Test Directive'],
      { type: null, data: null, timestamp: null }
    );

    expect(newRO).toBeDefined();
    expect(newRO.customerName).toBe('Test Customer');
    expect(newRO.vesselHIN).toBe('TESTHIN123');
    expect(newRO.status).toBe(ROStatus.AUTHORIZED);
    expect(addedRO).toBe(newRO);

    // Restore mocks
    inventoryService.fetchMasterInventory = originalFetchMasterInventory;
    roStore.add = originalRoStoreAdd;
  });

  test('should delegate getVesselHistory to vesselService', async () => {
    const mockVessel: VesselHistory = {
      vesselHIN: 'TESTHIN123',
      customerName: 'Test Customer',
      customerPhones: [],
      customerEmails: [],
      customerAddress: { street: '', city: '', state: '', zip: '' },
      customerNotes: '',
      status: 'INCOMPLETE',
      unresolvedNotes: '',
      boatMake: '',
      boatModel: '',
      boatYear: '',
      boatLength: '',
      engineMake: '',
      engineModel: '',
      engineYear: '',
      engineHorsepower: '',
      engineSerial: '',
      pastROs: []
    };

    const originalGetVesselByHIN = vesselService.getVesselByHIN;
    vesselService.getVesselByHIN = async (hin: string) => {
      if (hin === 'TESTHIN123') return mockVessel;
      return undefined;
    };

    const result = await integrationGatewayService.getVesselHistory('TESTHIN123');
    expect(result).toBe(mockVessel);

    const notFound = await integrationGatewayService.getVesselHistory('UNKNOWN');
    expect(notFound).toBeUndefined();

    // Restore mock
    vesselService.getVesselByHIN = originalGetVesselByHIN;
  });

  test('should delegate checkInventory to inventoryService', async () => {
    const mockPart: Part = {
      partNumber: 'TEST-PART',
      description: 'Test Part',
      category: 'TEST',
      binLocation: 'A1',
      msrp: 10,
      dealerPrice: 5,
      cost: 5,
      quantityOnHand: 10,
      reorderPoint: 5,
      supersedesPart: null,
      isCustom: false,
      status: PartStatus.REQUIRED,
      shopId: 'test-shop'
    };

    const originalFetchMasterInventory = inventoryService.fetchMasterInventory;
    inventoryService.fetchMasterInventory = async () => [mockPart];

    const result = await integrationGatewayService.checkInventory('TEST-PART');
    expect(result).toBe(mockPart);

    const notFound = await integrationGatewayService.checkInventory('UNKNOWN-PART');
    expect(notFound).toBeUndefined();

    // Restore mock
    inventoryService.fetchMasterInventory = originalFetchMasterInventory;
  });

  test('should delegate createNotification to notificationService', () => {
    const originalCreateNotification = notificationService.createNotification;
    let capturedType: string | null = null;
    let capturedMessage: string | null = null;
    let capturedData: any = null;

    notificationService.createNotification = (type, message, data) => {
      capturedType = type;
      capturedMessage = message;
      capturedData = data;
      return { id: 'test', type, message, createdAt: new Date().toISOString(), read: false, data };
    };

    integrationGatewayService.createNotification('info', 'Test Message', { test: true });

    expect(capturedType).toBe('info');
    expect(capturedMessage).toBe('Test Message');
    expect(capturedData).toEqual({ test: true });

    // Restore mock
    notificationService.createNotification = originalCreateNotification;
  });

  test('should delegate publishDomainEvent to domainEventService', () => {
    const originalPublish = domainEventService.publish;
    let capturedEvent: string | null = null;
    let capturedPayload: any = null;

    domainEventService.publish = (eventName, payload) => {
      capturedEvent = eventName;
      capturedPayload = payload;
    };

    integrationGatewayService.publishDomainEvent('test-event', { test: true });

    expect(capturedEvent).toBe('test-event');
    expect(capturedPayload).toEqual({ test: true });

    // Restore mock
    domainEventService.publish = originalPublish;
  });

  test('should delegate getPlatformMetrics to metricsEventHandlerService', () => {
    const originalGetMetrics = metricsEventHandlerService.getMetrics;
    const mockMetrics = {
      repairOrdersCreated: 5,
      repairOrdersAuthorized: 3,
      repairOrdersCompleted: 2,
      inventoryAdjustments: 10,
      lowStockEvents: 1,
      laborSessionsStarted: 4,
      laborSessionsEnded: 4,
      lastUpdated: '2026-03-07T00:00:00.000Z'
    };

    metricsEventHandlerService.getMetrics = () => mockMetrics;

    const result = integrationGatewayService.getPlatformMetrics();
    expect(result).toBe(mockMetrics);

    // Restore mock
    metricsEventHandlerService.getMetrics = originalGetMetrics;
  });
});
