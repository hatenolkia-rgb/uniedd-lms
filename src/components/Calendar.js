import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabaseClient'

const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']

const TYPE_COLOR = {
  class:   '#1e90ff',
  demo:    '#e87c1e',
  meeting: '#8b5cf6',
  payment: '#10b981',
  exam:    '#ef4444',
}

// ── Timezone helpers ────────────────────────────────────────────────────────

// Convert a class stored in IST (UTC+5:30) to the user's local timezone
// class_date = "2026-05-15", start_time = "10:00"
function classToLocalTime(classDate, startTime) {
  if (!startTime) return { localDate: classDate, localTime: null, offset: null }
  try {
    // Parse as IST (Asia/Kolkata = UTC+5:30)
    const istDateTime = new Date(`${classDate}T${startTime}:00+05:30`)
    const userTZ       = Intl.DateTimeFormat().resolvedOptions().timeZone
    const localDate    = istDateTime.toLocaleDateString('en-CA', { timeZone: userTZ }) // YYYY-MM-DD
    const localTime    = istDateTime.toLocaleTimeString('en-GB', { timeZone: userTZ, hour:'2-digit', minute:'2-digit', hour12:false })
    const userOffset   = -istDateTime.toLocaleString('en', { timeZone: userTZ, timeZoneName:'shortOffset' }).split('GMT')[1]
    return { localDate, localTime, offset: userTZ, istTime: startTime }
  } catch(e) {
    return { localDate: classDate, localTime: startTime, offset: null }
  }
}

function getUserTimezone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone } catch(e) { return 'UTC' }
}

function formatTZLabel(tz) {
  try {
    const now    = new Date()
    const offset = now.toLocaleString('en', { timeZone: tz, timeZoneName:'shortOffset' }).split('GMT')[1] || ''
    const city   = tz.split('/').pop().replace(/_/g,' ')
    return `${city} (GMT${offset})`
  } catch(e) { return tz }
}

// ── Main Calendar ───────────────────────────────────────────────────────────

export default function Calendar({ profile }) {
  const now     = new Date()
  const userTZ  = getUserTimezone()
  const isIST   = userTZ === 'Asia/Kolkata' || userTZ.includes('Calcutta')

  const [year,     setYear]     = useState(now.getFullYear())
  const [month,    setMonth]    = useState(now.getMonth())
  const [events,   setEvents]   = useState([])
  const [classes,  setClasses]  = useState([])
  const [selected, setSelected] = useState(null)
  const [showAdd,  setShowAdd]  = useState(false)
  const [form,     setForm]     = useState({ title:'', type:'class', time:'' })
  const [saving,   setSaving]   = useState(false)
  const [showTZNote, setShowTZNote] = useState(!isIST)

  const canAdd = ['admin','teacher','sales'].includes(profile.role)

  const loadData = useCallback(async () => {
    const startDate = `${year}-${String(month+1).padStart(2,'0')}-01`
    const endDate   = `${year}-${String(month+1).padStart(2,'0')}-31`

    // Events scoped by role
    let evtQuery = supabase.from('events').select('*').eq('year', year).eq('month', month + 1)
    if (profile.role === 'teacher') {
      evtQuery = evtQuery.eq('teacher_name', profile.full_name)
    }
    // Students don't see events (only classes)
    const { data: evts } = profile.role === 'student'
      ? { data: [] }
      : await evtQuery

    // Classes — strictly scoped by role
    let cls = []

    if (profile.role === 'admin' || profile.role === 'sales') {
      const { data } = await supabase.from('classes').select('*')
        .gte('class_date', startDate).lte('class_date', endDate)
        .order('class_date')
      cls = data || []

    } else if (profile.role === 'teacher') {
      const { data } = await supabase.from('classes').select('*')
        .eq('teacher_id', profile.id)
        .gte('class_date', startDate).lte('class_date', endDate)
        .order('class_date')
      cls = data || []

    } else if (profile.role === 'student') {
      // ONLY enrolled classes
      const { data: enrollments } = await supabase
        .from('enrollments').select('class_id').eq('student_id', profile.id)
      const classIds = (enrollments || []).map(e => e.class_id).filter(Boolean)
      if (classIds.length > 0) {
        const { data } = await supabase.from('classes').select('*')
          .in('id', classIds)
          .gte('class_date', startDate).lte('class_date', endDate)
          .order('class_date')
        cls = data || []
      }
    }

    // Convert class times to user's local timezone
    const converted = cls.map(c => {
      const { localDate, localTime } = classToLocalTime(c.class_date, c.start_time)
      return { ...c, _localDate: localDate, _localTime: localTime }
    })

    setEvents(evts || [])
    setClasses(converted)
  }, [year, month, profile.id, profile.role, profile.full_name])

  useEffect(() => { loadData() }, [loadData])

  // Calendar grid (keyed to LOCAL dates for non-IST users)
  const firstDay  = new Date(year, month, 1).getDay()
  const daysInMon = new Date(year, month + 1, 0).getDate()
  const cells     = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMon; d++) cells.push(d)

  function getEventsForDay(day) {
    // Use local date for the calendar grid
    const monthStr = String(month + 1).padStart(2,'0')
    const dayStr   = String(day).padStart(2,'0')
    const dateKey  = `${year}-${monthStr}-${dayStr}`

    const evts = events.filter(e => e.day === day)
    const cls  = classes.filter(c => {
      // Compare against local date if converted, else original date
      const d = (c._localDate || c.class_date)
      return d === dateKey
    }).map(c => ({
      ...c,
      event_type: 'class',
      _displayTime: c._localTime || c.start_time,
    }))
    return [...evts, ...cls]
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
    setSelected(null)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
    setSelected(null)
  }

  async function addEvent(e) {
    e.preventDefault()
    if (!selected || !form.title.trim()) return
    setSaving(true)
    await supabase.from('events').insert({
      title:      form.title,
      event_type: form.type,
      day:        selected,
      month:      month + 1,
      year,
      time:       form.time || null,
    })
    setForm({ title:'', type:'class', time:'' })
    setShowAdd(false)
    loadData()
    setSaving(false)
  }

  const selectedEvents = selected ? getEventsForDay(selected) : []
  const todayDay = now.getFullYear()===year && now.getMonth()===month ? now.getDate() : null

  const roleLabel = {
    admin:   'All classes & events',
    sales:   'All classes & events',
    teacher: 'Your assigned classes only',
    student: 'Your enrolled classes only',
  }[profile.role] || ''

  return (
    <div id="uniedd-calendar" style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'1rem', marginTop:'14px' }}>

      {/* Timezone banner for non-IST users */}
      {showTZNote && !isIST && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', background:'rgba(139,92,246,0.1)', border:'0.5px solid rgba(139,92,246,0.25)', borderRadius:'10px', marginBottom:'12px', fontSize:'11px', color:'#a78bfa' }}>
          <span>🌍 Times shown in your timezone: <strong>{formatTZLabel(userTZ)}</strong> · Classes scheduled in IST are auto-converted.</span>
          <button onClick={() => setShowTZNote(false)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.3)', cursor:'pointer', fontSize:'14px', padding:'0 0 0 8px' }}>×</button>
        </div>
      )}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
        <div>
          <div style={{ fontSize:'15px', fontWeight:700, color:'#fff' }}>
            📅 {MONTHS[month]} {year}
          </div>
          <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.25)', marginTop:'2px' }}>{roleLabel}</div>
        </div>
        <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
          {canAdd && selected && (
            <button onClick={() => setShowAdd(s => !s)} style={{ fontSize:'11px', fontWeight:700, padding:'4px 12px', borderRadius:'8px', background:'#1e90ff', color:'#fff', border:'none', cursor:'pointer' }}>
              + Add Event
            </button>
          )}
          <button onClick={prevMonth} style={{ background:'rgba(255,255,255,0.07)', border:'none', color:'#fff', width:'28px', height:'28px', borderRadius:'6px', cursor:'pointer', fontSize:'14px' }}>‹</button>
          <button onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()) }} style={{ background:'rgba(255,255,255,0.07)', border:'none', color:'rgba(255,255,255,0.5)', padding:'0 8px', height:'28px', borderRadius:'6px', cursor:'pointer', fontSize:'11px' }}>Today</button>
          <button onClick={nextMonth} style={{ background:'rgba(255,255,255,0.07)', border:'none', color:'#fff', width:'28px', height:'28px', borderRadius:'6px', cursor:'pointer', fontSize:'14px' }}>›</button>
        </div>
      </div>

      {/* Day headers */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'2px', marginBottom:'4px' }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign:'center', fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.3)', padding:'4px 0', letterSpacing:'0.05em' }}>{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'2px' }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />
          const dayEvts    = getEventsForDay(day)
          const isToday    = day === todayDay
          const isSelected = day === selected
          return (
            <div key={day} onClick={() => setSelected(isSelected ? null : day)} style={{
              minHeight:'44px', borderRadius:'8px', padding:'4px',
              background: isSelected ? 'rgba(30,144,255,0.2)' : isToday ? 'rgba(30,144,255,0.08)' : 'rgba(255,255,255,0.03)',
              border: isSelected ? '1px solid #1e90ff' : isToday ? '1px solid rgba(30,144,255,0.3)' : '1px solid rgba(255,255,255,0.05)',
              cursor:'pointer', transition:'all 0.15s',
            }}>
              <div style={{ fontSize:'12px', fontWeight: isToday ? 700 : 400, color: isToday ? '#1e90ff' : 'rgba(255,255,255,0.7)', marginBottom:'2px' }}>{day}</div>
              {dayEvts.slice(0,2).map((ev, idx) => (
                <div key={idx} style={{ fontSize:'9px', fontWeight:600, padding:'1px 4px', borderRadius:'3px', marginBottom:'1px', background:`${TYPE_COLOR[ev.event_type]||'#888'}22`, color:TYPE_COLOR[ev.event_type]||'#aaa', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {ev._displayTime && <span style={{ opacity:0.7 }}>{ev._displayTime} </span>}
                  {ev.title}
                </div>
              ))}
              {dayEvts.length > 2 && <div style={{ fontSize:'9px', color:'rgba(255,255,255,0.3)' }}>+{dayEvts.length - 2} more</div>}
            </div>
          )
        })}
      </div>

      {/* Selected day detail */}
      {selected && (
        <div style={{ marginTop:'12px', borderTop:'0.5px solid rgba(255,255,255,0.07)', paddingTop:'12px' }}>
          <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.7)', marginBottom:'8px' }}>
            {MONTHS[month]} {selected}, {year}
            {!isIST && <span style={{ fontSize:'10px', fontWeight:400, color:'rgba(255,255,255,0.3)', marginLeft:'8px' }}>All times in {formatTZLabel(userTZ)}</span>}
          </div>

          {/* Add event form */}
          {showAdd && canAdd && (
            <form onSubmit={addEvent} style={{ background:'rgba(255,255,255,0.05)', borderRadius:'10px', padding:'12px', marginBottom:'10px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'8px' }}>
                <div>
                  <div style={{ fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.35)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'4px' }}>Title</div>
                  <input value={form.title} onChange={e => setForm(f => ({...f, title:e.target.value}))} required placeholder="Event title"
                    style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'8px', padding:'8px 10px', fontSize:'13px', color:'#fff', outline:'none' }}/>
                </div>
                <div>
                  <div style={{ fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.35)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'4px' }}>Time (IST)</div>
                  <input type="time" value={form.time} onChange={e => setForm(f => ({...f, time:e.target.value}))}
                    style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'8px', padding:'8px 10px', fontSize:'13px', color:'#fff', outline:'none' }}/>
                </div>
              </div>
              <div style={{ marginBottom:'8px' }}>
                <div style={{ fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.35)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'4px' }}>Type</div>
                <select value={form.type} onChange={e => setForm(f => ({...f, type:e.target.value}))}
                  style={{ width:'100%', background:'rgba(255,255,255,0.07)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'8px', padding:'8px 10px', fontSize:'13px', color:'#fff', outline:'none' }}>
                  <option value="class">Class</option>
                  <option value="demo">Demo</option>
                  <option value="meeting">Meeting</option>
                  <option value="payment">Payment</option>
                  <option value="exam">Exam</option>
                </select>
              </div>
              <div style={{ display:'flex', gap:'8px' }}>
                <button type="submit" disabled={saving} style={{ flex:1, padding:'8px', background:'#1e90ff', color:'#fff', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:700, cursor:'pointer', opacity:saving?0.6:1 }}>
                  {saving ? 'Saving...' : 'Add Event'}
                </button>
                <button type="button" onClick={() => setShowAdd(false)} style={{ padding:'8px 16px', background:'rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.5)', border:'none', borderRadius:'8px', fontSize:'13px', cursor:'pointer' }}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Events list */}
          {selectedEvents.length === 0
            ? <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.25)', textAlign:'center', padding:'12px' }}>
                No events this day{canAdd ? ' — click "+ Add Event" to add one' : ''}
              </div>
            : selectedEvents.map((ev, i) => {
                // Show IST time as secondary if user is not in IST
                const displayTime = ev._displayTime || ev._localTime || ev.time || ev.start_time
                const istTime     = ev.start_time
                const showDual    = !isIST && istTime && displayTime && displayTime !== istTime

                return (
                  <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:'10px', padding:'10px 12px', background:'rgba(255,255,255,0.04)', borderRadius:'10px', marginBottom:'6px', border:`0.5px solid ${TYPE_COLOR[ev.event_type]||'#888'}33` }}>
                    <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:TYPE_COLOR[ev.event_type]||'#888', flexShrink:0, marginTop:'4px' }}/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.85)', fontWeight:600 }}>{ev.title}</div>
                      <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.4)', marginTop:'3px', display:'flex', gap:'6px', flexWrap:'wrap' }}>
                        {displayTime && (
                          <span style={{ background:'rgba(30,144,255,0.15)', color:'#5aabff', padding:'1px 7px', borderRadius:'6px', fontWeight:700 }}>
                            🕐 {displayTime}
                            {!isIST && <span style={{ opacity:0.6, fontWeight:400 }}> (local)</span>}
                          </span>
                        )}
                        {showDual && (
                          <span style={{ background:'rgba(255,165,0,0.1)', color:'#f4a335', padding:'1px 7px', borderRadius:'6px' }}>
                            {istTime} IST
                          </span>
                        )}
                        {ev.event_type && <span style={{ color:'rgba(255,255,255,0.3)' }}>· {ev.event_type}</span>}
                        {ev.batch        && <span style={{ color:'rgba(255,255,255,0.3)' }}>· {ev.batch}</span>}
                        {ev.teacher_name && <span style={{ color:'rgba(255,255,255,0.3)' }}>· 👨‍🏫 {ev.teacher_name}</span>}
                      </div>
                    </div>
                    {ev.meet_link && (
                      <a href={ev.meet_link} target="_blank" rel="noreferrer" style={{ fontSize:'11px', fontWeight:700, padding:'5px 12px', borderRadius:'8px', background:'rgba(30,144,255,0.15)', color:'#5aabff', border:'0.5px solid rgba(30,144,255,0.25)', whiteSpace:'nowrap', textDecoration:'none', flexShrink:0 }}>
                        🔗 Join Zoom
                      </a>
                    )}
                  </div>
                )
              })
          }
        </div>
      )}

      {/* Footer: legend + TZ info */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'10px', paddingTop:'10px', borderTop:'0.5px solid rgba(255,255,255,0.06)', flexWrap:'wrap', gap:'8px' }}>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'10px' }}>
          {Object.entries(TYPE_COLOR).map(([type, color]) => (
            <div key={type} style={{ display:'flex', alignItems:'center', gap:'4px' }}>
              <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:color }}/>
              <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.3)', textTransform:'capitalize' }}>{type}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.2)' }}>
          🌍 {formatTZLabel(userTZ)}
        </div>
      </div>
    </div>
  )
}
