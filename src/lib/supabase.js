import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
const schema = import.meta.env.VITE_SUPABASE_SCHEMA || 'app'

export const supabase = createClient(url, key, {
  db: { schema },
  auth: { persistSession: true, autoRefreshToken: true },
})
