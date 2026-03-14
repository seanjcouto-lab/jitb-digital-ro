import { test, expect } from '@playwright/test';
import { metricsEventHandlerService } from '../services/metricsEventHandlerService';

test.describe('MetricsEventHandlerService', () => {
  test.beforeEach(() => {
    metricsEventHandlerService.resetMetrics();
  });

  test('should track repair order creation', () => {
    metricsEventHandlerService.handleRepairOrderCreated({ id: 'ro-1' });
    const metrics = metricsEventHandlerService.getMetrics();
    expect(metrics.repairOrdersCreated).toBe(1);
    expect(metrics.lastUpdated).not.toBeNull();
  });

  test('should track repair order authorization', () => {
    metricsEventHandlerService.handleRepairOrderAuthorized({ id: 'ro-1' });
    const metrics = metricsEventHandlerService.getMetrics();
    expect(metrics.repairOrdersAuthorized).toBe(1);
  });

  test('should track repair order completion', () => {
    metricsEventHandlerService.handleRepairOrderCompleted({ id: 'ro-1' });
    const metrics = metricsEventHandlerService.getMetrics();
    expect(metrics.repairOrdersCompleted).toBe(1);
  });

  test('should track inventory adjustments', () => {
    metricsEventHandlerService.handleInventoryAdjusted({ partId: 'p-1' });
    const metrics = metricsEventHandlerService.getMetrics();
    expect(metrics.inventoryAdjustments).toBe(1);
  });

  test('should track low stock events', () => {
    metricsEventHandlerService.handleInventoryLowStock({ partId: 'p-1' });
    const metrics = metricsEventHandlerService.getMetrics();
    expect(metrics.lowStockEvents).toBe(1);
  });

  test('should track labor sessions started and ended', () => {
    metricsEventHandlerService.handleTechnicianLaborStarted({ techId: 't-1' });
    metricsEventHandlerService.handleTechnicianLaborEnded({ techId: 't-1' });
    const metrics = metricsEventHandlerService.getMetrics();
    expect(metrics.laborSessionsStarted).toBe(1);
    expect(metrics.laborSessionsEnded).toBe(1);
  });

  test('should update timestamp on status update', () => {
    metricsEventHandlerService.handleRepairOrderStatusUpdated({ id: 'ro-1', status: 'in-progress' });
    const metrics = metricsEventHandlerService.getMetrics();
    expect(metrics.lastUpdated).not.toBeNull();
  });
});
