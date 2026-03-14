import { AppConfig, RepairOrder, Part } from '../types';

export const adminService = {
  // While the data gathering happens in App.tsx, the actual file generation/download can be here
  generateExportFile: (repairOrders: RepairOrder[], masterInventory: Part[], config: AppConfig) => {
    const data = { repairOrders, masterInventory, config, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SCC-DATA-EXPORT-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
};
