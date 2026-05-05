import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Calendar from './Calendar'
import Resources from './Resources'
import Attendance from './Attendance'
import Layout, { PageHeader, Grid4, MetricCard, TwoCol, Panel, Lbl, Inp, Btn, Err, Ok, Empty, ZoomBtn } from './Layout'

export default function TeacherDash({ profile }) {
  const [tab,      setTab]      = useState('classes')
  const [classes,  setClasses]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [title,    setTitle]    = useState('')
  const [date,     setDate]     = useState('')
  const [time,     setTime]     = useState('')
  const [duration, setDuration] = useState('1h')
  const [batch,    setBatch]    = useState('')
  const [meetLink, setMeetLink] = useState('')
  const [editId,   setEditId]   = useState(null)
  const [busy,     setBusy]     = useState(false)
  const [err,      setErr]      = useState('')
  const [ok,       setOk]       = useState('')
  const [msg,      setMsg]      = useState('')
  const [messages, setMessages] = useState([])
  const [sending,  setSending]  = useState(false)
  const [students, setStudents] = useState([])

  const today    = new Date().toISOString().slice(0,10)
  const upcoming = classes.filter(c => c.class_date >= today)
  const done     = classes.filter(c => c.class_date <  today)

  useEffect(() => { loadClasses() }, [profile.id])
  useEffect(() => { if (tab === 'support')    loadMessages() }, [tab])
  useEffect(() => { if (tab === 'students')   loadStudents() }, [tab])

  async function loadClasses() {
    setLoading(true)
    const { data } = await supabase.from('classes').select('*').eq('teacher_id', profile.id).order('class_date', { ascending: true })
    setClasses(data || [])
    setLoading(false)
  }
  async function loadStudents() {
    const { data } = await supabase.from('profiles').select('id,full_name,email,created_at,student_id').eq('role','student')
    setStudents(data || [])
  }
  async function loadMessages() {
    const { data } = await supabase.from('chat_messages').select('*, profiles(full_name, role)').eq('room','support').order('created_at',{ascending:true}).limit(50)
    setMessages(data || [])
  }
  async function sendMsg(e) {
    e.preventDefault(); if (!msg.trim()) return
    setSending(true)
    await supabase.from('chat_messages').insert({ sender_id:profile.id, room:'support', content:msg.trim() })
    setMsg(''); loadMessages(); setSending(false)
  }
  async function schedule(e) {
    e.preventDefault(); setErr(''); setOk('')
    if (!title.trim() || !date) return setErr('Title and date are required.')
    setBusy(true)
    const payload = { title, teacher_id:profile.id, teacher_name:profile.full_name, class_date:date, start_time:time||null, duration, batch:batch||null, meet_link:meetLink.trim()||null }
    let error
    if (editId) { ({ error } = await supabase.from('classes').update(payload).eq('id', editId)) }
    else {
      ({ error } = await supabase.from('classes').insert(payload))
      if (!error) {
        const [y, m, d] = date.split('-').map(Number)
        await supabase.from('events').insert({ title, event_type:'class', day:d, month:m, year:y, time:time||null, teacher_name:profile.full_name, batch:batch||null })
      }
    }
    if (error) setErr(error.message)
    else { setOk(editId ? '✓ Class updated!' : '✓ Class scheduled!'); setTitle(''); setDate(''); setTime(''); setBatch(''); setMeetLink(''); setEditId(null); loadClasses() }
    setBusy(false)
  }
  function startEdit(cls) {
    setTitle(cls.title||''); setDate(cls.class_date||''); setTime(cls.start_time||'')
    setBatch(cls.batch||''); setMeetLink(cls.meet_link||''); setDuration(cls.duration||'1h')
    setEditId(cls.id); setTab('classes'); setErr(''); setOk('')
  }
  async function deleteClass(id) {
    if (!window.confirm('Delete this class?')) return
    await supabase.from('classes').delete().eq('id', id)
    loadClasses()
  }

  const firstName = (profile.full_name || profile.email).split(/[ @]/)[0]

  return (
    <Layout profile={profile} activeTab={tab} onTabChange={setTab}>
      {/* ── CLASSES ── */}
      {tab === 'classes' && (
        <>
          <PageHeader title={`Welcome back, ${firstName} 👋`} subtitle="Manage your classes and schedule." />
          <Grid4>
            <MetricCard icon="📹" label="Upcoming"  value={upcoming.length} />
            <MetricCard icon="✅" label="Completed" value={done.length}     />
            <MetricCard icon="👥" label="Students"  value={students.length || '—'} />
            <MetricCard icon="📚" label="Total"     value={classes.length} sub="all classes" />
          </Grid4>
          <TwoCol>
            <Panel title={`Upcoming Classes${upcoming.length ? ` (${upcoming.length})` : ''}`}>
              {loading ? <Empty msg="Loading..." /> : upcoming.length === 0 ? <Empty msg="No upcoming classes." /> :
                upcoming.map(c => (
                  <div key={c.id} style={{ padding:'10px 0', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.85)', fontWeight:500 }}>{c.title}</div>
                        <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'2px' }}>{c.class_date} {c.start_time && `· ${c.start_time}`} {c.batch && `· ${c.batch}`}</div>
                      </div>
                      <ZoomBtn link={c.meet_link} />
                      <button onClick={() => startEdit(c)} style={{ fontSize:'10px', padding:'4px 10px', borderRadius:'6px', background:'rgba(30,144,255,0.1)', color:'#5aabff', border:'0.5px solid rgba(30,144,255,0.2)', cursor:'pointer' }}>Edit</button>
                      <button onClick={() => deleteClass(c.id)} style={{ fontSize:'10px', padding:'4px 8px', borderRadius:'6px', background:'rgba(239,68,68,0.1)', color:'#f87171', border:'0.5px solid rgba(239,68,68,0.15)', cursor:'pointer' }}>✕</button>
                    </div>
                  </div>
                ))}
              {!loading && done.length > 0 && (
                <div style={{ marginTop:'12px', paddingTop:'12px', borderTop:'0.5px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize:'11px', fontWeight:600, color:'rgba(255,255,255,0.25)', marginBottom:'8px', letterSpacing:'0.05em', textTransform:'uppercase' }}>Past ({done.length})</div>
                  {done.slice(0,3).map(c => (
                    <div key={c.id} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'7px 0', borderBottom:'0.5px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.4)' }}>{c.title}</div>
                        <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.2)' }}>{c.class_date}</div>
                      </div>
                      <span style={{ fontSize:'9px', fontWeight:700, padding:'2px 7px', borderRadius:'6px', background:'rgba(16,185,129,0.1)', color:'#34d399' }}>Done</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
            <Panel title={editId ? '✏️ Edit Class' : '+ Schedule Class'}>
              <form onSubmit={schedule}>
                <Lbl>Class Title *</Lbl>
                <Inp type="text" placeholder="e.g. IELTS Speaking Practice" value={title} onChange={e=>setTitle(e.target.value)} required />
                <Lbl>Date *</Lbl>
                <Inp type="date" value={date} onChange={e=>setDate(e.target.value)} required />
                <Lbl>Start Time</Lbl>
                <Inp type="time" value={time} onChange={e=>setTime(e.target.value)} />
                <Lbl>Zoom / Meet Link</Lbl>
                <Inp type="url" placeholder="https://zoom.us/j/..." value={meetLink} onChange={e=>setMeetLink(e.target.value)} />
                <Lbl>Batch / Group</Lbl>
                <Inp type="text" placeholder="e.g. Batch A" value={batch} onChange={e=>setBatch(e.target.value)} />
                <Err msg={err}/><Ok msg={ok}/>
                <Btn busy={busy}>{editId ? 'Update Class' : 'Schedule Class'}</Btn>
                {editId && (
                  <button type="button" onClick={() => { setEditId(null); setTitle(''); setDate(''); setTime(''); setBatch(''); setMeetLink('') }}
                    style={{ width:'100%', padding:'10px', marginTop:'6px', background:'transparent', color:'rgba(255,255,255,0.3)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', cursor:'pointer', fontFamily:'inherit', fontSize:'13px' }}>
                    Cancel Edit
                  </button>
                )}
              </form>
            </Panel>
          </TwoCol>
        </>
      )}

      {/* ── STUDENTS ── */}
      {tab === 'students' && (
        <>
          <PageHeader title="My Students" subtitle={`${students.length} students enrolled on the platform.`} />
          <Panel>
            {students.length === 0 ? <Empty msg="No students yet." /> :
              <div style={{ display:'grid', gap:'6px' }}>
                {students.map(s => (
                  <div key={s.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 12px', background:'rgba(255,255,255,0.03)', borderRadius:'10px', border:'0.5px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width:'34px', height:'34px', borderRadius:'50%', background:'rgba(16,185,129,0.18)', color:'#34d399', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:800, flexShrink:0 }}>
                      {(s.full_name||s.email||'?').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.85)', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.full_name || '—'}</div>
                      <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.28)' }}>{s.email} {s.student_id && `· ID: ${s.student_id}`}</div>
                    </div>
                    <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.2)', flexShrink:0 }}>Joined {new Date(s.created_at).toLocaleDateString('en-IN')}</div>
                  </div>
                ))}
              </div>}
          </Panel>
        </>
      )}

      {/* ── ATTENDANCE ── */}
      {tab === 'attendance' && (
        <>
          <PageHeader title="Attendance" subtitle="Mark student attendance per class." />
          <Attendance profile={profile} />
        </>
      )}

      {/* ── CALENDAR ── */}
      {tab === 'calendar' && (
        <>
          <PageHeader title="Calendar" subtitle="Your class schedule and events." />
          <Calendar profile={profile} />
        </>
      )}

      {/* ── RESOURCES ── */}
      {tab === 'resources' && (
        <>
          <PageHeader title="Resources" subtitle="Upload and manage study materials." />
          <Resources profile={profile} />
        </>
      )}

      {/* ── SUPPORT ── */}
      {tab === 'support' && (
        <>
          <PageHeader title="Support Chat" subtitle="Message admins and get help." />
          <Panel>
            <div style={{ maxHeight:'360px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'8px', marginBottom:'12px', paddingRight:'4px' }}>
              {messages.length === 0
                ? <Empty msg="No messages yet. Start the conversation!" />
                : messages.map((m,i) => {
                    const isMe = m.sender_id === profile.id
                    return (
                      <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:isMe?'flex-end':'flex-start' }}>
                        <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.22)', marginBottom:'3px', textAlign:isMe?'right':'left' }}>{m.profiles?.full_name||'Unknown'} · {m.profiles?.role}</div>
                        <div style={{ maxWidth:'75%', padding:'9px 13px', borderRadius:isMe?'12px 12px 2px 12px':'12px 12px 12px 2px', background:isMe?'rgba(30,144,255,0.18)':'rgba(255,255,255,0.06)', border:`0.5px solid ${isMe?'rgba(30,144,255,0.3)':'rgba(255,255,255,0.08)'}`, fontSize:'13px', color:'rgba(255,255,255,0.85)', lineHeight:1.5 }}>
                          {m.content}
                        </div>
                      </div>
                    )
                  })}
            </div>
            <form onSubmit={sendMsg} style={{ display:'flex', gap:'8px' }}>
              <Inp value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Type a message..." style={{ margin:0 }} />
              <Btn busy={sending} style={{ width:'auto', padding:'0 20px', margin:0 }}>Send</Btn>
            </form>
          </Panel>
        </>
      )}
    </Layout>
  )
}
