import { RepairOrder, PartStatus, Directive, Part, RORequest } from '../types';
import { repairOrderService } from './repairOrderService';
import { inventoryService } from './inventoryService';
import { shopContextService } from './shopContextService';
import { domainEventService } from './domainEventService';

export const TechnicianService = {
  startJob: (ro: RepairOrder): RepairOrder => {
    const updatedRO = repairOrderService.startJob(ro);
    domainEventService.publish('technician:labor-started', { roId: ro.id, technicianId: ro.technicianId });
    return updatedRO;
  },

  calculateElapsedTime: (repairOrder: RepairOrder | undefined): number => {
    return repairOrderService.calculateElapsedTime(repairOrder);
  },

  saveEvidence: (
    repairOrder: RepairOrder,
    evidenceModal: { directiveId: string | null; mode: 'photo' | 'video' | 'audio' },
    capturedMediaUrl: string
  ): { updatedRO?: RepairOrder; laborNoteUpdate?: string } => {
    if (evidenceModal.directiveId === null) {
      const noteText = `\n[Attached ${evidenceModal.mode}: ${capturedMediaUrl}]`;
      return { laborNoteUpdate: noteText };
    }

    const updatedRO = repairOrderService.addEvidenceToDirective(
      repairOrder,
      evidenceModal.directiveId,
      { type: evidenceModal.mode, url: capturedMediaUrl }
    );

    return { updatedRO };
  },

  completeDirective: (repairOrder: RepairOrder, directive: Directive): RepairOrder => {
    const isFirstDirective = directive.id === 'd1';
    const updatedRO = repairOrderService.completeDirective(repairOrder, directive);
    
    if (isFirstDirective && updatedRO.status === 'ACTIVE') {
      domainEventService.publish('technician:labor-started', { roId: repairOrder.id, technicianId: repairOrder.technicianId });
    }
    
    return updatedRO;
  },

  submitRequest: (repairOrder: RepairOrder, request: Omit<RORequest, 'id' | 'timestamp'>): RepairOrder => {
    return repairOrderService.submitRequest(repairOrder, request);
  },

  requestDirective: (repairOrder: RepairOrder, requestTitle: string): RepairOrder => {
    const title = requestTitle.trim().toUpperCase();
    const withRequest = TechnicianService.submitRequest(repairOrder, {
      roId: repairOrder.id,
      type: 'DIRECTIVE',
      payload: { title },
      status: 'PENDING',
      requestedBy: 'TECHNICIAN'
    });
    const pendingDirective: Directive = {
      id: `d-tech-pending-${Date.now()}`,
      title,
      isCompleted: false,
      isApproved: false
    };
    return { ...withRequest, directives: [...withRequest.directives, pendingDirective] };
  },

  requestPart: async (repairOrder: RepairOrder, part: Part): Promise<RepairOrder> => {
    await inventoryService.addToClipboard({
      partNumber: part.partNumber,
      description: part.description,
      quantity: 1,
      timestamp: Date.now(),
      roId: repairOrder.id
    });
    return repairOrderService.createPartRequest(repairOrder, part);
  },

  requestCustomPart: async (repairOrder: RepairOrder, query: string): Promise<RepairOrder> => {
    const newCustomPart: Part = {
      partNumber: `REQ-CUSTOM-${Date.now()}`,
      description: query.trim(),
      category: 'CUSTOM',
      binLocation: 'N/A',
      msrp: 0,
      dealerPrice: 0,
      cost: 0,
      quantityOnHand: 0,
      reorderPoint: 0,
      supersedesPart: null,
      isCustom: true,
      status: PartStatus.APPROVAL_PENDING,
      shopId: shopContextService.getActiveShopId()
    };
    return TechnicianService.requestPart(repairOrder, newCustomPart);
  },

  updatePartStatus: async (repairOrder: RepairOrder, partIndex: number, newStatus: PartStatus, masterInventory: Part[]): Promise<RepairOrder> => {
    const result = await repairOrderService.updatePartStatus(repairOrder, partIndex, newStatus, masterInventory);
    return result.updatedRO;
  },

  finalizeJob: async (repairOrder: RepairOrder, laborNote: string): Promise<RepairOrder> => {
    const updatedRO = await repairOrderService.technicianFinalizeJob(repairOrder, laborNote);
    domainEventService.publish('technician:labor-ended', { roId: repairOrder.id, technicianId: repairOrder.technicianId, reason: 'completed' });
    return updatedRO;
  },

  haltJob: (repairOrder: RepairOrder, haltReason: string): RepairOrder => {
    const updatedRO = repairOrderService.holdJob(repairOrder, haltReason);
    domainEventService.publish('technician:labor-ended', { roId: repairOrder.id, technicianId: repairOrder.technicianId, reason: 'halted' });
    return updatedRO;
  },

  reportMissingPart: (ro: RepairOrder, partIndex: number, reason: string, notes: string): RepairOrder => {
    const { updatedRO, alert } = repairOrderService.confirmMissingPart(ro, partIndex, reason, notes);
    // In a real app, we'd save the alert to a store. For now, it's handled by the service returning it.
    // The UI will call updateRO with the updatedRO.
    return updatedRO;
  },

  reportNotUsed: (ro: RepairOrder, partIndex: number, reason: string, notes: string): RepairOrder => {
    return repairOrderService.confirmPartNotUsed(ro, partIndex, reason, notes);
  }
};
