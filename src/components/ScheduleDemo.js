import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { sendEmail } from '../emailService'

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday:'short', day:'2-digit', month:'short', year:'numeric'
  })
}
function fmtTime(t) {
  if (!t) return ''
  return new Date('2000-01-01T' + t).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true })
}

const STATUS_STYLE = {
  'New':            { bg:'rgba(30,144,255,0.12)',  color:'#5aabff'  },
  'Contacted':      { bg:'rgba(139,92,246,0.12)',  color:'#a78bfa'  },
  'Demo Scheduled': { bg:'rgba(244,163,53,0.12)',  color:'#f4a335'  },
  'Enrolled':       { bg:'rgba(16,185,129,0.12)',  color:'#34d399'  },
  'Lost':           { bg:'rgba(239,68,68,0.12)',   color:'#f87171'  },
}

// ── Mini modal shown inline when clicking Schedule Demo on a lead ──
export function ScheduleDemoModal({ lead, onClose, onSaved }) {
  const [teachers,   setTeachers]   = useState([])
  const [teacherId,  setTeacherId]  = useState('')
  const [date,       setDate]       = useState('')
  const [time,       setTime]       = useState('')
  const [topic,      setTopic]      = useState(lead?.course_interest ? `${lead.course_interest} Demo` : 'Free Demo Class')
  const [notes,      setNotes]      = useState('')
  const [sendMail,   setSendMail]   = useState(true)
  const [busy,       setBusy]       = useState(false)
  const [err,        setErr]        = useState('')

  useEffect(() => {
    supabase.from('profiles').select('id,full_name').eq('role','teacher').order('full_name')
      .then(({ data }) => setTeachers(data || []))
  }, [])

  async function submit(e) {
    e.preventDefault()
    if (!date) return setErr('Select a date.')
    setBusy(true); setErr('')

    const teacher = teachers.find(t => t.id === teacherId)
    const d       = new Date(date + 'T00:00:00')

    // Insert demo class
    const { error } = await supabase.from('classes').insert({
      title:        topic || `Demo — ${lead.full_name}`,
      teacher_id:   teacherId || null,
      teacher_name: teacher?.full_name || null,
      class_date:   date,
      start_time:   time || null,
      batch:        'demo',
      created_by:   'admin',
      meet_link:    null,
    })
    if (error) { setErr(error.message); setBusy(false); return }

    // Update lead status + demo_date
    await supabase.from('leads').update({
      status:    'Demo Scheduled',
      demo_date: time ? `${date}T${time}:00` : date,
      notes:     notes || null,
    }).eq('id', lead.id)

    // Add to calendar
    await supabase.from('events').insert({
      title:        `Demo: ${lead.full_name}`,
      event_type:   'demo',
      day:          d.getDate(),
      month:        d.getMonth() + 1,
      year:         d.getFullYear(),
      time:         time || null,
      teacher_name: teacher?.full_name || null,
    })

    // Send email to lead if they have email
    if (sendMail && lead.email) {
      sendEmail('class_scheduled', lead.email, {
        name:        lead.full_name,
        classTitle:  topic || 'Free Demo Class',
        classDate:   date,
        startTime:   time || null,
        teacherName: teacher?.full_name || null,
        zoomLink:    null,
      })
    }

    setBusy(false)
    onSaved?.()
  }

  const inp = { width:'100%', background:'#1a2535', border:'0.5px solid rgba(255,255,255,0.12)', borderRadius:'10px', padding:'9px 12px', fontSize:'13px', color:'rgba(255,255,255,0.85)', outline:'none', fontFamily:'inherit', colorScheme:'dark', boxSizing:'border-box' }
  const lbl = { display:'block', fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'4px', marginTop:'10px' }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
      <div style={{ background:'#0f1923', border:'1px solid rgba(139,92,246,0.3)', borderRadius:'16px', padding:'24px', width:'100%', maxWidth:'440px', boxShadow:'0 20px 60px rgba(0,0,0,0.5)' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
          <div>
            <div style={{ fontSize:'16px', fontWeight:800, color:'#fff' }}>🎯 Schedule Demo</div>
            <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.4)', marginTop:'2px' }}>for {lead.full_name}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.4)', fontSize:'22px', cursor:'pointer', lineHeight:1 }}>×</button>
        </div>

        {/* Lead info badge */}
        <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', background:'rgba(255,255,255,0.04)', borderRadius:'10px', marginBottom:'4px' }}>
          <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:'rgba(139,92,246,0.2)', color:'#a78bfa', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:800, flexShrink:0 }}>
            {lead.full_name?.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:'13px', fontWeight:600, color:'#fff' }}>{lead.full_name}</div>
            <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.4)' }}>
              {lead.phone && `📞 ${lead.phone}`}
              {lead.email && ` · 📧 ${lead.email}`}
              {lead.course_interest && ` · 🎸 ${lead.course_interest}`}
            </div>
          </div>
        </div>

        <form onSubmit={submit}>
          <label style={lbl}>Demo Topic</label>
          <input style={inp} type="text" value={topic} onChange={e=>setTopic(e.target.value)} placeholder="e.g. Guitar Intro Demo" />

          <label style={lbl}>Assign Teacher</label>
          <select style={{ ...inp, colorScheme:'dark' }} value={teacherId} onChange={e=>setTeacherId(e.target.value)}>
            <option value="">— Select teacher (optional) —</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
          </select>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            <div>
              <label style={lbl}>Date *</label>
              <input style={inp} type="date" value={date} onChange={e=>setDate(e.target.value)} min={new Date().toISOString().slice(0,10)} required />
            </div>
            <div>
              <label style={lbl}>Time</label>
              <input style={inp} type="time" value={time} onChange={e=>setTime(e.target.value)} />
            </div>
          </div>

          <label style={lbl}>Notes (optional)</label>
          <textarea style={{ ...inp, minHeight:'60px', resize:'vertical' }} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Any notes about the lead or demo..." />

          {/* Email toggle */}
          {lead.email && (
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginTop:'10px', padding:'9px 12px', background:'rgba(255,255,255,0.04)', borderRadius:'9px', cursor:'pointer' }} onClick={()=>setSendMail(!sendMail)}>
              <div style={{ width:'34px', height:'18px', borderRadius:'9px', background:sendMail?'#1e90ff':'rgba(255,255,255,0.1)', position:'relative', flexShrink:0, transition:'background 0.2s' }}>
                <div style={{ position:'absolute', top:'2px', left:sendMail?'18px':'2px', width:'14px', height:'14px', borderRadius:'50%', background:'#fff', transition:'left 0.2s' }}/>
              </div>
              <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.6)' }}>
                Send confirmation email to <strong style={{ color:'rgba(255,255,255,0.8)' }}>{lead.email}</strong>
              </span>
            </div>
          )}

          {err && <div style={{ marginTop:'8px', padding:'8px 12px', background:'rgba(239,68,68,0.1)', color:'#f87171', borderRadius:'8px', fontSize:'12px' }}>{err}</div>}

          <div style={{ display:'flex', gap:'8px', marginTop:'16px' }}>
            <button type="submit" disabled={busy} style={{ flex:1, padding:'12px', background:busy?'rgba(100,100,100,0.3)':'linear-gradient(135deg,#8b5cf6,#6d28d9)', color:'#fff', fontSize:'14px', fontWeight:800, border:'none', borderRadius:'10px', cursor:busy?'not-allowed':'pointer', fontFamily:'inherit' }}>
              {busy ? '⏳ Scheduling...' : '🎯 Schedule Demo'}
            </button>
            <button type="button" onClick={onClose} style={{ padding:'12px 18px', background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.5)', border:'none', borderRadius:'10px', cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Full Schedule Demo Page (Admin / Sales dedicated section) ──
export default function ScheduleDemo({ profile }) {
  const [leads,     setLeads]     = useState([])
  const [students,  setStudents]  = useState([])
  const [teachers,  setTeachers]  = useState([])
  const [upcomingDemos, setUpcoming] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState('leads')  // leads | students | upcoming
  const [modal,     setModal]     = useState(null)  // lead object
  const [ok,        setOk]        = useState('')
  const [search,    setSearch]    = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const today = new Date().toISOString().slice(0,10)
    const [{ data: l }, { data: s }, { data: t }, { data: d }] = await Promise.all([
      supabase.from('leads').select('*').not('status','eq','Enrolled').order('created_at', { ascending:false }),
      supabase.from('profiles').select('id,full_name,email,timezone').eq('role','student').order('full_name'),
      supabase.from('profiles').select('id,full_name').eq('role','teacher').order('full_name'),
      supabase.from('classes').select('*').eq('batch','demo').gte('class_date', today).order('class_date'),
    ])
    setLeads(l || [])
    setStudents(s || [])
    setTeachers(t || [])
    setUpcoming(d || [])
    setLoading(false)
  }

  async function scheduleDemoForStudent(student, date, time, teacherId, topic) {
    const teacher = teachers.find(t=>t.id===teacherId)
    const d = new Date(date + 'T00:00:00')

    await supabase.from('classes').insert({
      title:        topic || `Demo — ${student.full_name}`,
      teacher_id:   teacherId || null,
      teacher_name: teacher?.full_name || null,
      class_date:   date,
      start_time:   time || null,
      batch:        'demo',
      created_by:   profile.full_name,
    })

    await supabase.from('events').insert({
      title: `Demo: ${student.full_name}`, event_type:'demo',
      day: d.getDate(), month: d.getMonth()+1, year: d.getFullYear(),
      time: time||null, teacher_name: teacher?.full_name||null,
    })

    loadAll()
  }

  const filteredLeads    = leads.filter(l => !search || l.full_name?.toLowerCase().includes(search.toLowerCase()) || l.phone?.includes(search))
  const filteredStudents = students.filter(s => !search || s.full_name?.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase()))

  const inp = { background:'#1a2535', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'9px 12px', fontSize:'13px', color:'rgba(255,255,255,0.85)', outline:'none', fontFamily:'inherit', colorScheme:'dark' }

  return (
    <div style={{ marginTop:'14px' }}>
      <div style={{ fontSize:'16px', fontWeight:700, color:'rgba(255,255,255,0.85)', marginBottom:'4px' }}>🎯 Schedule Demo</div>
      <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.3)', marginBottom:'16px' }}>
        Book a free demo class for any lead or existing student
      </div>

      {ok && <div style={{ padding:'9px 14px', background:'rgba(16,185,129,0.1)', border:'0.5px solid rgba(16,185,129,0.25)', borderRadius:'9px', fontSize:'13px', color:'#34d399', marginBottom:'12px' }}>{ok}</div>}

      {/* Tabs */}
      <div style={{ display:'flex', gap:'6px', marginBottom:'16px', borderBottom:'0.5px solid rgba(255,255,255,0.07)', paddingBottom:'12px' }}>
        {[
          { id:'leads',    label:`📋 Leads (${leads.length})`           },
          { id:'students', label:`🎓 Students (${students.length})`     },
          { id:'upcoming', label:`📅 Upcoming Demos (${upcomingDemos.length})` },
        ].map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ fontSize:'12px', fontWeight:700, padding:'7px 16px', borderRadius:'10px', border:'none', cursor:'pointer', fontFamily:'inherit', background:tab===t.id?'linear-gradient(135deg,#8b5cf6,#6d28d9)':'rgba(255,255,255,0.05)', color:tab===t.id?'#fff':'rgba(255,255,255,0.45)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      {tab !== 'upcoming' && (
        <input style={{ ...inp, width:'100%', marginBottom:'12px' }} type="text"
          placeholder={tab==='leads' ? '🔍 Search leads by name or phone...' : '🔍 Search students...'}
          value={search} onChange={e=>setSearch(e.target.value)} />
      )}

      {loading ? (
        <div style={{ textAlign:'center', padding:'3rem', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>Loading...</div>
      ) : (

        <>
          {/* ── LEADS TAB ── */}
          {tab === 'leads' && (
            <div style={{ display:'grid', gap:'8px' }}>
              {filteredLeads.length === 0
                ? <div style={{ textAlign:'center', padding:'3rem', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>No leads found</div>
                : filteredLeads.map(lead => {
                  const ss = STATUS_STYLE[lead.status] || STATUS_STYLE['New']
                  return (
                    <div key={lead.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 16px', background:'rgba(255,255,255,0.03)', borderRadius:'12px', border:'0.5px solid rgba(255,255,255,0.07)' }}>
                      <div style={{ width:'36px', height:'36px', borderRadius:'50%', flexShrink:0, background:'rgba(139,92,246,0.18)', color:'#a78bfa', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:800 }}>
                        {lead.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:'13px', fontWeight:600, color:'rgba(255,255,255,0.85)' }}>{lead.full_name}</div>
                        <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)', marginTop:'2px' }}>
                          {lead.phone && `📞 ${lead.phone}`}
                          {lead.email && ` · ${lead.email}`}
                          {lead.course_interest && ` · 🎸 ${lead.course_interest}`}
                        </div>
                        {lead.demo_date && (
                          <div style={{ fontSize:'10px', color:'#f4a335', marginTop:'2px' }}>
                            📅 Demo: {fmtDate(lead.demo_date?.slice(0,10))} {lead.demo_date?.slice(11,16) && fmtTime(lead.demo_date.slice(11,16))}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize:'10px', fontWeight:700, padding:'3px 9px', borderRadius:'8px', background:ss.bg, color:ss.color, flexShrink:0 }}>
                        {lead.status || 'New'}
                      </span>
                      <button
                        onClick={() => setModal(lead)}
                        style={{ fontSize:'12px', fontWeight:700, padding:'7px 16px', borderRadius:'9px', background:'rgba(139,92,246,0.15)', color:'#a78bfa', border:'0.5px solid rgba(139,92,246,0.25)', cursor:'pointer', fontFamily:'inherit', flexShrink:0, whiteSpace:'nowrap' }}>
                        🎯 {lead.demo_date ? 'Reschedule' : 'Schedule Demo'}
                      </button>
                    </div>
                  )
                })
              }
            </div>
          )}

          {/* ── STUDENTS TAB ── */}
          {tab === 'students' && (
            <div style={{ display:'grid', gap:'8px' }}>
              {filteredStudents.length === 0
                ? <div style={{ textAlign:'center', padding:'3rem', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>No students found</div>
                : filteredStudents.map(stu => (
                  <div key={stu.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 16px', background:'rgba(255,255,255,0.03)', borderRadius:'12px', border:'0.5px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ width:'36px', height:'36px', borderRadius:'50%', flexShrink:0, background:'rgba(30,144,255,0.18)', color:'#5aabff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:800 }}>
                      {stu.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'13px', fontWeight:600, color:'rgba(255,255,255,0.85)' }}>{stu.full_name}</div>
                      <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)', marginTop:'2px' }}>{stu.email}</div>
                    </div>
                    <button
                      onClick={() => {
                        // For existing students, create a fake lead-like object
                        setModal({ ...stu, phone:'', course_interest:'', status:'Student', isStudent:true })
                      }}
                      style={{ fontSize:'12px', fontWeight:700, padding:'7px 16px', borderRadius:'9px', background:'rgba(30,144,255,0.12)', color:'#5aabff', border:'0.5px solid rgba(30,144,255,0.2)', cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>
                      🎯 Schedule Demo
                    </button>
                  </div>
                ))
              }
            </div>
          )}

          {/* ── UPCOMING DEMOS TAB ── */}
          {tab === 'upcoming' && (
            <div style={{ display:'grid', gap:'8px' }}>
              {upcomingDemos.length === 0
                ? <div style={{ textAlign:'center', padding:'3rem 1rem', background:'rgba(255,255,255,0.03)', borderRadius:'14px', border:'0.5px solid rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.25)', fontSize:'13px' }}>
                    No upcoming demos scheduled yet
                  </div>
                : upcomingDemos.map(demo => (
                  <div key={demo.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 16px', background:'rgba(139,92,246,0.06)', borderRadius:'12px', border:'0.5px solid rgba(139,92,246,0.18)' }}>
                    <div style={{ fontSize:'24px', flexShrink:0 }}>🎯</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'13px', fontWeight:600, color:'rgba(255,255,255,0.85)' }}>{demo.title}</div>
                      <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)', marginTop:'2px' }}>
                        📅 {fmtDate(demo.class_date)}
                        {demo.start_time && ` · ⏰ ${fmtTime(demo.start_time)}`}
                        {demo.teacher_name && ` · 👨‍🏫 ${demo.teacher_name}`}
                      </div>
                    </div>
                    {/* Countdown */}
                    {(() => {
                      const daysLeft = Math.ceil((new Date(demo.class_date) - new Date()) / 86400000)
                      return (
                        <span style={{ fontSize:'10px', fontWeight:700, padding:'3px 9px', borderRadius:'8px', background: daysLeft <= 1 ? 'rgba(239,68,68,0.15)' : daysLeft <= 3 ? 'rgba(244,163,53,0.15)' : 'rgba(139,92,246,0.15)', color: daysLeft <= 1 ? '#f87171' : daysLeft <= 3 ? '#f4a335' : '#a78bfa', flexShrink:0 }}>
                          {daysLeft === 0 ? 'Today!' : daysLeft === 1 ? 'Tomorrow' : `In ${daysLeft} days`}
                        </span>
                      )
                    })()}
                  </div>
                ))
              }
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {modal && (
        <ScheduleDemoModal
          lead={modal}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            setOk(`✓ Demo scheduled for ${modal.full_name}!`)
            setTimeout(() => setOk(''), 4000)
            loadAll()
          }}
        />
      )}
    </div>
  )
}
