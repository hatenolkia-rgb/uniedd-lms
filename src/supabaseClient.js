// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://mgpvfkuzurhzysorkbvh.supabase.co'
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || ''

if (!SUPABASE_ANON_KEY) {
  console.warn('⚠️  REACT_APP_SUPABASE_ANON_KEY is not set. Add it to your .env file.')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
