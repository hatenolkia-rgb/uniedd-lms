import React, { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        if (session) fetchProfile(session.user.id)
        else { setProfile(null); setLoading(false) }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

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
      const res = await supabase
        .from('profiles')
        .insert({
          id:        userId,
          email:     user.email,
          full_name: meta.full_name || user.email.split('@')[0],
          role:      meta.role || 'student',
        })
        .select()
        .single()
      data = res.data
    }
    setProfile(data)
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
