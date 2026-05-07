import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { sendEmail } from '../emailService'

export default function ScheduleClasses({ profile }) {
  const [students,  setStudents]  = useState([])
  const [teachers,  setTeachers]  = useState([])
  const [courses,   setCourses]   = useState([])
  const [busy,      setBusy]      = useState(false)
  const [ok,        setOk]        = useState('')
  const [err,       setErr]       = useState('')
  const [preview,   setPreview]   = useState([])
  const [mode,      setMode]      = useState('single')  // single | bulk

  // Form
  const [selStudent,  setSelStudent]  = useState('')
  const [selTeacher,  setSelTeacher]  = useState('')
  const [selCourse,   setSelCourse]   = useState('')
  const [title,       setTitle]       = useState('')
  const [startDate,   setStartDate]   = useState('')
  const [startTime,   setStartTime]   = useState('')
  const [zoomLink,    setZoomLink]    = useState('')
  const [batch,       setBatch]       = useState('')
  const [totalClasses,setTotalClasses]= useState(72)
  const [weekDays,    setWeekDays]    = useState([1]) // 0=Sun,1=Mon...6=Sat
  const [classesPerWeek, setClassesPerWeek] = useState(2)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [{ data: s }, { data: t }, { data: c }] = await Promise.all([
      supabase.from('profiles').select('id,full_name,email').eq('role','student').order('full_name'),
      supabase.from('profiles').select('id,full_name').eq('role','teacher').order('full_name'),
      supabase.from('courses').select('id,title,duration_months').order('title'),
    ])
    setStudents(s || [])
    setTeachers(t || [])
    setCourses(c || [])

    // Auto-fill teacher if logged in as teacher
    if (profile.role === 'teacher') setSelTeacher(profile.id)
  }

  const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

  function toggleDay(d) {
    setWeekDays(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort()
    )
  }

  // Generate preview of all class dates
  function generateDates(start, days, total) {
    if (!start || !days.length || !total) return []
    const dates = []
    let current = new Date(start)
    current.setHours(0,0,0,0)

    while (dates.length < total) {
      if (days.includes(current.getDay())) {
        dates.push(new Date(current))
      }
      current.setDate(current.getDate() + 1)
      if (dates.length >= total * 3) break // safety
    }
    return dates.slice(0, total)
  }

  function updatePreview() {
    if (!startDate || !weekDays.length || !totalClasses) { setPreview([]); return }
    const dates = generateDates(startDate, weekDays, totalClasses)
    setPreview(dates)
  }

  useEffect(() => { updatePreview() }, [startDate, weekDays, totalClasses])

  async function scheduleClasses(e) {
    e.preventDefault()
    setErr(''); setOk(''); setBusy(true)

    if (!title.trim())     { setErr('Enter class title.'); setBusy(false); return }
    if (!startDate)        { setErr('Select start date.'); setBusy(false); return }
    if (!weekDays.length)  { setErr('Select at least one day of week.'); setBusy(false); return }

    const teacher  = teachers.find(t => t.id === selTeacher)
    const student  = students.find(s => s.id === selStudent)
    const course   = courses.find(c => c.id === selCourse)
    const dates    = mode === 'bulk' ? generateDates(startDate, weekDays, totalClasses) : [new Date(startDate)]

    try {
      // Create all class records
      const classRecords = dates.map((d, i) => ({
        title:        title.trim() + (mode === 'bulk' ? ` (Class ${i+1}/${dates.length})` : ''),
        teacher_id:   selTeacher || null,
        teacher_name: teacher?.full_name || null,
        class_date:   d.toISOString().slice(0,10),
        start_time:   startTime || null,
        batch:        batch || course?.title || null,
        meet_link:    zoomLink.trim() || null,
        created_by:   profile.full_name,
      }))

      const { data: insertedClasses, error } = await supabase
        .from('classes')
        .insert(classRecords)
        .select()

      if (error) throw new Error(error.message)

      // Enrol student in all classes if student selected
      if (selStudent && insertedClasses?.length) {
        const enrollments = insertedClasses.map(c => ({
          student_id: selStudent,
          class_id:   c.id,
          course_id:  selCourse || null,
        }))
        await supabase.from('enrollments').insert(enrollments)
      }

      // Add to events/calendar
      const events = dates.map((d, i) => ({
        title:        title.trim(),
        event_type:   'class',
        day:          d.getDate(),
        month:        d.getMonth() + 1,
        year:         d.getFullYear(),
        time:         startTime || null,
        teacher_name: teacher?.full_name || null,
        batch:        batch || course?.title || null,
      }))
      await supabase.from('events').insert(events)

      // Send email to student
      if (selStudent && student?.email) {
        const firstDate = dates[0]?.toISOString().slice(0,10)
        sendEmail('class_scheduled', student.email, {
          name:        student.full_name,
          classTitle:  title.trim(),
          classDate:   mode === 'bulk' ? `${firstDate} + ${dates.length - 1} more classes` : firstDate,
          startTime:   startTime || null,
          teacherName: teacher?.full_name || null,
          zoomLink:    zoomLink.trim() || null,
        })
      }

      const msg = mode === 'bulk'
        ? `✓ ${dates.length} classes scheduled${selStudent ? ` and added to ${student?.full_name}'s calendar` : ''}!`
        : `✓ Class scheduled${selStudent ? ` for ${student?.full_name}` : ''}!`
      setOk(msg)

      // Reset
      setTitle(''); setStartDate(''); setStartTime(''); setZoomLink('')
      setBatch(''); setSelStudent(''); setPreview([])

    } catch(e) { setErr('Error: ' + e.message) }
    setBusy(false)
    setTimeout(() => setOk(''), 6000)
  }

  const inp = { width:'100%', background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'11px 13px', fontSize:'14px', color:'rgba(255,255,255,0.85)', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
  const lbl = { display:'block', fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.32)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'6px', marginTop:'14px' }

  return (
    <div id="uniedd-schedule-classes" style={{ marginTop:'14px' }}>
      <div style={{ fontSize:'16px', fontWeight:700, color:'rgba(255,255,255,0.85)', marginBottom:'14px' }}>📅 Schedule Classes</div>

      {/* Mode selector */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'20px' }}>
        <button onClick={() => setMode('single')} style={{ padding:'14px', borderRadius:'12px', border:`1.5px solid ${mode==='single'?'#1e90ff':'rgba(255,255,255,0.08)'}`, background:mode==='single'?'rgba(30,144,255,0.12)':'rgba(255,255,255,0.03)', cursor:'pointer', textAlign:'left' }}>
          <div style={{ fontSize:'22px', marginBottom:'6px' }}>📌</div>
          <div style={{ fontSize:'13px', fontWeight:700, color:mode==='single'?'#fff':'rgba(255,255,255,0.5)' }}>Single Class</div>
          <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'3px' }}>Schedule one class at a time</div>
        </button>
        <button onClick={() => setMode('bulk')} style={{ padding:'14px', borderRadius:'12px', border:`1.5px solid ${mode==='bulk'?'#8b5cf6':'rgba(255,255,255,0.08)'}`, background:mode==='bulk'?'rgba(139,92,246,0.12)':'rgba(255,255,255,0.03)', cursor:'pointer', textAlign:'left' }}>
          <div style={{ fontSize:'22px', marginBottom:'6px' }}>📆</div>
          <div style={{ fontSize:'13px', fontWeight:700, color:mode==='bulk'?'#fff':'rgba(255,255,255,0.5)' }}>Bulk — Full Course</div>
          <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'3px' }}>Schedule all classes for entire course</div>
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>

        {/* ── LEFT — Form ── */}
        <div style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'1.2rem' }}>

          <form onSubmit={scheduleClasses}>
            {/* Title */}
            <label style={lbl}>Class Title *</label>
            <input style={inp} type="text" placeholder="e.g. Guitar — Batch A" value={title} onChange={e=>setTitle(e.target.value)} required />

            {/* Teacher */}
            {profile.role !== 'teacher' && (
              <>
                <label style={lbl}>Assign Teacher</label>
                <select style={inp} value={selTeacher} onChange={e=>setSelTeacher(e.target.value)}>
                  <option value="">— Select teacher —</option>
                  {teachers.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </>
            )}

            {/* Student (optional) */}
            <label style={lbl}>Assign Student (optional)</label>
            <select style={inp} value={selStudent} onChange={e=>setSelStudent(e.target.value)}>
              <option value="">— Select student (optional) —</option>
              {students.map(s=><option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>

            {/* Course */}
            <label style={lbl}>Course (optional)</label>
            <select style={inp} value={selCourse} onChange={e=>setSelCourse(e.target.value)}>
              <option value="">— Link to course —</option>
              {courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}
            </select>

            {/* Start date + time */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
              <div>
                <label style={lbl}>{mode==='bulk'?'Course Start Date':'Class Date'} *</label>
                <input style={inp} type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} required />
              </div>
              <div>
                <label style={lbl}>Start Time</label>
                <input style={inp} type="time" value={startTime} onChange={e=>setStartTime(e.target.value)} />
              </div>
            </div>

            {/* Zoom link */}
            <label style={lbl}>Zoom Link (optional)</label>
            <input style={inp} type="url" placeholder="https://zoom.us/j/..." value={zoomLink} onChange={e=>setZoomLink(e.target.value)} />

            {/* Batch */}
            <label style={lbl}>Batch / Group (optional)</label>
            <input style={inp} type="text" placeholder="e.g. Batch A, Beginners" value={batch} onChange={e=>setBatch(e.target.value)} />

            {/* BULK options */}
            {mode === 'bulk' && (
              <div style={{ marginTop:'14px', padding:'14px', background:'rgba(139,92,246,0.08)', border:'0.5px solid rgba(139,92,246,0.2)', borderRadius:'12px' }}>
                <div style={{ fontSize:'12px', fontWeight:700, color:'#a78bfa', marginBottom:'12px', letterSpacing:'0.05em' }}>📆 BULK SCHEDULE SETTINGS</div>

                <label style={{ ...lbl, marginTop:0 }}>Total Number of Classes</label>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'6px', marginBottom:'10px' }}>
                  {[24,36,48,60,72,84,96,120].map(n => (
                    <button key={n} type="button" onClick={() => setTotalClasses(n)}
                      style={{ padding:'8px', borderRadius:'8px', border:'none', cursor:'pointer', fontSize:'13px', fontWeight:700, background:totalClasses===n?'#8b5cf6':'rgba(255,255,255,0.05)', color:totalClasses===n?'#fff':'rgba(255,255,255,0.5)', fontFamily:'inherit' }}>
                      {n}
                    </button>
                  ))}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'14px' }}>
                  <input type="number" min="1" max="365" value={totalClasses} onChange={e=>setTotalClasses(parseInt(e.target.value)||1)}
                    style={{ ...inp, width:'80px', padding:'8px 10px', fontSize:'13px' }} />
                  <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.4)' }}>custom number</span>
                </div>

                <label style={{ ...lbl, marginTop:0 }}>Repeat on these days every week</label>
                <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'10px' }}>
                  {DAY_NAMES.map((d,i) => (
                    <button key={i} type="button" onClick={() => toggleDay(i)}
                      style={{ width:'40px', height:'40px', borderRadius:'50%', border:'none', cursor:'pointer', fontSize:'12px', fontWeight:700, background:weekDays.includes(i)?'#8b5cf6':'rgba(255,255,255,0.07)', color:weekDays.includes(i)?'#fff':'rgba(255,255,255,0.4)', fontFamily:'inherit' }}>
                      {d}
                    </button>
                  ))}
                </div>

                {preview.length > 0 && (
                  <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.4)', marginTop:'8px' }}>
                    <span style={{ color:'#a78bfa', fontWeight:700 }}>{preview.length} classes</span> from{' '}
                    <span style={{ color:'rgba(255,255,255,0.7)' }}>{preview[0]?.toLocaleDateString('en-IN')}</span> to{' '}
                    <span style={{ color:'rgba(255,255,255,0.7)' }}>{preview[preview.length-1]?.toLocaleDateString('en-IN')}</span>
                    {startTime && <span> at {startTime}</span>}
                    <span style={{ display:'block', marginTop:'4px', color:'rgba(255,255,255,0.3)' }}>
                      Every {weekDays.map(d => DAY_NAMES[d]).join(' & ')}
                    </span>
                  </div>
                )}
              </div>
            )}

            {err && <div style={{ marginTop:'10px', padding:'9px 13px', background:'rgba(220,60,60,0.1)', border:'0.5px solid rgba(220,60,60,0.3)', borderRadius:'8px', fontSize:'13px', color:'#f09595' }}>{err}</div>}
            {ok  && <div style={{ marginTop:'10px', padding:'9px 13px', background:'rgba(16,185,129,0.1)', border:'0.5px solid rgba(16,185,129,0.3)', borderRadius:'8px', fontSize:'13px', color:'#34d399' }}>{ok}</div>}

            <button type="submit" disabled={busy} style={{ width:'100%', padding:'13px', background:busy?'rgba(100,100,100,0.3)':mode==='bulk'?'linear-gradient(135deg,#8b5cf6,#6d28d9)':'linear-gradient(135deg,#1e90ff,#0ea5e9)', color:'#fff', fontSize:'14px', fontWeight:800, border:'none', borderRadius:'10px', cursor:busy?'not-allowed':'pointer', marginTop:'14px', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
              {busy
                ? <><span style={{ display:'inline-block', width:'14px', height:'14px', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite' }}/> Scheduling...</>
                : mode === 'bulk'
                  ? `📆 Schedule All ${preview.length || totalClasses} Classes`
                  : '📌 Schedule Class'
              }
            </button>
          </form>
        </div>

        {/* ── RIGHT — Preview ── */}
        <div style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'1.2rem' }}>
          <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.7)', marginBottom:'12px' }}>
            {mode === 'bulk' ? `📋 Preview — ${preview.length} Classes` : '📋 Summary'}
          </div>

          {mode === 'single' ? (
            <div style={{ display:'grid', gap:'8px' }}>
              {[
                { label:'Title',   value: title || '—' },
                { label:'Teacher', value: teachers.find(t=>t.id===selTeacher)?.full_name || '—' },
                { label:'Student', value: students.find(s=>s.id===selStudent)?.full_name || 'Not assigned' },
                { label:'Date',    value: startDate || '—' },
                { label:'Time',    value: startTime || '—' },
                { label:'Zoom',    value: zoomLink ? '✓ Link added' : 'No link yet' },
              ].map(row => (
                <div key={row.label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 10px', background:'rgba(255,255,255,0.03)', borderRadius:'8px' }}>
                  <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.4)' }}>{row.label}</span>
                  <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.8)', fontWeight:500 }}>{row.value}</span>
                </div>
              ))}
            </div>
          ) : preview.length === 0 ? (
            <div style={{ textAlign:'center', padding:'3rem 1rem', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>
              Select start date and days to see preview
            </div>
          ) : (
            <>
              {/* Stats */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', marginBottom:'14px' }}>
                {[
                  { label:'Total', value: preview.length, color:'#a78bfa' },
                  { label:'Weeks', value: Math.ceil(preview.length / weekDays.length), color:'#5aabff' },
                  { label:'Days/wk', value: weekDays.length, color:'#10b981' },
                ].map(s => (
                  <div key={s.label} style={{ background:'rgba(255,255,255,0.04)', borderRadius:'10px', padding:'10px', textAlign:'center' }}>
                    <div style={{ fontSize:'18px', fontWeight:800, color:s.color }}>{s.value}</div>
                    <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.3)', marginTop:'2px' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Class list */}
              <div style={{ maxHeight:'380px', overflowY:'auto', display:'grid', gap:'3px' }}>
                {preview.map((d, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'6px 10px', background:'rgba(255,255,255,0.03)', borderRadius:'7px' }}>
                    <span style={{ fontSize:'10px', fontWeight:700, padding:'2px 7px', borderRadius:'6px', background:'rgba(139,92,246,0.15)', color:'#a78bfa', flexShrink:0 }}>#{i+1}</span>
                    <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.7)', flex:1 }}>
                      {d.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' })}
                    </span>
                    {startTime && <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)' }}>{startTime}</span>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
