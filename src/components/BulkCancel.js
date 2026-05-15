import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { sendEmail } from '../emailService'

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday:'short', day:'numeric', month:'short', year:'numeric'
  })
}

export default function BulkCancel() {
  const [students,    setStudents]    = useState([])
  const [teachers,    setTeachers]    = useState([])
  const [selStudent,  setSelStudent]  = useState('')
  const [selTeacher,  setSelTeacher]  = useState('')
  const [filterMode,  setFilterMode]  = useState('both')  // both | student | teacher
  const [whichCls,    setWhichCls]    = useState('unattended') // future | unattended | all
  const [sendMail,    setSendMail]    = useState(false)  // default: no email
  const [reason,      setReason]      = useState('')
  const [preview,     setPreview]     = useState([])
  const [loadingPrev, setLoadingPrev] = useState(false)
  const [busy,        setBusy]        = useState(false)
  const [done,        setDone]        = useState(null)
  const [err,         setErr]         = useState('')
  const [step,        setStep]        = useState(1)

  useEffect(() => { loadPeople() }, [])

  async function loadPeople() {
    const [{ data: s }, { data: t }] = await Promise.all([
      supabase.from('profiles').select('id,full_name,email,timezone').eq('role','student').order('full_name'),
      supabase.from('profiles').select('id,full_name').eq('role','teacher').order('full_name'),
    ])
    setStudents(s || [])
    setTeachers(t || [])
  }

  async function loadPreview() {
    setErr('')
    // Validate inputs
    if (filterMode === 'both' && (!selStudent || !selTeacher)) return setErr('Select both student and teacher.')
    if (filterMode === 'student' && !selStudent) return setErr('Select a student.')
    if (filterMode === 'teacher' && !selTeacher) return setErr('Select a teacher.')

    setLoadingPrev(true)
    const today = new Date().toISOString().slice(0,10)

    try {
      let classIds = []

      if (filterMode === 'student' || filterMode === 'both') {
        // Get classes via enrollments for this student
        const { data: enrols } = await supabase
          .from('enrollments').select('class_id').eq('student_id', selStudent)
        classIds = (enrols||[]).map(e=>e.class_id).filter(Boolean)
      }

      // Build class query
      let q = supabase.from('classes').select('*').eq('is_cancelled', false)

      if (filterMode === 'student') {
        if (!classIds.length) { setPreview([]); setLoadingPrev(false); return }
        q = q.in('id', classIds)
      } else if (filterMode === 'teacher') {
        q = q.eq('teacher_id', selTeacher)
      } else if (filterMode === 'both') {
        if (!classIds.length) { setPreview([]); setLoadingPrev(false); return }
        q = q.in('id', classIds).eq('teacher_id', selTeacher)
      }

      // Date filter
      if (whichCls === 'future' || whichCls === 'unattended') {
        q = q.gte('class_date', today)
      }
      q = q.order('class_date')

      const { data: cls } = await q
      let result = cls || []

      // Further filter: unattended only
      if (whichCls === 'unattended' && selStudent) {
        const filtered = []
        for (const c of result) {
          const { data: att } = await supabase.from('attendance')
            .select('id').eq('class_id', c.id).eq('student_id', selStudent).limit(1)
          if (!att || att.length === 0) filtered.push(c)
        }
        result = filtered
      }

      setPreview(result)
    } catch(e) { setErr(e.message) }
    setLoadingPrev(false)
    setStep(2)
  }

  async function bulkCancel() {
    if (!preview.length) return
    setBusy(true); setErr('')

    const student = students.find(s=>s.id===selStudent)
    const teacher = teachers.find(t=>t.id===selTeacher)

    try {
      const ids = preview.map(c=>c.id)

      // Mark all as cancelled
      await supabase.from('classes').update({
        is_cancelled:  true,
        cancel_reason: reason.trim() || 'Bulk cancelled by admin',
        cancelled_at:  new Date().toISOString(),
      }).in('id', ids)

      // Send cancellation email if requested
      if (sendMail && student?.email) {
        await sendEmail('class_scheduled', student.email, {
          name:        student.full_name,
          classTitle:  `${preview.length} classes cancelled`,
          classDate:   `${fmtDate(preview[0]?.class_date)} — ${fmtDate(preview[preview.length-1]?.class_date)}`,
          startTime:   null,
          teacherName: teacher?.full_name || null,
          zoomLink:    null,
          studentTZ:   student.timezone || 'Asia/Kolkata',
        })
      }

      setDone({
        count:       preview.length,
        studentName: student?.full_name,
        teacherName: teacher?.full_name,
        emailSent:   sendMail && !!student?.email,
      })
      setStep(3)
    } catch(e) { setErr(e.message) }
    setBusy(false)
  }

  function reset() {
    setStep(1); setPreview([]); setDone(null); setErr('')
    setSelStudent(''); setSelTeacher(''); setReason('')
  }

  const student = students.find(s=>s.id===selStudent)
  const teacher = teachers.find(t=>t.id===selTeacher)
  const inp = { width:'100%', background:'#1a2535', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'10px 13px', fontSize:'13px', color:'rgba(255,255,255,0.85)', outline:'none', fontFamily:'inherit', colorScheme:'dark', boxSizing:'border-box' }
  const lbl = { display:'block', fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'5px', marginTop:'12px' }

  return (
    <div style={{ marginTop:'14px' }}>
      <div style={{ fontSize:'16px', fontWeight:700, color:'rgba(255,255,255,0.85)', marginBottom:'4px' }}>🚫 Bulk Cancel Classes</div>
      <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.3)', marginBottom:'16px' }}>
        Cancel multiple classes at once by student name, teacher name, or both
      </div>

      {/* ── STEP 1: Filters ── */}
      {step === 1 && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
          {/* Left: filter form */}
          <div style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'20px' }}>

            {/* Filter mode */}
            <label style={{ ...lbl, marginTop:0 }}>Cancel by</label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'6px', marginBottom:'4px' }}>
              {[
                { v:'both',    label:'Both',    icon:'🎯' },
                { v:'student', label:'Student', icon:'🎓' },
                { v:'teacher', label:'Teacher', icon:'👨‍🏫' },
              ].map(m=>(
                <button key={m.v} type="button" onClick={()=>setFilterMode(m.v)}
                  style={{ padding:'10px 6px', borderRadius:'10px', border:`1.5px solid ${filterMode===m.v?'#1e90ff':'rgba(255,255,255,0.08)'}`, background:filterMode===m.v?'rgba(30,144,255,0.12)':'rgba(255,255,255,0.03)', cursor:'pointer', fontFamily:'inherit', textAlign:'center' }}>
                  <div style={{ fontSize:'16px', marginBottom:'3px' }}>{m.icon}</div>
                  <div style={{ fontSize:'11px', fontWeight:700, color:filterMode===m.v?'#fff':'rgba(255,255,255,0.4)' }}>{m.label}</div>
                </button>
              ))}
            </div>

            {/* Student picker */}
            {(filterMode === 'student' || filterMode === 'both') && (
              <>
                <label style={lbl}>Student Name</label>
                <select style={{ ...inp, colorScheme:'dark' }} value={selStudent} onChange={e=>setSelStudent(e.target.value)}>
                  <option value="">— Select student —</option>
                  {students.map(s=><option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </>
            )}

            {/* Teacher picker */}
            {(filterMode === 'teacher' || filterMode === 'both') && (
              <>
                <label style={lbl}>Teacher Name</label>
                <select style={{ ...inp, colorScheme:'dark' }} value={selTeacher} onChange={e=>setSelTeacher(e.target.value)}>
                  <option value="">— Select teacher —</option>
                  {teachers.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </>
            )}

            {/* Which classes */}
            <label style={lbl}>Which classes to cancel</label>
            <div style={{ display:'grid', gap:'6px', marginBottom:'4px' }}>
              {[
                { v:'future',     label:'Future classes only',           desc:'From today onwards'                },
                { v:'unattended', label:'Future + unattended only',      desc:'Future classes with no attendance' },
                { v:'all',        label:'All classes (past + future)',    desc:'Complete history'                  },
              ].map(o=>(
                <button key={o.v} type="button" onClick={()=>setWhichCls(o.v)}
                  style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 12px', borderRadius:'10px', border:`1px solid ${whichCls===o.v?'#1e90ff':'rgba(255,255,255,0.07)'}`, background:whichCls===o.v?'rgba(30,144,255,0.1)':'rgba(255,255,255,0.03)', cursor:'pointer', textAlign:'left', width:'100%' }}>
                  <div style={{ width:'14px', height:'14px', borderRadius:'50%', border:`2px solid ${whichCls===o.v?'#1e90ff':'rgba(255,255,255,0.2)'}`, background:whichCls===o.v?'#1e90ff':'transparent', flexShrink:0 }}/>
                  <div>
                    <div style={{ fontSize:'12px', fontWeight:700, color:whichCls===o.v?'#fff':'rgba(255,255,255,0.6)' }}>{o.label}</div>
                    <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.3)' }}>{o.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Reason */}
            <label style={lbl}>Cancellation Reason (optional)</label>
            <input style={inp} type="text" placeholder="e.g. Teacher resigned, Batch closed..." value={reason} onChange={e=>setReason(e.target.value)} />

            {/* Email toggle */}
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginTop:'14px', padding:'10px 12px', background:'rgba(255,255,255,0.04)', borderRadius:'10px' }}>
              <button type="button" onClick={()=>setSendMail(!sendMail)}
                style={{ width:'36px', height:'20px', borderRadius:'10px', border:'none', cursor:'pointer', position:'relative', background:sendMail?'#1e90ff':'rgba(255,255,255,0.1)', transition:'background 0.2s', flexShrink:0 }}>
                <div style={{ position:'absolute', top:'2px', left:sendMail?'18px':'2px', width:'16px', height:'16px', borderRadius:'50%', background:'#fff', transition:'left 0.2s' }}/>
              </button>
              <div>
                <div style={{ fontSize:'12px', fontWeight:700, color:'rgba(255,255,255,0.7)' }}>Send cancellation email to student</div>
                <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.3)' }}>{sendMail ? 'Email will be sent' : 'Silent cancel — no email'}</div>
              </div>
            </div>

            {err && <div style={{ marginTop:'10px', padding:'8px 12px', background:'rgba(239,68,68,0.1)', color:'#f87171', borderRadius:'8px', fontSize:'12px' }}>{err}</div>}

            <button onClick={loadPreview} disabled={loadingPrev}
              style={{ marginTop:'16px', width:'100%', padding:'12px', background:'linear-gradient(135deg,#1e90ff,#0ea5e9)', color:'#fff', fontSize:'14px', fontWeight:800, border:'none', borderRadius:'10px', cursor:'pointer', fontFamily:'inherit' }}>
              {loadingPrev ? '⏳ Loading...' : 'Preview Classes →'}
            </button>
          </div>

          {/* Right: info panel */}
          <div style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'20px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color:'rgba(255,255,255,0.4)', marginBottom:'14px' }}>SELECTED FILTERS</div>
            {[
              { label:'Mode',     value: filterMode === 'both' ? 'Student + Teacher' : filterMode === 'student' ? 'Student only' : 'Teacher only' },
              { label:'Student',  value: student?.full_name || '—' },
              { label:'Teacher',  value: teacher?.full_name || '—' },
              { label:'Classes',  value: whichCls === 'future' ? 'Future only' : whichCls === 'unattended' ? 'Future unattended' : 'All classes' },
              { label:'Email',    value: sendMail ? 'Yes — send email' : 'No — silent cancel' },
            ].map(r=>(
              <div key={r.label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 10px', background:'rgba(255,255,255,0.03)', borderRadius:'8px', marginBottom:'4px' }}>
                <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.35)' }}>{r.label}</span>
                <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.8)', fontWeight:500 }}>{r.value}</span>
              </div>
            ))}

            <div style={{ marginTop:'16px', padding:'12px', background:'rgba(239,68,68,0.08)', border:'0.5px solid rgba(239,68,68,0.2)', borderRadius:'10px', fontSize:'11px', color:'rgba(255,255,255,0.45)', lineHeight:1.6 }}>
              ⚠ Cancelled classes are marked as cancelled in the database — they are not deleted. You can view them in the Cancelled tab of Reschedule Manager.
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: Preview & Confirm ── */}
      {step === 2 && (
        <div style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'20px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px', flexWrap:'wrap', gap:'10px' }}>
            <div>
              <div style={{ fontSize:'14px', fontWeight:700, color:'#fff' }}>
                {preview.length} classes will be cancelled
              </div>
              <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.4)', marginTop:'2px' }}>
                {student?.full_name && `Student: ${student.full_name}`}
                {student && teacher && ' · '}
                {teacher?.full_name && `Teacher: ${teacher.full_name}`}
              </div>
            </div>
            <button onClick={()=>setStep(1)} style={{ fontSize:'12px', padding:'6px 14px', borderRadius:'8px', background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.5)', border:'none', cursor:'pointer', fontFamily:'inherit' }}>← Change filters</button>
          </div>

          {preview.length === 0 ? (
            <div style={{ textAlign:'center', padding:'3rem', color:'rgba(255,255,255,0.25)', fontSize:'13px' }}>
              No classes match the selected filters.
            </div>
          ) : (
            <>
              {/* Class list */}
              <div style={{ maxHeight:'360px', overflowY:'auto', display:'grid', gap:'4px', marginBottom:'16px' }}>
                {preview.map((cls, i) => (
                  <div key={cls.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 12px', background:'rgba(239,68,68,0.06)', borderRadius:'9px', border:'0.5px solid rgba(239,68,68,0.12)' }}>
                    <span style={{ fontSize:'10px', fontWeight:700, padding:'2px 7px', borderRadius:'5px', background:'rgba(239,68,68,0.15)', color:'#f87171', flexShrink:0 }}>#{i+1}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'12px', fontWeight:600, color:'rgba(255,255,255,0.75)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cls.title}</div>
                      <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.35)', marginTop:'1px' }}>
                        {fmtDate(cls.class_date)}
                        {cls.start_time && ` · ${cls.start_time}`}
                        {cls.teacher_name && ` · ${cls.teacher_name}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Confirm warning */}
              <div style={{ padding:'12px 14px', background:'rgba(239,68,68,0.08)', border:'0.5px solid rgba(239,68,68,0.25)', borderRadius:'10px', marginBottom:'14px', fontSize:'12px', color:'#f87171' }}>
                🚫 This will mark all {preview.length} classes as cancelled. This action cannot be undone automatically.
                {sendMail && student?.email && <span> A cancellation email will be sent to <strong>{student.email}</strong>.</span>}
              </div>

              {err && <div style={{ padding:'8px 12px', background:'rgba(239,68,68,0.1)', color:'#f87171', borderRadius:'8px', fontSize:'12px', marginBottom:'10px' }}>{err}</div>}

              <button onClick={bulkCancel} disabled={busy}
                style={{ width:'100%', padding:'13px', background:busy?'rgba(100,100,100,0.3)':'linear-gradient(135deg,#ef4444,#dc2626)', color:'#fff', fontSize:'14px', fontWeight:800, border:'none', borderRadius:'10px', cursor:busy?'not-allowed':'pointer', fontFamily:'inherit' }}>
                {busy ? '⏳ Cancelling...' : `🚫 Cancel All ${preview.length} Classes`}
              </button>
            </>
          )}
        </div>
      )}

      {/* ── STEP 3: Done ── */}
      {step === 3 && done && (
        <div style={{ textAlign:'center', padding:'2.5rem', background:'rgba(239,68,68,0.06)', border:'0.5px solid rgba(239,68,68,0.2)', borderRadius:'16px' }}>
          <div style={{ fontSize:'52px', marginBottom:'14px' }}>🚫</div>
          <div style={{ fontSize:'18px', fontWeight:800, color:'#f87171', marginBottom:'8px' }}>Bulk Cancel Complete</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', maxWidth:'320px', margin:'0 auto 20px' }}>
            <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:'12px', padding:'14px' }}>
              <div style={{ fontSize:'28px', fontWeight:800, color:'#f87171' }}>{done.count}</div>
              <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.4)', marginTop:'4px' }}>Classes cancelled</div>
            </div>
            <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:'12px', padding:'14px' }}>
              <div style={{ fontSize:'28px', fontWeight:800, color:done.emailSent?'#34d399':'#94a3b8' }}>{done.emailSent ? '✓' : '—'}</div>
              <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.4)', marginTop:'4px' }}>{done.emailSent ? 'Email sent' : 'No email sent'}</div>
            </div>
          </div>
          <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.35)', marginBottom:'20px' }}>
            {done.studentName && `Student: ${done.studentName}`}
            {done.studentName && done.teacherName && ' · '}
            {done.teacherName && `Teacher: ${done.teacherName}`}
          </div>
          <button onClick={reset} style={{ padding:'11px 28px', background:'linear-gradient(135deg,#1e90ff,#0ea5e9)', color:'#fff', fontSize:'13px', fontWeight:700, border:'none', borderRadius:'10px', cursor:'pointer', fontFamily:'inherit' }}>
            Cancel More Classes
          </button>
        </div>
      )}
    </div>
  )
}
