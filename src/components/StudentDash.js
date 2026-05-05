import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Calendar from './Calendar'
import Resources from './Resources'
import Attendance from './Attendance'
import Layout, { PageHeader, Grid4, MetricCard, Panel, TwoCol, Empty, ZoomBtn } from './Layout'

export default function StudentDash({ profile }) {
  const [classes,     setClasses]     = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [payments,    setPayments]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [tab,         setTab]         = useState('overview')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: cls }, { data: enr }, { data: pay }] = await Promise.all([
        supabase.from('classes').select('*').order('class_date', { ascending: true }),
        supabase.from('enrollments').select('*').eq('student_id', profile.id),
        supabase.from('payments').select('*').eq('student_id', profile.id).order('created_at', { ascending: false }),
      ])
      setClasses(cls || [])
      setEnrollments(enr || [])
      setPayments(pay || [])
      setLoading(false)
    }
    load()
  }, [profile.id])

  const today    = new Date().toISOString().slice(0,10)
  const upcoming = classes.filter(c => c.class_date >= today)
  const past     = classes.filter(c => c.class_date <  today)

  // Payment summary
  const totalDue  = payments.filter(p => p.status !== 'paid').reduce((a,p) => a+(p.amount||0), 0)
  const totalPaid = payments.filter(p => p.status === 'paid').reduce((a,p) => a+(p.amount||0), 0)
  const hasPending = payments.some(p => ['pending','overdue'].includes(p.status))

  const statusColor = { paid:'#10b981', pending:'#f4a335', overdue:'#f87171', draft:'rgba(255,255,255,0.3)' }
  const statusBg    = { paid:'rgba(16,185,129,0.12)', pending:'rgba(232,124,30,0.12)', overdue:'rgba(239,68,68,0.12)', draft:'rgba(255,255,255,0.05)' }

  const TABS = ['overview','payments','attendance']
  const tabStyle = (k) => ({ padding:'8px 16px', fontSize:'13px', fontWeight:600, borderRadius:'10px', border:'none', cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s', background:tab===k?'#1e90ff':'rgba(255,255,255,0.06)', color:tab===k?'#fff':'rgba(255,255,255,0.45)', textTransform:'capitalize' })

  return (
    <Layout profile={profile} pageTitle="My Learning">
      <PageHeader
        title={`Hey ${profile.full_name?.split(' ')[0] || 'there'} 👋`}
        subtitle={profile.student_id ? `Student ID: ${profile.student_id}` : 'Welcome to UniEDD'}
      />

      <Grid4>
        <MetricCard icon="📚" label="Enrolled"  value={enrollments.length} />
        <MetricCard icon="📅" label="Upcoming"  value={upcoming.length} sub="classes" />
        <MetricCard icon="✅" label="Attended"  value={past.length} />
        {hasPending
          ? <div style={{ background:'rgba(232,124,30,0.1)', border:'1px solid rgba(232,124,30,0.3)', borderRadius:'14px', padding:'14px', cursor:'pointer' }} onClick={() => setTab('payments')}>
              <div style={{ fontSize:'18px', marginBottom:'8px' }}>💳</div>
              <div style={{ fontSize:'10px', fontWeight:700, color:'#f4a335', letterSpacing:'0.1em', textTransform:'uppercase' }}>Fee Due</div>
              <div style={{ fontSize:'22px', fontWeight:800, color:'#f4a335', marginTop:'3px' }}>₹{totalDue.toLocaleString('en-IN')}</div>
            </div>
          : <MetricCard icon="💳" label="Fees Paid" value={`₹${totalPaid.toLocaleString('en-IN')}`} />
        }
      </Grid4>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'6px', marginBottom:'16px', flexWrap:'wrap' }}>
        {TABS.map(t => <button key={t} onClick={() => setTab(t)} style={tabStyle(t)}>{t === 'overview' ? '📋 Overview' : t === 'payments' ? '💳 Payments' : '✅ Attendance'}</button>)}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
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
            {hasPending && (
              <div style={{ display:'flex', gap:'10px', padding:'9px 0', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize:'18px' }}>⚠️</div>
                <div>
                  <div style={{ fontSize:'13px', color:'#f4a335', fontWeight:500 }}>Fee payment pending</div>
                  <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'2px' }}>₹{totalDue.toLocaleString('en-IN')} outstanding — <span style={{ color:'#5aabff', cursor:'pointer' }} onClick={() => setTab('payments')}>view details</span></div>
                </div>
              </div>
            )}
            {upcoming.slice(0,3).map(c => c.meet_link && (
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

      {/* ── PAYMENTS ── */}
      {tab === 'payments' && (
        <Panel title="Fee & Payment Status">
          {loading ? <Empty msg="Loading..." /> :
           payments.length === 0 ? <Empty msg="No payment records yet." /> :
           <div style={{ display:'grid', gap:'8px' }}>
             {/* Summary */}
             <div style={{ display:'flex', gap:'10px', marginBottom:'6px', flexWrap:'wrap' }}>
               <div style={{ padding:'6px 14px', borderRadius:'20px', background:'rgba(16,185,129,0.1)', fontSize:'12px', fontWeight:700, color:'#10b981' }}>Paid: ₹{totalPaid.toLocaleString('en-IN')}</div>
               {totalDue > 0 && <div style={{ padding:'6px 14px', borderRadius:'20px', background:'rgba(232,124,30,0.1)', fontSize:'12px', fontWeight:700, color:'#f4a335' }}>Due: ₹{totalDue.toLocaleString('en-IN')}</div>}
             </div>
             {payments.map(p => (
               <div key={p.id} style={{ padding:'12px 14px', background:'rgba(255,255,255,0.03)', borderRadius:'10px', borderLeft:`3px solid ${statusColor[p.status]||'#888'}` }}>
                 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'10px' }}>
                   <div>
                     <div style={{ fontSize:'13px', fontWeight:600, color:'rgba(255,255,255,0.85)' }}>{p.course_name || 'Course Fee'}</div>
                     <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'2px' }}>
                       {p.due_date && `Due: ${p.due_date}`} {p.paid_date && `· Paid: ${p.paid_date}`}
                     </div>
                     {p.notes && <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.25)', marginTop:'2px' }}>{p.notes.split('\n')[0]}</div>}
                   </div>
                   <div style={{ textAlign:'right', flexShrink:0 }}>
                     <div style={{ fontSize:'16px', fontWeight:800, color:statusColor[p.status]||'#fff' }}>₹{(p.amount||0).toLocaleString('en-IN')}</div>
                     <span style={{ fontSize:'9px', fontWeight:700, padding:'2px 8px', borderRadius:'10px', background:statusBg[p.status]||'rgba(255,255,255,0.05)', color:statusColor[p.status]||'#aaa', textTransform:'uppercase' }}>{p.status}</span>
                   </div>
                 </div>
                 {p.payment_link && p.status !== 'paid' && (
                   <a href={p.payment_link} target="_blank" rel="noreferrer" style={{ display:'inline-block', marginTop:'8px', fontSize:'12px', fontWeight:700, padding:'6px 14px', borderRadius:'8px', background:'rgba(16,185,129,0.15)', color:'#10b981', border:'0.5px solid rgba(16,185,129,0.25)' }}>
                     💳 Pay Now
                   </a>
                 )}
               </div>
             ))}
           </div>}
        </Panel>
      )}

      {/* ── ATTENDANCE ── */}
      {tab === 'attendance' && <Attendance profile={profile} />}

      <Calendar  profile={profile} />
      <Resources profile={profile} />
    </Layout>
  )
}
