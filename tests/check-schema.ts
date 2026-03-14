import { supabase } from '../supabaseClient';

async function checkSchema() {
  const { data: ro } = await supabase.from('repair_orders').select('id').limit(1);
  const roId = ro?.[0]?.id;
  
  const { data, error } = await supabase.from('repair_order_requests').insert({ 
    repair_order_id: roId, 
    shop_id: '00000000-0000-0000-0000-000000000001', 
    type: 'PART', 
    payload_json: {},
    status: 'PENDING',
    requested_by: 'TECHNICIAN',
    decision: 'REJECT'
  }).select();
  console.log('Error:', error);
  console.log('Data:', data);
}

checkSchema().catch(console.error);
