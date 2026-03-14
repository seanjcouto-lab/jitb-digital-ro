import { syncROToSupabase } from '../utils/supabaseSync';
import { supabase } from '../supabaseClient';
import { RepairOrder, ROStatus, CollectionsStatus, PaymentStatus } from '../types';

async function runTest() {
  const testROId = `RO-TEST-${Date.now()}`;
  const testRO: RepairOrder = {
    id: testROId,
    shopId: '00000000-0000-0000-0000-000000000001',
    customerName: 'Test Customer',
    customerPhones: ['555-1234'],
    customerEmails: ['test@example.com'],
    customerAddress: {
      street: '123 Test St',
      city: 'Testville',
      state: 'TS',
      zip: '12345'
    },
    customerNotes: null,
    vesselName: 'Test Vessel',
    vesselHIN: 'TEST12345678',
    engineSerial: 'ENG12345',
    status: ROStatus.STAGED,
    parts: [],
    directives: [
      { id: 'dir-1', title: 'Test Directive 1', isCompleted: false },
      { id: 'dir-2', title: 'Test Directive 2', isCompleted: false }
    ],
    workSessions: [],
    laborDescription: 'Test labor',
    authorizationType: null,
    authorizationTimestamp: null,
    authorizationData: null,
    invoiceTotal: null,
    paymentStatus: null,
    payments: [],
    dateInvoiced: null,
    datePaid: null,
    collectionsStatus: CollectionsStatus.NONE,
    boatMake: 'Test Make',
    boatModel: 'Test Model',
    boatYear: '2020',
    boatLength: '20',
    engineMake: 'Test Engine Make',
    engineModel: 'Test Engine Model',
    engineYear: '2020',
    engineHorsepower: '200',
    technicianId: null,
    technicianName: null,
    requests: [
      {
        id: `REQ-${Date.now()}`,
        roId: testROId,
        type: 'PART',
        payload: {
          partNumber: 'TEST-PART-1',
          description: 'Test Part',
          category: 'Test Category',
          binLocation: 'A1',
          msrp: 10,
          dealerPrice: 5,
          cost: 3,
          quantityOnHand: 10,
          reorderPoint: 5,
          supersedesPart: null,
          shopId: '00000000-0000-0000-0000-000000000001'
        },
        status: 'PENDING',
        requestedBy: 'TECHNICIAN',
        timestamp: Date.now()
      }
    ]
  };

  console.log('Syncing test RO to Supabase...');
  await syncROToSupabase(testRO);

  console.log('Querying repair_order_requests for RO:', testROId);
  const { data, error } = await supabase
    .from('repair_order_requests')
    .select('*')
    .eq('repair_order_id', testROId);

  if (error) {
    console.error('Error querying repair_order_requests:', error);
  } else {
    console.log('repair_order_requests data:', JSON.stringify(data, null, 2));
  }

  // Also verify directives sort_order
  const { data: dirData, error: dirError } = await supabase
    .from('repair_order_directives')
    .select('title, sort_order')
    .eq('repair_order_id', testROId)
    .order('sort_order', { ascending: true });

  if (dirError) {
    console.error('Error querying repair_order_directives:', dirError);
  } else {
    console.log('repair_order_directives data:', JSON.stringify(dirData, null, 2));
  }
}

runTest().catch(console.error);
