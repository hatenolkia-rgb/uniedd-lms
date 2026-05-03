import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Calendar from './Calendar'
import Layout, { PageHeader, Grid4, MetricCard, Panel, TwoCol, Lbl, Inp, Btn, Err, Ok, Empty, ZoomBtn } from './Layout'

export default function TeacherDash({ profile }) {
  const [classes,  setClasses]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [title,    setTitle]    = useState('')
  const [date,     setDate]     = useState('')
  const [time,     setTime]     = useState('')
  const [duration, setDuration] = useState('1h')
  const [batch,    setBatch]    = useState('')
  const [busy,     setBusy]     = useState(false)
  const [err,      setErr]      = useState('')
  const [ok,       setOk]       = useState('')

  useEffect(() => { loadClasses() }, [profile.id])

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

  async function schedule(e) {
    e.preventDefault(); setErr(''); setOk('')
    if (!title.trim() || !date) return setErr('Title and date are required.')
    setBusy(true)
    const { error } = await supabase.from('classes').insert({
      title,
      teacher_id:   profile.id,
      teacher_name: profile.full_name,
      class_date:   date,
      start_time:   time || null,
      duration,
      batch:        batch || null,
      meet_link:    null,
    })
    if (error) setErr(error.message)
    else {
      // Also add to shared calendar
      const [y, m, d] = date.split('-').map(Number)
      await supabase.from('events').insert({
        title: title, event_type: 'class',
        day: d, month: m, year: y,
        time: time || null,
        teacher_name: profile.full_name,
        batch: batch || null,
      })
      setOk('✓ Class scheduled! Zoom link auto-generating... Check the calendar.')
      setTitle(''); setDate(''); setTime(''); setBatch('')
      loadClasses()
    }
    setBusy(false)
  }

  const today     = new Date().toISOString().slice(0,10)
  const upcoming  = classes.filter(c => c.class_date >= today)
  const completed = classes.filter(c => c.class_date <  today)

  const classRow = (c) => (
    <div key={c.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 0', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
      <div style={{ fontSize:'20px' }}>📹</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.85)', fontWeight:500 }}>{c.title}</div>
        <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)' }}>{c.class_date} {c.start_time && `· ${c.start_time}`} {c.batch && `· ${c.batch}`}</div>
      </div>
      <ZoomBtn link={c.meet_link} />
    </div>
  )

  return (
    <Layout profile={profile} pageTitle="My Classes">
      <PageHeader title={`Welcome back, ${profile.full_name?.split(' ')[0] || 'Teacher'} 👋`} subtitle="Your Zoom classes." />

      <Grid4>
        <MetricCard icon="📅" label="Upcoming"  value={upcoming.length}  />
        <MetricCard icon="✅" label="Completed" value={completed.length} />
        <MetricCard icon="📚" label="Total"     value={classes.length}   />
        <MetricCard icon="👥" label="Batches"   value={[...new Set(classes.map(c=>c.batch).filter(Boolean))].length} />
      </Grid4>

      <TwoCol>
        <Panel title="Upcoming Classes">
          {loading ? <Empty msg="Loading..." /> :
           upcoming.length === 0 ? <Empty msg="No upcoming classes. Schedule one →" /> :
           upcoming.map(classRow)}
        </Panel>

        <Panel title="Schedule a Class">
          <form onSubmit={schedule}>
            <Lbl>Class Title</Lbl>
            <Inp type="text" placeholder="e.g. IELTS Prep — Batch A" value={title} onChange={e=>setTitle(e.target.value)} required />
            <Lbl>Date</Lbl>
            <Inp type="date" value={date} onChange={e=>setDate(e.target.value)} required />
            <Lbl>Time</Lbl>
            <Inp type="time" value={time} onChange={e=>setTime(e.target.value)} />
            <Lbl>Duration</Lbl>
            <select value={duration} onChange={e=>setDuration(e.target.value)} style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'11px 13px', fontSize:'14px', color:'rgba(255,255,255,0.85)', outline:'none' }}>
              <option value="30m">30 minutes</option>
              <option value="45m">45 minutes</option>
              <option value="1h">1 hour</option>
              <option value="1.5h">1.5 hours</option>
              <option value="2h">2 hours</option>
            </select>
            <Lbl>Batch (optional)</Lbl>
            <Inp type="text" placeholder="e.g. Batch A" value={batch} onChange={e=>setBatch(e.target.value)} />
            <Err msg={err} /><Ok msg={ok} />
            <Btn busy={busy}>Schedule + Auto-Generate Zoom Link</Btn>
          </form>
        </Panel>
      </TwoCol>
    <Calendar profile={profile} />
    </Layout>
  )
}
