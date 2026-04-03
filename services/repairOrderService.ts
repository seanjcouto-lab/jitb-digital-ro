import { 
  Part, 
  InventoryAlert, 
  RepairOrder, 
  RORequest, 
  PartStatus, 
  ROStatus, 
  Technician, 
  PaymentStatus, 
  CollectionsStatus,
  VesselHistory,
  Directive,
  ClipboardEntry
} from '../types';
import { RepairOrderCreateInput } from '../types/RepairOrderCreateInput';
import { vesselService } from './vesselService';
import { inventoryService } from './inventoryService';
import { SERVICE_PACKAGES } from '../constants';
import { shopContextService } from './shopContextService';
import { domainEventService } from './domainEventService';
import { db } from '../localDb';
import { syncCompanyToSupabase, syncContactToSupabase, syncVesselEntityToSupabase, syncEngineToSupabase } from '../utils/supabaseSync';

export const repairOrderService = {
  createPartRequest: (repairOrder: RepairOrder, partPayload: Part): RepairOrder => {
    const newRequest: RORequest = {
      id: `req-${Date.now()}`,
      roId: repairOrder.id,
      type: 'PART',
      payload: partPayload,
      status: 'PENDING',
      requestedBy: 'TECHNICIAN',
      timestamp: Date.now()
    };

    const updatedRequests = [...(repairOrder.requests || []), newRequest];
    
    // Check if part already exists in RO.parts
    const existingPartIndex = repairOrder.parts.findIndex(p => p.partNumber === partPayload.partNumber);
    let updatedParts = [...repairOrder.parts];
    
    if (existingPartIndex >= 0) {
      updatedParts[existingPartIndex] = { ...updatedParts[existingPartIndex], status: PartStatus.APPROVAL_PENDING };
    } else {
      updatedParts.push({ ...partPayload, status: PartStatus.APPROVAL_PENDING });
    }

    return { ...repairOrder, requests: updatedRequests, parts: updatedParts };
  },

  fulfillPartRequest: async (
    ro: RepairOrder,
    requestId: string,
    masterInventory: Part[]
  ): Promise<{ updatedRO: RepairOrder, updatedInventory?: Part[], alertToAdd?: Omit<InventoryAlert, 'id' | 'timestamp'> } | null> => {
    const request = ro.requests?.find(r => r.id === requestId);
    if (!request || request.type !== 'PART' || request.status !== 'PENDING') return null;

    const partPayload = request.payload as Part;

    const updatedRequests = ro.requests!.map(r => 
      r.id === requestId ? { ...r, status: 'APPROVED' as const, decision: 'FILL_FROM_STOCK' as const } : r
    );

    const newPart: Part = { ...partPayload, status: PartStatus.IN_BOX };
    const updatedParts = [...ro.parts, newPart];

    const invResult = await inventoryService.adjustInventory(
      masterInventory,
      partPayload.partNumber,
      -1,
      'Fulfillment from stock (Tech Request)',
      ro.id,
      ro.shopId
    );

    return {
      updatedRO: { ...ro, requests: updatedRequests, parts: updatedParts },
      updatedInventory: invResult?.updatedInventory,
      alertToAdd: invResult?.alertToAdd
    };
  },

  flagPartRequestForApproval: (
    ro: RepairOrder,
    requestId: string,
    pmStatus: 'MISSING' | 'SPECIAL_ORDER'
  ): RepairOrder => {
    const updatedRequests = (ro.requests || []).map(r => 
      r.id === requestId ? { ...r, pmReview: pmStatus } : r
    );
    return { ...ro, requests: updatedRequests };
  },

  approvePartRequest: async (
    masterInventory: Part[],
    repairOrder: RepairOrder,
    requestId: string,
    decision: 'FILL_FROM_STOCK' | 'SPECIAL_ORDER' | 'REJECT'
  ): Promise<{ updatedRO: RepairOrder, updatedInventory?: Part[], alertToAdd?: Omit<InventoryAlert, 'id' | 'timestamp'> }> => {
    // 1) Find the request by requestId.
    const request = (repairOrder.requests || []).find(req => req.id === requestId);
    
    // 1) Early return if not found OR request.type !== 'PART' OR request.status !== 'PENDING'
    if (!request || request.type !== 'PART' || request.status !== 'PENDING') {
      return { updatedRO: repairOrder };
    }

    const partPayload = request.payload as Part;
    let actualDecision = decision;
    let updatedInventory: Part[] | undefined;
    let alertToAdd: Omit<InventoryAlert, 'id' | 'timestamp'> | undefined;

    // 2) Update the request in updatedRequests: Set status and decision
    const updatedRequests = (repairOrder.requests || []).map(req => {
      if (req.id === requestId) {
        return { 
          ...req, 
          status: actualDecision === 'REJECT' ? 'REJECTED' : 'APPROVED',
          decision: actualDecision
        } as RORequest;
      }
      return req;
    });

    // Update parts in RO
    let updatedParts = [...repairOrder.parts];
    const partIndex = updatedParts.findIndex(p => p.partNumber === partPayload.partNumber);

    if (actualDecision === 'FILL_FROM_STOCK') {
      if (partIndex >= 0) {
        updatedParts[partIndex] = { ...updatedParts[partIndex], status: PartStatus.IN_BOX };
      }
      
      // 4) Only if quantityOnHand > 0: proceed with inventory decrement
      const invResult = await inventoryService.adjustInventory(
        masterInventory,
        partPayload.partNumber,
        -1,
        'Fulfillment from stock',
        repairOrder.id,
        repairOrder.shopId
      );
      
      if (invResult) {
        updatedInventory = invResult.updatedInventory;
        alertToAdd = invResult.alertToAdd;
      }
    } else if (actualDecision === 'SPECIAL_ORDER') {
      if (partIndex >= 0) {
        updatedParts[partIndex] = { ...updatedParts[partIndex], status: PartStatus.SPECIAL_ORDER };
      }
    } else if (actualDecision === 'REJECT') {
      if (partIndex >= 0) {
        updatedParts[partIndex] = { ...updatedParts[partIndex], status: PartStatus.RETURNED };
      }
    }

    return {
      updatedRO: { ...repairOrder, requests: updatedRequests, parts: updatedParts },
      updatedInventory,
      alertToAdd
    };
  },

  createRepairOrder: (
    input: RepairOrderCreateInput,
    masterInventory: Part[]
  ): RepairOrder => {
    // Phase 3 — persist nested entities if provided, resolve IDs
    let resolvedCompanyId = input.companyId;
    let resolvedContactId = input.contactId;
    let resolvedVesselId = input.vesselId;
    let resolvedEngineId = input.engineId;

    if (input.company) {
      const company = { ...input.company, companyId: input.company.companyId || crypto.randomUUID() };
      resolvedCompanyId = company.companyId;
      db.companies.put(company).catch(console.error);
      syncCompanyToSupabase(company).catch(console.error);
    }

    if (input.contact) {
      const contact = { ...input.contact, contactId: input.contact.contactId || crypto.randomUUID(), companyId: resolvedCompanyId };
      resolvedContactId = contact.contactId;
      db.contacts.put(contact).catch(console.error);
      syncContactToSupabase(contact).catch(console.error);
    }

    if (input.vessel) {
      const vessel = { ...input.vessel, vesselId: input.vessel.vesselId || crypto.randomUUID(), companyId: resolvedCompanyId };
      resolvedVesselId = vessel.vesselId;
      db.vessels.put(vessel).catch(console.error);
      syncVesselEntityToSupabase(vessel).catch(console.error);
    }

    if (input.engine) {
      const engine = { ...input.engine, engineId: input.engine.engineId || crypto.randomUUID(), vesselId: resolvedVesselId };
      resolvedEngineId = engine.engineId;
      db.engines.put(engine).catch(console.error);
      syncEngineToSupabase(engine).catch(console.error);
    }

    let packageParts: Part[] = [];
    input.selectedPackages.forEach(pkgName => {
        const pkg = SERVICE_PACKAGES[pkgName as keyof typeof SERVICE_PACKAGES];
        if (pkg) {
            const partsFromPkg = pkg.parts
              .map(p => {
                const invPart = masterInventory.find(m => m.partNumber === p.partNumber);
                if (!invPart) {
                  console.warn(`[createRepairOrder] Part ${p.partNumber} not found in inventory — skipped.`);
                  return null;
                }
                return { ...invPart, status: PartStatus.REQUIRED };
              })
              .filter((p): p is NonNullable<typeof p> => p !== null);
            packageParts.push(...partsFromPkg);
        }
    });
    
    const finalManuallyAddedParts = input.manualParts.map(p => {
        const invPart = masterInventory.find(m => m.partNumber === p.partNumber);
        return { ...(invPart || p), status: PartStatus.REQUIRED, quantity: p.quantity ?? 1 } as Part;
    });
    const allParts = [...packageParts, ...finalManuallyAddedParts];
    const uniqueParts = Array.from(new Map(allParts.map(p => [p.partNumber, p])).values());

    const directiveTitle = input.selectedPackages.length > 0 ? `PERFORM ${input.selectedPackages.join(', ')}` : 'PERFORM DIAGNOSTICS & REQUESTED WORK';
    const standardDirectives = [ { id: 'd2', title: directiveTitle, isCompleted: false, requiredParts: uniqueParts.map(p => p.partNumber), isApproved: true } ];
    const manualDirectivesObjects = input.manualDirectives.map((title, index) => ({ id: `manual-${index}-${Date.now()}`, title: title.toUpperCase(), isCompleted: false, isApproved: true }));
    const finalDirectives = [ ...standardDirectives, ...manualDirectivesObjects ];

    const hasParts = uniqueParts.length > 0;
    let status = hasParts ? ROStatus.AUTHORIZED : ROStatus.READY_FOR_TECH;
    let authorizationType = input.authorization?.type ?? null;
    let authorizationData = input.authorization?.data ?? null;
    let authorizationTimestamp = input.authorization?.timestamp ?? null;

    if (authorizationType) {
        if (!authorizationTimestamp) authorizationTimestamp = Date.now();
    }

    const newRO: RepairOrder = {
      id: `RO-${Date.now()}`,
      customerName: input.customerName,
      customerAddress: input.customerAddress,
      vesselHIN: input.vesselHIN,
      engineSerial: input.engineSerial,
      customerNotes: input.customerNotes || null,
      jobComplaint: input.jobComplaint || null,
      customerEmails: input.customerEmails.filter((e: string) => e),
      customerPhones: input.customerPhones.filter((p: string) => p),
      vesselName: input.vesselName,
      status, 
      parts: uniqueParts, 
      directives: finalDirectives, 
      workSessions: [], 
      requests: [],
      laborDescription: null,
      authorizationType, 
      authorizationData, 
      authorizationTimestamp,
      invoiceTotal: null,
      paymentStatus: null,
      payments: null,
      dateInvoiced: null,
      datePaid: null,
      collectionsStatus: input.collectionsStatus ?? CollectionsStatus.NONE,
      boatMake: input.boatMake || null,
      boatModel: input.boatModel || null,
      boatYear: input.boatYear || null,
      boatLength: input.boatLength || null,
      engineMake: input.engineMake || null,
      engineModel: input.engineModel || null,
      engineYear: input.engineYear || null,
      engineHours: input.engineHours ? Number(input.engineHours) : null,
      engineHorsepower: input.engineHorsepower || null,
      technicianId: null,
      technicianName: null,
      shopId: input.shopId,
      companyId: resolvedCompanyId,
      contactId: resolvedContactId,
      vesselId: resolvedVesselId,
      engineId: resolvedEngineId,
      scheduledDate: input.scheduledDate ?? null,
      arrivalDate: input.arrivalDate ?? null,
      estimatedPickupDate: input.estimatedPickupDate ?? null,
      jobCategory: input.jobCategory ?? null,
    };
    
    domainEventService.publish('repair-order:created', newRO);
    return newRO;
  },

  holdJob: (ro: RepairOrder, reason?: string): RepairOrder => {
    const updatedSessions = ro.workSessions.map((session, index) => 
        index === ro.workSessions.length - 1 && !session.endTime ? { ...session, endTime: Date.now() } : session
    );
    
    let updatedNotes = ro.customerNotes;
    if (reason) {
        const haltNote = `**TECH HOLD NOTE [${new Date().toLocaleString()}]:** ${reason}`;
        updatedNotes = ro.customerNotes
          ? `${haltNote}\n-----------------\n${ro.customerNotes}`
          : haltNote;
    }

    const updatedRO = { ...ro, status: ROStatus.HOLD, workSessions: updatedSessions, customerNotes: updatedNotes };
    domainEventService.publish('repair-order:status-updated', updatedRO);
    return updatedRO;
  },

  reactivateJob: (ro: RepairOrder): RepairOrder => {
    const hasPendingParts = ro.parts.some(p => 
      p.status === PartStatus.MISSING || 
      p.status === PartStatus.SPECIAL_ORDER || 
      p.status === PartStatus.APPROVAL_PENDING
    );
    
    const status = hasPendingParts ? ROStatus.PARTS_PENDING : ROStatus.READY_FOR_TECH;
    const updatedRO = { ...ro, status };
    domainEventService.publish('repair-order:status-updated', updatedRO);
    return updatedRO;
  },

  finalizeInvoice: async (ro: RepairOrder, hourlyRate: number, invoiceTotal?: number, taxExempt?: boolean, taxExemptId?: string): Promise<RepairOrder> => {
    let grandTotal: number;
    if (invoiceTotal !== undefined) {
      grandTotal = invoiceTotal;
    } else {
      const totalMilliseconds = ro.workSessions.reduce((acc, session) => {
        if (session.endTime) { return acc + (session.endTime - session.startTime); }
        return acc;
      }, 0);
      const totalHours = totalMilliseconds / (1000 * 60 * 60);
      const laborTotal = totalHours * hourlyRate;
      const partsTotal = ro.parts.reduce((acc, part) => acc + (part.msrp || 0), 0);
      grandTotal = laborTotal + partsTotal;
    }

    const dateInvoiced = Date.now();
    const updatedRO: RepairOrder = {
      ...ro,
      status: ROStatus.COMPLETED,
      invoiceTotal: grandTotal,
      dateInvoiced,
      paymentStatus: grandTotal === 0 ? PaymentStatus.PAID : PaymentStatus.UNPAID,
      datePaid: grandTotal === 0 ? dateInvoiced : null,
      payments: [],
      collectionsStatus: CollectionsStatus.NONE,
      taxExempt: taxExempt ?? null,
      taxExemptId: taxExemptId ?? null,
    };

   // Update Vessel DNA
    const vesselKey = ro.vesselHIN || ro.engineSerial || ro.id;
    const vessel = await vesselService.getVesselByHIN(vesselKey);
    const partsUsed = ro.parts
      .filter(p => p.status === PartStatus.USED)
      .map(p => ({ partNumber: p.partNumber, description: p.description }));

    const newPastROEntry = {
      id: ro.id,
      date: new Date(dateInvoiced).toLocaleDateString(),
      summary: ro.laborDescription || 'No summary provided.',
      partsUsed: partsUsed,
      technicianName: ro.technicianName ?? null,
      laborHours: ro.workSessions
        .filter(s => s.endTime)
        .reduce((acc, s) => acc + (s.endTime! - s.startTime) / 3600000, 0),
      invoiceTotal: grandTotal,
      completedDirectives: ro.directives
        .filter(d => d.isCompleted)
        .map(d => ({ id: d.id, description: d.title })),
    };

    if (vessel) {
      await vesselService.addPastRO(vesselKey, newPastROEntry);
    } else {
      const newVesselDNA: VesselHistory = {
        vesselHIN: vesselKey,
        customerName: ro.customerName,
        customerPhones: ro.customerPhones,
        customerEmails: ro.customerEmails,
        customerAddress: ro.customerAddress,
        customerNotes: ro.customerNotes,
        status: 'COMPLETE',
        unresolvedNotes: '',
        boatMake: ro.boatMake || '',
        boatModel: ro.boatModel || '',
        boatYear: ro.boatYear || '',
        boatLength: ro.boatLength || '',
        engineMake: ro.engineMake || '',
        engineModel: ro.engineModel || '',
        engineYear: ro.engineYear || '',
        engineHours: ro.engineHours ?? undefined,
        engineHorsepower: ro.engineHorsepower || '',
        engineSerial: ro.engineSerial,
        pastROs: [newPastROEntry],
      };
      await vesselService.createVessel(newVesselDNA);
    }

    // Flag vessel as INCOMPLETE if any directives were not finished — triggers alert on next Oracle Search
    const incompleteDirectives = ro.directives.filter(d => !d.isCompleted);
    if (incompleteDirectives.length > 0) {
      const unresolvedSummary = `Incomplete from RO ${ro.id}: ${incompleteDirectives.map(d => d.title).join(', ')}`;
      await vesselService.flagUnresolvedIssues(vesselKey, unresolvedSummary);
    }

    domainEventService.publish('repair-order:completed', updatedRO);
    return updatedRO;
  },

  finalizeAuthorization: (ro: RepairOrder, type: 'digital' | 'verbal', data: string): RepairOrder => {
    const hasParts = ro.parts.length > 0;
    const status = hasParts ? ROStatus.AUTHORIZED : ROStatus.READY_FOR_TECH;
    const updatedRO: RepairOrder = {
        ...ro,
        status,
        authorizationType: type,
        authorizationData: data,
        authorizationTimestamp: Date.now(),
    };
    domainEventService.publish('repair-order:authorized', updatedRO);
    return updatedRO;
  },

  assignTechnician: (ro: RepairOrder, tech: Technician): RepairOrder => {
    const updatedRO: RepairOrder = {
        ...ro,
        status: ROStatus.READY_FOR_TECH,
        technicianId: tech.id,
        technicianName: tech.name,
    };
    domainEventService.publish('repair-order:status-updated', updatedRO);
    return updatedRO;
  },

  unassignTechnician: (ro: RepairOrder): RepairOrder => {
    return { ...ro, technicianId: null, technicianName: null };
  },

  processReviewRequest: (ro: RepairOrder, request: RORequest, decision: 'APPROVED' | 'REJECTED'): RepairOrder => {
    let updatedRO = { ...ro };
    const updatedRequests = (updatedRO.requests || []).map(r =>
      r.id === request.id ? { ...r, status: decision } : r
    );
    updatedRO.requests = updatedRequests;

   if (decision === 'REJECTED') {
      if (request.type === 'PART') {
        const partPayload = request.payload as Part;
        updatedRO.parts = updatedRO.parts.map(p =>
          p.partNumber === partPayload.partNumber && p.status === PartStatus.APPROVAL_PENDING
            ? { ...p, status: PartStatus.DECLINED }
            : p
        );
      } else if (request.type === 'DIRECTIVE') {
        const requestedTitle = (request.payload as { title: string }).title;
        updatedRO.directives = updatedRO.directives.filter(d => !(d.isApproved === false && d.title === requestedTitle));
      }
    }

   if (decision === 'APPROVED') {
      if (request.type === 'DIRECTIVE') {
        const requestedTitle = (request.payload as { title: string }).title;
        const existingIndex = updatedRO.directives.findIndex(d => d.isApproved === false && d.title === requestedTitle);
        if (existingIndex >= 0) {
          updatedRO.directives = updatedRO.directives.map((d, i) =>
            i === existingIndex ? { ...d, isApproved: true } : d
          );
        } else {
          updatedRO.directives = [...updatedRO.directives, { id: `d-tech-${Date.now()}`, title: requestedTitle, isCompleted: false, isApproved: true }];
        }
      } else if (request.type === 'PART') {
        const pmStatus = request.pmReview as PartStatus | undefined;
        const partPayload = request.payload as Part;
        const existingIndex = updatedRO.parts.findIndex(p => p.partNumber === partPayload.partNumber && p.status === PartStatus.APPROVAL_PENDING);
        if (existingIndex >= 0) {
          updatedRO.parts = updatedRO.parts.map((p, i) =>
            i === existingIndex ? { ...p, status: pmStatus || PartStatus.REQUIRED } : p
          );
        } else {
          updatedRO.parts = [...updatedRO.parts, { ...partPayload, status: pmStatus || PartStatus.REQUIRED }];
        }

        if (updatedRO.status !== ROStatus.ACTIVE) {
          updatedRO.status = ROStatus.PARTS_PENDING;
          domainEventService.publish('repair-order:status-updated', updatedRO);
        }
      }
    }
    return updatedRO;
  },

  confirmDeferral: async (ro: RepairOrder, summary: string): Promise<RepairOrder> => {
    await vesselService.flagUnresolvedIssues(ro.vesselHIN, summary);

    const deferredNote = `**JOB FINALIZED WITH DEFERRED ITEMS [${new Date().toLocaleString()}]:** ${summary}`;
    const updatedLaborDescription = ro.laborDescription 
        ? `${ro.laborDescription}\n-----------------\n${deferredNote}`
        : deferredNote;

    const updatedRO: RepairOrder = {
        ...ro,
        status: ROStatus.PENDING_INVOICE,
        laborDescription: updatedLaborDescription,
    };
    domainEventService.publish('repair-order:status-updated', updatedRO);
    return updatedRO;
  },

  startJob: (ro: RepairOrder): RepairOrder => {
    const updatedSessions = [...ro.workSessions];
    const lastSession = updatedSessions[updatedSessions.length - 1];
    
    if (!lastSession || lastSession.endTime) {
      updatedSessions.push({ startTime: Date.now() });
    }
    
    const updatedRO = { ...ro, status: ROStatus.ACTIVE, workSessions: updatedSessions };
    domainEventService.publish('repair-order:status-updated', updatedRO);
    return updatedRO;
  },

  completeJob: async (ro: RepairOrder, laborNote: string): Promise<RepairOrder> => {
    const unusedParts = ro.parts.filter(p => p.status === PartStatus.IN_BOX);
    if (unusedParts.length > 0) {
      const clipboardSubtractions: ClipboardEntry[] = unusedParts.map(part => ({
        partNumber: part.partNumber,
        description: part.description,
        quantity: -1,
        timestamp: Date.now(),
        roId: ro.id,
      }));
      await inventoryService.bulkAddToClipboard(clipboardSubtractions);
    }

    const finalWorkSessions = ro.workSessions.map(session =>
      !session.endTime ? { ...session, endTime: Date.now() } : session
    );
    
    const updatedRO: RepairOrder = {
      ...ro,
      status: ROStatus.PENDING_INVOICE,
      workSessions: finalWorkSessions,
      laborDescription: laborNote
    };
    domainEventService.publish('repair-order:status-updated', updatedRO);
    return updatedRO;
  },

  addPartToRO: async (ro: RepairOrder, partData: Part, masterInventory: Part[]): Promise<RepairOrder | null> => {
    const partFromInventory = masterInventory.find(p => p.partNumber === partData.partNumber);
    if (!partFromInventory) return null;

    const updatedParts = [...ro.parts, { ...partFromInventory, status: PartStatus.REQUIRED }];
    return { ...ro, parts: updatedParts };
  },

  removePartFromRO: async (
    ro: RepairOrder, 
    partIndex: number, 
    masterInventory: Part[]
  ): Promise<{ updatedRO: RepairOrder, updatedInventory?: Part[], alertToAdd?: Omit<InventoryAlert, 'id' | 'timestamp'> }> => {
    const part = ro.parts[partIndex];
    let updatedInventory: Part[] | undefined;
    let alertToAdd: Omit<InventoryAlert, 'id' | 'timestamp'> | undefined;

    if (part.status === PartStatus.IN_BOX && !part.isCustom) {
        const invResult = await inventoryService.adjustInventory(
            masterInventory,
            part.partNumber,
            1,
            'Removed from RO',
            ro.id,
            ro.shopId
        );
        if (invResult) {
            updatedInventory = invResult.updatedInventory;
            alertToAdd = invResult.alertToAdd;
        }
    }
    const updatedParts = ro.parts.filter((_, idx) => idx !== partIndex);
    return { updatedRO: { ...ro, parts: updatedParts }, updatedInventory, alertToAdd };
  },

  updatePartStatus: async (
    ro: RepairOrder, 
    partIndex: number, 
    status: PartStatus, 
    masterInventory: Part[]
  ): Promise<{ updatedRO: RepairOrder, updatedInventory?: Part[], alertToAdd?: Omit<InventoryAlert, 'id' | 'timestamp'> }> => {
    const originalStatus = ro.parts[partIndex].status;
    const updatedParts = [...ro.parts];
    const part = updatedParts[partIndex];
    updatedParts[partIndex] = { ...part, status };

    let finalRO = {...ro, parts: updatedParts};
    let updatedInventory: Part[] | undefined;
    let alertToAdd: Omit<InventoryAlert, 'id' | 'timestamp'> | undefined;

   // Status advance is manual — user must press Send to Service Manager

    if (status === PartStatus.IN_BOX && originalStatus !== PartStatus.IN_BOX) {
        if (!part.isCustom) {
            const invResult = await inventoryService.adjustInventory(masterInventory, part.partNumber, -1, 'Added to box', ro.id, ro.shopId);
            if (invResult) {
                updatedInventory = invResult.updatedInventory;
                alertToAdd = invResult.alertToAdd;
            }
        }
    }
    else if (status === PartStatus.RETURNED && originalStatus !== PartStatus.RETURNED) {
        if (!part.isCustom) {
            const invResult = await inventoryService.adjustInventory(masterInventory, part.partNumber, 1, 'Returned to stock', ro.id, ro.shopId);
            if (invResult) {
                updatedInventory = invResult.updatedInventory;
                alertToAdd = invResult.alertToAdd;
            }
        }
    }
    else if (originalStatus === PartStatus.IN_BOX && status === PartStatus.REQUIRED) {
        // This is the "Return to Stock" button in ROCard logic
        if (!part.isCustom) {
            const invResult = await inventoryService.adjustInventory(masterInventory, part.partNumber, 1, 'Returned to stock', ro.id, ro.shopId);
            if (invResult) {
                updatedInventory = invResult.updatedInventory;
                alertToAdd = invResult.alertToAdd;
            }
        }
    }
    else if (status === PartStatus.USED && originalStatus !== PartStatus.USED) {
        await inventoryService.addToClipboard({
            partNumber: part.partNumber,
            description: part.description,
            quantity: 1,
            timestamp: Date.now(),
            roId: ro.id,
            technicianName: ro.technicianName || undefined,
        });
    }

    return { updatedRO: finalRO, updatedInventory, alertToAdd };
  },

  confirmMissingPart: (
    ro: RepairOrder, 
    partIndex: number, 
    missingReason: string, 
    missingReasonNotes: string
  ): { updatedRO: RepairOrder, alert: Omit<InventoryAlert, 'id' | 'timestamp'> } => {
    const updatedParts = [...ro.parts];
    const part = updatedParts[partIndex];

    updatedParts[partIndex] = { 
        ...part, 
        status: PartStatus.MISSING,
        missingReason: missingReason,
        missingReasonNotes: missingReasonNotes,
    };
    const newStatus = ro.status === ROStatus.ACTIVE ? ROStatus.PARTS_PENDING : ro.status;
    const finalRO = { ...ro, parts: updatedParts, status: newStatus };

    const alert = {
      partNumber: part.partNumber,
      message: `Part marked MISSING by Parts Dept. Reason: ${missingReason}.`,
      roId: ro.id,
      reason: 'Discrepancy'
    };

    return { updatedRO: finalRO, alert };
  },

  returnPartToStock: async (
    ro: RepairOrder, 
    partIndex: number, 
    masterInventory: Part[]
  ): Promise<{ updatedRO: RepairOrder, updatedInventory?: Part[], alertToAdd?: Omit<InventoryAlert, 'id' | 'timestamp'> } | null> => {
    const updatedParts = [...ro.parts];
    const part = updatedParts[partIndex];
    if (part.status !== PartStatus.IN_BOX && part.status !== PartStatus.NOT_USED) return null;

    updatedParts[partIndex] = { ...part, status: PartStatus.RETURNED };

    let updatedInventory: Part[] | undefined;
    let alertToAdd: Omit<InventoryAlert, 'id' | 'timestamp'> | undefined;

    if (!part.isCustom) {
        const invResult = await inventoryService.adjustInventory(masterInventory, part.partNumber, 1, 'Returned unused from RO', ro.id, ro.shopId);
        if (invResult) {
            updatedInventory = invResult.updatedInventory;
            alertToAdd = invResult.alertToAdd;
        }
    }

    return { updatedRO: { ...ro, parts: updatedParts }, updatedInventory, alertToAdd };
  },

  confirmPartNotUsed: async (ro: RepairOrder, partIndex: number, reason: string, notes: string, masterInventory: Part[]): Promise<RepairOrder> => {
    const updatedParts = [...ro.parts];
    const part = updatedParts[partIndex];

    updatedParts[partIndex] = {
        ...part,
        status: PartStatus.NOT_USED,
        notUsedReason: reason,
        notUsedNotes: notes,
        notUsedTimestamp: Date.now()
    };

    if (!part.isCustom) {
        await inventoryService.adjustInventory(masterInventory, part.partNumber, 1, 'Part not used — returned to stock', ro.id, ro.shopId);
    }

    return { ...ro, parts: updatedParts };
  },

  calculateElapsedTime: (repairOrder: RepairOrder | undefined): number => {
    if (!repairOrder || !repairOrder.workSessions.length) return 0;

    let totalMs = 0;
    repairOrder.workSessions.forEach((session, index) => {
      const isLastSession = index === repairOrder.workSessions.length - 1;
      if (isLastSession && !session.endTime && repairOrder.status === ROStatus.ACTIVE) {
        totalMs += Date.now() - session.startTime;
      } else if (session.endTime) {
        totalMs += session.endTime - session.startTime;
      }
    });
    return Math.floor(totalMs / 1000);
  },

  addEvidenceToDirective: (
    repairOrder: RepairOrder,
    directiveId: string,
    evidence: { type: 'photo' | 'video' | 'audio', url: string }
  ): RepairOrder => {
    const updatedDirectives = repairOrder.directives.map(d => {
      if (d.id === directiveId) {
        return { ...d, evidence: [...(d.evidence || []), evidence] };
      }
      return d;
    });
    return { ...repairOrder, directives: updatedDirectives };
  },

  completeDirective: (repairOrder: RepairOrder, directive: Directive): RepairOrder => {
    const updatedDirectives = repairOrder.directives.map(d =>
      d.id === directive.id ? { ...d, isCompleted: true, completionTimestamp: Date.now() } : d
    );

    let newStatus = repairOrder.status;
    let newWorkSessions = [...repairOrder.workSessions];

    // Starts the clock on the first directive
    if (repairOrder.directives[0]?.id === directive.id) {
      const lastSession = newWorkSessions[newWorkSessions.length - 1];
      if (!lastSession || lastSession.endTime) {
        newWorkSessions.push({ startTime: Date.now() });
        newStatus = ROStatus.ACTIVE;
      }
    }

    return { ...repairOrder, directives: updatedDirectives, status: newStatus, workSessions: newWorkSessions };
  },

  submitRequest: (repairOrder: RepairOrder, request: Omit<RORequest, 'id' | 'timestamp'>): RepairOrder => {
    const newRequest: RORequest = { ...request, id: `req-${Date.now()}`, timestamp: Date.now() };
    const updatedRequests = [...(repairOrder.requests || []), newRequest];
    return { ...repairOrder, requests: updatedRequests };
  },

  technicianFinalizeJob: async (repairOrder: RepairOrder, laborNote: string): Promise<RepairOrder> => {
    return repairOrderService.completeJob(repairOrder, laborNote);
  },

  deleteRepairOrder: (roId: string, allROs: RepairOrder[]): RepairOrder[] => {
    const updatedROs = allROs.filter(ro => ro.id !== roId);
    domainEventService.publish('repair-order:deleted', { id: roId });
    return updatedROs;
  },

  addDirectiveToRO: (ro: RepairOrder, title: string): RepairOrder => {
    const newDirective: Directive = {
      id: `manual-${Date.now()}`,
      title: title.toUpperCase(),
      isCompleted: false,
      isApproved: true
    };
    return { ...ro, directives: [...ro.directives, newDirective] };
  },

  removeDirectiveFromRO: (ro: RepairOrder, directiveId: string): RepairOrder => {
    // Prevent removing standard directives if needed, but for now allow all
    const updatedDirectives = ro.directives.filter(d => d.id !== directiveId);
    return { ...ro, directives: updatedDirectives };
  },

  addManualPartToRO: (ro: RepairOrder, part: Part): RepairOrder => {
    const newPart = { ...part, status: PartStatus.REQUIRED };
    return { ...ro, parts: [...ro.parts, newPart] };
  },

  updatePartDetails: (ro: RepairOrder, partIndex: number, updates: Partial<Part>): RepairOrder => {
    const updatedParts = [...ro.parts];
    updatedParts[partIndex] = { ...updatedParts[partIndex], ...updates };
    return { ...ro, parts: updatedParts };
  }
};
