import { supabase } from '../supabaseClient'
import { mapROToSupabase } from './supabaseMapper'
import { RepairOrder } from '../types'

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
