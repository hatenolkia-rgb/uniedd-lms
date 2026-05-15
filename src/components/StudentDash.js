import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Calendar from './Calendar'
import Resources from './Resources'
import Attendance from './Attendance'
import Layout, { PageHeader, Grid4, MetricCard, Panel, TwoCol, Empty, ZoomBtn } from './Layout'
import ZoomRecordings from './ZoomRecordings'
import RescheduleManager from './RescheduleManager'

function isZoomVisible(classDate, startTime) {
  if (!classDate) return false
  try {
    const classIST = new Date(`${classDate}T${startTime||'00:00'}:00+05:30`)
    const diffHrs  = (classIST - new Date()) / 3600000
    return diffHrs <= 24 && diffHrs >= -2
  } catch(e) { return false }
}

export default function StudentDash({ profile }) {
  const [classes,     setClasses]     = useState([])   // only enrolled classes
  const [enrollments, setEnrollments] = useState([])
  const [payments,    setPayments]    = useState([])   // only own payments
  const [courses,     setCourses]     = useState([])   // only enrolled courses
  const [loading,     setLoading]     = useState(true)
  const [tab,         setTab]         = useState('overview')

  useEffect(() => {
    async function load() {
      setLoading(true)

      // Step 1 — get enrollments for this student
      const { data: enr } = await supabase
        .from('enrollments')
        .select('*')
        .eq('student_id', profile.id)

      const enrolledClassIds  = (enr || []).map(e => e.class_id).filter(Boolean)
      const enrolledCourseIds = (enr || []).map(e => e.course_id).filter(Boolean)

      // Step 2 — fetch only enrolled classes
      let cls = []
      if (enrolledClassIds.length > 0) {
        const { data } = await supabase
          .from('classes')
          .select('*')
          .in('id', enrolledClassIds)
          .order('class_date', { ascending: true })
        cls = data || []
      }

      // Step 3 — fetch only own payments (matched by student_id)
      const { data: pay } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', profile.id)
        .order('created_at', { ascending: false })

      // Step 4 — fetch only enrolled courses
      let crss = []
      if (enrolledCourseIds.length > 0) {
        const { data } = await supabase
          .from('courses')
          .select('*')
          .in('id', enrolledCourseIds)
        crss = data || []
      }

      setEnrollments(enr || [])
      setClasses(cls)
      setPayments(pay || [])
      setCourses(crss)
      setLoading(false)
    }
    load()
  }, [profile.id])

  const today    = new Date().toISOString().slice(0,10)
  const upcoming = classes.filter(c => c.class_date >= today)
  const past     = classes.filter(c => c.class_date <  today)

  const totalDue   = payments.filter(p => p.status !== 'paid').reduce((a,p) => a+(p.amount||0), 0)
  const totalPaid  = payments.filter(p => p.status === 'paid').reduce((a,p) => a+(p.amount||0), 0)
  const hasPending = payments.some(p => ['pending','overdue'].includes(p.status))

  const statusColor = { paid:'#10b981', pending:'#f4a335', overdue:'#f87171' }
  const statusBg    = { paid:'rgba(16,185,129,0.12)', pending:'rgba(232,124,30,0.12)', overdue:'rgba(239,68,68,0.12)' }

  const TABS = [
    { id:'overview',    label:'📋 Overview'  },
    { id:'classes',     label:'📹 My Classes' },
    { id:'courses',     label:'🎓 My Courses' },
    { id:'payments',    label:'💳 Payments'   },
    { id:'attendance',  label:'✅ Attendance' },
  ]
  const tabStyle = k => ({ padding:'8px 16px', fontSize:'13px', fontWeight:600, borderRadius:'10px', border:'none', cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s', background:tab===k?'#1e90ff':'rgba(255,255,255,0.06)', color:tab===k?'#fff':'rgba(255,255,255,0.45)' })

  return (
    <Layout profile={profile} pageTitle="My Learning">
      <PageHeader
        title={`Hey ${profile.full_name?.split(' ')[0] || 'there'} 👋`}
        subtitle={profile.student_id ? `Student ID: ${profile.student_id}` : 'Welcome to UniEDD'}
      />

      <Grid4>
        <MetricCard icon="🎓" label="Enrolled Courses" value={courses.length || enrollments.length} />
        <MetricCard icon="📅" label="Upcoming Classes" value={upcoming.length} />
        <MetricCard icon="✅" label="Completed"        value={past.length} />
        {hasPending
          ? <div style={{ background:'rgba(232,124,30,0.1)', border:'1px solid rgba(232,124,30,0.3)', borderRadius:'14px', padding:'14px', cursor:'pointer' }} onClick={() => setTab('payments')}>
              <div style={{ fontSize:'18px', marginBottom:'8px' }}>💳</div>
              <div style={{ fontSize:'10px', fontWeight:700, color:'#f4a335', letterSpacing:'0.1em', textTransform:'uppercase' }}>Fee Due</div>
              <div style={{ fontSize:'22px', fontWeight:800, color:'#f4a335', marginTop:'3px' }}>${totalDue.toFixed(2)} USD</div>
            </div>
          : <MetricCard icon="💳" label="Fees Paid" value={`₹${totalPaid.toLocaleString('en-IN')}`} />
        }
      </Grid4>

      {/* Tab nav */}
      <div style={{ display:'flex', gap:'6px', marginBottom:'16px', flexWrap:'wrap' }}>
        {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={tabStyle(t.id)}>{t.label}</button>)}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <TwoCol>
          <Panel title="My Upcoming Classes">
            {loading ? <Empty msg="Loading..." /> :
             upcoming.length === 0 ? (
               <div style={{ textAlign:'center', padding:'2rem 1rem' }}>
                 <div style={{ fontSize:'32px', marginBottom:'10px' }}>📅</div>
                 <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.3)' }}>No upcoming classes assigned yet.</div>
               </div>
             ) :
             upcoming.map(c => (
               <div key={c.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 0', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
                 <div style={{ fontSize:'20px' }}>📹</div>
                 <div style={{ flex:1 }}>
                   <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.85)', fontWeight:500 }}>{c.title}</div>
                   <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)' }}>
                     {c.class_date} {c.start_time && `· ${c.start_time}`}
                     {c.teacher_name && ` · 👨‍🏫 ${c.teacher_name}`}
                   </div>
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
                <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'2px' }}>Your learning journey starts here.</div>
              </div>
            </div>
            {hasPending && (
              <div style={{ display:'flex', gap:'10px', padding:'9px 0', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize:'18px' }}>⚠️</div>
                <div>
                  <div style={{ fontSize:'13px', color:'#f4a335', fontWeight:500 }}>Fee payment pending</div>
                  <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'2px' }}>
                    ${totalDue.toFixed(2)} USD outstanding —{' '}
                    <span style={{ color:'#5aabff', cursor:'pointer' }} onClick={() => setTab('payments')}>view details</span>
                  </div>
                </div>
              </div>
            )}
            {upcoming.filter(c => c.meet_link).slice(0,3).map(c => (
              <div key={c.id} style={{ display:'flex', gap:'10px', padding:'9px 0', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize:'18px' }}>🔗</div>
                <div>
                  <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.8)', fontWeight:500 }}>Zoom: {c.title}</div>
                  <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'2px' }}>{c.class_date} {c.start_time && `· ${c.start_time}`}</div>
                </div>
              </div>
            ))}
          </Panel>
        </TwoCol>
      )}

      {/* ── MY CLASSES ── */}
      {tab === 'classes' && (
        <>
          <PageHeader title="My Classes" subtitle="Only classes assigned to you." />
          {loading ? <Empty msg="Loading..." /> : classes.length === 0 ? (
            <div style={{ textAlign:'center', padding:'3rem 1rem', background:'rgba(255,255,255,0.03)', borderRadius:'14px', border:'0.5px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontSize:'40px', marginBottom:'12px' }}>📚</div>
              <div style={{ fontSize:'14px', color:'rgba(255,255,255,0.4)', marginBottom:'6px' }}>No classes assigned yet.</div>
              <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.25)' }}>Your teacher will add you to classes soon.</div>
            </div>
          ) : (
            <>
              {/* Upcoming */}
              {upcoming.length > 0 && (
                <Panel title={`Upcoming (${upcoming.length})`} style={{ marginBottom:'14px' }}>
                  {upcoming.map(c => (
                    <div key={c.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 0', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:'rgba(30,144,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0 }}>📹</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.85)', fontWeight:600 }}>{c.title}</div>
                        <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)', marginTop:'2px' }}>
                          {c.class_date} {c.start_time && `· ${c.start_time}`}
                          {c.batch && ` · ${c.batch}`}
                          {c.teacher_name && ` · 👨‍🏫 ${c.teacher_name}`}
                        </div>
                      </div>
                      <ZoomBtn link={c.meet_link} />
                    </div>
                  ))}
                </Panel>
              )}
              {/* Past */}
              {past.length > 0 && (
                <Panel title={`Completed (${past.length})`}>
                  {past.map(c => (
                    <div key={c.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'9px 0', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:'rgba(16,185,129,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0 }}>✅</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.5)', fontWeight:500 }}>{c.title}</div>
                        <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.25)', marginTop:'2px' }}>{c.class_date} {c.start_time && `· ${c.start_time}`}</div>
                      </div>
                      <span style={{ fontSize:'9px', fontWeight:700, padding:'3px 8px', borderRadius:'10px', background:'rgba(16,185,129,0.1)', color:'#34d399' }}>Done</span>
                    </div>
                  ))}
                </Panel>
              )}
            </>
          )}
        </>
      )}

      {/* ── MY COURSES ── */}
      {tab === 'courses' && (
        <>
          <PageHeader title="My Courses" subtitle="Courses you are enrolled in." />
          {loading ? <Empty msg="Loading..." /> : courses.length === 0 ? (
            <div style={{ textAlign:'center', padding:'3rem 1rem', background:'rgba(255,255,255,0.03)', borderRadius:'14px', border:'0.5px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontSize:'40px', marginBottom:'12px' }}>🎓</div>
              <div style={{ fontSize:'14px', color:'rgba(255,255,255,0.4)', marginBottom:'6px' }}>No courses enrolled yet.</div>
              <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.25)' }}>Contact your admin to enrol you in a course.</div>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:'12px' }}>
              {courses.map(c => (
                <div key={c.id} style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:'14px', padding:'16px' }}>
                  <div style={{ fontSize:'24px', marginBottom:'10px' }}>🎵</div>
                  <div style={{ fontSize:'14px', fontWeight:700, color:'rgba(255,255,255,0.85)', marginBottom:'4px' }}>{c.title}</div>
                  {c.level    && <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.4)', marginTop:'3px' }}>Level: {c.level}</div>}
                  {c.mode     && <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.4)', marginTop:'2px' }}>Mode: {c.mode}</div>}
                  {c.duration_months && <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.4)', marginTop:'2px' }}>Duration: {c.duration_months} months</div>}
                  {c.fee      && <div style={{ fontSize:'13px', fontWeight:700, color:'#10b981', marginTop:'8px' }}>₹{c.fee.toLocaleString('en-IN')}/mo</div>}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── PAYMENTS ── */}
      {tab === 'payments' && (
        <>
          <PageHeader title="My Payments" subtitle="Your fee records and payment history." />
          <Panel>
            {loading ? <Empty msg="Loading..." /> :
             payments.length === 0 ? (
               <div style={{ textAlign:'center', padding:'2.5rem 1rem' }}>
                 <div style={{ fontSize:'32px', marginBottom:'10px' }}>💳</div>
                 <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.3)' }}>No payment records yet.</div>
               </div>
             ) : (
               <div style={{ display:'grid', gap:'8px' }}>
                 <div style={{ display:'flex', gap:'10px', marginBottom:'6px', flexWrap:'wrap' }}>
                   <div style={{ padding:'6px 14px', borderRadius:'20px', background:'rgba(16,185,129,0.1)', fontSize:'12px', fontWeight:700, color:'#10b981' }}>Paid: ${totalPaid.toFixed(2)} USD</div>
                   {totalDue > 0 && <div style={{ padding:'6px 14px', borderRadius:'20px', background:'rgba(232,124,30,0.1)', fontSize:'12px', fontWeight:700, color:'#f4a335' }}>Due: ${totalDue.toFixed(2)} USD</div>}
                 </div>
                 {payments.map(p => (
                   <div key={p.id} style={{ padding:'12px 14px', background:'rgba(255,255,255,0.03)', borderRadius:'10px', borderLeft:`3px solid ${statusColor[p.status]||'#888'}` }}>
                     <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'10px' }}>
                       <div style={{ flex:1 }}>
                         <div style={{ fontSize:'13px', fontWeight:600, color:'rgba(255,255,255,0.85)' }}>{p.course_name || 'Course Fee'}</div>
                         <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'2px' }}>
                           {p.invoice_no && `${p.invoice_no} · `}
                           {p.due_date && `Due: ${p.due_date}`}
                           {p.paid_date && ` · Paid: ${p.paid_date}`}
                         </div>
                         {p.notes && <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.25)', marginTop:'2px' }}>{p.notes.split('\n')[0]}</div>}
                       </div>
                       <div style={{ textAlign:'right', flexShrink:0 }}>
                         <div style={{ fontSize:'16px', fontWeight:800, color:statusColor[p.status]||'#fff' }}>
                           {`${p.currency === 'USD' ? '$' : p.currency === 'GBP' ? '£' : p.currency === 'EUR' ? '€' : '$'}${(p.amount||0).toFixed(2)} ${p.currency||'USD'}`}
                         </div>
                         <span style={{ fontSize:'9px', fontWeight:700, padding:'2px 8px', borderRadius:'10px', background:statusBg[p.status]||'rgba(255,255,255,0.05)', color:statusColor[p.status]||'#aaa', textTransform:'uppercase' }}>{p.status}</span>
                       </div>
                     </div>
                     {p.payment_link && p.status !== 'paid' && (
                       <a href={p.payment_link} target="_blank" rel="noreferrer"
                         style={{ display:'inline-flex', alignItems:'center', gap:'6px', marginTop:'10px', fontSize:'13px', fontWeight:700, padding:'8px 18px', borderRadius:'10px', background:'rgba(24,119,242,0.2)', color:'#5aabff', border:'0.5px solid rgba(24,119,242,0.35)', textDecoration:'none' }}>
                         💳 Pay Now →
                       </a>
                     )}
                   </div>
                 ))}
               </div>
             )}
          </Panel>
        </>
      )}

      {/* ── ATTENDANCE ── */}
      {tab === 'attendance' && (
        <>
          <PageHeader title="My Attendance" subtitle="Your class attendance history." />
          <Attendance profile={profile} />
        </>
      )}

      <Calendar  profile={profile} />
      <Resources profile={profile} />
      <ZoomRecordings profile={profile} />
      <RescheduleManager profile={profile} />
    </Layout>
  )
}
