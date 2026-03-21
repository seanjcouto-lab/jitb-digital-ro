import { RepairOrder } from '../types'

export function mapROToSupabase(ro: RepairOrder) {
  return {
    header: {
      id: ro.id,
      shop_id: ro.shopId,
      customer_name: ro.customerName,
      customer_phones: ro.customerPhones,
      customer_emails: ro.customerEmails,
      customer_address_street: ro.customerAddress?.street ?? null,
      customer_address_city: ro.customerAddress?.city ?? null,
      customer_address_state: ro.customerAddress?.state ?? null,
      customer_address_zip: ro.customerAddress?.zip ?? null,
      customer_notes: ro.customerNotes,
      vessel_name: ro.vesselName,
      vessel_hin: ro.vesselHIN,
      engine_serial: ro.engineSerial,
      status: ro.status,
      labor_description: ro.laborDescription,
      authorization_type: ro.authorizationType,
      authorization_timestamp: ro.authorizationTimestamp
        ? new Date(ro.authorizationTimestamp).toISOString()
        : null,
      authorization_data: ro.authorizationData,
      invoice_total: ro.invoiceTotal,
      payment_status: ro.paymentStatus,
      date_invoiced: ro.dateInvoiced
        ? new Date(ro.dateInvoiced).toISOString()
        : null,
      date_paid: ro.datePaid
        ? new Date(ro.datePaid).toISOString()
        : null,
      collections_status: ro.collectionsStatus,
      boat_make: ro.boatMake,
      boat_model: ro.boatModel,
      boat_year: ro.boatYear,
      boat_length: ro.boatLength,
      engine_make: ro.engineMake,
      engine_model: ro.engineModel,
      engine_year: ro.engineYear,
      engine_horsepower: ro.engineHorsepower,
      technician_id: ro.technicianId,
      technician_name: ro.technicianName,
    },
    parts: (ro.parts ?? []).map(p => ({
      repair_order_id: ro.id,
      shop_id: ro.shopId,
      part_number: p.partNumber,
      description: p.description,
      category: p.category,
      bin_location: p.binLocation,
      msrp: p.msrp,
      dealer_price: p.dealerPrice ?? 0,
      cost: p.cost ?? 0,
      quantity_on_hand_snapshot: p.quantityOnHand,
      reorder_point_snapshot: p.reorderPoint,
      supersedes_part: p.supersedesPart,
      status: p.status ?? 'REQUIRED',
      is_custom: p.isCustom ?? false,
      missing_reason: p.missingReason ?? null,
      missing_reason_notes: p.missingReasonNotes ?? null,
      not_used_reason: p.notUsedReason ?? null,
      not_used_notes: p.notUsedNotes ?? null,
      not_used_timestamp: p.notUsedTimestamp
        ? new Date(p.notUsedTimestamp).toISOString()
        : null,
    })),
    directives: (ro.directives ?? []).map((d, index) => ({
      repair_order_id: ro.id,
      shop_id: ro.shopId,
      title: d.title,
      is_completed: d.isCompleted,
      completion_timestamp: d.completionTimestamp
        ? new Date(d.completionTimestamp).toISOString()
        : null,
      is_approved: d.isApproved ?? false,
      sort_order: index,
    })),
    workSessions: (ro.workSessions ?? []).map(ws => ({
      repair_order_id: ro.id,
      shop_id: ro.shopId,
      start_time: new Date(ws.startTime).toISOString(),
      end_time: ws.endTime
        ? new Date(ws.endTime).toISOString()
        : null,
    })),
    payments: (ro.payments ?? []).map(p => ({
      repair_order_id: ro.id,
      shop_id: ro.shopId,
      amount: p.amount,
      method: p.method,
      reference: p.reference ?? null,
      paid_at: new Date(p.date).toISOString(),
    })),
    requests: (ro.requests ?? []).map(req => ({
      repair_order_id: ro.id,
      shop_id: ro.shopId,
      type: req.type,
      payload_json: req.payload,
      status: req.status,
      requested_by: req.requestedBy,
      requested_at: new Date(req.timestamp).toISOString(),
      decision: req.decision ?? null,
    })),
  }
}
