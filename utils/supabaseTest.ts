import { supabase } from '../supabaseClient'

export async function testSupabaseConnection(): Promise<void> {
  const { data, error } = await supabase
    .from('shops')
    .select('id, name')

  if (error) {
    console.error('Supabase connection FAILED:', error.message)
    return
  }

  console.log('Supabase connection OK. Shops:', data)
}
