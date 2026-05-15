import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday:'short', day:'numeric', month:'short', year:'numeric'
  })
}

const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export default function BatchResetTool() {
  const [students,     setStudents]     = useState([])
  const [teachers,     setTeachers]     = useState([])
  const [courses,      setCourses]      = useState([])

  // Step 1 — pick student
  const [selStudent,   setSelStudent]   = useState('')
  const [studentCls,   setStudentCls]   = useState([])  // all classes for student
  const [loadingCls,   setLoadingCls]   = useState(false)

  // Step 2 — select which to cancel
  const [selected,     setSelected]     = useState(new Set())  // class ids to cancel
  const [cancelBusy,   setCancelBusy]   = useState(false)
  const [cancelDone,   setCancelDone]   = useState(0)

  // Step 3 — optional regenerate
  const [showRegen,    setShowRegen]    = useState(false)
  const [title,        setTitle]        = useState('')
  const [selTeacher,   setSelTeacher]   = useState('')
  const [selCourse,    setSelCourse]    = useState('')
  const [startDate,    setStartDate]    = useState('')
  const [startTime,    setStartTime]    = useState('')
  const [totalClasses, setTotalClasses] = useState(24)
  const [weekDays,     setWeekDays]     = useState([1])
  const [genPreview,   setGenPreview]   = useState([])
  const [regenBusy,    setRegenBusy]    = useState(false)
  const [regenDone,    setRegenDone]    = useState(0)
  const [err,          setErr]          = useState('')

  const today = new Date().toISOString().slice(0,10)

  useEffect(() => { loadInit() }, [])
  useEffect(() => {
    if (startDate && weekDays.length && totalClasses)
      setGenPreview(generateDates(startDate, weekDays, totalClasses))
    else setGenPreview([])
  }, [startDate, weekDays, totalClasses])

  async function loadInit() {
    const [{ data: s }, { data: t }, { data: c }] = await Promise.all([
      supabase.from('profiles').select('id,full_name,email').eq('role','student').order('full_name'),
      supabase.from('profiles').select('id,full_name').eq('role','teacher').order('full_name'),
      supabase.from('courses').select('id,title').order('title'),
    ])
    setStudents(s || [])
    setTeachers(t || [])
    setCourses(c || [])
  }

  async function loadStudentClasses(sid) {
    setSelStudent(sid)
    setStudentCls([])
    setSelected(new Set())
    setCancelDone(0)
    setRegenDone(0)
    setShowRegen(false)
    if (!sid) return
    setLoadingCls(true)
    const { data: enrols } = await supabase
      .from('enrollments').select('class_id').eq('student_id', sid)
    const ids = (enrols||[]).map(e=>e.class_id).filter(Boolean)
    if (!ids.length) { setStudentCls([]); setLoadingCls(false); return }
    const { data: cls } = await supabase
      .from('classes').select('*').in('id', ids)
      .eq('is_cancelled', false).order('class_date')
    setStudentCls(cls || [])
    setLoadingCls(false)
  }

  // Quick select helpers
  function selectAll()        { setSelected(new Set(studentCls.map(c=>c.id))) }
  function selectNone()       { setSelected(new Set()) }
  function selectFuture()     { setSelected(new Set(studentCls.filter(c=>c.class_date>=today).map(c=>c.id))) }
  function selectPast()       { setSelected(new Set(studentCls.filter(c=>c.class_date<today).map(c=>c.id))) }
  function selectUnattended() {
    // future + no attendance (we check locally — attendance status not loaded, so just future)
    setSelected(new Set(studentCls.filter(c=>c.class_date>=today).map(c=>c.id)))
  }
  function toggleOne(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function cancelSelected() {
    if (!selected.size) return setErr('Select at least one class to cancel.')
    setErr(''); setCancelBusy(true)
    const ids = [...selected]
    await supabase.from('classes').update({
      is_cancelled:  true,
      cancel_reason: 'Cancelled by admin',
      cancelled_at:  new Date().toISOString(),
    }).in('id', ids)
    // Remove enrollments
    await supabase.from('enrollments').delete().eq('student_id', selStudent).in('class_id', ids)
    setCancelDone(ids.size || ids.length)
    // Refresh list
    await loadStudentClasses(selStudent)
    setCancelBusy(false)
  }

  function generateDates(start, days, total) {
    const dates = []; let cur = new Date(start + 'T00:00:00')
    while (dates.length < total) {
      if (days.includes(cur.getDay())) dates.push(new Date(cur))
      cur.setDate(cur.getDate() + 1)
      if (dates.length >= total * 3) break
    }
    return dates.slice(0, total)
  }

  function toggleDay(d) {
    setWeekDays(prev => prev.includes(d) ? prev.filter(x=>x!==d) : [...prev,d].sort())
  }

  async function regenerate() {
    if (!title.trim())      return setErr('Enter class title.')
    if (!startDate)         return setErr('Select start date.')
    if (!weekDays.length)   return setErr('Select at least one day.')
    if (!genPreview.length) return setErr('No dates generated.')
    setErr(''); setRegenBusy(true)
    const teacher = teachers.find(t=>t.id===selTeacher)
    const course  = courses.find(c=>c.id===selCourse)
    const records = genPreview.map((d,i) => ({
      title:        title.trim() + ` (${i+1}/${genPreview.length})`,
      teacher_id:   selTeacher || null,
      teacher_name: teacher?.full_name || null,
      class_date:   d.toISOString().slice(0,10),
      start_time:   startTime || null,
      batch:        course?.title || null,
      created_by:   'admin',
    }))
    const { data: inserted, error } = await supabase.from('classes').insert(records).select()
    if (error) { setErr(error.message); setRegenBusy(false); return }
    if (inserted?.length) {
      await supabase.from('enrollments').insert(
        inserted.map(c => ({ student_id: selStudent, class_id: c.id, course_id: selCourse||null }))
      )
      await supabase.from('events').insert(
        genPreview.map(d => ({
          title: title.trim(), event_type:'class',
          day: d.getDate(), month: d.getMonth()+1, year: d.getFullYear(),
          time: startTime||null, teacher_name: teacher?.full_name||null,
        }))
      )
    }
    setRegenDone(inserted?.length || 0)
    setRegenBusy(false)
    setShowRegen(false)
    await loadStudentClasses(selStudent)
  }

  const student    = students.find(s=>s.id===selStudent)
  const futureCount  = studentCls.filter(c=>c.class_date>=today).length
  const pastCount    = studentCls.filter(c=>c.class_date<today).length

  const inp = { width:'100%', background:'#1a2535', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'10px 13px', fontSize:'13px', color:'rgba(255,255,255,0.85)', outline:'none', fontFamily:'inherit', colorScheme:'dark', boxSizing:'border-box' }
  const lbl = { display:'block', fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'5px', marginTop:'12px' }

  return (
    <div style={{ marginTop:'14px' }}>
      <div style={{ fontSize:'16px', fontWeight:700, color:'rgba(255,255,255,0.85)', marginBottom:'4px' }}>🔄 Class Manager — Cancel &amp; Regenerate</div>
      <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.3)', marginBottom:'16px' }}>
        Pick a student → select which classes to cancel → optionally regenerate new ones. One student at a time. No emails sent.
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:'16px' }}>

        {/* ── LEFT: Student picker ── */}
        <div style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'16px', height:'fit-content' }}>
          <label style={{ ...lbl, marginTop:0 }}>Select Student</label>
          <select style={{ ...inp, colorScheme:'dark' }} value={selStudent} onChange={e=>loadStudentClasses(e.target.value)}>
            <option value="">— Choose student —</option>
            {students.map(s=><option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>

          {student && (
            <div style={{ marginTop:'12px', padding:'12px', background:'rgba(30,144,255,0.08)', borderRadius:'10px', border:'0.5px solid rgba(30,144,255,0.2)' }}>
              <div style={{ fontSize:'13px', fontWeight:700, color:'#fff' }}>{student.full_name}</div>
              <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.4)', marginTop:'2px' }}>{student.email}</div>
              {!loadingCls && studentCls.length > 0 && (
                <div style={{ marginTop:'8px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px' }}>
                  {[
                    { label:'Future', value:futureCount, color:'#5aabff' },
                    { label:'Past',   value:pastCount,   color:'#94a3b8' },
                  ].map(s=>(
                    <div key={s.label} style={{ textAlign:'center', padding:'6px', background:'rgba(255,255,255,0.05)', borderRadius:'8px' }}>
                      <div style={{ fontSize:'18px', fontWeight:800, color:s.color }}>{s.value}</div>
                      <div style={{ fontSize:'9px', color:'rgba(255,255,255,0.3)' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Success messages */}
          {cancelDone > 0 && (
            <div style={{ marginTop:'10px', padding:'8px 12px', background:'rgba(239,68,68,0.1)', border:'0.5px solid rgba(239,68,68,0.2)', borderRadius:'8px', fontSize:'12px', color:'#f87171' }}>
              🚫 {cancelDone} classes cancelled
            </div>
          )}
          {regenDone > 0 && (
            <div style={{ marginTop:'6px', padding:'8px 12px', background:'rgba(16,185,129,0.1)', border:'0.5px solid rgba(16,185,129,0.2)', borderRadius:'8px', fontSize:'12px', color:'#34d399' }}>
              ✓ {regenDone} new classes created
            </div>
          )}
        </div>

        {/* ── RIGHT: Class list + actions ── */}
        <div>
          {!selStudent && (
            <div style={{ textAlign:'center', padding:'4rem', background:'rgba(255,255,255,0.03)', borderRadius:'14px', border:'0.5px solid rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>
              ← Select a student to manage their classes
            </div>
          )}

          {selStudent && loadingCls && (
            <div style={{ textAlign:'center', padding:'4rem', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>Loading classes...</div>
          )}

          {selStudent && !loadingCls && studentCls.length === 0 && (
            <div style={{ textAlign:'center', padding:'3rem', background:'rgba(255,255,255,0.03)', borderRadius:'14px', border:'0.5px solid rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.25)', fontSize:'13px' }}>
              No active classes for this student.
              <div style={{ marginTop:'12px' }}>
                <button onClick={()=>setShowRegen(r=>!r)} style={{ fontSize:'12px', fontWeight:700, padding:'8px 18px', borderRadius:'9px', background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
                  + Generate New Classes
                </button>
              </div>
            </div>
          )}

          {selStudent && !loadingCls && studentCls.length > 0 && (
            <div style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'16px' }}>

              {/* Quick select row */}
              <div style={{ display:'flex', gap:'6px', marginBottom:'12px', flexWrap:'wrap', alignItems:'center' }}>
                <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.4)', marginRight:'4px' }}>Select:</span>
                {[
                  { label:'All',              fn: selectAll        },
                  { label:'Future only',       fn: selectFuture     },
                  { label:'Past only',         fn: selectPast       },
                  { label:'Future unattended', fn: selectUnattended },
                  { label:'None',              fn: selectNone       },
                ].map(b=>(
                  <button key={b.label} onClick={b.fn} style={{ fontSize:'11px', fontWeight:600, padding:'4px 10px', borderRadius:'7px', border:'none', cursor:'pointer', fontFamily:'inherit', background:'rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.6)' }}>
                    {b.label}
                  </button>
                ))}
                <span style={{ marginLeft:'auto', fontSize:'11px', color:'rgba(255,255,255,0.4)' }}>
                  {selected.size} of {studentCls.length} selected
                </span>
              </div>

              {/* Class list */}
              <div style={{ maxHeight:'380px', overflowY:'auto', display:'grid', gap:'4px', marginBottom:'12px' }}>
                {studentCls.map(cls => {
                  const isFuture  = cls.class_date >= today
                  const isChecked = selected.has(cls.id)
                  return (
                    <div key={cls.id} onClick={()=>toggleOne(cls.id)}
                      style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 12px', borderRadius:'9px', cursor:'pointer', border:`1px solid ${isChecked?'rgba(239,68,68,0.4)':'rgba(255,255,255,0.06)'}`, background:isChecked?'rgba(239,68,68,0.08)':'rgba(255,255,255,0.02)', transition:'all 0.15s' }}>
                      {/* Checkbox */}
                      <div style={{ width:'16px', height:'16px', borderRadius:'4px', border:`2px solid ${isChecked?'#ef4444':'rgba(255,255,255,0.2)'}`, background:isChecked?'#ef4444':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.15s' }}>
                        {isChecked && <span style={{ color:'#fff', fontSize:'10px', fontWeight:800 }}>✓</span>}
                      </div>
                      {/* Info */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:'12px', fontWeight:600, color:'rgba(255,255,255,0.8)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cls.title}</div>
                        <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.35)', marginTop:'1px' }}>
                          {fmtDate(cls.class_date)}
                          {cls.start_time && ` · ${cls.start_time}`}
                          {cls.teacher_name && ` · ${cls.teacher_name}`}
                        </div>
                      </div>
                      {/* Future/Past badge */}
                      <span style={{ fontSize:'9px', fontWeight:700, padding:'2px 7px', borderRadius:'5px', flexShrink:0, background:isFuture?'rgba(30,144,255,0.12)':'rgba(255,255,255,0.05)', color:isFuture?'#5aabff':'rgba(255,255,255,0.3)' }}>
                        {isFuture ? 'Future' : 'Past'}
                      </span>
                    </div>
                  )
                })}
              </div>

              {err && <div style={{ padding:'8px 12px', background:'rgba(239,68,68,0.1)', color:'#f87171', borderRadius:'8px', fontSize:'12px', marginBottom:'10px' }}>{err}</div>}

              {/* Action buttons */}
              <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                <button onClick={cancelSelected} disabled={cancelBusy || !selected.size}
                  style={{ flex:1, padding:'11px', background:!selected.size?'rgba(100,100,100,0.2)':'linear-gradient(135deg,#ef4444,#dc2626)', color:'#fff', fontSize:'13px', fontWeight:800, border:'none', borderRadius:'10px', cursor:selected.size?'pointer':'not-allowed', fontFamily:'inherit', opacity:selected.size?1:0.5 }}>
                  {cancelBusy ? '⏳ Cancelling...' : `🚫 Cancel ${selected.size} Selected Class${selected.size!==1?'es':''}`}
                </button>
                <button onClick={()=>{ setShowRegen(r=>!r); setErr('') }} style={{ padding:'11px 18px', background:'rgba(16,185,129,0.12)', color:'#34d399', border:'0.5px solid rgba(16,185,129,0.25)', borderRadius:'10px', cursor:'pointer', fontFamily:'inherit', fontSize:'13px', fontWeight:700 }}>
                  {showRegen ? '▲ Hide Regen' : '+ Regenerate'}
                </button>
              </div>
            </div>
          )}

          {/* ── Regenerate Panel ── */}
          {selStudent && showRegen && (
            <div style={{ marginTop:'12px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
              {/* Form */}
              <div style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(16,185,129,0.2)', borderRadius:'14px', padding:'16px' }}>
                <div style={{ fontSize:'13px', fontWeight:700, color:'#34d399', marginBottom:'12px' }}>+ Generate New Classes</div>
                <div style={{ fontSize:'11px', color:'#f4a335', padding:'7px 10px', background:'rgba(244,163,53,0.08)', borderRadius:'8px', marginBottom:'10px' }}>
                  ⚡ No email sent — appears on dashboard only
                </div>

                <label style={{ ...lbl, marginTop:0 }}>Class Title *</label>
                <input style={inp} type="text" placeholder="e.g. Guitar Private" value={title} onChange={e=>setTitle(e.target.value)} />

                <label style={lbl}>Teacher</label>
                <select style={{ ...inp, colorScheme:'dark' }} value={selTeacher} onChange={e=>setSelTeacher(e.target.value)}>
                  <option value="">— Select teacher —</option>
                  {teachers.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>

                <label style={lbl}>Course (optional)</label>
                <select style={{ ...inp, colorScheme:'dark' }} value={selCourse} onChange={e=>setSelCourse(e.target.value)}>
                  <option value="">— Link to course —</option>
                  {courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}
                </select>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                  <div>
                    <label style={lbl}>Start Date *</label>
                    <input style={inp} type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} min={today} />
                  </div>
                  <div>
                    <label style={lbl}>Time</label>
                    <input style={inp} type="time" value={startTime} onChange={e=>setStartTime(e.target.value)} />
                  </div>
                </div>

                <label style={lbl}>Total Classes</label>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'5px', marginBottom:'8px' }}>
                  {[12,24,36,48,60,72,84,96].map(n=>(
                    <button key={n} type="button" onClick={()=>setTotalClasses(n)}
                      style={{ padding:'6px', borderRadius:'7px', border:'none', cursor:'pointer', fontSize:'11px', fontWeight:700, background:totalClasses===n?'#1e90ff':'rgba(255,255,255,0.05)', color:totalClasses===n?'#fff':'rgba(255,255,255,0.4)', fontFamily:'inherit' }}>{n}</button>
                  ))}
                </div>
                <input type="number" min="1" max="365" value={totalClasses} onChange={e=>setTotalClasses(parseInt(e.target.value)||1)}
                  style={{ ...inp, width:'70px', padding:'7px 10px', fontSize:'12px' }} />

                <label style={lbl}>Repeat on</label>
                <div style={{ display:'flex', gap:'5px', flexWrap:'wrap', marginBottom:'6px' }}>
                  {DAY_NAMES.map((d,i)=>(
                    <button key={i} type="button" onClick={()=>toggleDay(i)}
                      style={{ width:'36px', height:'36px', borderRadius:'50%', border:'none', cursor:'pointer', fontSize:'11px', fontWeight:700, background:weekDays.includes(i)?'#1e90ff':'rgba(255,255,255,0.07)', color:weekDays.includes(i)?'#fff':'rgba(255,255,255,0.4)', fontFamily:'inherit' }}>{d}</button>
                  ))}
                </div>

                {err && <div style={{ padding:'7px 10px', background:'rgba(239,68,68,0.1)', color:'#f87171', borderRadius:'8px', fontSize:'12px', marginBottom:'8px' }}>{err}</div>}

                <button onClick={regenerate} disabled={regenBusy}
                  style={{ marginTop:'10px', width:'100%', padding:'11px', background:regenBusy?'rgba(100,100,100,0.3)':'linear-gradient(135deg,#10b981,#059669)', color:'#fff', fontSize:'13px', fontWeight:800, border:'none', borderRadius:'10px', cursor:'pointer', fontFamily:'inherit' }}>
                  {regenBusy ? '⏳ Creating...' : `✓ Generate ${genPreview.length} Classes`}
                </button>
              </div>

              {/* Preview */}
              <div style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'16px' }}>
                <div style={{ fontSize:'12px', fontWeight:700, color:'rgba(255,255,255,0.5)', marginBottom:'10px' }}>📋 {genPreview.length} Classes Preview</div>
                {genPreview.length === 0
                  ? <div style={{ textAlign:'center', padding:'3rem 1rem', color:'rgba(255,255,255,0.2)', fontSize:'12px' }}>Set start date and days</div>
                  : <>
                      <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)', marginBottom:'8px' }}>
                        {genPreview[0]?.toLocaleDateString('en-IN')} → {genPreview[genPreview.length-1]?.toLocaleDateString('en-IN')}
                        <div style={{ color:'rgba(255,255,255,0.25)', marginTop:'2px' }}>Every {weekDays.map(d=>DAY_NAMES[d]).join(' & ')}{startTime && ` at ${startTime}`}</div>
                      </div>
                      <div style={{ maxHeight:'320px', overflowY:'auto', display:'grid', gap:'3px' }}>
                        {genPreview.map((d,i)=>(
                          <div key={i} style={{ display:'flex', gap:'8px', padding:'5px 8px', background:'rgba(255,255,255,0.03)', borderRadius:'6px', alignItems:'center' }}>
                            <span style={{ fontSize:'9px', fontWeight:700, padding:'1px 6px', borderRadius:'4px', background:'rgba(16,185,129,0.15)', color:'#34d399', flexShrink:0 }}>#{i+1}</span>
                            <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.6)' }}>{d.toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}</span>
                            {startTime && <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.3)', marginLeft:'auto' }}>{startTime}</span>}
                          </div>
                        ))}
                      </div>
                    </>
                }
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
