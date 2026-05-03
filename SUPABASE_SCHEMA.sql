import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://jtbcsoticxzkohykwsgs.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0YmNzb3RpY3h6a29oeWt3c2dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2MzIxMDksImV4cCI6MjA5MzIwODEwOX0.FJAclFRQB-8FaRuqntIkdmC4_-YuCfE6FvhtqknfI9o'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
