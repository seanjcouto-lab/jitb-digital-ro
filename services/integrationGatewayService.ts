import { repairOrderService } from './repairOrderService';
import { vesselService } from './vesselService';
import { inventoryService } from './inventoryService';
import { notificationService } from './notificationService';
import { domainEventService } from './domainEventService';
import { metricsEventHandlerService } from './metricsEventHandlerService';
import { roStore } from '../data/roStore';
import { Part, RepairOrder, VesselHistory } from '../types';

export const integrationGatewayService = {
  /**
   * Creates a new Repair Order and persists it.
   * This is the approved entry point for external modules to create ROs.
   */
  createRepairOrder: async (
    profileData: any,
    selectedPackages: string[],
    manualParts: Part[],
    manualDirectives: string[],
    authInfo: { type: 'digital' | 'verbal' | null, data: string | null, timestamp: number | null }
  ): Promise<RepairOrder> => {
    const masterInventory = await inventoryService.fetchMasterInventory();
    
    // Map the old arguments to the new RepairOrderCreateInput shape
    const createInput = {
      ...profileData,
      selectedPackages,
      manualParts: manualParts.map(p => ({ partNumber: p.partNumber, description: p.description })),
      manualDirectives,
      authorization: authInfo.type ? {
        type: authInfo.type,
        data: authInfo.data || '',
        timestamp: authInfo.timestamp || Date.now()
      } : undefined,
      shopId: profileData.shopId || 'shop-1' // Fallback if not provided in profileData
    };

    const newRO = repairOrderService.createRepairOrder(createInput, masterInventory);
    await roStore.add(newRO);
    return newRO;
  },

  /**
   * Retrieves the history of a specific vessel by HIN.
   */
  getVesselHistory: async (hin: string): Promise<VesselHistory | undefined> => {
    return await vesselService.getVesselByHIN(hin);
  },

  /**
   * Checks the current inventory status for a specific part.
   */
  checkInventory: async (partNumber: string): Promise<Part | undefined> => {
    const masterInventory = await inventoryService.fetchMasterInventory();
    return masterInventory.find(p => p.partNumber === partNumber);
  },

  /**
   * Creates a platform notification.
   */
  createNotification: (
    type: 'info' | 'warning' | 'success' | 'error',
    message: string,
    data?: any
  ): void => {
    notificationService.createNotification(type, message, data);
  },

  /**
   * Publishes a domain event to the platform's event bus.
   */
  publishDomainEvent: (eventName: string, payload: any): void => {
    domainEventService.publish(eventName, payload);
  },

  /**
   * Retrieves current platform metrics.
   */
  getPlatformMetrics: () => {
    return metricsEventHandlerService.getMetrics();
  }
};
