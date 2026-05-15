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
  const [keepStudent,  setKeepStudent]  = useState('')  // the ONE student to keep + regenerate
  const [step,         setStep]         = useState(1)
  const [preview,      setPreview]      = useState(null)
  const [loadingPrev,  setLoadingPrev]  = useState(false)
  const [busy,         setBusy]         = useState(false)
  const [err,          setErr]          = useState('')
  const [result,       setResult]       = useState(null)

  // Regenerate form
  const [title,        setTitle]        = useState('')
  const [selTeacher,   setSelTeacher]   = useState('')
  const [selCourse,    setSelCourse]    = useState('')
  const [startDate,    setStartDate]    = useState('')
  const [startTime,    setStartTime]    = useState('')
  const [totalClasses, setTotalClasses] = useState(24)
  const [weekDays,     setWeekDays]     = useState([1])
  const [genPreview,   setGenPreview]   = useState([])

  useEffect(() => { loadInit() }, [])

  useEffect(() => {
    if (startDate && weekDays.length && totalClasses) {
      setGenPreview(generateDates(startDate, weekDays, totalClasses))
    } else {
      setGenPreview([])
    }
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

  async function loadPreview() {
    if (!keepStudent) return
    setLoadingPrev(true); setErr('')
    const today = new Date().toISOString().slice(0,10)

    // Get ALL students except the kept one
    const otherStudents = students.filter(s => s.id !== keepStudent)

    // For each other student: find future unattended classes
    let totalToDelete = 0
    let breakdownOthers = []

    for (const stu of otherStudents) {
      const { data: enrols } = await supabase
        .from('enrollments').select('class_id').eq('student_id', stu.id)
      const classIds = (enrols||[]).map(e=>e.class_id).filter(Boolean)
      if (!classIds.length) continue

      // Get future classes (not attended)
      const { data: futureCls } = await supabase
        .from('classes').select('id,title,class_date')
        .in('id', classIds)
        .gte('class_date', today)
        .order('class_date')

      // Check which have NO attendance marked
      let toDelete = []
      for (const cls of (futureCls||[])) {
        const { data: att } = await supabase
          .from('attendance')
          .select('id')
          .eq('class_id', cls.id)
          .eq('student_id', stu.id)
          .limit(1)
        if (!att || att.length === 0) toDelete.push(cls)
      }

      if (toDelete.length > 0) {
        breakdownOthers.push({ student: stu, toDelete })
        totalToDelete += toDelete.length
      }
    }

    // For kept student: show their future classes (will stay)
    const { data: keepEnrols } = await supabase
      .from('enrollments').select('class_id').eq('student_id', keepStudent)
    const keepClassIds = (keepEnrols||[]).map(e=>e.class_id).filter(Boolean)
    let keepFuture = []
    let keepPast   = []
    if (keepClassIds.length) {
      const { data: kCls } = await supabase
        .from('classes').select('*').in('id', keepClassIds).order('class_date')
      keepPast   = (kCls||[]).filter(c => c.class_date < today)
      keepFuture = (kCls||[]).filter(c => c.class_date >= today)
    }

    setPreview({ breakdownOthers, totalToDelete, keepPast, keepFuture })
    setLoadingPrev(false)
    setStep(2)
  }

  async function deleteOthersFutureClasses() {
    if (!preview) return
    setBusy(true); setErr('')
    const today = new Date().toISOString().slice(0,10)
    let deleted = 0

    for (const { student, toDelete } of preview.breakdownOthers) {
      const ids = toDelete.map(c=>c.id)
      // Remove enrollments
      await supabase.from('enrollments').delete()
        .eq('student_id', student.id).in('class_id', ids)

      // Delete class records if no other students enrolled
      for (const id of ids) {
        const { data: others } = await supabase
          .from('enrollments').select('id').eq('class_id', id)
        if (!others || others.length === 0) {
          await supabase.from('classes').delete().eq('id', id)
        }
      }
      deleted += ids.length
    }

    setBusy(false)
    setStep(3)
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

  async function regenerateClasses() {
    if (!title.trim())       return setErr('Enter class title.')
    if (!startDate)          return setErr('Select start date.')
    if (!weekDays.length)    return setErr('Select at least one day.')
    if (!genPreview.length)  return setErr('No dates generated.')
    setBusy(true); setErr('')

    const teacher = teachers.find(t=>t.id===selTeacher)
    const course  = courses.find(c=>c.id===selCourse)

    const classRecords = genPreview.map((d,i) => ({
      title:        title.trim() + ` (Class ${i+1}/${genPreview.length})`,
      teacher_id:   selTeacher || null,
      teacher_name: teacher?.full_name || null,
      class_date:   d.toISOString().slice(0,10),
      start_time:   startTime || null,
      batch:        course?.title || null,
      created_by:   'admin',
    }))

    const { data: inserted, error } = await supabase.from('classes').insert(classRecords).select()
    if (error) { setErr(error.message); setBusy(false); return }

    // Enrol kept student only — NO email
    if (inserted?.length) {
      await supabase.from('enrollments').insert(
        inserted.map(c => ({
          student_id: keepStudent,
          class_id:   c.id,
          course_id:  selCourse || null,
        }))
      )

      // Add to events/calendar silently
      await supabase.from('events').insert(
        genPreview.map(d => ({
          title:        title.trim(),
          event_type:   'class',
          day:          d.getDate(),
          month:        d.getMonth() + 1,
          year:         d.getFullYear(),
          time:         startTime || null,
          teacher_name: teacher?.full_name || null,
          batch:        course?.title || null,
        }))
      )
    }

    const stu = students.find(s=>s.id===keepStudent)
    setResult({
      studentName:  stu?.full_name,
      othersCleaned: preview.breakdownOthers.length,
      totalDeleted:  preview.totalToDelete,
      regenerated:   inserted?.length || 0,
      kept:          (preview.keepPast?.length || 0) + (preview.keepFuture?.length || 0),
    })
    setBusy(false)
    setStep(4)
  }

  const keptStudent = students.find(s=>s.id===keepStudent)
  const inp = { width:'100%', background:'#1a2535', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'10px 13px', fontSize:'13px', color:'rgba(255,255,255,0.85)', outline:'none', fontFamily:'inherit', colorScheme:'dark', boxSizing:'border-box' }
  const lbl = { display:'block', fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'5px', marginTop:'12px' }

  return (
    <div style={{ marginTop:'14px' }}>
      <div style={{ fontSize:'16px', fontWeight:700, color:'rgba(255,255,255,0.85)', marginBottom:'4px' }}>🔄 Batch Reset & Regenerate</div>
      <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.3)', marginBottom:'16px' }}>
        Clear future classes for all other students · Keep attended classes intact · Regenerate fresh classes for one student only · No emails sent
      </div>

      {/* Step bar */}
      <div style={{ display:'flex', gap:'4px', marginBottom:'24px', alignItems:'center' }}>
        {[
          { n:1, label:'Choose Student to Keep' },
          { n:2, label:'Preview Impact'          },
          { n:3, label:'Regenerate Classes'      },
          { n:4, label:'Done'                    },
        ].map((s,i) => (
          <React.Fragment key={s.n}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' }}>
              <div style={{ width:'28px', height:'28px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:800, background:step>=s.n?'#1e90ff':'rgba(255,255,255,0.08)', color:step>=s.n?'#fff':'rgba(255,255,255,0.3)' }}>{s.n}</div>
              <span style={{ fontSize:'9px', color:step===s.n?'rgba(255,255,255,0.7)':'rgba(255,255,255,0.25)', fontWeight:step===s.n?700:400, whiteSpace:'nowrap' }}>{s.label}</span>
            </div>
            {i < 3 && <div style={{ flex:1, height:'1px', background:step>s.n?'#1e90ff':'rgba(255,255,255,0.08)', marginBottom:'14px' }}/>}
          </React.Fragment>
        ))}
      </div>

      {/* ── STEP 1 ── */}
      {step === 1 && (
        <div style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'20px' }}>
          <div style={{ padding:'12px', background:'rgba(239,68,68,0.08)', border:'0.5px solid rgba(239,68,68,0.2)', borderRadius:'10px', fontSize:'12px', color:'#f87171', marginBottom:'16px', lineHeight:1.6 }}>
            ⚠ <strong>What this does:</strong><br/>
            1. Deletes all future &amp; unattended classes for ALL other students<br/>
            2. Keeps attended classes for everyone intact<br/>
            3. Generates fresh new classes for the student you pick below only<br/>
            4. No emails sent at any step
          </div>

          <label style={lbl}>Which student should KEEP &amp; get new classes? *</label>
          <select style={{ ...inp, colorScheme:'dark' }} value={keepStudent} onChange={e=>setKeepStudent(e.target.value)}>
            <option value="">— Select the student to keep —</option>
            {students.map(s=><option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>)}
          </select>

          {keepStudent && (
            <>
              <div style={{ marginTop:'12px', padding:'12px', background:'rgba(16,185,129,0.08)', borderRadius:'10px', border:'0.5px solid rgba(16,185,129,0.2)' }}>
                <div style={{ fontSize:'11px', color:'#34d399', fontWeight:700, marginBottom:'4px' }}>✓ WILL KEEP &amp; REGENERATE FOR:</div>
                <div style={{ fontSize:'13px', color:'#fff', fontWeight:600 }}>{keptStudent?.full_name}</div>
                <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.4)' }}>{keptStudent?.email}</div>
              </div>
              <div style={{ marginTop:'8px', padding:'12px', background:'rgba(239,68,68,0.08)', borderRadius:'10px', border:'0.5px solid rgba(239,68,68,0.2)' }}>
                <div style={{ fontSize:'11px', color:'#f87171', fontWeight:700, marginBottom:'4px' }}>🗑 FUTURE CLASSES WILL BE CLEARED FOR:</div>
                {students.filter(s=>s.id!==keepStudent).map(s=>(
                  <div key={s.id} style={{ fontSize:'12px', color:'rgba(255,255,255,0.5)', padding:'2px 0' }}>· {s.full_name}</div>
                ))}
              </div>
            </>
          )}

          <button onClick={loadPreview} disabled={!keepStudent||loadingPrev}
            style={{ marginTop:'16px', width:'100%', padding:'12px', background:!keepStudent?'rgba(100,100,100,0.3)':'linear-gradient(135deg,#1e90ff,#0ea5e9)', color:'#fff', fontSize:'14px', fontWeight:800, border:'none', borderRadius:'10px', cursor:keepStudent?'pointer':'not-allowed', fontFamily:'inherit' }}>
            {loadingPrev ? '⏳ Analysing classes...' : 'Preview Impact →'}
          </button>
        </div>
      )}

      {/* ── STEP 2 ── */}
      {step === 2 && preview && (
        <div style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'20px' }}>
          <div style={{ fontSize:'14px', fontWeight:700, color:'#fff', marginBottom:'14px' }}>Impact Preview</div>

          {/* Summary boxes */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'16px' }}>
            {[
              { label:'Students affected', value: preview.breakdownOthers.length, color:'#f87171', icon:'👥' },
              { label:'Classes to delete', value: preview.totalToDelete,          color:'#f87171', icon:'🗑' },
              { label:`${keptStudent?.full_name?.split(' ')[0]}'s classes kept`, value: (preview.keepPast?.length||0)+(preview.keepFuture?.length||0), color:'#34d399', icon:'✓' },
            ].map(s=>(
              <div key={s.label} style={{ background:'rgba(255,255,255,0.04)', borderRadius:'12px', padding:'14px', textAlign:'center' }}>
                <div style={{ fontSize:'24px', marginBottom:'4px' }}>{s.icon}</div>
                <div style={{ fontSize:'22px', fontWeight:800, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.3)', marginTop:'2px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Breakdown per student */}
          {preview.breakdownOthers.length > 0 && (
            <div style={{ marginBottom:'14px' }}>
              <div style={{ fontSize:'11px', fontWeight:700, color:'#f87171', marginBottom:'8px' }}>CLASSES TO DELETE PER STUDENT:</div>
              <div style={{ display:'grid', gap:'6px', maxHeight:'200px', overflowY:'auto' }}>
                {preview.breakdownOthers.map(({ student, toDelete }) => (
                  <div key={student.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 12px', background:'rgba(239,68,68,0.06)', borderRadius:'9px', border:'0.5px solid rgba(239,68,68,0.15)' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'12px', fontWeight:600, color:'rgba(255,255,255,0.7)' }}>{student.full_name}</div>
                      <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.3)' }}>{student.email}</div>
                    </div>
                    <span style={{ fontSize:'12px', fontWeight:800, color:'#f87171' }}>{toDelete.length} classes</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {preview.breakdownOthers.length === 0 && (
            <div style={{ padding:'12px', background:'rgba(16,185,129,0.08)', borderRadius:'10px', fontSize:'12px', color:'#34d399', marginBottom:'14px' }}>
              ✓ No future classes to delete for other students — proceed to regenerate.
            </div>
          )}

          <div style={{ display:'flex', gap:'8px' }}>
            <button onClick={()=>setStep(1)} style={{ padding:'11px 18px', background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.5)', border:'none', borderRadius:'10px', cursor:'pointer', fontFamily:'inherit', fontSize:'13px' }}>← Back</button>
            <button onClick={deleteOthersFutureClasses} disabled={busy}
              style={{ flex:1, padding:'11px', background:busy?'rgba(100,100,100,0.3)':'linear-gradient(135deg,#ef4444,#dc2626)', color:'#fff', fontSize:'13px', fontWeight:800, border:'none', borderRadius:'10px', cursor:busy?'not-allowed':'pointer', fontFamily:'inherit' }}>
              {busy ? '⏳ Deleting...' : `🗑 Delete ${preview.totalToDelete} future classes → Proceed to Regenerate`}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3 ── */}
      {step === 3 && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
          <div style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'20px' }}>
            <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.7)', marginBottom:'6px' }}>
              New classes for: <span style={{ color:'#5aabff' }}>{keptStudent?.full_name}</span>
            </div>
            <div style={{ padding:'8px 12px', background:'rgba(244,163,53,0.08)', borderRadius:'8px', fontSize:'11px', color:'#f4a335', marginBottom:'14px', border:'0.5px solid rgba(244,163,53,0.2)' }}>
              ⚡ No email sent — classes appear on dashboard only
            </div>

            <label style={lbl}>Class Title *</label>
            <input style={inp} type="text" placeholder="e.g. Guitar — Private Batch" value={title} onChange={e=>setTitle(e.target.value)} />

            <label style={lbl}>Assign Teacher</label>
            <select style={{ ...inp, colorScheme:'dark' }} value={selTeacher} onChange={e=>setSelTeacher(e.target.value)}>
              <option value="">— Select teacher —</option>
              {teachers.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>

            <label style={lbl}>Course (optional)</label>
            <select style={{ ...inp, colorScheme:'dark' }} value={selCourse} onChange={e=>setSelCourse(e.target.value)}>
              <option value="">— Link to course —</option>
              {courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}
            </select>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
              <div>
                <label style={lbl}>Start Date *</label>
                <input style={inp} type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} min={new Date().toISOString().slice(0,10)} />
              </div>
              <div>
                <label style={lbl}>Time</label>
                <input style={inp} type="time" value={startTime} onChange={e=>setStartTime(e.target.value)} />
              </div>
            </div>

            <label style={lbl}>Total Classes</label>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'6px', marginBottom:'8px' }}>
              {[12,24,36,48,60,72,84,96].map(n=>(
                <button key={n} type="button" onClick={()=>setTotalClasses(n)} style={{ padding:'7px', borderRadius:'8px', border:'none', cursor:'pointer', fontSize:'12px', fontWeight:700, background:totalClasses===n?'#1e90ff':'rgba(255,255,255,0.05)', color:totalClasses===n?'#fff':'rgba(255,255,255,0.4)', fontFamily:'inherit' }}>{n}</button>
              ))}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px' }}>
              <input type="number" min="1" max="365" value={totalClasses} onChange={e=>setTotalClasses(parseInt(e.target.value)||1)}
                style={{ ...inp, width:'80px', padding:'8px 10px', fontSize:'13px' }} />
              <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.3)' }}>custom</span>
            </div>

            <label style={lbl}>Repeat every week on</label>
            <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'6px' }}>
              {DAY_NAMES.map((d,i)=>(
                <button key={i} type="button" onClick={()=>toggleDay(i)} style={{ width:'38px', height:'38px', borderRadius:'50%', border:'none', cursor:'pointer', fontSize:'11px', fontWeight:700, background:weekDays.includes(i)?'#1e90ff':'rgba(255,255,255,0.07)', color:weekDays.includes(i)?'#fff':'rgba(255,255,255,0.4)', fontFamily:'inherit' }}>{d}</button>
              ))}
            </div>

            {err && <div style={{ marginTop:'8px', padding:'8px 12px', background:'rgba(239,68,68,0.1)', color:'#f87171', borderRadius:'8px', fontSize:'12px' }}>{err}</div>}

            <button onClick={regenerateClasses} disabled={busy}
              style={{ marginTop:'14px', width:'100%', padding:'12px', background:busy?'rgba(100,100,100,0.3)':'linear-gradient(135deg,#10b981,#059669)', color:'#fff', fontSize:'14px', fontWeight:800, border:'none', borderRadius:'10px', cursor:busy?'not-allowed':'pointer', fontFamily:'inherit' }}>
              {busy ? '⏳ Creating...' : `✓ Generate ${genPreview.length} Classes (No Email)`}
            </button>
          </div>

          {/* Preview panel */}
          <div style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'20px' }}>
            <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.6)', marginBottom:'12px' }}>
              📋 {genPreview.length} New Classes
            </div>
            {genPreview.length === 0 ? (
              <div style={{ textAlign:'center', padding:'3rem 1rem', color:'rgba(255,255,255,0.2)', fontSize:'12px' }}>Select start date and days to preview</div>
            ) : (
              <>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'12px' }}>
                  {[
                    { label:'Classes', value:genPreview.length, color:'#5aabff' },
                    { label:'Weeks',   value:Math.ceil(genPreview.length/weekDays.length), color:'#a78bfa' },
                  ].map(s=>(
                    <div key={s.label} style={{ background:'rgba(255,255,255,0.04)', borderRadius:'10px', padding:'10px', textAlign:'center' }}>
                      <div style={{ fontSize:'20px', fontWeight:800, color:s.color }}>{s.value}</div>
                      <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.3)', marginTop:'2px' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {startDate && <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)', marginBottom:'10px' }}>
                  {genPreview[0]?.toLocaleDateString('en-IN')} → {genPreview[genPreview.length-1]?.toLocaleDateString('en-IN')}
                  <div style={{ color:'rgba(255,255,255,0.25)', marginTop:'2px' }}>Every {weekDays.map(d=>DAY_NAMES[d]).join(' & ')}{startTime && ` at ${startTime}`}</div>
                </div>}
                <div style={{ maxHeight:'340px', overflowY:'auto', display:'grid', gap:'3px' }}>
                  {genPreview.map((d,i)=>(
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'5px 8px', background:'rgba(255,255,255,0.03)', borderRadius:'6px' }}>
                      <span style={{ fontSize:'9px', fontWeight:700, padding:'1px 6px', borderRadius:'4px', background:'rgba(16,185,129,0.15)', color:'#34d399', flexShrink:0 }}>#{i+1}</span>
                      <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.6)' }}>{d.toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}</span>
                      {startTime && <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.3)', marginLeft:'auto' }}>{startTime}</span>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 4: Done ── */}
      {step === 4 && result && (
        <div style={{ textAlign:'center', padding:'2.5rem', background:'rgba(16,185,129,0.06)', border:'0.5px solid rgba(16,185,129,0.2)', borderRadius:'16px' }}>
          <div style={{ fontSize:'52px', marginBottom:'14px' }}>✅</div>
          <div style={{ fontSize:'18px', fontWeight:800, color:'#34d399', marginBottom:'8px' }}>All Done!</div>
          <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.4)', marginBottom:'20px' }}>
            Other students cleared · <strong style={{ color:'#5aabff' }}>{result.studentName}</strong> set up fresh
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px', marginBottom:'24px' }}>
            {[
              { label:'Students cleared',     value:result.othersCleaned, color:'#f87171' },
              { label:'Classes deleted',       value:result.totalDeleted,  color:'#f87171' },
              { label:'Classes kept (past)',   value:result.kept,          color:'#34d399' },
              { label:'New classes created',   value:result.regenerated,   color:'#5aabff' },
            ].map(s=>(
              <div key={s.label} style={{ background:'rgba(255,255,255,0.04)', borderRadius:'12px', padding:'14px' }}>
                <div style={{ fontSize:'26px', fontWeight:800, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.4)', marginTop:'4px' }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.35)', marginBottom:'16px' }}>
            ⚡ No emails were sent — new classes visible on {result.studentName}'s dashboard immediately.
          </div>
          <button onClick={()=>{ setStep(1); setKeepStudent(''); setPreview(null); setResult(null); setTitle(''); setStartDate(''); setStartTime(''); setGenPreview([]) }}
            style={{ padding:'11px 28px', background:'linear-gradient(135deg,#1e90ff,#0ea5e9)', color:'#fff', fontSize:'13px', fontWeight:700, border:'none', borderRadius:'10px', cursor:'pointer', fontFamily:'inherit' }}>
            Run Again
          </button>
        </div>
      )}
    </div>
  )
}
