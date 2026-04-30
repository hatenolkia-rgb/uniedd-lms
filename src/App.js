import React, { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import LoginPage     from './components/LoginPage'
import AdminDash     from './components/AdminDash'
import TeacherDash   from './components/TeacherDash'
import StudentDash   from './components/StudentDash'
import SalesDash     from './components/SalesDash'

export default function App() {
  const [session, setSession]   = useState(null)
  const [profile, setProfile]   = useState(null)
  const [loading, setLoading]   = useState(true)

  // ── Listen for auth state changes ──────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        if (session) await fetchProfile(session.user.id)
        else { setProfile(null); setLoading(false) }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  // ── Fetch user profile (role is stored here) ───────────────
  async function fetchProfile(userId) {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error || !data) {
      // Profile doesn't exist yet — create it
      const user = (await supabase.auth.getUser()).data.user
      const meta = user?.user_metadata || {}
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({
          id:        userId,
          email:     user.email,
          full_name: meta.full_name || user.email.split('@')[0],
          role:      meta.role || 'student',
        })
        .select()
        .single()
      setProfile(newProfile)
    } else {
      setProfile(data)
    }
    setLoading(false)
  }

  // ── Loading screen ─────────────────────────────────────────
  if (loading) return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center',
      justifyContent:'center', background:'#0c1118', flexDirection:'column', gap:'12px'
    }}>
      <div style={{ fontSize:'28px', fontWeight:900 }}>
        <span style={{color:'#1e90ff'}}>UNI</span>
        <span style={{color:'#e87c1e'}}>EDD</span>
      </div>
      <div style={{color:'rgba(255,255,255,0.3)',fontSize:'13px'}}>Loading...</div>
    </div>
  )

  // ── Not logged in → show login ─────────────────────────────
  if (!session || !profile) return <LoginPage />

  // ── Route by role (auto-detected, no selector shown) ──────
  const props = { profile, session }
  switch (profile.role) {
    case 'admin':   return <AdminDash   {...props} />
    case 'teacher': return <TeacherDash {...props} />
    case 'sales':   return <SalesDash   {...props} />
    default:        return <StudentDash {...props} />
  }
}
