import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabaseClient'
import Calendar from './Calendar'
import ManageUsers from './ManageUsers'
import PaymentsAdmin from './PaymentsAdmin'
import ManageCourses from './ManageCourses'
import Resources from './Resources'
import RevenueChart from './RevenueChart'
import Layout, { PageHeader, Grid4, MetricCard, Panel, TwoCol, Row, Pill, Empty, Lbl, Inp, Btn, Err, Ok } from './Layout'

const SOURCE_COLOR = {
  'Google Ads':    { bg:'rgba(66,133,244,0.15)',  c:'#4285f4' },
  'Facebook Ads':  { bg:'rgba(24,119,242,0.15)',  c:'#1877f2' },
  'Instagram Ads': { bg:'rgba(193,53,132,0.15)',  c:'#c13584' },
  'Landing Page':  { bg:'rgba(16,185,129,0.15)',  c:'#10b981' },
  'Sales Team':    { bg:'rgba(232,124,30,0.15)',  c:'#f4a335' },
  'Bulk Upload':   { bg:'rgba(139,92,246,0.15)',  c:'#a78bfa' },
}

function SourceBadge({ source }) {
  const s = SOURCE_COLOR[source] || { bg:'rgba(100,100,100,0.15)', c:'#888' }
  return (
    <span style={{ fontSize:'9px', fontWeight:700, padding:'3px 8px', borderRadius:'10px',
      background:s.bg, color:s.c, whiteSpace:'nowrap', flexShrink:0 }}>
      {source || 'Unknown'}
    </span>
  )
}

export default function AdminDash({ profile }) {
  const [stats,   setStats]   = useState({ users:0, students:0, leads:0, newLeads:0, revenue:0 })
  const [leads,   setLeads]   = useState([])
  const [users,   setUsers]   = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('overview')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [
      { count: usersCount },
      { count: studentsCount },
      { count: leadsCount },
      { count: newLeadsCount },
      { data: allLeads },
      { data: recentUsers },
      { data: recentClasses },
      { data: payments },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count:'exact', head:true }),
      supabase.from('profiles').select('*', { count:'exact', head:true }).eq('role','student'),
      supabase.from('leads').select('*', { count:'exact', head:true }),
      supabase.from('leads').select('*', { count:'exact', head:true }).eq('status','New'),
      supabase.from('leads').select('*').order('created_at', { ascending:false }).limit(50),
      supabase.from('profiles').select('*').order('created_at', { ascending:false }).limit(6),
      supabase.from('classes').select('*').order('created_at', { ascending:false }).limit(4),
      supabase.from('payments').select('amount,status').eq('status','paid'),
    ])
    const revenue = (payments||[]).reduce((a,p) => a+(p.amount||0), 0)
    setStats({ users:usersCount, students:studentsCount, leads:leadsCount, newLeads:newLeadsCount, revenue })
    setLeads(allLeads || [])
    setUsers(recentUsers || [])
    setClasses(recentClasses || [])
    setLoading(false)
  }

  async function changeRole(id, role) {
    await supabase.from('profiles').update({ role }).eq('id', id)
    load()
  }

  async function updateLeadStatus(id, status) {
    await supabase.from('leads').update({ status }).eq('id', id)
    load()
  }

  const newLeads = leads.filter(l => l.status === 'New')
  const adLeads  = leads.filter(l => l.source && ['Google Ads','Facebook Ads','Instagram Ads','Landing Page'].includes(l.source))

  const sel = { background:'rgba(255,255,255,0.07)', border:'0.5px solid rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.7)', borderRadius:'6px', padding:'4px 8px', fontSize:'11px', cursor:'pointer', outline:'none' }
  const STATUSES = ['New','Contacted','Demo Scheduled','Enrolled','Lost']

  return (
    <Layout profile={profile} pageTitle="Dashboard">
      <PageHeader title="Platform Overview" subtitle="Live metrics — full admin access." />

      {/* ── METRIC CARDS ── */}
      <Grid4>
        <MetricCard icon="👥" label="Total Users"   value={stats.users}    />
        <MetricCard icon="🎓" label="Students"      value={stats.students}  />
        <MetricCard icon="🆕" label="New Leads"     value={stats.newLeads}
          accentColor={stats.newLeads > 0 ? '#f4a335' : '#fff'}
          onClick={() => setActiveSection('leads')} />
        <MetricCard icon="💰" label="Revenue"       value={`₹${(stats.revenue||0).toLocaleString('en-IN')}`} accentColor="#10b981" />
      </Grid4>

      {/* ── QUICK NAV ── */}
      <div style={{ display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap' }}>
        {[
          { id:'overview', label:'📊 Overview'    },
          { id:'leads',    label:'📋 All Leads'   },
          { id:'adleads',  label:'📣 From Ads'    },
          { id:'users',    label:'👥 Users'       },
        ].map(item => (
          <button key={item.id} onClick={() => setActiveSection(item.id)} style={{
            fontSize:'12px', fontWeight:600, padding:'7px 14px', borderRadius:'10px',
            border:'none', cursor:'pointer', fontFamily:'inherit',
            background: activeSection===item.id ? '#1e90ff' : 'rgba(255,255,255,0.06)',
            color:      activeSection===item.id ? '#fff'    : 'rgba(255,255,255,0.5)',
            position:'relative',
          }}>
            {item.label}
            {item.id==='leads' && stats.newLeads > 0 && (
              <span style={{ position:'absolute', top:'-6px', right:'-6px', background:'#f4a335', color:'#000', fontSize:'9px', fontWeight:800, borderRadius:'10px', padding:'1px 5px' }}>{stats.newLeads}</span>
            )}
            {item.id==='adleads' && adLeads.filter(l=>l.status==='New').length > 0 && (
              <span style={{ position:'absolute', top:'-6px', right:'-6px', background:'#ef4444', color:'#fff', fontSize:'9px', fontWeight:800, borderRadius:'10px', padding:'1px 5px' }}>{adLeads.filter(l=>l.status==='New').length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeSection === 'overview' && (
        <>
          <TwoCol>
            <Panel title="Recent Leads">
              {loading ? <Empty msg="Loading..." /> : leads.slice(0,6).length === 0 ? <Empty msg="No leads yet." /> :
                leads.slice(0,6).map(l => (
                  <div key={l.id} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'9px 0', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width:'28px', height:'28px', borderRadius:'50%', flexShrink:0, background:'rgba(139,92,246,0.2)', color:'#a78bfa', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:800 }}>
                      {(l.full_name||'?').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.85)', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.full_name}</div>
                      <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)' }}>{l.phone||l.email||'—'} · {l.course_interest||'No course'}</div>
                    </div>
                    <SourceBadge source={l.source} />
                    <Pill status={l.status} />
                  </div>
                ))}
              <button onClick={() => setActiveSection('leads')} style={{ marginTop:'10px', fontSize:'12px', color:'#5aabff', background:'none', border:'none', cursor:'pointer', padding:0 }}>View all {stats.leads} leads →</button>
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
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'10px' }}>
                {classes.map(c => (
                  <div key={c.id} style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'10px', padding:'12px' }}>
                    <div style={{ fontSize:'13px', fontWeight:600, color:'rgba(255,255,255,0.85)' }}>{c.title}</div>
                    <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)', marginTop:'3px' }}>{c.class_date} {c.start_time && `· ${c.start_time}`}</div>
                    {c.teacher_name && <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'2px' }}>👨‍🏫 {c.teacher_name}</div>}
                  </div>
                ))}
              </div>}
          </Panel>

          <RevenueChart />
          <BulkUploadAdmin profile={profile} />
        </>
      )}

      {/* ── ALL LEADS ── */}
      {activeSection === 'leads' && (
        <>
          <PageHeader title={`All Leads (${stats.leads})`} subtitle="Every lead from all sources." />
          <Panel>
            {loading ? <Empty msg="Loading..." /> : leads.length === 0 ? <Empty msg="No leads yet. Share your /book link to get started!" /> :
              leads.map(l => (
                <div key={l.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 0', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ width:'30px', height:'30px', borderRadius:'50%', flexShrink:0, background:'rgba(139,92,246,0.2)', color:'#a78bfa', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:800 }}>
                    {(l.full_name||'?').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.85)', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.full_name}</div>
                    <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'1px' }}>{l.phone} {l.email && `· ${l.email}`} {l.course_interest && `· ${l.course_interest}`}</div>
                    {l.notes && <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.2)', marginTop:'1px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.notes.split('\n')[0]}</div>}
                  </div>
                  <SourceBadge source={l.source} />
                  <select value={l.status||'New'} onChange={e => updateLeadStatus(l.id, e.target.value)} style={sel}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              ))}
          </Panel>
        </>
      )}

      {/* ── FROM ADS ── */}
      {activeSection === 'adleads' && (
        <>
          <PageHeader title="Leads from Ads / Landing Page" subtitle="All leads submitted via your /book form." />

          {/* Source breakdown */}
          <div style={{ display:'flex', gap:'10px', marginBottom:'14px', flexWrap:'wrap' }}>
            {Object.entries(SOURCE_COLOR).map(([src, style]) => {
              const count = leads.filter(l => l.source === src).length
              if (!count) return null
              return (
                <div key={src} style={{ padding:'8px 16px', borderRadius:'20px', background:style.bg, fontSize:'12px', fontWeight:700, color:style.c }}>
                  {src}: {count}
                </div>
              )
            })}
          </div>

          <Panel title={adLeads.length === 0 ? 'No ad leads yet' : `${adLeads.length} leads from ads`}>
            {adLeads.length === 0 ? (
              <div style={{ textAlign:'center', padding:'2rem 1rem' }}>
                <div style={{ fontSize:'32px', marginBottom:'12px' }}>📣</div>
                <div style={{ fontSize:'14px', color:'rgba(255,255,255,0.5)', marginBottom:'8px' }}>No leads from ads yet.</div>
                <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.3)' }}>Share this link in your Google / Meta ads:</div>
                <div style={{ marginTop:'10px', padding:'10px 16px', background:'rgba(30,144,255,0.1)', border:'0.5px solid rgba(30,144,255,0.2)', borderRadius:'10px', fontFamily:'monospace', fontSize:'13px', color:'#5aabff' }}>
                  https://uniedd-lms.vercel.app/book
                </div>
              </div>
            ) : (
              adLeads.map(l => (
                <div key={l.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 0', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ width:'30px', height:'30px', borderRadius:'50%', flexShrink:0, background:'rgba(30,144,255,0.2)', color:'#5aabff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:800 }}>
                    {(l.full_name||'?').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.85)', fontWeight:600 }}>{l.full_name}</div>
                    <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'1px' }}>{l.phone} {l.email && `· ${l.email}`} {l.course_interest && `· ${l.course_interest}`}</div>
                    {l.notes && (
                      <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.25)', marginTop:'2px' }}>
                        {l.notes.split('\n').map((n,i) => <span key={i} style={{ display:'block' }}>{n}</span>)}
                      </div>
                    )}
                    <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.2)', marginTop:'2px' }}>
                      {new Date(l.created_at).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <SourceBadge source={l.source} />
                  <select value={l.status||'New'} onChange={e => updateLeadStatus(l.id, e.target.value)} style={sel}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              ))
            )}
          </Panel>
        </>
      )}

      {/* ── USERS ── */}
      {activeSection === 'users' && (
        <>
          <PageHeader title="All Users" subtitle="Manage roles across the platform." />
          <Panel>
            {loading ? <Empty msg="Loading..." /> : users.length === 0 ? <Empty msg="No users yet." /> :
              users.map(u => (
                <div key={u.id} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 0', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ width:'32px', height:'32px', borderRadius:'50%', flexShrink:0, background:'rgba(30,144,255,0.2)', color:'#5aabff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:800 }}>
                    {(u.full_name||u.email||'?').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.85)', fontWeight:500 }}>{u.full_name || '—'}</div>
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
        </>
      )}

      {/* Sections always rendered (anchor scroll for sidebar nav) */}
      <ManageUsers   profile={profile} />
      <ManageCourses profile={profile} />
      <PaymentsAdmin profile={profile} />
      <Calendar      profile={profile} />
      <Resources     profile={profile} />
    </Layout>
  )
}

// ── BULK UPLOAD — Admin only ─────────────────────────────────
function BulkUploadAdmin({ profile }) {
  const [csv,      setCsv]      = useState('')
  const [preview,  setPreview]  = useState([])
  const [uploading,setUploading]= useState(false)
  const [ok,       setOk]       = useState('')
  const [err,      setErr]      = useState('')
  const [open,     setOpen]     = useState(false)
  const fileRef = useRef()

  function parseCSV(text) {
    const lines = text.trim().split('\n').filter(l => l.trim())
    if (lines.length < 2) return []
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g,''))
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/"/g,''))
      const obj = {}; headers.forEach((h,i) => obj[h] = vals[i]||'')
      return { full_name:obj['name']||obj['full_name']||obj['full name']||'', phone:obj['phone']||obj['mobile']||'', email:obj['email']||'', course_interest:obj['course']||obj['course_interest']||'', source:obj['source']||'Bulk Upload' }
    }).filter(r => r.full_name)
  }
  function handleFile(e) {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { setCsv(ev.target.result); setPreview(parseCSV(ev.target.result)); setErr(''); setOk('') }
    reader.readAsText(file)
  }
  async function uploadLeads() {
    if (!preview.length) return setErr('No valid leads to upload.')
    setUploading(true); setErr(''); setOk('')
    const { error } = await supabase.from('leads').insert(preview.map(r => ({ ...r, assigned_to:profile.id, status:'New' })))
    if (error) setErr(error.message)
    else { setOk(`✓ ${preview.length} leads uploaded!`); setPreview([]); setCsv(''); if(fileRef.current) fileRef.current.value='' }
    setUploading(false)
  }

  return (
    <div id="uniedd-bulk-upload" style={{ marginTop:'14px' }}>
      <div style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'1rem 1.1rem' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:open?'14px':0, paddingBottom:open?'8px':0, borderBottom:open?'0.5px solid rgba(255,255,255,0.06)':'none' }}>
          <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.7)' }}>
            📤 Bulk Lead Upload <span style={{ fontSize:'10px', fontWeight:600, padding:'2px 8px', borderRadius:'10px', background:'rgba(232,124,30,0.15)', color:'#e87c1e', marginLeft:'6px' }}>Admin only</span>
          </div>
          <button onClick={() => setOpen(o => !o)} style={{ fontSize:'12px', fontWeight:600, padding:'5px 14px', borderRadius:'8px', background:open?'rgba(255,255,255,0.07)':'rgba(30,144,255,0.15)', color:open?'rgba(255,255,255,0.4)':'#5aabff', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
            {open ? 'Close ✕' : '+ Upload CSV'}
          </button>
        </div>
        {open && (
          <>
            <div style={{ marginBottom:'12px', padding:'10px 14px', background:'rgba(30,144,255,0.07)', border:'0.5px solid rgba(30,144,255,0.18)', borderRadius:'10px', fontSize:'12px', color:'rgba(255,255,255,0.45)', lineHeight:1.7 }}>
              <strong style={{ color:'#5aabff' }}>CSV Format:</strong> Required: <code style={{ color:'#e87c1e' }}>name</code> | Optional: <code style={{ color:'#e87c1e' }}>phone, email, course, source</code>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
              <div>
                <Lbl>Upload CSV File</Lbl>
                <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'10px 13px', fontSize:'13px', color:'rgba(255,255,255,0.7)', outline:'none' }}/>
              </div>
              <div>
                <Lbl>Or Paste CSV Text</Lbl>
                <textarea value={csv} onChange={e => { setCsv(e.target.value); setPreview(parseCSV(e.target.value)) }} rows={4} placeholder={"name,phone,email,course\nRahul,9876543210,r@gmail.com,Guitar"} style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'10px 13px', fontSize:'12px', color:'rgba(255,255,255,0.7)', outline:'none', resize:'vertical', fontFamily:'monospace', boxSizing:'border-box' }}/>
              </div>
            </div>
            {preview.length > 0 && <div style={{ fontSize:'12px', fontWeight:700, color:'#5aabff', marginBottom:'8px' }}>{preview.length} leads ready</div>}
            <Err msg={err}/><Ok msg={ok}/>
            <Btn busy={uploading} style={{ marginTop:'8px' }} onClick={uploadLeads}>Upload {preview.length > 0 ? `${preview.length} Leads` : 'Leads'}</Btn>
          </>
        )}
      </div>
    </div>
  )
}
