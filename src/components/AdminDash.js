import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Calendar from './Calendar'
import ManageUsers from './ManageUsers'
import PaymentsAdmin from './PaymentsAdmin'
import ManageCourses from './ManageCourses'
import Resources from './Resources'
import Layout, { PageHeader, Grid4, MetricCard, Panel, TwoCol, Row, Pill, Empty } from './Layout'

export default function AdminDash({ profile }) {
  const [stats,   setStats]   = useState({ users:0, students:0, leads:0, classes:0 })
  const [leads,   setLeads]   = useState([])
  const [users,   setUsers]   = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [
      { count: users },
      { count: students },
      { count: leads },
      { count: classes },
      { data: recentLeads },
      { data: recentUsers },
      { data: recentClasses },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count:'exact', head:true }),
      supabase.from('profiles').select('*', { count:'exact', head:true }).eq('role','student'),
      supabase.from('leads').select('*', { count:'exact', head:true }).not('status','in','(enrolled,lost,Enrolled,Lost)'),
      supabase.from('classes').select('*', { count:'exact', head:true }),
      supabase.from('leads').select('*').order('created_at',{ ascending:false }).limit(6),
      supabase.from('profiles').select('*').order('created_at',{ ascending:false }).limit(6),
      supabase.from('classes').select('*').order('created_at',{ ascending:false }).limit(4),
    ])
    setStats({ users, students, leads, classes })
    setLeads(recentLeads   || [])
    setUsers(recentUsers   || [])
    setClasses(recentClasses || [])
    setLoading(false)
  }

  async function changeRole(id, role) {
    await supabase.from('profiles').update({ role }).eq('id', id)
    load()
  }

  const sel = { background:'rgba(255,255,255,0.07)', border:'0.5px solid rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.7)', borderRadius:'6px', padding:'4px 8px', fontSize:'11px', cursor:'pointer', outline:'none' }

  return (
    <Layout profile={profile} pageTitle="Dashboard">
      <PageHeader title="Platform Overview" subtitle="Live metrics — real Supabase data." />

      <Grid4>
        <MetricCard icon="👥" label="Total Users" value={stats.users}   />
        <MetricCard icon="🎓" label="Students"    value={stats.students} />
        <div onClick={() => { const el=document.getElementById('uniedd-calendar'); if(el) el.scrollIntoView({behavior:'smooth'}) }}
          style={{ background:'rgba(30,144,255,0.08)', border:'1px solid rgba(30,144,255,0.2)', borderRadius:'14px', padding:'14px', cursor:'pointer', transition:'all 0.2s' }}
          onMouseOver={e=>e.currentTarget.style.background='rgba(30,144,255,0.15)'}
          onMouseOut={e=>e.currentTarget.style.background='rgba(30,144,255,0.08)'}>
          <div style={{ fontSize:'18px', marginBottom:'8px' }}>📅</div>
          <div style={{ fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.4)', letterSpacing:'0.1em', textTransform:'uppercase' }}>Calendar</div>
          <div style={{ fontSize:'18px', fontWeight:800, color:'#5aabff', marginTop:'3px' }}>{stats.classes} classes</div>
        </div>
        <div onClick={() => { const el=document.getElementById('uniedd-resources'); if(el) el.scrollIntoView({behavior:'smooth'}) }}
          style={{ background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:'14px', padding:'14px', cursor:'pointer', transition:'all 0.2s' }}
          onMouseOver={e=>e.currentTarget.style.background='rgba(16,185,129,0.15)'}
          onMouseOut={e=>e.currentTarget.style.background='rgba(16,185,129,0.08)'}>
          <div style={{ fontSize:'18px', marginBottom:'8px' }}>📚</div>
          <div style={{ fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.4)', letterSpacing:'0.1em', textTransform:'uppercase' }}>Resources</div>
          <div style={{ fontSize:'18px', fontWeight:800, color:'#34d399', marginTop:'3px' }}>Manage</div>
        </div>
      </Grid4>

      <TwoCol>
        <Panel title="Recent Leads">
          {loading ? <Empty msg="Loading..." /> : leads.length === 0 ? <Empty msg="No leads yet." /> :
            leads.map(l => <Row key={l.id} name={l.full_name}
              sub={`${l.phone||l.email||'—'} · ${l.course_interest||'No course'}`}
              right={<Pill status={l.status} />} />)}
        </Panel>

        <Panel title="Users — Set Role">
          {loading ? <Empty msg="Loading..." /> : users.length === 0 ? <Empty msg="No users yet." /> :
            users.map(u => (
              <div key={u.id} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 0', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.85)', fontWeight:500 }}>{u.full_name || u.email}</div>
                  <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)' }}>{u.email}</div>
                </div>
                <select value={u.role} onChange={e => changeRole(u.id, e.target.value)} style={sel}>
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="sales">Sales</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            ))}
        </Panel>
      </TwoCol>

      <Panel title="Recent Classes" style={{ marginTop:'14px' }}>
        {loading ? <Empty msg="Loading..." /> : classes.length === 0 ? <Empty msg="No classes yet." /> :
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:'10px' }}>
            {classes.map(c => (
              <div key={c.id} style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'10px', padding:'12px' }}>
                <div style={{ fontSize:'13px', fontWeight:600, color:'rgba(255,255,255,0.85)', marginBottom:'4px' }}>{c.title}</div>
                <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)' }}>{c.class_date||'No date'} {c.start_time && `· ${c.start_time}`}</div>
                {c.meet_link && <a href={c.meet_link} target="_blank" rel="noreferrer" style={{ display:'inline-block', marginTop:'8px', fontSize:'11px', background:'rgba(30,144,255,0.15)', color:'#5aabff', border:'0.5px solid rgba(30,144,255,0.25)', borderRadius:'6px', padding:'3px 10px', fontWeight:700 }}>Join Zoom</a>}
              </div>
            ))}
          </div>}
      </Panel>
    <ManageUsers profile={profile} />
    <ManageCourses profile={profile} />
    <PaymentsAdmin profile={profile} />
    <Calendar profile={profile} />
    <Resources profile={profile} />
    </Layout>
  )
}
