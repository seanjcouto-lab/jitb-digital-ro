import { db } from '../localDb';
import { RepairOrder, ROStatus, PaymentStatus, CollectionsStatus } from '../types';
import { shopContextService } from '../services/shopContextService';
import { syncROToSupabase } from '../utils/supabaseSync';
import { supabase } from '../supabaseClient';

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

    if (!rows) {
      console.log(`Fetched 0 rows from Supabase for shop ${shopId}`);
      return;
    }

    console.log(`Fetched ${rows.length} rows from Supabase for shop ${shopId}`);
    
    const hydratedIds: string[] = [];

    for (const row of rows) {
      const existing = await db.repairOrders.get(row.id);
      
      const merged: RepairOrder = {
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
        boatMake: row.boat_make ?? null,
        boatModel: row.boat_model ?? null,
        boatYear: row.boat_year ?? null,
        boatLength: row.boat_length ?? null,
        engineMake: row.engine_make ?? null,
        engineModel: row.engine_model ?? null,
        engineYear: row.engine_year ?? null,
        engineHorsepower: row.engine_horsepower ?? null,
        technicianId: row.technician_id ?? null,
        technicianName: row.technician_name ?? null,
        
        parts: existing?.parts ?? [],
        directives: existing?.directives ?? [],
        workSessions: existing?.workSessions ?? [],
        payments: existing?.payments ?? [],
        requests: existing?.requests ?? [],
      };

      const [partsRes, directivesRes, workSessionsRes, paymentsRes, requestsRes] =
        await Promise.all([
          supabase.from('repair_order_parts').select('*').eq('repair_order_id', merged.id),
          supabase.from('repair_order_directives').select('*').eq('repair_order_id', merged.id).order('sort_order', { ascending: true }),
          supabase.from('work_sessions').select('*').eq('repair_order_id', merged.id),
          supabase.from('payments').select('*').eq('repair_order_id', merged.id),
          supabase.from('repair_order_requests').select('*').eq('repair_order_id', merged.id),
        ]);

      if (partsRes.error) {
        console.warn(`Supabase fetch failed on repair_order_parts for ${merged.id}:`, partsRes.error.message);
      } else {
        console.log(`repair_order_parts hydrated for ${merged.id}: ${partsRes.data.length} rows`);
      }

      if (directivesRes.error) {
        console.warn(`Supabase fetch failed on repair_order_directives for ${merged.id}:`, directivesRes.error.message);
      } else {
        console.log(`repair_order_directives hydrated for ${merged.id}: ${directivesRes.data.length} rows`);
      }

      if (workSessionsRes.error) {
        console.warn(`Supabase fetch failed on work_sessions for ${merged.id}:`, workSessionsRes.error.message);
      } else {
        console.log(`work_sessions hydrated for ${merged.id}: ${workSessionsRes.data.length} rows`);
      }

      if (paymentsRes.error) {
        console.warn(`Supabase fetch failed on payments for ${merged.id}:`, paymentsRes.error.message);
      } else {
        console.log(`payments hydrated for ${merged.id}: ${paymentsRes.data.length} rows`);
      }

      if (requestsRes.error) {
        console.warn(`Supabase fetch failed on repair_order_requests for ${merged.id}:`, requestsRes.error.message);
      } else {
        console.log(`repair_order_requests hydrated for ${merged.id}: ${requestsRes.data.length} rows`);
      }

      const fullyMerged = {
        ...merged,
        parts: partsRes.error
          ? (existing?.parts ?? [])
          : partsRes.data.map((row: any) => ({
              id: row.id,
              partNumber: row.part_number,
              description: row.description,
              category: row.category,
              binLocation: row.bin_location,
              msrp: row.msrp,
              dealerPrice: row.dealer_price,
              cost: row.cost,
              quantityOnHand: row.quantity_on_hand_snapshot,
              reorderPoint: row.reorder_point_snapshot,
              supersedesPart: row.supersedes_part,
              status: row.status,
              isCustom: row.is_custom,
              missingReason: row.missing_reason ?? null,
              missingReasonNotes: row.missing_reason_notes ?? null,
              notUsedReason: row.not_used_reason ?? null,
              notUsedNotes: row.not_used_notes ?? null,
              notUsedTimestamp: row.not_used_timestamp
                ? new Date(row.not_used_timestamp).getTime()
                : null,
              shopId: merged.shopId,
            })),
        directives: directivesRes.error
          ? (existing?.directives ?? [])
          : directivesRes.data.map((row: any) => ({
              id: row.id,
              title: row.title,
              isCompleted: row.is_completed,
              completionTimestamp: row.completion_timestamp
                ? new Date(row.completion_timestamp).getTime()
                : null,
              isApproved: row.is_approved ?? false,
            })),
        workSessions: workSessionsRes.error
          ? (existing?.workSessions ?? [])
          : workSessionsRes.data.map((row: any) => ({
              startTime: new Date(row.start_time).getTime(),
              endTime: row.end_time
                ? new Date(row.end_time).getTime()
                : undefined,
            })),
        payments: paymentsRes.error
          ? (existing?.payments ?? [])
          : paymentsRes.data.map((row: any) => ({
              id: row.id,
              amount: row.amount,
              method: row.method,
              reference: row.reference ?? undefined,
              date: new Date(row.paid_at).getTime(),
            })),
        requests: requestsRes.error
          ? (existing?.requests ?? [])
          : requestsRes.data.map((row: any) => ({
              id: row.id,
              roId: row.repair_order_id,
              type: row.type,
              payload: row.payload_json,
              status: row.status,
              requestedBy: row.requested_by,
              timestamp: new Date(row.requested_at).getTime(),
              decision: row.decision ?? undefined,
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

export const roStore = {
  getAll: async (shopId: string = shopContextService.getActiveShopId()) => {
    const legacyCount = await db.repairOrders.filter(ro => !ro.shopId).count();
    if (legacyCount > 0) {
      await db.repairOrders.filter(ro => !ro.shopId).modify({ shopId: shopContextService.getDefaultShopId() });
    }
    return await db.repairOrders.where('shopId').equals(shopId).toArray();
  },

  add: async (newRO: RepairOrder) => {
    const ro = { ...newRO, shopId: newRO.shopId || shopContextService.getActiveShopId() };
    await db.repairOrders.add(ro);
    syncROToSupabase(ro).catch(err => console.warn('Supabase sync failed (add):', err));
    return ro;
  },

  put: async (updatedRO: RepairOrder) => {
    const ro = { ...updatedRO, shopId: updatedRO.shopId || shopContextService.getActiveShopId() };
    await db.repairOrders.put(ro);
    syncROToSupabase(ro).catch(err => console.warn('Supabase sync failed (put):', err));
    return ro;
  },
};
