import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Calendar from './Calendar'
import Layout, { PageHeader, Grid4, MetricCard, Panel, TwoCol, Lbl, Inp, Btn, Err, Ok, Empty } from './Layout'

const STATUSES = ['New','Contacted','Demo Scheduled','Enrolled','Lost']

export default function SalesDash({ profile }) {
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
    const { data, error } = await supabase.from('leads').insert({
      full_name:       name.trim(),
      phone:           phone || null,
      email:           email || null,
      course_interest: course || null,
      assigned_to:     profile.id,
      status:          'New',
      source:          'Sales Team',
    }).select().single()
    if (error) setErr(error.message)
    else {
      setOk(`✓ Lead added! Student ID auto-assigned.`)
      setName(''); setPhone(''); setEmail(''); setCourse('')
      loadLeads()
    }
    setBusy(false)
  }

  async function updateStatus(id, status) {
    await supabase.from('leads').update({ status }).eq('id', id)
    loadLeads()
  }

  const week = leads.filter(l => (Date.now() - new Date(l.created_at)) < 7*24*60*60*1000)
  const sel = { background:'rgba(255,255,255,0.07)', border:'0.5px solid rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.7)', borderRadius:'6px', padding:'3px 6px', fontSize:'10px', cursor:'pointer', outline:'none', flexShrink:0 }

  return (
    <Layout profile={profile} pageTitle="Sales CRM">
      <PageHeader title="Sales Pipeline" subtitle="All leads auto-assigned a Student ID on entry." />

      <Grid4>
        <MetricCard icon="📋" label="Total Leads"    value={leads.length} />
        <MetricCard icon="🆕" label="This Week"      value={week.length}  />
        <MetricCard icon="▶"  label="Demo Scheduled" value={leads.filter(l=>l.status==='Demo Scheduled').length} />
        <MetricCard icon="👤" label="Enrolled"       value={leads.filter(l=>l.status==='Enrolled').length} />
      </Grid4>

      <TwoCol>
        <Panel title="Active Leads">
          {loading ? <Empty msg="Loading..." /> :
           leads.length === 0 ? <Empty msg="No leads yet. Add the first one →" /> :
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
            <Lbl>Full Name *</Lbl>
            <Inp type="text" placeholder="Lead's full name" value={name} onChange={e=>setName(e.target.value)} required />
            <Lbl>Phone</Lbl>
            <Inp type="tel" placeholder="+91 XXXXX XXXXX" value={phone} onChange={e=>setPhone(e.target.value)} />
            <Lbl>Email (sends welcome email automatically)</Lbl>
            <Inp type="email" placeholder="Optional" value={email} onChange={e=>setEmail(e.target.value)} />
            <Lbl>Course Interest</Lbl>
            <Inp type="text" placeholder="e.g. IELTS, Spoken English" value={course} onChange={e=>setCourse(e.target.value)} />
            <Err msg={err} /><Ok msg={ok} />
            <Btn busy={busy}>Add Lead — Auto-Generate Student ID</Btn>
          </form>
        </Panel>
      </TwoCol>
    <Calendar profile={profile} />
    </Layout>
  )
}
