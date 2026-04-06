import { db } from '../localDb';
import { RepairOrder, ROStatus, PaymentStatus, CollectionsStatus } from '../types';
import { shopContextService } from '../services/shopContextService';
import { syncROToSupabase } from '../utils/supabaseSync';
import { supabase } from '../supabaseClient';

function parseEvidence(raw: any): { type: 'photo' | 'video' | 'audio'; url: string }[] {
  if (!raw) return [];
  try { return Array.isArray(raw) ? raw : typeof raw === 'string' ? JSON.parse(raw) : []; }
  catch { return []; }
}

export async function loadFromSupabase(shopId: string): Promise<void> {
  try {
    const { data: rows, error } = await supabase
      .from('repair_orders')
      .select('*')
      .eq('shop_id', shopId);

    if (error) {
      console.warn('Supabase fetch failed:', error.message);
      return;
    }

    if (!rows || rows.length === 0) {
      console.log(`Fetched 0 rows from Supabase for shop ${shopId}`);
      return;
    }

    console.log(`Fetched ${rows.length} rows from Supabase for shop ${shopId}`);

    const allIds = rows.map(r => r.id);

    // Bulk-fetch all child records in parallel (6 queries total instead of N*5)
    const [partsRes, directivesRes, workSessionsRes, paymentsRes, requestsRes] =
      await Promise.all([
        supabase.from('repair_order_parts').select('*').in('repair_order_id', allIds),
        supabase.from('repair_order_directives').select('*').in('repair_order_id', allIds).order('sort_order', { ascending: true }),
        supabase.from('work_sessions').select('*').in('repair_order_id', allIds),
        supabase.from('payments').select('*').in('repair_order_id', allIds),
        supabase.from('repair_order_requests').select('*').in('repair_order_id', allIds),
      ]);

    // Group child records by repair_order_id for O(1) lookup
    const groupBy = (data: any[] | null, key: string) => {
      const map: Record<string, any[]> = {};
      if (!data) return map;
      for (const row of data) {
        const id = row[key];
        if (!map[id]) map[id] = [];
        map[id].push(row);
      }
      return map;
    };

    const partsByRO = groupBy(partsRes.data, 'repair_order_id');
    const directivesByRO = groupBy(directivesRes.data, 'repair_order_id');
    const sessionsByRO = groupBy(workSessionsRes.data, 'repair_order_id');
    const paymentsByRO = groupBy(paymentsRes.data, 'repair_order_id');
    const requestsByRO = groupBy(requestsRes.data, 'repair_order_id');

    if (partsRes.error) console.warn('Bulk fetch repair_order_parts failed:', partsRes.error.message);
    if (directivesRes.error) console.warn('Bulk fetch repair_order_directives failed:', directivesRes.error.message);
    if (workSessionsRes.error) console.warn('Bulk fetch work_sessions failed:', workSessionsRes.error.message);
    if (paymentsRes.error) console.warn('Bulk fetch payments failed:', paymentsRes.error.message);
    if (requestsRes.error) console.warn('Bulk fetch repair_order_requests failed:', requestsRes.error.message);

    console.log(`Bulk fetched children: ${partsRes.data?.length ?? 0} parts, ${directivesRes.data?.length ?? 0} directives, ${workSessionsRes.data?.length ?? 0} sessions, ${paymentsRes.data?.length ?? 0} payments, ${requestsRes.data?.length ?? 0} requests`);

    const hydratedIds: string[] = [];

    for (const row of rows) {
      const existing = await db.repairOrders.get(row.id);

      // Timestamp-aware conflict resolution: most recent write wins
      const supabaseUpdatedAt = row.updated_at ? new Date(row.updated_at).getTime() : 0;
      const localUpdatedAt = existing?.updatedAt ?? 0;

      if (existing && localUpdatedAt > supabaseUpdatedAt) {
        // Local is newer — push local version to Supabase so other devices get it
        syncROToSupabase(existing).catch(err => console.warn('Re-sync newer local RO:', err));
        hydratedIds.push(existing.id);
        continue;
      }

      const roParts = partsByRO[row.id] || [];
      const roDirectives = directivesByRO[row.id] || [];
      const roSessions = sessionsByRO[row.id] || [];
      const roPayments = paymentsByRO[row.id] || [];
      const roRequests = requestsByRO[row.id] || [];

      const fullyMerged: RepairOrder = {
        ...(existing || {}),
        id: row.id,
        shopId: row.shop_id,
        customerName: row.customer_name,
        customerPhones: row.customer_phones ?? existing?.customerPhones ?? [],
        customerEmails: row.customer_emails ?? existing?.customerEmails ?? [],
        customerAddress: {
          street: row.customer_address_street ?? existing?.customerAddress?.street ?? '',
          city: row.customer_address_city ?? existing?.customerAddress?.city ?? '',
          state: row.customer_address_state ?? existing?.customerAddress?.state ?? '',
          zip: row.customer_address_zip ?? existing?.customerAddress?.zip ?? '',
        },
        customerNotes: row.customer_notes ?? null,
        jobComplaint: row.job_complaint ?? existing?.jobComplaint ?? null,
        vesselName: row.vessel_name ?? '',
        vesselHIN: row.vessel_hin ?? '',
        engineSerial: row.engine_serial ?? '',
        status: row.status as ROStatus,
        laborDescription: row.labor_description ?? null,
        authorizationType: (row.authorization_type as RepairOrder['authorizationType']) ?? null,
        authorizationTimestamp: row.authorization_timestamp
          ? new Date(row.authorization_timestamp).getTime()
          : null,
        authorizationData: row.authorization_data ?? null,
        invoiceTotal: row.invoice_total ?? null,
        paymentStatus: (row.payment_status as PaymentStatus) ?? null,
        dateInvoiced: row.date_invoiced
          ? new Date(row.date_invoiced).getTime()
          : null,
        datePaid: row.date_paid
          ? new Date(row.date_paid).getTime()
          : null,
        collectionsStatus: (row.collections_status as CollectionsStatus) ?? null,
        taxExempt: row.tax_exempt ?? existing?.taxExempt ?? null,
        taxExemptId: row.tax_exempt_id ?? existing?.taxExemptId ?? null,
        boatMake: row.boat_make ?? null,
        boatModel: row.boat_model ?? null,
        boatYear: row.boat_year ?? null,
        boatLength: row.boat_length ?? null,
        engineMake: row.engine_make ?? null,
        engineModel: row.engine_model ?? null,
        engineYear: row.engine_year ?? null,
        engineHours: row.engine_hours ?? null,
        engineHorsepower: row.engine_horsepower ?? null,
        technicianId: row.technician_id ?? null,
        technicianName: row.technician_name ?? null,
        scheduledDate: row.scheduled_date ?? existing?.scheduledDate ?? null,
        arrivalDate: row.arrival_date ?? existing?.arrivalDate ?? null,
        estimatedPickupDate: row.estimated_pickup_date ?? existing?.estimatedPickupDate ?? null,
        jobCategory: row.job_category ?? existing?.jobCategory ?? null,
        evidence: parseEvidence(row.evidence_urls),
        updatedAt: supabaseUpdatedAt || localUpdatedAt || Date.now(),

        parts: partsRes.error
          ? (existing?.parts ?? [])
          : roParts.map((p: any) => ({
              id: p.id,
              partNumber: p.part_number,
              description: p.description,
              category: p.category,
              binLocation: p.bin_location,
              msrp: p.msrp,
              dealerPrice: p.dealer_price,
              cost: p.cost,
              quantityOnHand: p.quantity_on_hand_snapshot,
              reorderPoint: p.reorder_point_snapshot,
              supersedesPart: p.supersedes_part,
              status: p.status,
              isCustom: p.is_custom,
              missingReason: p.missing_reason ?? null,
              missingReasonNotes: p.missing_reason_notes ?? null,
              notUsedReason: p.not_used_reason ?? null,
              notUsedNotes: p.not_used_notes ?? null,
              notUsedTimestamp: p.not_used_timestamp
                ? new Date(p.not_used_timestamp).getTime()
                : null,
              shopId: row.shop_id,
            })),
        directives: directivesRes.error
          ? (existing?.directives ?? [])
          : roDirectives.map((d: any) => ({
              id: d.id,
              title: d.title,
              isCompleted: d.is_completed,
              completionTimestamp: d.completion_timestamp
                ? new Date(d.completion_timestamp).getTime()
                : null,
              isApproved: d.is_approved ?? false,
              evidence: parseEvidence(d.evidence_urls),
            })),
        workSessions: workSessionsRes.error
          ? (existing?.workSessions ?? [])
          : roSessions.map((s: any) => ({
              startTime: new Date(s.start_time).getTime(),
              endTime: s.end_time
                ? new Date(s.end_time).getTime()
                : undefined,
            })),
        payments: paymentsRes.error
          ? (existing?.payments ?? [])
          : roPayments.map((p: any) => ({
              id: p.id,
              amount: p.amount,
              method: p.method,
              reference: p.reference ?? undefined,
              date: new Date(p.paid_at).getTime(),
            })),
        requests: requestsRes.error
          ? (existing?.requests ?? [])
          : roRequests.map((r: any) => ({
              id: r.id,
              roId: r.repair_order_id,
              type: r.type,
              payload: r.payload_json,
              status: r.status,
              requestedBy: r.requested_by,
              timestamp: new Date(r.requested_at).getTime(),
              decision: r.decision ?? undefined,
            })),
      };

      await db.repairOrders.put(fullyMerged);
      hydratedIds.push(fullyMerged.id);
    }

    console.log('Hydrated repair_order ids:', hydratedIds);
  } catch (err) {
    console.warn('Error in loadFromSupabase:', err);
  }
}

/** Fetch a single RO + children from Supabase, merge into Dexie if newer. Returns merged RO or null if local is newer. */
export async function refreshSingleRO(roId: string): Promise<RepairOrder | null> {
  try {
    const { data: row, error } = await supabase.from('repair_orders').select('*').eq('id', roId).single();
    if (error || !row) return null;

    const [partsRes, directivesRes, sessionsRes, paymentsRes, requestsRes] = await Promise.all([
      supabase.from('repair_order_parts').select('*').eq('repair_order_id', roId),
      supabase.from('repair_order_directives').select('*').eq('repair_order_id', roId),
      supabase.from('work_sessions').select('*').eq('repair_order_id', roId),
      supabase.from('payments').select('*').eq('repair_order_id', roId),
      supabase.from('repair_order_requests').select('*').eq('repair_order_id', roId),
    ]);

    const existing = await db.repairOrders.get(roId);
    const supabaseUpdatedAt = row.updated_at ? new Date(row.updated_at).getTime() : 0;
    const localUpdatedAt = existing?.updatedAt ?? 0;

    if (existing && localUpdatedAt > supabaseUpdatedAt) {
      return null; // Local is newer, don't overwrite
    }

    const fullyMerged: RepairOrder = {
      ...(existing || {}),
      id: row.id,
      shopId: row.shop_id,
      customerName: row.customer_name,
      customerPhones: row.customer_phones ?? existing?.customerPhones ?? [],
      customerEmails: row.customer_emails ?? existing?.customerEmails ?? [],
      customerAddress: {
        street: row.customer_address_street ?? existing?.customerAddress?.street ?? '',
        city: row.customer_address_city ?? existing?.customerAddress?.city ?? '',
        state: row.customer_address_state ?? existing?.customerAddress?.state ?? '',
        zip: row.customer_address_zip ?? existing?.customerAddress?.zip ?? '',
      },
      customerNotes: row.customer_notes ?? null,
      jobComplaint: row.job_complaint ?? existing?.jobComplaint ?? null,
      vesselName: row.vessel_name ?? '',
      vesselHIN: row.vessel_hin ?? '',
      engineSerial: row.engine_serial ?? '',
      status: row.status as ROStatus,
      laborDescription: row.labor_description ?? null,
      authorizationType: (row.authorization_type as RepairOrder['authorizationType']) ?? null,
      authorizationTimestamp: row.authorization_timestamp ? new Date(row.authorization_timestamp).getTime() : null,
      authorizationData: row.authorization_data ?? null,
      invoiceTotal: row.invoice_total ?? null,
      paymentStatus: (row.payment_status as PaymentStatus) ?? null,
      dateInvoiced: row.date_invoiced ? new Date(row.date_invoiced).getTime() : null,
      datePaid: row.date_paid ? new Date(row.date_paid).getTime() : null,
      collectionsStatus: (row.collections_status as CollectionsStatus) ?? null,
      taxExempt: row.tax_exempt ?? existing?.taxExempt ?? null,
      taxExemptId: row.tax_exempt_id ?? existing?.taxExemptId ?? null,
      boatMake: row.boat_make ?? null,
      boatModel: row.boat_model ?? null,
      boatYear: row.boat_year ?? null,
      boatLength: row.boat_length ?? null,
      engineMake: row.engine_make ?? null,
      engineModel: row.engine_model ?? null,
      engineYear: row.engine_year ?? null,
      engineHours: row.engine_hours ?? null,
      engineHorsepower: row.engine_horsepower ?? null,
      technicianId: row.technician_id ?? null,
      technicianName: row.technician_name ?? null,
      scheduledDate: row.scheduled_date ?? existing?.scheduledDate ?? null,
      arrivalDate: row.arrival_date ?? existing?.arrivalDate ?? null,
      estimatedPickupDate: row.estimated_pickup_date ?? existing?.estimatedPickupDate ?? null,
      jobCategory: row.job_category ?? existing?.jobCategory ?? null,
      evidence: parseEvidence(row.evidence_urls),
      updatedAt: supabaseUpdatedAt || Date.now(),
      parts: partsRes.error ? (existing?.parts ?? []) : (partsRes.data ?? []).map((p: any) => ({
        id: p.id, partNumber: p.part_number, description: p.description, category: p.category,
        binLocation: p.bin_location, msrp: p.msrp, dealerPrice: p.dealer_price, cost: p.cost,
        quantityOnHand: p.quantity_on_hand_snapshot, reorderPoint: p.reorder_point_snapshot,
        supersedesPart: p.supersedes_part, status: p.status, isCustom: p.is_custom,
        missingReason: p.missing_reason ?? null, missingReasonNotes: p.missing_reason_notes ?? null,
        notUsedReason: p.not_used_reason ?? null, notUsedNotes: p.not_used_notes ?? null,
        notUsedTimestamp: p.not_used_timestamp ? new Date(p.not_used_timestamp).getTime() : null,
        shopId: row.shop_id,
      })),
      directives: directivesRes.error ? (existing?.directives ?? []) : (directivesRes.data ?? []).map((d: any) => ({
        id: d.id, title: d.title, isCompleted: d.is_completed,
        completionTimestamp: d.completion_timestamp ? new Date(d.completion_timestamp).getTime() : null,
        isApproved: d.is_approved ?? false,
        evidence: parseEvidence(d.evidence_urls),
      })),
      workSessions: sessionsRes.error ? (existing?.workSessions ?? []) : (sessionsRes.data ?? []).map((s: any) => ({
        startTime: new Date(s.start_time).getTime(),
        endTime: s.end_time ? new Date(s.end_time).getTime() : undefined,
      })),
      payments: paymentsRes.error ? (existing?.payments ?? []) : (paymentsRes.data ?? []).map((p: any) => ({
        id: p.id, amount: p.amount, method: p.method, reference: p.reference ?? undefined,
        date: new Date(p.paid_at).getTime(),
      })),
      requests: requestsRes.error ? (existing?.requests ?? []) : (requestsRes.data ?? []).map((r: any) => ({
        id: r.id, roId: r.repair_order_id, type: r.type, payload: r.payload_json,
        status: r.status, requestedBy: r.requested_by,
        timestamp: new Date(r.requested_at).getTime(), decision: r.decision ?? undefined,
      })),
    };

    await db.repairOrders.put(fullyMerged);
    return fullyMerged;
  } catch (err) {
    console.warn('refreshSingleRO failed:', err);
    return null;
  }
}

export const roStore = {
  getAll: async (shopId: string = shopContextService.getActiveShopId()) => {
    const legacyCount = await db.repairOrders.filter(ro => !ro.shopId).count();
    if (legacyCount > 0) {
      await db.repairOrders.filter(ro => !ro.shopId).modify({ shopId: shopContextService.getDefaultShopId() });
    }
    return await db.repairOrders.where('shopId').equals(shopId).toArray();
  },

  add: async (newRO: RepairOrder) => {
    const ro = { ...newRO, shopId: newRO.shopId || shopContextService.getActiveShopId(), updatedAt: Date.now() };
    await db.repairOrders.add(ro);
    syncROToSupabase(ro).catch(err => console.warn('Supabase sync failed (add):', err));
    return ro;
  },

  put: async (updatedRO: RepairOrder) => {
    const ro = { ...updatedRO, shopId: updatedRO.shopId || shopContextService.getActiveShopId(), updatedAt: Date.now() };
    await db.repairOrders.put(ro);
    syncROToSupabase(ro).catch(err => console.warn('Supabase sync failed (put):', err));
    return ro;
  },

  delete: async (id: string) => {
    await db.repairOrders.delete(id);
    // Also delete from Supabase
    supabase.from('repair_orders').delete().eq('id', id)
      .then(({ error }) => {
        if (error) console.warn('Supabase delete failed:', error.message);
        else console.log('Supabase delete success for RO:', id);
      });
  },
};
