import { domainEventService } from './domainEventService';
import { notificationService } from './notificationService';
import { metricsEventHandlerService } from './metricsEventHandlerService';

const handlers = {
  onRepairOrderCreated: (payload: any) => {
    console.log('[EventSubscribersService] Observed repair-order:created', payload);
    metricsEventHandlerService.handleRepairOrderCreated(payload);
  },
  onRepairOrderAuthorized: (payload: any) => {
    console.log('[EventSubscribersService] Observed repair-order:authorized', payload);
    notificationService.createNotification(
      'success',
      `Repair Order ${payload.id || 'authorized'} has been authorized.`,
      payload
    );
    metricsEventHandlerService.handleRepairOrderAuthorized(payload);
  },
  onRepairOrderStatusUpdated: (payload: any) => {
    console.log('[EventSubscribersService] Observed repair-order:status-updated', payload);
    metricsEventHandlerService.handleRepairOrderStatusUpdated(payload);
  },
  onRepairOrderCompleted: (payload: any) => {
    console.log('[EventSubscribersService] Observed repair-order:completed', payload);
    notificationService.createNotification(
      'info',
      `Repair Order ${payload.id || 'completed'} has been completed.`,
      payload
    );
    metricsEventHandlerService.handleRepairOrderCompleted(payload);
  },
  onInventoryAdjusted: (payload: any) => {
    console.log('[EventSubscribersService] Observed inventory:adjusted', payload);
    metricsEventHandlerService.handleInventoryAdjusted(payload);
  },
  onInventoryLowStock: (payload: any) => {
    console.log('[EventSubscribersService] Observed inventory:low-stock', payload);
    notificationService.createNotification(
      'warning',
      `Low stock alert for part ${payload.partId || 'unknown'}.`,
      payload
    );
    metricsEventHandlerService.handleInventoryLowStock(payload);
  },
  onTechnicianLaborStarted: (payload: any) => {
    console.log('[EventSubscribersService] Observed technician:labor-started', payload);
    metricsEventHandlerService.handleTechnicianLaborStarted(payload);
  },
  onTechnicianLaborEnded: (payload: any) => {
    console.log('[EventSubscribersService] Observed technician:labor-ended', payload);
    notificationService.createNotification(
      'info',
      `Technician ${payload.techId || 'unknown'} has ended labor.`,
      payload
    );
    metricsEventHandlerService.handleTechnicianLaborEnded(payload);
  }
};

export const eventSubscribersService = {
  /**
   * Registers all core platform event subscribers.
   * This centralizes the reaction logic so that it isn't scattered across the UI or stores.
   */
  registerCoreSubscribers: () => {
    // Repair Order Events
    domainEventService.subscribe('repair-order:created', handlers.onRepairOrderCreated);
    domainEventService.subscribe('repair-order:authorized', handlers.onRepairOrderAuthorized);
    domainEventService.subscribe('repair-order:status-updated', handlers.onRepairOrderStatusUpdated);
    domainEventService.subscribe('repair-order:completed', handlers.onRepairOrderCompleted);

    // Inventory Events
    domainEventService.subscribe('inventory:adjusted', handlers.onInventoryAdjusted);
    domainEventService.subscribe('inventory:low-stock', handlers.onInventoryLowStock);

    // Technician Events
    domainEventService.subscribe('technician:labor-started', handlers.onTechnicianLaborStarted);
    domainEventService.subscribe('technician:labor-ended', handlers.onTechnicianLaborEnded);
  },

  /**
   * Unregisters all core platform event subscribers.
   * Useful for cleanup during testing or teardown.
   */
  unregisterCoreSubscribers: () => {
    domainEventService.unsubscribe('repair-order:created', handlers.onRepairOrderCreated);
    domainEventService.unsubscribe('repair-order:authorized', handlers.onRepairOrderAuthorized);
    domainEventService.unsubscribe('repair-order:status-updated', handlers.onRepairOrderStatusUpdated);
    domainEventService.unsubscribe('repair-order:completed', handlers.onRepairOrderCompleted);
    domainEventService.unsubscribe('inventory:adjusted', handlers.onInventoryAdjusted);
    domainEventService.unsubscribe('inventory:low-stock', handlers.onInventoryLowStock);
    domainEventService.unsubscribe('technician:labor-started', handlers.onTechnicianLaborStarted);
    domainEventService.unsubscribe('technician:labor-ended', handlers.onTechnicianLaborEnded);
  }
};
