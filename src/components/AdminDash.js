import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabaseClient'
import Calendar from './Calendar'
import ManageUsers from './ManageUsers'
import PaymentsAdmin from './PaymentsAdmin'
import ManageCourses from './ManageCourses'
import Resources from './Resources'
import RevenueChart from './RevenueChart'
import Layout, { PageHeader, Grid4, MetricCard, Panel, TwoCol, Row, Pill, Empty, Lbl, Inp, Btn, Err, Ok } from './Layout'

export default function AdminDash({ profile }) {
  const [stats,   setStats]   = useState({ users:0, students:0, leads:0, classes:0, revenue:0 })
  const [leads,   setLeads]   = useState([])
  const [users,   setUsers]   = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [
      { count: usersCount },
      { count: studentsCount },
      { count: leadsCount },
      { count: classesCount },
      { data: recentLeads },
      { data: recentUsers },
      { data: recentClasses },
      { data: payments },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count:'exact', head:true }),
      supabase.from('profiles').select('*', { count:'exact', head:true }).eq('role','student'),
      supabase.from('leads').select('*', { count:'exact', head:true }).not('status','in','(enrolled,lost,Enrolled,Lost)'),
      supabase.from('classes').select('*', { count:'exact', head:true }),
      supabase.from('leads').select('*').order('created_at',{ ascending:false }).limit(6),
      supabase.from('profiles').select('*').order('created_at',{ ascending:false }).limit(6),
      supabase.from('classes').select('*').order('created_at',{ ascending:false }).limit(4),
      supabase.from('payments').select('amount,status').eq('status','paid'),
    ])
    const revenue = (payments||[]).reduce((a,p) => a+(p.amount||0), 0)
    setStats({ users:usersCount, students:studentsCount, leads:leadsCount, classes:classesCount, revenue })
    setLeads(recentLeads || [])
    setUsers(recentUsers || [])
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
      <PageHeader title="Platform Overview" subtitle="Live metrics — full admin access." />

      <Grid4>
        <MetricCard icon="👥" label="Total Users"  value={stats.users}    />
        <MetricCard icon="🎓" label="Students"     value={stats.students}  />
        <MetricCard icon="📋" label="Active Leads" value={stats.leads}    />
        <MetricCard icon="💰" label="Revenue"      value={`₹${(stats.revenue||0).toLocaleString('en-IN')}`} accentColor="#10b981" />
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
                {c.teacher_name && <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'3px' }}>👨‍🏫 {c.teacher_name}</div>}
                {c.meet_link && <a href={c.meet_link} target="_blank" rel="noreferrer" style={{ display:'inline-block', marginTop:'8px', fontSize:'11px', background:'rgba(30,144,255,0.15)', color:'#5aabff', border:'0.5px solid rgba(30,144,255,0.25)', borderRadius:'6px', padding:'3px 10px', fontWeight:700 }}>Join Zoom</a>}
              </div>
            ))}
          </div>}
      </Panel>

      <RevenueChart />
      <BulkUploadAdmin profile={profile} />
      <ManageUsers profile={profile} />
      <ManageCourses profile={profile} />
      <PaymentsAdmin profile={profile} />
      <Calendar profile={profile} />
      <Resources profile={profile} />
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
    else { setOk(`✓ ${preview.length} leads uploaded successfully!`); setPreview([]); setCsv(''); if(fileRef.current) fileRef.current.value='' }
    setUploading(false)
  }

  return (
    <div id="uniedd-bulk-upload" style={{ marginTop:'14px' }}>
      <div style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'1rem 1.1rem' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: open ? '14px' : 0, paddingBottom: open ? '8px' : 0, borderBottom: open ? '0.5px solid rgba(255,255,255,0.06)' : 'none' }}>
          <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.7)' }}>📤 Bulk Lead Upload <span style={{ fontSize:'10px', fontWeight:600, padding:'2px 8px', borderRadius:'10px', background:'rgba(232,124,30,0.15)', color:'#e87c1e', marginLeft:'6px' }}>Admin only</span></div>
          <button onClick={() => setOpen(o => !o)} style={{ fontSize:'12px', fontWeight:600, padding:'5px 14px', borderRadius:'8px', background:open?'rgba(255,255,255,0.07)':'rgba(30,144,255,0.15)', color:open?'rgba(255,255,255,0.4)':'#5aabff', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
            {open ? 'Close ✕' : '+ Upload Leads'}
          </button>
        </div>

        {open && (
          <>
            <div style={{ marginBottom:'12px', padding:'10px 14px', background:'rgba(30,144,255,0.07)', border:'0.5px solid rgba(30,144,255,0.18)', borderRadius:'10px', fontSize:'12px', color:'rgba(255,255,255,0.45)', lineHeight:1.7 }}>
              <strong style={{ color:'#5aabff' }}>CSV Format:</strong> First row = headers. Required: <code style={{ color:'#e87c1e' }}>name</code> | Optional: <code style={{ color:'#e87c1e' }}>phone, email, course, source</code>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
              <div>
                <Lbl>Upload CSV File</Lbl>
                <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile}
                  style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'10px 13px', fontSize:'13px', color:'rgba(255,255,255,0.7)', outline:'none' }}/>
              </div>
              <div>
                <Lbl>Or Paste CSV Text</Lbl>
                <textarea value={csv} onChange={e => { setCsv(e.target.value); setPreview(parseCSV(e.target.value)) }} rows={4}
                  placeholder={"name,phone,email,course\nRahul Sharma,9876543210,rahul@gmail.com,IELTS"}
                  style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'10px 13px', fontSize:'12px', color:'rgba(255,255,255,0.7)', outline:'none', resize:'vertical', fontFamily:'monospace', boxSizing:'border-box' }}/>
              </div>
            </div>

            {preview.length > 0 && (
              <>
                <div style={{ fontSize:'12px', fontWeight:700, color:'#5aabff', marginBottom:'8px' }}>Preview — {preview.length} leads ready</div>
                <div style={{ maxHeight:'180px', overflowY:'auto', marginBottom:'12px', borderRadius:'8px', border:'0.5px solid rgba(255,255,255,0.07)' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
                    <thead>
                      <tr style={{ background:'rgba(255,255,255,0.04)' }}>
                        {['Name','Phone','Email','Course','Source'].map(h => (
                          <th key={h} style={{ padding:'7px 10px', textAlign:'left', color:'rgba(255,255,255,0.4)', fontWeight:600, fontSize:'10px', textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((r,i) => (
                        <tr key={i} style={{ borderTop:'0.5px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding:'7px 10px', color:'rgba(255,255,255,0.8)' }}>{r.full_name}</td>
                          <td style={{ padding:'7px 10px', color:'rgba(255,255,255,0.4)' }}>{r.phone||'—'}</td>
                          <td style={{ padding:'7px 10px', color:'rgba(255,255,255,0.4)' }}>{r.email||'—'}</td>
                          <td style={{ padding:'7px 10px', color:'rgba(255,255,255,0.4)' }}>{r.course_interest||'—'}</td>
                          <td style={{ padding:'7px 10px', color:'rgba(255,255,255,0.4)' }}>{r.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <Err msg={err}/><Ok msg={ok}/>
            <Btn busy={uploading} style={{ marginTop:'8px' }} onClick={uploadLeads}>
              Upload {preview.length > 0 ? `${preview.length} Leads` : 'Leads'}
            </Btn>
          </>
        )}
      </div>
    </div>
  )
}
