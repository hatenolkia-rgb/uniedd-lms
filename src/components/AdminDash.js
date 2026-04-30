import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Layout, {
  PageHeader, MetricsGrid, MetricCard, Panel, TwoCol,
  ListItem, StatusPill, EmptyState,
} from './Layout'

export default function AdminDash({ profile }) {
  const [stats,   setStats]   = useState({})
  const [leads,   setLeads]   = useState([])
  const [users,   setUsers]   = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [
      { count: totalUsers },
      { count: totalStudents },
      { count: openLeads },
      { count: upcomingClasses },
      { data: recentLeads },
      { data: recentUsers },
      { data: recentClasses },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count:'exact', head:true }),
      supabase.from('profiles').select('*', { count:'exact', head:true }).eq('role','student'),
      supabase.from('leads').select('*', { count:'exact', head:true }).not('status','in','(enrolled,lost)'),
      supabase.from('classes').select('*', { count:'exact', head:true }).eq('status','scheduled'),
      supabase.from('leads').select('*').order('created_at',{ ascending:false }).limit(5),
      supabase.from('profiles').select('*').order('created_at',{ ascending:false }).limit(5),
      supabase.from('classes').select('*').order('created_at',{ ascending:false }).limit(4),
    ])
    setStats({ totalUsers, totalStudents, openLeads, upcomingClasses })
    setLeads(recentLeads  || [])
    setUsers(recentUsers  || [])
    setClasses(recentClasses || [])
    setLoading(false)
  }

  async function setRole(userId, role) {
    await supabase.from('profiles').update({ role }).eq('id', userId)
    loadAll()
  }

  return (
    <Layout profile={profile} pageTitle="Dashboard">
      <PageHeader
        title="Platform Overview"
        subtitle="Live metrics — real Supabase data."
      />

      <MetricsGrid>
        <MetricCard icon="👥" label="Total Users"       value={stats.totalUsers}      />
        <MetricCard icon="🎓" label="Students"          value={stats.totalStudents}   />
        <MetricCard icon="📅" label="Upcoming Classes"  value={stats.upcomingClasses} />
        <MetricCard icon="📋" label="Open Leads"        value={stats.openLeads}       />
      </MetricsGrid>

      <TwoCol>
        {/* Recent Leads */}
        <Panel title="Recent Leads">
          {loading ? <EmptyState message="Loading..." /> :
           leads.length === 0 ? <EmptyState message="No leads yet." /> :
           leads.map(l => (
             <ListItem
               key={l.id}
               name={l.full_name}
               sub={`${l.phone || l.email || '—'} · ${l.course_interest || 'No course'}`}
               right={<StatusPill status={l.status} />}
             />
           ))}
        </Panel>

        {/* Recent Users + role setter */}
        <Panel title="Recent Users">
          {loading ? <EmptyState message="Loading..." /> :
           users.length === 0 ? <EmptyState message="No users yet." /> :
           users.map(u => (
             <div key={u.id} style={{
               display:'flex', alignItems:'center', gap:'8px',
               padding:'8px 0', borderBottom:'0.5px solid rgba(255,255,255,0.05)',
             }}>
               <div style={{ flex:1 }}>
                 <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.85)', fontWeight:500 }}>
                   {u.full_name || u.email}
                 </div>
                 <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)' }}>
                   {u.email}
                 </div>
               </div>
               <select
                 value={u.role}
                 onChange={e => setRole(u.id, e.target.value)}
                 style={{
                   background:'rgba(255,255,255,0.07)', border:'0.5px solid rgba(255,255,255,0.12)',
                   color:'rgba(255,255,255,0.7)', borderRadius:'6px', padding:'4px 8px',
                   fontSize:'11px', cursor:'pointer', outline:'none',
                 }}
               >
                 <option value="student">Student</option>
                 <option value="teacher">Teacher</option>
                 <option value="sales">Sales</option>
                 <option value="admin">Admin</option>
               </select>
             </div>
           ))}
        </Panel>
      </TwoCol>

      {/* Recent Classes */}
      <Panel title="Recent Classes" style={{ marginTop:'14px' }}>
        {loading ? <EmptyState message="Loading..." /> :
         classes.length === 0 ? <EmptyState message="No classes scheduled yet." /> :
         <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:'10px' }}>
           {classes.map(c => (
             <div key={c.id} style={{
               background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)',
               borderRadius:'10px', padding:'12px',
             }}>
               <div style={{ fontSize:'13px', fontWeight:600, color:'rgba(255,255,255,0.85)', marginBottom:'4px' }}>
                 {c.title}
               </div>
               <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)' }}>
                 {c.class_date || 'No date'} · {c.start_time || ''}
               </div>
               {c.meet_link && (
                 <a href={c.meet_link} target="_blank" rel="noreferrer" style={{
                   display:'inline-block', marginTop:'8px', fontSize:'11px',
                   background:'rgba(30,144,255,0.15)', color:'#5aabff',
                   border:'0.5px solid rgba(30,144,255,0.25)', borderRadius:'6px',
                   padding:'3px 10px', fontWeight:700,
                 }}>
                   Join Zoom
                 </a>
               )}
             </div>
           ))}
         </div>}
      </Panel>
    </Layout>
  )
}
