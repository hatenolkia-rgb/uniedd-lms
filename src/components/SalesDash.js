import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Layout, {
  PageHeader, MetricsGrid, MetricCard, Panel, TwoCol,
  FieldLabel, Input, PrimaryBtn, ErrMsg, OkMsg,
  EmptyState,
} from './Layout'

const STATUS_OPTIONS = ['New','Contacted','Demo Scheduled','Enrolled','Lost']

export default function SalesDash({ profile }) {
  const [leads,   setLeads]   = useState([])
  const [loading, setLoading] = useState(true)
  const [name,    setName]    = useState('')
  const [phone,   setPhone]   = useState('')
  const [email,   setEmail]   = useState('')
  const [course,  setCourse]  = useState('')
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState('')
  const [ok,      setOk]      = useState('')

  useEffect(() => { loadLeads() }, [])

  async function loadLeads() {
    setLoading(true)
    const { data } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
    setLeads(data || [])
    setLoading(false)
  }

  async function addLead(e) {
    e.preventDefault()
    setErr(''); setOk('')
    if (!name.trim()) return setErr('Full name is required.')
    setSaving(true)

    const { data, error } = await supabase.from('leads').insert({
      full_name:       name.trim(),
      phone:           phone || null,
      email:           email || null,
      course_interest: course || null,
      assigned_to:     profile.id,
      status:          'New',
      source:          'Sales Team',
    }).select().single()

    if (error) {
      setErr(error.message)
    } else {
      setOk(`✓ Lead added! Student ID auto-assigned: ${data.id.slice(0,8).toUpperCase()}`)
      setName(''); setPhone(''); setEmail(''); setCourse('')
      loadLeads()
    }
    setSaving(false)
  }

  async function updateStatus(id, status) {
    await supabase.from('leads').update({ status }).eq('id', id)
    loadLeads()
  }

  const thisWeek = leads.filter(l => {
    const d = new Date(l.created_at)
    const now = new Date()
    return (now - d) < 7 * 24 * 60 * 60 * 1000
  })

  return (
    <Layout profile={profile} pageTitle="Sales CRM">
      <PageHeader
        title="Sales Pipeline"
        subtitle="All leads auto-assigned a Student ID on entry."
      />

      <MetricsGrid>
        <MetricCard icon="📋" label="Total Leads"    value={leads.length}                                        />
        <MetricCard icon="🆕" label="New This Week"  value={thisWeek.length}                                     />
        <MetricCard icon="▶"  label="Demo Scheduled" value={leads.filter(l=>l.status==='Demo Scheduled').length} />
        <MetricCard icon="👤" label="Enrolled"       value={leads.filter(l=>l.status==='Enrolled').length}       />
      </MetricsGrid>

      <TwoCol>
        {/* Lead list */}
        <Panel title="Active Leads">
          {loading ? <EmptyState message="Loading..." /> :
           leads.length === 0 ? <EmptyState message="No leads yet. Add the first one →" /> :
           leads.map(l => (
             <div key={l.id} style={{
               display:'flex', alignItems:'center', gap:'8px',
               padding:'9px 0', borderBottom:'0.5px solid rgba(255,255,255,0.05)',
             }}>
               <div style={{ flex:1 }}>
                 <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.85)', fontWeight:500 }}>
                   {l.full_name}
                 </div>
                 <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)' }}>
                   {l.phone || l.email || '—'} · {l.course_interest || 'No course'}
                 </div>
               </div>
               <select
                 value={l.status}
                 onChange={e => updateStatus(l.id, e.target.value)}
                 style={{
                   background:'rgba(255,255,255,0.07)', border:'0.5px solid rgba(255,255,255,0.12)',
                   color:'rgba(255,255,255,0.7)', borderRadius:'6px', padding:'3px 6px',
                   fontSize:'10px', cursor:'pointer', outline:'none', flexShrink:0,
                 }}
               >
                 {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
               </select>
             </div>
           ))}
        </Panel>

        {/* Add lead form */}
        <Panel title="Add New Lead">
          <form onSubmit={addLead}>
            <FieldLabel>Full Name *</FieldLabel>
            <Input type="text" placeholder="Lead's full name"
              value={name} onChange={e => setName(e.target.value)} required/>

            <FieldLabel>Phone</FieldLabel>
            <Input type="tel" placeholder="+91 XXXXX XXXXX"
              value={phone} onChange={e => setPhone(e.target.value)}/>

            <FieldLabel>Email (for auto welcome email)</FieldLabel>
            <Input type="email" placeholder="Optional"
              value={email} onChange={e => setEmail(e.target.value)}/>

            <FieldLabel>Course Interest</FieldLabel>
            <Input type="text" placeholder="e.g. IELTS, Spoken English"
              value={course} onChange={e => setCourse(e.target.value)}/>

            <ErrMsg>{err}</ErrMsg>
            <OkMsg>{ok}</OkMsg>
            <PrimaryBtn loading={saving}>Add Lead — Auto-Generate Student ID</PrimaryBtn>
          </form>
        </Panel>
      </TwoCol>
    </Layout>
  )
}
