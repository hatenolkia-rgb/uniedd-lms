import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Calendar from './Calendar'
import Resources from './Resources'
import Layout, { PageHeader, Grid4, MetricCard, TwoCol, Panel, Lbl, Inp, Btn, Err, Ok, Empty, ZoomBtn } from './Layout'

const TABS = [
  { key:'classes',   label:'📹 Classes'   },
  { key:'calendar',  label:'📅 Calendar'  },
  { key:'resources', label:'📚 Resources' },
  { key:'support',   label:'💬 Support'   },
]

export default function TeacherDash({ profile }) {
  const [tab,      setTab]      = useState('classes')
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
  const [msg,      setMsg]      = useState('')
  const [messages, setMessages] = useState([])
  const [sending,  setSending]  = useState(false)

  useEffect(() => { loadClasses() }, [profile.id])
  useEffect(() => { if (tab === 'support') loadMessages() }, [tab])

  async function loadClasses() {
    setLoading(true)
    const { data } = await supabase.from('classes').select('*')
      .eq('teacher_id', profile.id).order('class_date', { ascending: true })
    setClasses(data || [])
    setLoading(false)
  }

  async function loadMessages() {
    const { data } = await supabase.from('chat_messages')
      .select('*, profiles(full_name, role)')
      .eq('room', 'support')
      .order('created_at', { ascending: true }).limit(50)
    setMessages(data || [])
  }

  async function sendMsg(e) {
    e.preventDefault()
    if (!msg.trim()) return
    setSending(true)
    await supabase.from('chat_messages').insert({ sender_id: profile.id, room: 'support', content: msg.trim() })
    setMsg(''); loadMessages(); setSending(false)
  }

  async function schedule(e) {
    e.preventDefault(); setErr(''); setOk('')
    if (!title.trim() || !date) return setErr('Title and date are required.')
    setBusy(true)
    const { error } = await supabase.from('classes').insert({
      title, teacher_id: profile.id, teacher_name: profile.full_name,
      class_date: date, start_time: time || null, duration, batch: batch || null, meet_link: null,
    })
    if (error) { setErr(error.message) }
    else {
      const [y, m, d] = date.split('-').map(Number)
      await supabase.from('events').insert({
        title, event_type: 'class', day: d, month: m, year: y,
        time: time || null, teacher_name: profile.full_name, batch: batch || null,
      })
      setOk('Class scheduled! Zoom link auto-generating...')
      setTitle(''); setDate(''); setTime(''); setBatch('')
      loadClasses()
    }
    setBusy(false)
  }

  const today    = new Date().toISOString().slice(0,10)
  const upcoming = classes.filter(c => c.class_date >= today)
  const done     = classes.filter(c => c.class_date <  today)

  const tabStyle = (k) => ({
    padding:'8px 18px', fontSize:'13px', fontWeight:600, borderRadius:'10px',
    border:'none', cursor:'pointer', fontFamily:'inherit', transition:'all 0.2s',
    background: tab===k ? '#1e90ff' : 'rgba(255,255,255,0.06)',
    color:      tab===k ? '#fff'    : 'rgba(255,255,255,0.45)',
  })

  return (
    <Layout profile={profile} pageTitle="Dashboard">
      <PageHeader
        title={`Welcome back, ${(profile.full_name || profile.email).split(/[ @]/)[0]} 👋`}
        subtitle="Your UniEDD teacher dashboard."
      />

      <Grid4>
        <div onClick={() => { const el=document.getElementById('uniedd-calendar'); if(el) el.scrollIntoView({behavior:'smooth'}) }}
          style={{ background:'rgba(30,144,255,0.08)', border:'1px solid rgba(30,144,255,0.2)', borderRadius:'14px', padding:'14px', cursor:'pointer', transition:'all 0.2s' }}
          onMouseOver={e=>e.currentTarget.style.background='rgba(30,144,255,0.15)'}
          onMouseOut={e=>e.currentTarget.style.background='rgba(30,144,255,0.08)'}>
          <div style={{ fontSize:'18px', marginBottom:'8px' }}>📅</div>
          <div style={{ fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.4)', letterSpacing:'0.1em', textTransform:'uppercase' }}>Calendar</div>
          <div style={{ fontSize:'18px', fontWeight:800, color:'#5aabff', marginTop:'3px' }}>{upcoming.length} upcoming</div>
        </div>
        <MetricCard icon="✅" label="Completed" value={done.length}     />
        <MetricCard icon="📚" label="Total"     value={classes.length}  />
        <div onClick={() => { const el=document.getElementById('uniedd-resources'); if(el) el.scrollIntoView({behavior:'smooth'}) }}
          style={{ background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:'14px', padding:'14px', cursor:'pointer', transition:'all 0.2s' }}
          onMouseOver={e=>e.currentTarget.style.background='rgba(16,185,129,0.15)'}
          onMouseOut={e=>e.currentTarget.style.background='rgba(16,185,129,0.08)'}>
          <div style={{ fontSize:'18px', marginBottom:'8px' }}>📚</div>
          <div style={{ fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.4)', letterSpacing:'0.1em', textTransform:'uppercase' }}>Resources</div>
          <div style={{ fontSize:'18px', fontWeight:800, color:'#34d399', marginTop:'3px' }}>View all</div>
        </div>
      </Grid4>

      {/* Tab bar */}
      <div style={{ display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap' }}>
        {TABS.map(t => <button key={t.key} onClick={()=>setTab(t.key)} style={tabStyle(t.key)}>{t.label}</button>)}
      </div>

      {/* CLASSES */}
      {tab === 'classes' && (
        <TwoCol>
          <Panel title="Upcoming Classes">
            {loading ? <Empty msg="Loading..." /> :
             upcoming.length === 0 ? <Empty msg="No upcoming classes. Schedule one →" /> :
             upcoming.map(c => (
               <div key={c.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 0', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
                 <div style={{ fontSize:'20px' }}>📹</div>
                 <div style={{ flex:1 }}>
                   <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.85)', fontWeight:500 }}>{c.title}</div>
                   <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)' }}>{c.class_date} {c.start_time && `· ${c.start_time}`} {c.batch && `· ${c.batch}`}</div>
                 </div>
                 <ZoomBtn link={c.meet_link} />
               </div>
             ))}
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
      )}

      {tab === 'calendar'  && <Calendar  profile={profile} />}
      {tab === 'resources' && <Resources profile={profile} />}

      {tab === 'support' && (
        <Panel title="Support Chat — Talk to Admin / Sales">
          <div style={{ height:'360px', overflowY:'auto', marginBottom:'12px', display:'flex', flexDirection:'column', gap:'8px', padding:'4px' }}>
            {messages.length === 0
              ? <Empty msg="No messages yet. Ask anything!" />
              : messages.map(m => {
                  const isMe   = m.sender_id === profile.id
                  const isAdmin = ['admin','sales'].includes(m.profiles?.role)
                  return (
                    <div key={m.id} style={{ display:'flex', flexDirection:'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                      <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.3)', marginBottom:'3px' }}>
                        {isMe ? 'You' : m.profiles?.full_name || 'User'}
                        {isAdmin && <span style={{ color:'#e87c1e', marginLeft:'4px' }}>· Support</span>}
                      </div>
                      <div style={{ maxWidth:'75%', padding:'9px 13px', borderRadius:'12px', fontSize:'13px', lineHeight:1.5, background: isMe ? '#1e90ff' : 'rgba(255,255,255,0.08)', color: isMe ? '#fff' : 'rgba(255,255,255,0.85)', borderBottomRightRadius: isMe ? '4px' : '12px', borderBottomLeftRadius: isMe ? '12px' : '4px' }}>
                        {m.content}
                      </div>
                      <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.2)', marginTop:'2px' }}>
                        {new Date(m.created_at).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
                      </div>
                    </div>
                  )
                })}
          </div>
          <form onSubmit={sendMsg} style={{ display:'flex', gap:'8px' }}>
            <input value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Type your message..."
              style={{ flex:1, background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'10px 14px', fontSize:'14px', color:'rgba(255,255,255,0.85)', outline:'none', fontFamily:'inherit' }}
              onFocus={e=>e.target.style.borderColor='#1e90ff'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'}/>
            <button type="submit" disabled={sending} style={{ padding:'10px 20px', background:'#1e90ff', color:'#fff', border:'none', borderRadius:'10px', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity:sending?0.6:1 }}>Send</button>
          </form>
        </Panel>
      )}
    </Layout>
  )
}
