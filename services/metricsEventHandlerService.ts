export interface PlatformMetrics {
  repairOrdersCreated: number;
  repairOrdersAuthorized: number;
  repairOrdersCompleted: number;
  inventoryAdjustments: number;
  lowStockEvents: number;
  laborSessionsStarted: number;
  laborSessionsEnded: number;
  lastUpdated: string | null;
}

class MetricsEventHandlerService {
  private metrics: PlatformMetrics = {
    repairOrdersCreated: 0,
    repairOrdersAuthorized: 0,
    repairOrdersCompleted: 0,
    inventoryAdjustments: 0,
    lowStockEvents: 0,
    laborSessionsStarted: 0,
    laborSessionsEnded: 0,
    lastUpdated: null,
  };

  private updateTimestamp() {
    this.metrics.lastUpdated = new Date().toISOString();
  }

  getMetrics(): PlatformMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      repairOrdersCreated: 0,
      repairOrdersAuthorized: 0,
      repairOrdersCompleted: 0,
      inventoryAdjustments: 0,
      lowStockEvents: 0,
      laborSessionsStarted: 0,
      laborSessionsEnded: 0,
      lastUpdated: null,
    };
  }

  handleRepairOrderCreated = (payload: any) => {
    this.metrics.repairOrdersCreated++;
    this.updateTimestamp();
  };

  handleRepairOrderAuthorized = (payload: any) => {
    this.metrics.repairOrdersAuthorized++;
    this.updateTimestamp();
  };

  handleRepairOrderStatusUpdated = (payload: any) => {
    this.updateTimestamp();
  };

  handleRepairOrderCompleted = (payload: any) => {
    this.metrics.repairOrdersCompleted++;
    this.updateTimestamp();
  };

  handleInventoryAdjusted = (payload: any) => {
    this.metrics.inventoryAdjustments++;
    this.updateTimestamp();
  };

  handleInventoryLowStock = (payload: any) => {
    this.metrics.lowStockEvents++;
    this.updateTimestamp();
  };

  handleTechnicianLaborStarted = (payload: any) => {
    this.metrics.laborSessionsStarted++;
    this.updateTimestamp();
  };

  handleTechnicianLaborEnded = (payload: any) => {
    this.metrics.laborSessionsEnded++;
    this.updateTimestamp();
  };
}

export const metricsEventHandlerService = new MetricsEventHandlerService();
