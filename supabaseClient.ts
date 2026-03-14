import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = (import.meta.env && import.meta.env.VITE_SUPABASE_URL) || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : '') || ''
const SUPABASE_PUBLISHABLE_KEY = (import.meta.env && import.meta.env.VITE_SUPABASE_KEY) || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_KEY : '') || ''

export const supabase = createClient(SUPABASE_URL as string, SUPABASE_PUBLISHABLE_KEY as string)
