import { supabase } from './supabaseClient'

// Generate a unique session ID per browser tab session
const SESSION_ID = `sess_${Date.now()}_${Math.random().toString(36).slice(2,8)}`
let sessionStart = Date.now()
let currentProfile = null
let heartbeatInterval = null

export function initActivityLogger(profile) {
  currentProfile = profile
  sessionStart   = Date.now()

  // Log login event
  logEvent('login', window.location.pathname)

  // Heartbeat every 60s to track active time
  heartbeatInterval = setInterval(() => {
    logEvent('heartbeat', window.location.pathname)
  }, 60000)

  // Log logout on tab close / refresh
  window.addEventListener('beforeunload', handleLogout)

  return () => {
    window.removeEventListener('beforeunload', handleLogout)
    if (heartbeatInterval) clearInterval(heartbeatInterval)
  }
}

export function logPageView(page) {
  if (!currentProfile) return
  logEvent('page_view', page)
}

function handleLogout() {
  const durationSec = Math.floor((Date.now() - sessionStart) / 1000)
  // Use sendBeacon for reliable fire-and-forget on tab close
  const payload = JSON.stringify({
    user_id:      currentProfile?.id,
    user_name:    currentProfile?.full_name,
    user_email:   currentProfile?.email,
    user_role:    currentProfile?.role,
    event_type:   'logout',
    session_id:   SESSION_ID,
    duration_sec: durationSec,
    page:         window.location.pathname,
    user_agent:   navigator.userAgent.slice(0, 200),
  })
  // Use fetch with keepalive instead of supabase client (works on page unload)
  const SUPABASE_URL = 'https://jtbcsoticxzkohykwsgs.supabase.co'
  const ANON_KEY     = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0YmNzb3RpY3h6a29oeWt3c2dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2MzIxMDksImV4cCI6MjA5MzIwODEwOX0.FJAclFRQB-8FaRuqntIkdmC4_-YuCfE6FvhtqknfI9o'
  fetch(`${SUPABASE_URL}/rest/v1/user_activity_logs`, {
    method:    'POST',
    keepalive: true,
    headers: {
      'Content-Type':  'application/json',
      'apikey':         ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Prefer':        'return=minimal',
    },
    body: payload,
  }).catch(() => {})
}

async function logEvent(eventType, page) {
  if (!currentProfile) return
  try {
    await supabase.from('user_activity_logs').insert({
      user_id:    currentProfile.id,
      user_name:  currentProfile.full_name,
      user_email: currentProfile.email,
      user_role:  currentProfile.role,
      event_type: eventType,
      session_id: SESSION_ID,
      page:       page || '/',
      user_agent: navigator.userAgent.slice(0, 200),
    })
  } catch(e) { /* non-critical */ }
}
