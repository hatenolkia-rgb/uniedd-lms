import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Layout, {
  PageHeader, MetricsGrid, MetricCard, Panel, TwoCol,
  FieldLabel, Input, PrimaryBtn, ErrMsg, OkMsg, EmptyState,
} from './Layout'

export default function TeacherDash({ profile }) {
  const [classes,  setClasses]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [title,    setTitle]    = useState('')
  const [date,     setDate]     = useState('')
  const [time,     setTime]     = useState('')
  const [duration, setDuration] = useState('1h')
  const [batch,    setBatch]    = useState('')
  const [isDemo,   setIsDemo]   = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [err,      setErr]      = useState('')
  const [ok,       setOk]       = useState('')

  useEffect(() => { loadClasses() }, [])

  async function loadClasses() {
    setLoading(true)
    const { data } = await supabase
      .from('classes')
      .select('*')
      .eq('teacher_id', profile.id)
      .order('class_date', { ascending: true })
    setClasses(data || [])
    setLoading(false)
  }

  async function scheduleClass(e) {
    e.preventDefault()
    setErr(''); setOk('')
    if (!title.trim() || !date) return setErr('Title and date are required.')
    setSaving(true)

    const { error } = await supabase.from('classes').insert({
      title,
      teacher_id:   profile.id,
      teacher_name: profile.full_name,
      class_date:   date,
      start_time:   time,
      duration,
      batch:        batch || null,
      meet_link:    null,   // filled by edge function after insert
    })

    if (error) setErr(error.message)
    else {
      setOk('✓ Class scheduled! Zoom link will be auto-generated and emailed to students.')
      setTitle(''); setDate(''); setTime(''); setBatch(''); setIsDemo(false)
      loadClasses()
    }
    setSaving(false)
  }

  const upcoming  = classes.filter(c => c.class_date >= new Date().toISOString().slice(0,10))
  const completed = classes.filter(c => c.class_date <  new Date().toISOString().slice(0,10))
  const demos     = classes.filter(c => !c.batch)

  return (
    <Layout profile={profile} pageTitle="My Classes">
      <PageHeader
        title={`Welcome back, ${profile.full_name?.split(' ')[0] || 'Teacher'} 👋`}
        subtitle="Your upcoming Zoom classes."
      />

      <MetricsGrid>
        <MetricCard icon="📅" label="Upcoming"   value={upcoming.length}  />
        <MetricCard icon="▶"  label="Demos"      value={demos.length}     />
        <MetricCard icon="✅" label="Completed"  value={completed.length} />
        <MetricCard icon="📚" label="Total"      value={classes.length}   />
      </MetricsGrid>

      <TwoCol>
        {/* Class list */}
        <Panel title="Upcoming Classes">
          {loading ? <EmptyState message="Loading..." /> :
           upcoming.length === 0 ? <EmptyState message="No upcoming classes. Schedule one →" /> :
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
                   {c.class_date} {c.start_time && `· ${c.start_time}`} {c.batch && `· ${c.batch}`}
                 </div>
               </div>
               {c.meet_link
                 ? <a href={c.meet_link} target="_blank" rel="noreferrer" style={{
                     fontSize:'10px', fontWeight:700, padding:'3px 10px', borderRadius:'8px',
                     background:'rgba(30,144,255,0.15)', color:'#5aabff',
                     border:'0.5px solid rgba(30,144,255,0.25)', flexShrink:0,
                   }}>Start Zoom</a>
                 : <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.2)', flexShrink:0 }}>Link pending</span>
               }
             </div>
           ))}
        </Panel>

        {/* Schedule form */}
        <Panel title="Schedule a New Class">
          <form onSubmit={scheduleClass}>
            <FieldLabel>Class Title</FieldLabel>
            <Input type="text" placeholder="e.g. IELTS Prep — Batch A"
              value={title} onChange={e => setTitle(e.target.value)} required/>

            <FieldLabel>Date</FieldLabel>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} required/>

            <FieldLabel>Time</FieldLabel>
            <Input type="time" value={time} onChange={e => setTime(e.target.value)}/>

            <FieldLabel>Duration</FieldLabel>
            <select value={duration} onChange={e => setDuration(e.target.value)} style={{
              width:'100%', background:'rgba(255,255,255,0.05)',
              border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px',
              padding:'11px 13px', fontSize:'14px', color:'rgba(255,255,255,0.85)',
              outline:'none', marginBottom:'4px',
            }}>
              <option value="30m">30 minutes</option>
              <option value="45m">45 minutes</option>
              <option value="1h">1 hour</option>
              <option value="1.5h">1.5 hours</option>
              <option value="2h">2 hours</option>
            </select>

            <FieldLabel>Batch Name (optional)</FieldLabel>
            <Input type="text" placeholder="e.g. Batch A, or leave blank for demo"
              value={batch} onChange={e => setBatch(e.target.value)}/>

            <ErrMsg>{err}</ErrMsg>
            <OkMsg>{ok}</OkMsg>
            <PrimaryBtn loading={saving}>Schedule + Auto-Generate Zoom Link</PrimaryBtn>
          </form>
        </Panel>
      </TwoCol>
    </Layout>
  )
}
