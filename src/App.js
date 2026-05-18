import React, { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { sendEmail } from './emailService'
import { initActivityLogger, logPageView } from './activityLogger'
import LoginPage   from './components/LoginPage'
import AdminDash   from './components/AdminDash'
import TeacherDash from './components/TeacherDash'
import StudentDash from './components/StudentDash'
import SalesDash   from './components/SalesDash'

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Get existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setLoading(false)
    })

    // 2. Listen for auth changes (login, logout, registration confirm)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        if (session) {
          // On SIGNED_IN or TOKEN_REFRESHED — fetch/create profile
          fetchProfile(session.user.id)
        } else {
          setProfile(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // 3. Realtime: re-fetch profile if it changes in DB (e.g. admin updates role)
  useEffect(() => {
    if (!session?.user?.id) return

    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${session.user.id}`,
        },
        (payload) => {
          // Profile updated in DB — update local state without refresh
          if (payload.new) setProfile(payload.new)
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [session?.user?.id])

  async function fetchProfile(userId) {
    setLoading(true)
    let { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!data) {
      const user = (await supabase.auth.getUser()).data.user
      const meta = user?.user_metadata || {}
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'
      const res = await supabase
        .from('profiles')
        .insert({
          id:        userId,
          email:     user.email,
          full_name: meta.full_name || user.email.split('@')[0],
          role:      meta.role || 'student',
          timezone:  userTimezone,
        })
        .select()
        .single()
      data = res.data
      if (data?.email) {
        sendEmail('welcome', data.email, { name: data.full_name || 'there' })
      }
    }

    if (data) {
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'
      if (data.timezone !== userTimezone) {
        supabase.from('profiles').update({ timezone: userTimezone }).eq('id', data.id).then(() => {})
      }
      setProfile(data)
      initActivityLogger(data)
    }

    setLoading(false)
  }

  if (loading) return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center',
      justifyContent:'center', background:'#0c1118', flexDirection:'column', gap:'12px'
    }}>
      <div style={{ fontFamily:"'Arial Black',sans-serif", fontWeight:900 }}>
        <span style={{ color:'#1e90ff', fontSize:'32px' }}>UNI</span>
        <span style={{ color:'#e87c1e', fontSize:'32px' }}>EDD</span>
      </div>
      <div style={{ color:'rgba(255,255,255,0.3)', fontSize:'13px' }}>Loading...</div>
    </div>
  )

  if (!session || !profile) return <LoginPage />

  switch (profile.role) {
    case 'admin':   return <AdminDash   profile={profile} />
    case 'teacher': return <TeacherDash profile={profile} />
    case 'sales':   return <SalesDash   profile={profile} />
    default:        return <StudentDash profile={profile} />
  }
}
