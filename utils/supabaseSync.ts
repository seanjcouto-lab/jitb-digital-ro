import { supabase } from '../supabaseClient'
import { mapROToSupabase } from './supabaseMapper'
import { RepairOrder, VesselHistory, Part, Company, Contact, Vessel, Engine } from '../types'
import { shopContextService } from '../services/shopContextService'

export async function syncROToSupabase(ro: RepairOrder): Promise<void> {
  const mapped = mapROToSupabase(ro)

  // 1. Upsert header
  const { error: headerError } = await supabase
    .from('repair_orders')
    .upsert(mapped.header)

  if (headerError) {
    console.error('Supabase sync failed on repair_orders:', headerError.message)
    return
  }

  // 2. Parts
  const { error: repair_order_partsDeleteError } = await supabase
    .from('repair_order_parts')
    .delete()
    .eq('repair_order_id', ro.id)

  if (repair_order_partsDeleteError) {
    console.error('Supabase delete failed on repair_order_parts:', repair_order_partsDeleteError.message)
    return
  }

  if (mapped.parts.length > 0) {
    const { error: repair_order_partsError } = await supabase
      .from('repair_order_parts')
      .insert(mapped.parts)

    if (repair_order_partsError) {
      console.error('Supabase sync failed on repair_order_parts:', repair_order_partsError.message)
      return
    }
  }

  // 3. Directives
  const { error: repair_order_directivesDeleteError } = await supabase
    .from('repair_order_directives')
    .delete()
    .eq('repair_order_id', ro.id)

  if (repair_order_directivesDeleteError) {
    console.error('Supabase delete failed on repair_order_directives:', repair_order_directivesDeleteError.message)
    return
  }

  if (mapped.directives.length > 0) {
    const { error: repair_order_directivesError } = await supabase
      .from('repair_order_directives')
      .insert(mapped.directives)

    if (repair_order_directivesError) {
      console.error('Supabase sync failed on repair_order_directives:', repair_order_directivesError.message)
      return
    }
  }

  // 4. Work Sessions
  const { error: work_sessionsDeleteError } = await supabase
    .from('work_sessions')
    .delete()
    .eq('repair_order_id', ro.id)

  if (work_sessionsDeleteError) {
    console.error('Supabase delete failed on work_sessions:', work_sessionsDeleteError.message)
    return
  }

  if (mapped.workSessions.length > 0) {
    const { error: work_sessionsError } = await supabase
      .from('work_sessions')
      .insert(mapped.workSessions)

    if (work_sessionsError) {
      console.error('Supabase sync failed on work_sessions:', work_sessionsError.message)
      return
    }
  }

  // 5. Payments
  const { error: paymentsDeleteError } = await supabase
    .from('payments')
    .delete()
    .eq('repair_order_id', ro.id)

  if (paymentsDeleteError) {
    console.error('Supabase delete failed on payments:', paymentsDeleteError.message)
    return
  }

  if (mapped.payments.length > 0) {
    const { error: paymentsError } = await supabase
      .from('payments')
      .insert(mapped.payments)

    if (paymentsError) {
      console.error('Supabase sync failed on payments:', paymentsError.message)
      return
    }
  }

  // 6. Requests
  const { error: repair_order_requestsDeleteError } = await supabase
    .from('repair_order_requests')
    .delete()
    .eq('repair_order_id', ro.id)

  if (repair_order_requestsDeleteError) {
    console.error('Supabase delete failed on repair_order_requests:', repair_order_requestsDeleteError.message)
    return
  }

  if (mapped.requests.length > 0) {
    const { error: repair_order_requestsError } = await supabase
      .from('repair_order_requests')
      .insert(mapped.requests)

    if (repair_order_requestsError) {
      console.error('Supabase sync failed on repair_order_requests:', repair_order_requestsError.message)
      return
    }
  }

  console.log('Supabase sync OK:', ro.id)
}

export async function syncVesselToSupabase(vessel: VesselHistory): Promise<void> {
  const shopId = shopContextService.getActiveShopId()
  const { error } = await supabase.from('vessel_history').upsert({
    vessel_hin: vessel.vesselHIN,
    shop_id: shopId,
    customer_name: vessel.customerName,
    customer_phones: vessel.customerPhones,
    customer_emails: vessel.customerEmails,
    customer_address: vessel.customerAddress,
    customer_notes: vessel.customerNotes,
    status: vessel.status,
    unresolved_notes: vessel.unresolvedNotes,
    boat_make: vessel.boatMake,
    boat_model: vessel.boatModel,
    boat_year: vessel.boatYear,
    boat_length: vessel.boatLength,
    engine_make: vessel.engineMake,
    engine_model: vessel.engineModel,
    engine_year: vessel.engineYear,
    engine_horsepower: vessel.engineHorsepower,
    engine_serial: vessel.engineSerial,
    past_ros: vessel.pastROs,
    updated_at: new Date().toISOString(),
  })
  if (error) {
    console.error('Supabase vessel sync failed:', error.message)
  } else {
    console.log('Supabase vessel sync OK:', vessel.vesselHIN)
  }
}

export async function syncInventoryToSupabase(part: Part): Promise<void> {
  const shopId = part.shopId || shopContextService.getActiveShopId()
  const { error } = await supabase.from('master_inventory').upsert({
    shop_id:          shopId,
    part_number:      part.partNumber,
    description:      part.description,
    category:         part.category,
    bin_location:     part.binLocation,
    msrp:             part.msrp,
    dealer_price:     part.dealerPrice,
    cost:             part.cost,
    quantity_on_hand: part.quantityOnHand,
    reorder_point:    part.reorderPoint,
    supersedes_part:  part.supersedesPart ?? null,
  })
  if (error) {
    console.error('Supabase inventory sync failed:', error.message)
  } else {
    console.log('Supabase inventory sync OK:', part.partNumber)
  }
}

export async function syncCompanyToSupabase(company: Company): Promise<void> {
  const { error } = await supabase.from('companies').upsert({
    company_id:   company.companyId,
    shop_id:      company.shopId,
    company_name: company.companyName,
    address:      company.address ?? null,
    created_at:   company.createdAt ?? new Date().toISOString(),
  })
  if (error) {
    console.error('Supabase company sync failed:', error.message)
  } else {
    console.log('Supabase company sync OK:', company.companyId)
  }
}

export async function syncContactToSupabase(contact: Contact): Promise<void> {
  const { error } = await supabase.from('contacts').upsert({
    contact_id:  contact.contactId,
    company_id:  contact.companyId,
    shop_id:     contact.shopId,
    full_name:   contact.fullName,
    phones:      contact.phones,
    emails:      contact.emails,
    is_primary:  contact.isPrimary,
    created_at:  contact.createdAt ?? new Date().toISOString(),
  })
  if (error) {
    console.error('Supabase contact sync failed:', error.message)
  } else {
    console.log('Supabase contact sync OK:', contact.contactId)
  }
}

export async function syncVesselEntityToSupabase(vessel: Vessel): Promise<void> {
  const { error } = await supabase.from('vessels').upsert({
    vessel_id:   vessel.vesselId,
    company_id:  vessel.companyId,
    shop_id:     vessel.shopId,
    vessel_name: vessel.vesselName ?? null,
    hin:         vessel.hin ?? null,
    boat_make:   vessel.boatMake ?? null,
    boat_model:  vessel.boatModel ?? null,
    boat_year:   vessel.boatYear ?? null,
    boat_length: vessel.boatLength ?? null,
    created_at:  vessel.createdAt ?? new Date().toISOString(),
  })
  if (error) {
    console.error('Supabase vessel entity sync failed:', error.message)
  } else {
    console.log('Supabase vessel entity sync OK:', vessel.vesselId)
  }
}

export async function syncEngineToSupabase(engine: Engine): Promise<void> {
  const { error } = await supabase.from('engines').upsert({
    engine_id:         engine.engineId,
    vessel_id:         engine.vesselId,
    shop_id:           engine.shopId,
    engine_make:       engine.engineMake ?? null,
    engine_model:      engine.engineModel ?? null,
    engine_year:       engine.engineYear ?? null,
    engine_horsepower: engine.engineHorsepower ?? null,
    engine_serial:     engine.engineSerial ?? null,
    engine_hours:      engine.engineHours ?? null,
    engine_type:       engine.engineType ?? null,
    fuel_type:         engine.fuelType ?? null,
    created_at:        engine.createdAt ?? new Date().toISOString(),
  })
  if (error) {
    console.error('Supabase engine sync failed:', error.message)
  } else {
    console.log('Supabase engine sync OK:', engine.engineId)
  }
}
