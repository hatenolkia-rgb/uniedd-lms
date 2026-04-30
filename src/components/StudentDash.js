import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Layout, {
  PageHeader, MetricsGrid, MetricCard, Panel, TwoCol, EmptyState,
} from './Layout'

export default function StudentDash({ profile }) {
  const [classes,     setClasses]     = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [{ data: allClasses }, { data: myEnrollments }] = await Promise.all([
      supabase.from('classes').select('*').order('class_date', { ascending: true }),
      supabase.from('enrollments').select('*, courses(title)').eq('student_id', profile.id),
    ])
    setClasses(allClasses || [])
    setEnrollments(myEnrollments || [])
    setLoading(false)
  }

  const today    = new Date().toISOString().slice(0,10)
  const upcoming = classes.filter(c => c.class_date >= today)
  const past     = classes.filter(c => c.class_date < today)

  return (
    <Layout profile={profile} pageTitle="My Learning">
      <PageHeader
        title={`Hey ${profile.full_name?.split(' ')[0] || 'there'} 👋`}
        subtitle={profile.student_id ? `Student ID: ${profile.student_id}` : 'Welcome to UniEDD'}
      />

      <MetricsGrid>
        <MetricCard icon="📚" label="Enrolled"          value={enrollments.length} />
        <MetricCard icon="📅" label="Upcoming Classes"  value={upcoming.length}    />
        <MetricCard icon="✅" label="Attended"          value={past.length}        />
        <MetricCard icon="🏆" label="Progress"          value={
          enrollments.length
            ? Math.round(enrollments.reduce((a,e) => a + (e.progress||0), 0) / enrollments.length) + '%'
            : '0%'
        } />
      </MetricsGrid>

      <TwoCol>
        {/* Upcoming classes */}
        <Panel title="Upcoming Classes">
          {loading ? <EmptyState message="Loading..." /> :
           upcoming.length === 0 ? <EmptyState message="No upcoming classes." /> :
           upcoming.map(c => (
             <div key={c.id} style={{
               display:'flex', alignItems:'center', gap:'10px',
               padding:'9px 0', borderBottom:'0.5px solid rgba(255,255,255,0.05)',
             }}>
               <div style={{ fontSize:'20px' }}>📹</div>
               <div style={{ flex:1 }}>
                 <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.85)', fontWeight:500 }}>
                   {c.title}
                 </div>
                 <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)' }}>
                   {c.class_date} {c.start_time && `· ${c.start_time}`}
                 </div>
               </div>
               {c.meet_link
                 ? <a href={c.meet_link} target="_blank" rel="noreferrer" style={{
                     fontSize:'10px', fontWeight:700, padding:'3px 10px', borderRadius:'8px',
                     background:'rgba(30,144,255,0.15)', color:'#5aabff',
                     border:'0.5px solid rgba(30,144,255,0.25)', flexShrink:0,
                   }}>Join Zoom</a>
                 : <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.2)', flexShrink:0 }}>
                     Link pending
                   </span>
               }
             </div>
           ))}
        </Panel>

        {/* Notifications */}
        <Panel title="Notifications">
          <div style={{
            display:'flex', alignItems:'flex-start', gap:'10px',
            padding:'9px 0', borderBottom:'0.5px solid rgba(255,255,255,0.05)',
          }}>
            <div style={{ fontSize:'18px' }}>📧</div>
            <div>
              <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.8)', fontWeight:500 }}>
                Welcome to UniEDD!
              </div>
              <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'2px' }}>
                Welcome email sent when you joined
              </div>
            </div>
          </div>
          {upcoming.slice(0,2).map(c => (
            c.meet_link && (
              <div key={c.id} style={{
                display:'flex', alignItems:'flex-start', gap:'10px',
                padding:'9px 0', borderBottom:'0.5px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{ fontSize:'18px' }}>🔗</div>
                <div>
                  <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.8)', fontWeight:500 }}>
                    Zoom link for {c.title}
                  </div>
                  <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'2px' }}>
                    {c.class_date} {c.start_time && `· ${c.start_time}`}
                  </div>
                </div>
              </div>
            )
          ))}
          {upcoming.length === 0 && (
            <div style={{
              display:'flex', alignItems:'flex-start', gap:'10px', padding:'9px 0',
            }}>
              <div style={{ fontSize:'18px' }}>📅</div>
              <div>
                <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.8)', fontWeight:500 }}>
                  No upcoming classes
                </div>
                <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'2px' }}>
                  Your teacher will schedule sessions soon
                </div>
              </div>
            </div>
          )}
        </Panel>
      </TwoCol>
    </Layout>
  )
}
