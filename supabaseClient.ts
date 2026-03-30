import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://bwsmgcsdgykczcgmrxzp.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_j1t5_P1IW5HNFdZ4skOKyQ_rykBcJsr'

export const supabase = createClient(SUPABASE_URL as string, SUPABASE_PUBLISHABLE_KEY as string)
