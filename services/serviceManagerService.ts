import { 
  RepairOrder, 
  ROStatus, 
} from '../types';

export const ServiceManagerService = {
  filterRepairOrders: (
    repairOrders: RepairOrder[],
    filterStatusGroup: string | null,
    filterTechId: string,
    searchQuery: string,
    STATUS_GROUPS: Record<string, ROStatus[]>
  ): RepairOrder[] => {
    return repairOrders.filter(ro => {
      // Status Group Filter
      if (filterStatusGroup) {
         const allowedStatuses = STATUS_GROUPS[filterStatusGroup];
         if (!allowedStatuses.includes(ro.status)) return false;
      }
      
      // Tech Filter
      if (filterTechId !== 'ALL' && ro.technicianId !== filterTechId) return false;

      // Search Filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const searchFields = [
          ro.customerName,
          ro.vesselName,
          ro.vesselHIN,
          ro.engineSerial
        ].map(s => s?.toLowerCase() || '');
        
        if (!searchFields.some(f => f.includes(q))) return false;
      }

      return true;
    });
  },
};
