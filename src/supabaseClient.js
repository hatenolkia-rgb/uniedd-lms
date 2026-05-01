import { createClient } from '@supabase/supabase-js'

// Your Supabase project URL — already set, do not change
const SUPABASE_URL = 'https://mgpvfkuzurhzysorkbvh.supabase.co'

// Your anon key — set this in Vercel Environment Variables
// Key:   REACT_APP_SUPABASE_ANON_KEY
// Value: (copy from Supabase → Settings → API → anon public)
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || ''

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
