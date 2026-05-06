import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Panel, Empty, Lbl, Err, Ok } from './Layout'

export default function EnrolStudent() {
  const [students,    setStudents]    = useState([])
  const [classes,     setClasses]     = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [selStudent,  setSelStudent]  = useState('')
  const [selClass,    setSelClass]    = useState('')
  const [loading,     setLoading]     = useState(true)
  const [busy,        setBusy]        = useState(false)
  const [ok,          setOk]          = useState('')
  const [err,         setErr]         = useState('')
  const [filterStud,  setFilterStud]  = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: s }, { data: c }, { data: e }] = await Promise.all([
      supabase.from('profiles').select('id,full_name,email,student_id').eq('role','student').order('full_name'),
      supabase.from('classes').select('id,title,class_date,start_time,teacher_name,batch').order('class_date', { ascending: false }),
      supabase.from('enrollments').select('*'),
    ])
    setStudents(s || [])
    setClasses(c || [])
    setEnrollments(e || [])
    setLoading(false)
  }

  async function enrol() {
    setErr(''); setOk('')
    if (!selStudent || !selClass) return setErr('Please select both a student and a class.')
    // Check already enrolled
    const already = enrollments.find(e => e.student_id === selStudent && e.class_id === selClass)
    if (already) return setErr('This student is already enrolled in that class.')
    setBusy(true)
    const { error } = await supabase.from('enrollments').insert({
      student_id: selStudent,
      class_id:   selClass,
    })
    if (error) setErr(error.message)
    else {
      const student = students.find(s => s.id === selStudent)
      const cls     = classes.find(c => c.id === selClass)
      setOk(`✓ ${student?.full_name} enrolled in "${cls?.title}"`)
      setSelClass('')
      load()
    }
    setBusy(false)
    setTimeout(() => setOk(''), 4000)
  }

  async function removeEnrollment(id, studentName, classTitle) {
    if (!window.confirm(`Remove ${studentName} from "${classTitle}"?`)) return
    await supabase.from('enrollments').delete().eq('id', id)
    load()
  }

  // Group enrollments by student for display
  const today = new Date().toISOString().slice(0,10)
  const filteredStudents = students.filter(s =>
    !filterStud || s.full_name?.toLowerCase().includes(filterStud.toLowerCase()) || s.email?.toLowerCase().includes(filterStud.toLowerCase())
  )

  const inp = { width:'100%', background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'11px 13px', fontSize:'14px', color:'rgba(255,255,255,0.85)', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }

  return (
    <div id="uniedd-enrol" style={{ marginTop:'14px' }}>
      <div style={{ fontSize:'16px', fontWeight:700, color:'rgba(255,255,255,0.85)', marginBottom:'14px', display:'flex', alignItems:'center', gap:'10px' }}>
        🎓 Enrol Students in Classes
        <span style={{ fontSize:'10px', fontWeight:600, padding:'3px 10px', borderRadius:'20px', background:'rgba(16,185,129,0.15)', color:'#10b981' }}>
          {enrollments.length} enrolments total
        </span>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>

        {/* ── ENROL FORM ── */}
        <Panel title="+ Enrol a Student">
          <Lbl>Select Student</Lbl>
          <select style={inp} value={selStudent} onChange={e => setSelStudent(e.target.value)}>
            <option value="">— Choose student —</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>
                {s.full_name} {s.email ? `(${s.email})` : ''}
              </option>
            ))}
          </select>

          <Lbl>Select Class</Lbl>
          <select style={inp} value={selClass} onChange={e => setSelClass(e.target.value)}>
            <option value="">— Choose class —</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.title} — {c.class_date} {c.teacher_name ? `(${c.teacher_name})` : ''}
              </option>
            ))}
          </select>

          <Err msg={err}/>
          <Ok  msg={ok}/>

          <button onClick={enrol} disabled={busy} style={{ width:'100%', padding:'12px', background:'#10b981', color:'#fff', fontSize:'14px', fontWeight:700, border:'none', borderRadius:'10px', cursor:'pointer', marginTop:'14px', fontFamily:'inherit', opacity:busy?0.6:1 }}>
            {busy ? 'Enrolling...' : '✓ Enrol Student'}
          </button>

          {/* Quick stats */}
          {selStudent && (
            <div style={{ marginTop:'14px', padding:'10px 12px', background:'rgba(255,255,255,0.03)', borderRadius:'10px', border:'0.5px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontSize:'11px', fontWeight:700, color:'rgba(255,255,255,0.35)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'8px' }}>
                Current Enrolments for {students.find(s=>s.id===selStudent)?.full_name}
              </div>
              {enrollments.filter(e => e.student_id === selStudent).length === 0 ? (
                <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.25)' }}>Not enrolled in any class yet.</div>
              ) : (
                enrollments.filter(e => e.student_id === selStudent).map(e => {
                  const cls = classes.find(c => c.id === e.class_id)
                  return cls ? (
                    <div key={e.id} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'5px 0', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ flex:1, fontSize:'12px', color:'rgba(255,255,255,0.7)' }}>{cls.title} — {cls.class_date}</div>
                      <button onClick={() => removeEnrollment(e.id, students.find(s=>s.id===selStudent)?.full_name, cls.title)}
                        style={{ fontSize:'10px', padding:'3px 8px', borderRadius:'6px', background:'rgba(239,68,68,0.1)', color:'#f87171', border:'none', cursor:'pointer' }}>✕</button>
                    </div>
                  ) : null
                })
              )}
            </div>
          )}
        </Panel>

        {/* ── ENROLMENT LIST ── */}
        <Panel title="All Enrolments">
          {/* Search */}
          <input
            placeholder="Search student..."
            value={filterStud}
            onChange={e => setFilterStud(e.target.value)}
            style={{ ...inp, marginBottom:'12px', padding:'8px 12px', fontSize:'13px' }}
          />

          {loading ? <Empty msg="Loading..." /> :
           enrollments.length === 0 ? <Empty msg="No enrolments yet." /> : (
            <div style={{ maxHeight:'400px', overflowY:'auto', display:'grid', gap:'4px' }}>
              {filteredStudents.map(student => {
                const stuEnrolments = enrollments.filter(e => e.student_id === student.id)
                if (stuEnrolments.length === 0) return null
                return (
                  <div key={student.id} style={{ background:'rgba(255,255,255,0.03)', borderRadius:'10px', padding:'10px 12px', border:'0.5px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px' }}>
                      <div style={{ width:'26px', height:'26px', borderRadius:'50%', background:'rgba(16,185,129,0.2)', color:'#34d399', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:800, flexShrink:0 }}>
                        {(student.full_name||'?').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'13px', fontWeight:600, color:'rgba(255,255,255,0.85)' }}>{student.full_name}</div>
                        <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.3)' }}>{student.email} · {stuEnrolments.length} class{stuEnrolments.length>1?'es':''}</div>
                      </div>
                    </div>
                    {stuEnrolments.map(e => {
                      const cls = classes.find(c => c.id === e.class_id)
                      if (!cls) return null
                      return (
                        <div key={e.id} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'4px 6px', background:'rgba(255,255,255,0.03)', borderRadius:'6px', marginBottom:'3px' }}>
                          <span style={{ fontSize:'9px', fontWeight:700, padding:'2px 6px', borderRadius:'6px', background:cls.class_date>=today?'rgba(30,144,255,0.15)':'rgba(16,185,129,0.1)', color:cls.class_date>=today?'#5aabff':'#34d399', flexShrink:0 }}>
                            {cls.class_date>=today?'Upcoming':'Done'}
                          </span>
                          <div style={{ flex:1, fontSize:'11px', color:'rgba(255,255,255,0.6)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {cls.title} — {cls.class_date}
                          </div>
                          <button onClick={() => removeEnrollment(e.id, student.full_name, cls.title)}
                            style={{ fontSize:'9px', padding:'2px 6px', borderRadius:'5px', background:'rgba(239,68,68,0.1)', color:'#f87171', border:'none', cursor:'pointer', flexShrink:0 }}>✕</button>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}
