import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabaseClient'
import Layout, { PageHeader, Grid4, MetricCard, Panel, TwoCol, Lbl, Inp, Btn, Err, Ok, Empty } from './Layout'
import Calendar from './Calendar'
import Resources from './Resources'

const STATUSES = ['New','Contacted','Demo Scheduled','Enrolled','Lost']

export default function SalesDash({ profile }) {
  const [tab, setTab] = useState('leads') // leads | demo | invoice | classes

  return (
    <Layout profile={profile} pageTitle="Sales CRM">
      <PageHeader title="Sales Pipeline" subtitle="Manage leads, demos, invoices and classes." />

      {/* Tab nav */}
      <div style={{ display:'flex', gap:'6px', marginBottom:'16px', flexWrap:'wrap' }}>
        {[
          { id:'leads',   icon:'📋', label:'Leads'         },
          { id:'bulk',    icon:'📤', label:'Bulk Upload'    },
          { id:'demo',    icon:'▶',  label:'Schedule Demo'  },
          { id:'classes', icon:'📅', label:'Teacher Classes'},
          { id:'invoice', icon:'🧾', label:'Invoice'        },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            fontSize:'13px', fontWeight:600, padding:'8px 16px', borderRadius:'10px', border:'none', cursor:'pointer',
            background: tab===t.id ? '#1e90ff' : 'rgba(255,255,255,0.06)',
            color:      tab===t.id ? '#fff'    : 'rgba(255,255,255,0.5)',
            transition:'all 0.2s',
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'leads'   && <LeadsTab   profile={profile} />}
      {tab === 'bulk'    && <BulkTab    profile={profile} />}
      {tab === 'demo'    && <DemoTab    profile={profile} />}
      {tab === 'classes' && <ClassesTab profile={profile} />}
      {tab === 'invoice' && <InvoiceTab profile={profile} />}

      <Calendar  profile={profile} />
      <Resources profile={profile} />
    </Layout>
  )
}

// ─────────────────────────────────────────────────────────────
// TAB 1: LEADS
// ─────────────────────────────────────────────────────────────
function LeadsTab({ profile }) {
  const [leads,  setLeads]  = useState([])
  const [loading,setLoading]= useState(true)
  const [name,   setName]   = useState('')
  const [phone,  setPhone]  = useState('')
  const [email,  setEmail]  = useState('')
  const [course, setCourse] = useState('')
  const [busy,   setBusy]   = useState(false)
  const [err,    setErr]    = useState('')
  const [ok,     setOk]     = useState('')

  useEffect(() => { loadLeads() }, [])

  async function loadLeads() {
    setLoading(true)
    const { data } = await supabase.from('leads').select('*').order('created_at',{ ascending:false })
    setLeads(data || [])
    setLoading(false)
  }

  async function addLead(e) {
    e.preventDefault(); setErr(''); setOk('')
    if (!name.trim()) return setErr('Full name is required.')
    setBusy(true)
    const { error } = await supabase.from('leads').insert({
      full_name: name.trim(), phone: phone||null, email: email||null,
      course_interest: course||null, assigned_to: profile.id, status:'New', source:'Sales Team',
    })
    if (error) setErr(error.message)
    else { setOk('✓ Lead added!'); setName(''); setPhone(''); setEmail(''); setCourse(''); loadLeads() }
    setBusy(false)
    setTimeout(() => setOk(''), 3000)
  }

  async function updateStatus(id, status) {
    await supabase.from('leads').update({ status }).eq('id', id)
    loadLeads()
  }

  const week = leads.filter(l => (Date.now() - new Date(l.created_at)) < 7*24*60*60*1000)
  const sel  = { background:'rgba(255,255,255,0.07)', border:'0.5px solid rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.7)', borderRadius:'6px', padding:'3px 6px', fontSize:'10px', cursor:'pointer', outline:'none', flexShrink:0 }

  return (
    <>
      <Grid4>
        <MetricCard icon="📋" label="Total Leads"    value={leads.length} />
        <MetricCard icon="🆕" label="This Week"      value={week.length}  />
        <MetricCard icon="▶"  label="Demo Scheduled" value={leads.filter(l=>l.status==='Demo Scheduled').length} />
        <MetricCard icon="👤" label="Enrolled"       value={leads.filter(l=>l.status==='Enrolled').length} />
      </Grid4>
      <TwoCol>
        <Panel title="Active Leads">
          {loading ? <Empty msg="Loading..." /> :
           leads.length === 0 ? <Empty msg="No leads yet." /> :
           leads.map(l => (
             <div key={l.id} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'9px 0', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
               <div style={{ flex:1 }}>
                 <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.85)', fontWeight:500 }}>{l.full_name}</div>
                 <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)' }}>{l.phone||l.email||'—'} · {l.course_interest||'No course'}</div>
               </div>
               <select value={l.status} onChange={e=>updateStatus(l.id,e.target.value)} style={sel}>
                 {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
               </select>
             </div>
           ))}
        </Panel>
        <Panel title="Add New Lead">
          <form onSubmit={addLead}>
            <Lbl>Full Name *</Lbl><Inp type="text" placeholder="Lead's full name" value={name} onChange={e=>setName(e.target.value)} required />
            <Lbl>Phone</Lbl><Inp type="tel" placeholder="+91 XXXXX XXXXX" value={phone} onChange={e=>setPhone(e.target.value)} />
            <Lbl>Email</Lbl><Inp type="email" placeholder="Optional" value={email} onChange={e=>setEmail(e.target.value)} />
            <Lbl>Course Interest</Lbl><Inp type="text" placeholder="e.g. IELTS, Spoken English" value={course} onChange={e=>setCourse(e.target.value)} />
            <Err msg={err}/><Ok msg={ok}/>
            <Btn busy={busy}>Add Lead</Btn>
          </form>
        </Panel>
      </TwoCol>
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// TAB 2: BULK UPLOAD
// ─────────────────────────────────────────────────────────────
function BulkTab({ profile }) {
  const [csv,     setCsv]     = useState('')
  const [preview, setPreview] = useState([])
  const [uploading,setUploading]=useState(false)
  const [ok,      setOk]      = useState('')
  const [err,     setErr]     = useState('')
  const fileRef = useRef()

  function parseCSV(text) {
    const lines = text.trim().split('\n').filter(l => l.trim())
    if (lines.length < 2) return []
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g,''))
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/"/g,''))
      const obj  = {}
      headers.forEach((h,i) => obj[h] = vals[i] || '')
      return {
        full_name:       obj['name'] || obj['full_name'] || obj['full name'] || '',
        phone:           obj['phone'] || obj['mobile'] || '',
        email:           obj['email'] || '',
        course_interest: obj['course'] || obj['course_interest'] || obj['interest'] || '',
        source:          obj['source'] || 'Bulk Upload',
      }
    }).filter(r => r.full_name)
  }

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target.result
      setCsv(text)
      setPreview(parseCSV(text))
      setErr(''); setOk('')
    }
    reader.readAsText(file)
  }

  function handlePaste(text) {
    setCsv(text)
    setPreview(parseCSV(text))
    setErr(''); setOk('')
  }

  async function uploadLeads() {
    if (preview.length === 0) return setErr('No valid leads to upload.')
    setUploading(true); setErr(''); setOk('')
    const rows = preview.map(r => ({ ...r, assigned_to: profile.id, status:'New' }))
    const { error } = await supabase.from('leads').insert(rows)
    if (error) setErr(error.message)
    else { setOk(`✓ ${rows.length} leads uploaded successfully!`); setPreview([]); setCsv(''); if(fileRef.current) fileRef.current.value='' }
    setUploading(false)
  }

  return (
    <Panel title="📤 Bulk Lead Upload">
      <div style={{ marginBottom:'12px', padding:'10px 14px', background:'rgba(30,144,255,0.07)', border:'0.5px solid rgba(30,144,255,0.2)', borderRadius:'10px', fontSize:'12px', color:'rgba(255,255,255,0.5)', lineHeight:1.7 }}>
        <strong style={{ color:'#5aabff' }}>CSV Format:</strong> First row must be headers.<br/>
        Required: <code style={{ color:'#e87c1e' }}>name</code> &nbsp;|&nbsp;
        Optional: <code style={{ color:'#e87c1e' }}>phone, email, course, source</code><br/>
        Example: <code style={{ color:'rgba(255,255,255,0.4)' }}>name,phone,email,course</code>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
        <div>
          <Lbl>Upload CSV File</Lbl>
          <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile}
            style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'10px 13px', fontSize:'13px', color:'rgba(255,255,255,0.7)', outline:'none' }}/>
        </div>
        <div>
          <Lbl>Or Paste CSV Text</Lbl>
          <textarea value={csv} onChange={e => handlePaste(e.target.value)} rows={4}
            placeholder={"name,phone,email,course\nRahul Sharma,9876543210,rahul@gmail.com,IELTS\nPriya Kapoor,9876543211,,Spoken English"}
            style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'10px 13px', fontSize:'12px', color:'rgba(255,255,255,0.7)', outline:'none', resize:'vertical', fontFamily:'monospace' }}/>
        </div>
      </div>

      {preview.length > 0 && (
        <>
          <div style={{ fontSize:'12px', fontWeight:700, color:'rgba(255,255,255,0.5)', marginBottom:'8px' }}>
            Preview — {preview.length} leads ready to upload:
          </div>
          <div style={{ maxHeight:'200px', overflowY:'auto', marginBottom:'12px', borderRadius:'8px', border:'0.5px solid rgba(255,255,255,0.08)' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
              <thead>
                <tr style={{ background:'rgba(255,255,255,0.05)' }}>
                  {['Name','Phone','Email','Course','Source'].map(h => (
                    <th key={h} style={{ padding:'8px 10px', textAlign:'left', color:'rgba(255,255,255,0.4)', fontWeight:600, fontSize:'10px', letterSpacing:'0.05em', textTransform:'uppercase' }}>{h}</th>
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
    </Panel>
  )
}

// ─────────────────────────────────────────────────────────────
// TAB 3: SCHEDULE DEMO
// ─────────────────────────────────────────────────────────────
function DemoTab({ profile }) {
  const [leads,    setLeads]    = useState([])
  const [teachers, setTeachers] = useState([])
  const [leadId,   setLeadId]   = useState('')
  const [teacherId,setTeacherId]= useState('')
  const [date,     setDate]     = useState('')
  const [time,     setTime]     = useState('')
  const [topic,    setTopic]    = useState('')
  const [duration, setDuration] = useState('60')
  const [notes,    setNotes]    = useState('')
  const [busy,     setBusy]     = useState(false)
  const [err,      setErr]      = useState('')
  const [ok,       setOk]       = useState('')
  const [demos,    setDemos]    = useState([])

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [{ data: l },{ data: t },{ data: d }] = await Promise.all([
      supabase.from('leads').select('id,full_name,phone,email,course_interest').not('status','eq','Enrolled').not('status','eq','Lost').order('created_at',{ascending:false}),
      supabase.from('profiles').select('id,full_name').eq('role','teacher'),
      supabase.from('classes').select('*,profiles(full_name)').eq('duration','demo').order('class_date',{ascending:false}).limit(10),
    ])
    setLeads(l||[])
    setTeachers(t||[])
    setDemos(d||[])
  }

  async function scheduleDemo(e) {
    e.preventDefault(); setErr(''); setOk('')
    if (!leadId || !date || !time) return setErr('Lead, date and time are required.')
    const lead    = leads.find(l => l.id === leadId)
    const teacher = teachers.find(t => t.id === teacherId)
    setBusy(true)

    // Create class entry (webhook will auto-generate Zoom link)
    const { error } = await supabase.from('classes').insert({
      title:        topic || `Demo — ${lead?.full_name}`,
      teacher_id:   teacherId || null,
      teacher_name: teacher?.full_name || null,
      class_date:   date,
      start_time:   time,
      duration:     'demo',
      batch:        null,
      meet_link:    null,
    })

    if (error) { setErr(error.message); setBusy(false); return }

    // Update lead status
    await supabase.from('leads').update({
      status:    'Demo Scheduled',
      demo_date: `${date}T${time}:00`,
      notes:     notes || null,
    }).eq('id', leadId)

    // Add to calendar
    const [y,m,d2] = date.split('-').map(Number)
    await supabase.from('events').insert({
      title:        `Demo: ${lead?.full_name}`,
      event_type:   'demo',
      day: d2, month: m, year: y,
      time,
      teacher_name: teacher?.full_name || null,
      lead:         lead?.full_name || null,
      sales:        profile.full_name || null,
    })

    setOk(`✓ Demo scheduled for ${lead?.full_name} on ${date} at ${time}. Zoom link auto-generating...`)
    setLeadId(''); setTeacherId(''); setDate(''); setTime(''); setTopic(''); setNotes('')
    loadData()
    setBusy(false)
    setTimeout(() => setOk(''), 5000)
  }

  const sel = { width:'100%', background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'11px 13px', fontSize:'14px', color:'rgba(255,255,255,0.85)', outline:'none', fontFamily:'inherit' }

  return (
    <TwoCol>
      <Panel title="▶ Schedule a Demo Class">
        <form onSubmit={scheduleDemo}>
          <Lbl>Select Lead *</Lbl>
          <select style={sel} value={leadId} onChange={e=>setLeadId(e.target.value)} required>
            <option value="">— Choose lead —</option>
            {leads.map(l => <option key={l.id} value={l.id}>{l.full_name} {l.phone ? `· ${l.phone}` : ''} {l.course_interest ? `· ${l.course_interest}` : ''}</option>)}
          </select>

          <Lbl>Assign Teacher</Lbl>
          <select style={sel} value={teacherId} onChange={e=>setTeacherId(e.target.value)}>
            <option value="">— Select teacher (optional) —</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
          </select>

          <Lbl>Demo Topic</Lbl>
          <Inp type="text" placeholder="e.g. IELTS Speaking Demo" value={topic} onChange={e=>setTopic(e.target.value)} />

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            <div><Lbl>Date *</Lbl><Inp type="date" value={date} onChange={e=>setDate(e.target.value)} required /></div>
            <div><Lbl>Time *</Lbl><Inp type="time" value={time} onChange={e=>setTime(e.target.value)} required /></div>
          </div>

          <Lbl>Notes</Lbl>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Any notes for the teacher..."
            style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'10px 13px', fontSize:'13px', color:'rgba(255,255,255,0.7)', outline:'none', resize:'vertical', minHeight:'60px', fontFamily:'inherit' }}/>

          <Err msg={err}/><Ok msg={ok}/>
          <Btn busy={busy}>Schedule Demo + Auto Zoom Link</Btn>
        </form>
      </Panel>

      <Panel title="Recent Demos">
        {demos.length === 0 ? <Empty msg="No demos scheduled yet." /> :
          demos.map(d => (
            <div key={d.id} style={{ padding:'9px 0', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.85)', fontWeight:500 }}>{d.title}</div>
              <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'2px' }}>
                {d.class_date} · {d.start_time} {d.profiles?.full_name && `· ${d.profiles.full_name}`}
              </div>
              {d.meet_link
                ? <a href={d.meet_link} target="_blank" rel="noreferrer" style={{ fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'6px', background:'rgba(30,144,255,0.15)', color:'#5aabff', border:'0.5px solid rgba(30,144,255,0.2)', display:'inline-block', marginTop:'4px' }}>Join Zoom</a>
                : <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.2)', display:'inline-block', marginTop:'4px' }}>Zoom link generating...</span>
              }
            </div>
          ))
        }
      </Panel>
    </TwoCol>
  )
}

// ─────────────────────────────────────────────────────────────
// TAB 4: TEACHER CLASSES VIEW
// ─────────────────────────────────────────────────────────────
function ClassesTab() {
  const [teachers,  setTeachers]  = useState([])
  const [selTeacher,setSelTeacher]= useState('')
  const [classes,   setClasses]   = useState([])
  const [loading,   setLoading]   = useState(false)

  useEffect(() => {
    supabase.from('profiles').select('id,full_name').eq('role','teacher').then(({ data }) => setTeachers(data||[]))
  }, [])

  async function loadClasses(tid) {
    setSelTeacher(tid); setLoading(true)
    const { data } = await supabase.from('classes').select('*').eq('teacher_id', tid).order('class_date',{ascending:false})
    setClasses(data||[])
    setLoading(false)
  }

  const today    = new Date().toISOString().slice(0,10)
  const upcoming = classes.filter(c => c.class_date >= today)
  const past     = classes.filter(c => c.class_date <  today)

  return (
    <Panel title="📅 Teacher Classes">
      <Lbl>Select Teacher</Lbl>
      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'16px' }}>
        {teachers.map(t => (
          <button key={t.id} onClick={() => loadClasses(t.id)} style={{
            padding:'8px 16px', borderRadius:'10px', border:'none', cursor:'pointer', fontSize:'13px', fontWeight:600,
            background: selTeacher===t.id ? '#1e90ff' : 'rgba(255,255,255,0.07)',
            color:      selTeacher===t.id ? '#fff'    : 'rgba(255,255,255,0.55)',
          }}>
            {t.full_name}
          </button>
        ))}
      </div>

      {loading && <Empty msg="Loading classes..." />}

      {!loading && selTeacher && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            <div>
              <div style={{ fontSize:'12px', fontWeight:700, color:'#5aabff', marginBottom:'8px' }}>Upcoming ({upcoming.length})</div>
              {upcoming.length === 0 ? <Empty msg="No upcoming classes." /> :
                upcoming.map(c => <ClassRow key={c.id} c={c} />)}
            </div>
            <div>
              <div style={{ fontSize:'12px', fontWeight:700, color:'rgba(255,255,255,0.3)', marginBottom:'8px' }}>Past ({past.length})</div>
              {past.length === 0 ? <Empty msg="No past classes." /> :
                past.slice(0,5).map(c => <ClassRow key={c.id} c={c} />)}
            </div>
          </div>
        </>
      )}

      {!selTeacher && <Empty msg="Select a teacher above to view their classes." />}
    </Panel>
  )
}

function ClassRow({ c }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 0', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
      <div style={{ fontSize:'16px' }}>📹</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.8)', fontWeight:500 }}>{c.title}</div>
        <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)' }}>{c.class_date} {c.start_time && `· ${c.start_time}`} {c.batch && `· ${c.batch}`}</div>
      </div>
      {c.meet_link
        ? <a href={c.meet_link} target="_blank" rel="noreferrer" style={{ fontSize:'10px', fontWeight:700, padding:'3px 8px', borderRadius:'6px', background:'rgba(30,144,255,0.15)', color:'#5aabff', border:'0.5px solid rgba(30,144,255,0.2)', flexShrink:0 }}>Zoom</a>
        : <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.2)', flexShrink:0 }}>Pending</span>
      }
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// TAB 5: INVOICE GENERATOR
// ─────────────────────────────────────────────────────────────
function InvoiceTab({ profile }) {
  const [leads,     setLeads]     = useState([])
  const [courses,   setCourses]   = useState([])
  const [leadId,    setLeadId]    = useState('')
  const [courseId,  setCourseId]  = useState('')
  const [period,    setPeriod]    = useState('1')
  const [discount,  setDiscount]  = useState('0')
  const [notes,     setNotes]     = useState('')
  const [preview,   setPreview]   = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [requesting,setRequesting]= useState(false)
  const [ok,        setOk]        = useState('')
  const [err,       setErr]       = useState('')
  const [invoices,  setInvoices]  = useState([])

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [{ data: l },{ data: c },{ data: inv }] = await Promise.all([
      supabase.from('leads').select('id,full_name,email,phone').order('created_at',{ascending:false}),
      supabase.from('courses').select('id,title,fee,duration_months,level,mode').eq('status','Active'),
      supabase.from('payments').select('*').order('created_at',{ascending:false}).limit(10),
    ])
    setLeads(l||[])
    setCourses(c||[])
    setInvoices(inv||[])
  }

  function buildPreview() {
    if (!leadId || !courseId) return setErr('Select a lead and course first.')
    const lead   = leads.find(l => l.id === leadId)
    const course = courses.find(c => c.id === courseId)
    if (!lead || !course) return
    const months     = parseInt(period) || 1
    const baseAmount = (course.fee || 0) * months
    const discPct    = Math.min(Math.max(parseInt(discount)||0, 0), 100)
    const discAmount = Math.round(baseAmount * discPct / 100)
    const finalAmt   = baseAmount - discAmount
    const invoiceNo  = 'INV-' + Date.now().toString().slice(-6)
    setPreview({ lead, course, months, baseAmount, discPct, discAmount, finalAmt, invoiceNo })
    setErr('')
  }

  async function saveInvoice() {
    if (!preview) return
    setSaving(true)
    const { error } = await supabase.from('payments').insert({
      student_id:      null,
      student_name:    preview.lead.full_name,
      student_email:   preview.lead.email || null,
      description:     `${preview.course.title} · ${preview.months} month${preview.months>1?'s':''}`,
      amount:          preview.finalAmt,
      original_amount: preview.baseAmount,
      discount_pct:    preview.discPct,
      invoice_no:      preview.invoiceNo,
      status:          'pending',
      generated_by:    profile.full_name,
      notes:           notes || null,
      coupon_code:     null,
    })
    if (error) setErr(error.message)
    else {
      setOk(`✓ Invoice ${preview.invoiceNo} saved! Awaiting admin approval for payment link.`)
      setPreview(null); setLeadId(''); setCourseId(''); setPeriod('1'); setDiscount('0'); setNotes('')
      loadData()
    }
    setSaving(false)
    setTimeout(() => setOk(''), 5000)
  }

  async function requestPaymentLink(invoiceId, invoiceNo, amount, studentName, studentEmail) {
    setRequesting(true)
    // Update payment with request flag - admin will see this and generate PayPal link
    const { error } = await supabase.from('payments').update({
      notes: `PAYMENT LINK REQUESTED by ${profile.full_name} on ${new Date().toLocaleDateString('en-IN')}`,
      status: 'pending',
    }).eq('id', invoiceId)
    if (error) setErr(error.message)
    else setOk(`✓ Payment link request sent to admin for ${studentName} (₹${amount})`)
    setRequesting(false)
    loadData()
    setTimeout(() => setOk(''), 5000)
  }

  const sel = { width:'100%', background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'11px 13px', fontSize:'14px', color:'rgba(255,255,255,0.85)', outline:'none', fontFamily:'inherit' }

  return (
    <>
      <TwoCol>
        {/* Invoice builder */}
        <Panel title="🧾 Generate Invoice">
          <Lbl>Select Lead / Student *</Lbl>
          <select style={sel} value={leadId} onChange={e=>setLeadId(e.target.value)}>
            <option value="">— Choose student —</option>
            {leads.map(l => <option key={l.id} value={l.id}>{l.full_name} {l.email ? `· ${l.email}` : ''}</option>)}
          </select>

          <Lbl>Select Course *</Lbl>
          <select style={sel} value={courseId} onChange={e=>setCourseId(e.target.value)}>
            <option value="">— Choose course —</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.title} — ₹{c.fee}/mo · {c.level} · {c.mode}</option>)}
          </select>

          <Lbl>Duration (months)</Lbl>
          <select style={sel} value={period} onChange={e=>setPeriod(e.target.value)}>
            {[1,2,3,4,5,6,9,12].map(m => <option key={m} value={m}>{m} month{m>1?'s':''}</option>)}
          </select>

          <Lbl>Discount (%)</Lbl>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <Inp type="number" min="0" max="100" placeholder="0" value={discount} onChange={e=>setDiscount(e.target.value)} style={{ flex:1 }}/>
            <span style={{ fontSize:'13px', color:'rgba(255,255,255,0.4)', flexShrink:0 }}>% off</span>
          </div>

          <Lbl>Notes (optional)</Lbl>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Any special terms..."
            style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'10px 13px', fontSize:'13px', color:'rgba(255,255,255,0.7)', outline:'none', resize:'vertical', minHeight:'60px', fontFamily:'inherit' }}/>

          <Err msg={err}/>
          <button onClick={buildPreview} style={{ width:'100%', padding:'11px', background:'rgba(30,144,255,0.15)', color:'#5aabff', border:'0.5px solid rgba(30,144,255,0.3)', borderRadius:'10px', fontSize:'14px', fontWeight:700, cursor:'pointer', marginTop:'12px', fontFamily:'inherit' }}>
            Preview Invoice
          </button>
        </Panel>

        {/* Invoice preview */}
        <Panel title="Invoice Preview">
          {!preview ? (
            <Empty msg="Fill the form and click Preview Invoice." />
          ) : (
            <div>
              {/* Invoice card */}
              <div style={{ background:'rgba(255,255,255,0.05)', borderRadius:'12px', padding:'16px', marginBottom:'12px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'12px', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ fontFamily:"'Arial Black',sans-serif", fontWeight:900 }}>
                      <span style={{ color:'#1e90ff', fontSize:'18px' }}>UNI</span>
                      <span style={{ color:'#e87c1e', fontSize:'18px' }}>EDD</span>
                    </div>
                    <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em', textTransform:'uppercase', marginTop:'2px' }}>Invoice</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:'13px', fontWeight:700, color:'#e87c1e' }}>{preview.invoiceNo}</div>
                    <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)' }}>{new Date().toLocaleDateString('en-IN')}</div>
                  </div>
                </div>
                <div style={{ borderTop:'0.5px solid rgba(255,255,255,0.1)', paddingTop:'10px', marginBottom:'10px' }}>
                  <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.4)', marginBottom:'2px' }}>Billed to</div>
                  <div style={{ fontSize:'14px', fontWeight:600, color:'#fff' }}>{preview.lead.full_name}</div>
                  {preview.lead.email && <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)' }}>{preview.lead.email}</div>}
                  {preview.lead.phone && <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)' }}>{preview.lead.phone}</div>}
                </div>
                <div style={{ borderTop:'0.5px solid rgba(255,255,255,0.1)', paddingTop:'10px' }}>
                  {[
                    ['Course',    preview.course.title],
                    ['Level',     preview.course.level],
                    ['Mode',      preview.course.mode],
                    ['Duration',  `${preview.months} month${preview.months>1?'s':''}`],
                    ['Base Amount', `₹${preview.baseAmount.toLocaleString('en-IN')}`],
                    ...(preview.discPct > 0 ? [['Discount', `-₹${preview.discAmount.toLocaleString('en-IN')} (${preview.discPct}%)`]] : []),
                  ].map(([k,v]) => (
                    <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', padding:'4px 0', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ color:'rgba(255,255,255,0.4)' }}>{k}</span>
                      <span style={{ color:'rgba(255,255,255,0.8)', fontWeight:500 }}>{v}</span>
                    </div>
                  ))}
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'15px', fontWeight:800, padding:'10px 0 4px', marginTop:'4px', borderTop:'1px solid rgba(255,255,255,0.15)' }}>
                    <span style={{ color:'rgba(255,255,255,0.6)' }}>Total</span>
                    <span style={{ color:'#10b981' }}>₹{preview.finalAmt.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <Ok msg={ok}/>
              <Btn busy={saving} onClick={saveInvoice}>Save Invoice</Btn>
              <div style={{ marginTop:'8px', padding:'8px 12px', background:'rgba(139,92,246,0.1)', border:'0.5px solid rgba(139,92,246,0.2)', borderRadius:'8px', fontSize:'12px', color:'#a78bfa', lineHeight:1.5 }}>
                💡 After saving, you can request admin to generate a PayPal payment link from the invoices list below.
              </div>
            </div>
          )}
        </Panel>
      </TwoCol>

      {/* Saved invoices */}
      <Panel title="Saved Invoices" style={{ marginTop:'14px' }}>
        <Ok msg={ok}/>
        <Err msg={err}/>
        {invoices.length === 0 ? <Empty msg="No invoices yet." /> :
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
              <thead>
                <tr style={{ background:'rgba(255,255,255,0.04)' }}>
                  {['Invoice No','Student','Description','Amount','Discount','Status','Action'].map(h => (
                    <th key={h} style={{ padding:'8px 10px', textAlign:'left', color:'rgba(255,255,255,0.4)', fontWeight:700, fontSize:'10px', letterSpacing:'0.05em', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => {
                  const statusColor = inv.status==='paid' ? '#10b981' : inv.status==='overdue' ? '#f87171' : '#f4a335'
                  const hasPayLink  = inv.payment_link
                  const requested   = inv.notes?.includes('PAYMENT LINK REQUESTED')
                  return (
                    <tr key={inv.id} style={{ borderTop:'0.5px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding:'8px 10px', color:'#e87c1e', fontWeight:700 }}>{inv.invoice_no||'—'}</td>
                      <td style={{ padding:'8px 10px', color:'rgba(255,255,255,0.8)' }}>{inv.student_name||'—'}</td>
                      <td style={{ padding:'8px 10px', color:'rgba(255,255,255,0.5)', maxWidth:'160px' }}>{inv.description||'—'}</td>
                      <td style={{ padding:'8px 10px', color:'#10b981', fontWeight:700 }}>₹{(inv.amount||0).toLocaleString('en-IN')}</td>
                      <td style={{ padding:'8px 10px', color:'rgba(255,255,255,0.4)' }}>{inv.discount_pct ? `${inv.discount_pct}%` : '—'}</td>
                      <td style={{ padding:'8px 10px' }}>
                        <span style={{ fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'10px', background:`${statusColor}22`, color:statusColor, textTransform:'capitalize' }}>
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ padding:'8px 10px' }}>
                        {hasPayLink ? (
                          <a href={inv.payment_link} target="_blank" rel="noreferrer" style={{ fontSize:'10px', fontWeight:700, padding:'3px 8px', borderRadius:'6px', background:'rgba(16,185,129,0.15)', color:'#10b981', border:'0.5px solid rgba(16,185,129,0.2)' }}>
                            💳 Pay Link
                          </a>
                        ) : requested ? (
                          <span style={{ fontSize:'10px', color:'rgba(139,92,246,0.7)', fontWeight:600 }}>⏳ Requested</span>
                        ) : (
                          <button
                            onClick={() => requestPaymentLink(inv.id, inv.invoice_no, inv.amount, inv.student_name, inv.student_email)}
                            disabled={requesting}
                            style={{ fontSize:'10px', fontWeight:700, padding:'3px 8px', borderRadius:'6px', background:'rgba(139,92,246,0.15)', color:'#a78bfa', border:'0.5px solid rgba(139,92,246,0.2)', cursor:'pointer' }}>
                            Request PayPal Link
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        }
      </Panel>
    </>
  )
}
