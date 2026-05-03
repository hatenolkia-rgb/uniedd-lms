import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Calendar from './Calendar'
import Resources from './Resources'
import Layout, { PageHeader, Grid4, MetricCard, Panel, TwoCol, Empty, ZoomBtn } from './Layout'

export default function StudentDash({ profile }) {
  const [classes,     setClasses]     = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: cls }, { data: enr }] = await Promise.all([
        supabase.from('classes').select('*').order('class_date', { ascending: true }),
        supabase.from('enrollments').select('*').eq('student_id', profile.id),
      ])
      setClasses(cls || [])
      setEnrollments(enr || [])
      setLoading(false)
    }
    load()
  }, [profile.id])

  const today    = new Date().toISOString().slice(0,10)
  const upcoming = classes.filter(c => c.class_date >= today)
  const past     = classes.filter(c => c.class_date <  today)
  const progress = enrollments.length
    ? Math.round(enrollments.reduce((a,e) => a + (e.progress||0), 0) / enrollments.length)
    : 0

  return (
    <Layout profile={profile} pageTitle="My Learning">
      <PageHeader
        title={`Hey ${profile.full_name?.split(' ')[0] || 'there'} 👋`}
        subtitle={profile.student_id ? `Student ID: ${profile.student_id}` : 'Welcome to UniEDD'}
      />

      <Grid4>
        <MetricCard icon="📚" label="Enrolled"  value={enrollments.length} />
        <div onClick={() => { const el=document.getElementById('uniedd-calendar'); if(el) el.scrollIntoView({behavior:'smooth'}) }}
          style={{ background:'rgba(30,144,255,0.08)', border:'1px solid rgba(30,144,255,0.2)', borderRadius:'14px', padding:'14px', cursor:'pointer', transition:'all 0.2s' }}
          onMouseOver={e=>e.currentTarget.style.background='rgba(30,144,255,0.15)'}
          onMouseOut={e=>e.currentTarget.style.background='rgba(30,144,255,0.08)'}>
          <div style={{ fontSize:'18px', marginBottom:'8px' }}>📅</div>
          <div style={{ fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.4)', letterSpacing:'0.1em', textTransform:'uppercase' }}>Calendar</div>
          <div style={{ fontSize:'18px', fontWeight:800, color:'#5aabff', marginTop:'3px' }}>{upcoming.length} upcoming</div>
        </div>
        <MetricCard icon="✅" label="Attended"  value={past.length}        />
        <div onClick={() => { const el=document.getElementById('uniedd-resources'); if(el) el.scrollIntoView({behavior:'smooth'}) }}
          style={{ background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:'14px', padding:'14px', cursor:'pointer', transition:'all 0.2s' }}
          onMouseOver={e=>e.currentTarget.style.background='rgba(16,185,129,0.15)'}
          onMouseOut={e=>e.currentTarget.style.background='rgba(16,185,129,0.08)'}>
          <div style={{ fontSize:'18px', marginBottom:'8px' }}>📚</div>
          <div style={{ fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.4)', letterSpacing:'0.1em', textTransform:'uppercase' }}>Resources</div>
          <div style={{ fontSize:'18px', fontWeight:800, color:'#34d399', marginTop:'3px' }}>View all</div>
        </div>
      </Grid4>

      <TwoCol>
        <Panel title="Upcoming Classes">
          {loading ? <Empty msg="Loading..." /> :
           upcoming.length === 0 ? <Empty msg="No upcoming classes yet." /> :
           upcoming.map(c => (
             <div key={c.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 0', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
               <div style={{ fontSize:'20px' }}>📹</div>
               <div style={{ flex:1 }}>
                 <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.85)', fontWeight:500 }}>{c.title}</div>
                 <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)' }}>{c.class_date} {c.start_time && `· ${c.start_time}`}</div>
               </div>
               <ZoomBtn link={c.meet_link} />
             </div>
           ))}
        </Panel>

        <Panel title="Notifications">
          <div style={{ display:'flex', gap:'10px', padding:'9px 0', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize:'18px' }}>📧</div>
            <div>
              <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.8)', fontWeight:500 }}>Welcome to UniEDD!</div>
              <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'2px' }}>Welcome email sent when you joined</div>
            </div>
          </div>
          {upcoming.slice(0,3).map(c => c.meet_link && (
            <div key={c.id} style={{ display:'flex', gap:'10px', padding:'9px 0', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize:'18px' }}>🔗</div>
              <div>
                <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.8)', fontWeight:500 }}>Zoom: {c.title}</div>
                <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'2px' }}>{c.class_date} {c.start_time && `· ${c.start_time}`}</div>
              </div>
            </div>
          ))}
          {upcoming.length === 0 && (
            <div style={{ display:'flex', gap:'10px', padding:'9px 0' }}>
              <div style={{ fontSize:'18px' }}>📅</div>
              <div>
                <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.8)', fontWeight:500 }}>No upcoming classes</div>
                <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'2px' }}>Your teacher will schedule sessions soon</div>
              </div>
            </div>
          )}
        </Panel>
      </TwoCol>
    <Calendar profile={profile} />
    <Resources profile={profile} />
    </Layout>
  )
}
