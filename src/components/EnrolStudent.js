import React, { useEffect, useState } from 'react'
import { sendEmail } from '../emailService'
import { supabase } from '../supabaseClient'

export default function EnrolStudent() {
  const [students,    setStudents]    = useState([])
  const [courses,     setCourses]     = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [selStudent,  setSelStudent]  = useState('')
  const [selCourse,   setSelCourse]   = useState('')
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
      supabase.from('courses').select('id,title,fee,level,mode,duration_months'),
      supabase.from('enrollments').select('*'),
    ])
    setStudents(s || [])
    setCourses(c || [])
    setEnrollments(e || [])
    setLoading(false)
  }

  async function enrol() {
    setErr(''); setOk('')
    if (!selStudent || !selCourse) return setErr('Please select both a student and a course.')
    const already = enrollments.find(e => e.student_id === selStudent && e.course_id === selCourse)
    if (already) return setErr('This student is already enrolled in that course.')
    setBusy(true)
    const { error } = await supabase.from('enrollments').insert({
      student_id: selStudent,
      course_id:  selCourse,
      class_id:   null,
    })
    if (error) setErr(error.message)
    else {
      const student = students.find(s => s.id === selStudent)
      const course  = courses.find(c => c.id === selCourse)
      const course2 = courses.find(c => c.id === selCourse)
      setOk(`✓ ${student?.full_name} enrolled in "${course2?.title}"`)
      // Send enrolment confirmation email
      if (student?.email) {
        sendEmail('enrolment', student.email, {
          name: student.full_name,
          courseName: course2?.title,
          fee: course2?.fee,
        })
      }
      setSelCourse('')
      load()
    }
    setBusy(false)
    setTimeout(() => setOk(''), 4000)
  }

  async function removeEnrollment(id, studentName, courseTitle) {
    if (!window.confirm(`Remove ${studentName} from "${courseTitle}"?`)) return
    await supabase.from('enrollments').delete().eq('id', id)
    load()
  }

  const filteredStudents = students.filter(s =>
    !filterStud ||
    s.full_name?.toLowerCase().includes(filterStud.toLowerCase()) ||
    s.email?.toLowerCase().includes(filterStud.toLowerCase())
  )

  const inp = { width:'100%', background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'11px 13px', fontSize:'14px', color:'rgba(255,255,255,0.85)', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
  const lbl = { display:'block', fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.32)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'6px', marginTop:'14px' }

  return (
    <div id="uniedd-enrol" style={{ marginTop:'14px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px' }}>
        <div style={{ fontSize:'16px', fontWeight:700, color:'rgba(255,255,255,0.85)' }}>🎓 Enrol Students in Courses</div>
        <span style={{ fontSize:'10px', fontWeight:600, padding:'3px 10px', borderRadius:'20px', background:'rgba(16,185,129,0.15)', color:'#10b981' }}>
          {enrollments.filter(e => e.course_id).length} enrolments total
        </span>
      </div>

      {/* Info banner */}
      <div style={{ padding:'10px 14px', background:'rgba(30,144,255,0.07)', border:'0.5px solid rgba(30,144,255,0.18)', borderRadius:'10px', fontSize:'12px', color:'rgba(255,255,255,0.45)', lineHeight:1.7, marginBottom:'14px' }}>
        <strong style={{ color:'#5aabff' }}>Enrolment Flow:</strong>
        &nbsp; 1. Enrol student in course here &nbsp;→&nbsp;
        2. Generate payment link (Payments) &nbsp;→&nbsp;
        3. Assign classes via Sales / Teacher dashboard
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>

        {/* ── ENROL FORM ── */}
        <div style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'1.1rem 1.2rem' }}>
          <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.7)', marginBottom:'14px', paddingBottom:'8px', borderBottom:'0.5px solid rgba(255,255,255,0.06)' }}>
            + Enrol a Student in a Course
          </div>

          <label style={lbl}>Select Student</label>
          <select style={inp} value={selStudent} onChange={e => setSelStudent(e.target.value)}>
            <option value="">— Choose student —</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>
                {s.full_name}{s.email ? ` (${s.email})` : ''}
              </option>
            ))}
          </select>

          <label style={lbl}>Select Course</label>
          <select style={inp} value={selCourse} onChange={e => setSelCourse(e.target.value)}>
            <option value="">— Choose course —</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>
                {c.title}{c.fee ? ` — ₹${c.fee}/mo` : ''}{c.level ? ` · ${c.level}` : ''}
              </option>
            ))}
          </select>

          {/* Course detail preview */}
          {selCourse && (() => {
            const course = courses.find(c => c.id === selCourse)
            if (!course) return null
            return (
              <div style={{ marginTop:'10px', padding:'10px 12px', background:'rgba(255,255,255,0.03)', borderRadius:'8px', border:'0.5px solid rgba(255,255,255,0.07)', fontSize:'12px', color:'rgba(255,255,255,0.5)', lineHeight:1.8 }}>
                {course.duration_months && <div>⏱ Duration: <strong style={{ color:'rgba(255,255,255,0.7)' }}>{course.duration_months} months</strong></div>}
                {course.mode          && <div>📍 Mode: <strong style={{ color:'rgba(255,255,255,0.7)' }}>{course.mode}</strong></div>}
                {course.fee           && <div>💰 Fee: <strong style={{ color:'#10b981' }}>₹{course.fee.toLocaleString('en-IN')}/month</strong></div>}
              </div>
            )
          })()}

          {err && <div style={{ marginTop:'10px', padding:'8px 12px', background:'rgba(220,60,60,0.1)', border:'0.5px solid rgba(220,60,60,0.3)', borderRadius:'8px', fontSize:'13px', color:'#f09595' }}>{err}</div>}
          {ok  && <div style={{ marginTop:'10px', padding:'8px 12px', background:'rgba(16,185,129,0.1)', border:'0.5px solid rgba(16,185,129,0.3)', borderRadius:'8px', fontSize:'13px', color:'#34d399' }}>{ok}</div>}

          <button onClick={enrol} disabled={busy} style={{ width:'100%', padding:'12px', background:'#10b981', color:'#fff', fontSize:'14px', fontWeight:700, border:'none', borderRadius:'10px', cursor:'pointer', marginTop:'14px', fontFamily:'inherit', opacity:busy?0.6:1 }}>
            {busy ? 'Enrolling...' : '✓ Enrol in Course'}
          </button>

          {/* Student's current enrolments */}
          {selStudent && (
            <div style={{ marginTop:'14px', padding:'10px 12px', background:'rgba(255,255,255,0.03)', borderRadius:'10px', border:'0.5px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontSize:'11px', fontWeight:700, color:'rgba(255,255,255,0.35)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'8px' }}>
                {students.find(s=>s.id===selStudent)?.full_name}'s Enrolments
              </div>
              {enrollments.filter(e => e.student_id === selStudent && e.course_id).length === 0 ? (
                <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.25)' }}>Not enrolled in any course yet.</div>
              ) : (
                enrollments.filter(e => e.student_id === selStudent && e.course_id).map(e => {
                  const course = courses.find(c => c.id === e.course_id)
                  return course ? (
                    <div key={e.id} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'5px 0', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ flex:1, fontSize:'12px', color:'rgba(255,255,255,0.7)' }}>
                        🎓 {course.title} {course.fee && <span style={{ color:'#10b981' }}>· ₹{course.fee}/mo</span>}
                      </div>
                      <button onClick={() => removeEnrollment(e.id, students.find(s=>s.id===selStudent)?.full_name, course.title)}
                        style={{ fontSize:'10px', padding:'3px 8px', borderRadius:'6px', background:'rgba(239,68,68,0.1)', color:'#f87171', border:'none', cursor:'pointer' }}>✕</button>
                    </div>
                  ) : null
                })
              )}
            </div>
          )}
        </div>

        {/* ── ALL ENROLMENTS ── */}
        <div style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'1.1rem 1.2rem' }}>
          <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.7)', marginBottom:'12px', paddingBottom:'8px', borderBottom:'0.5px solid rgba(255,255,255,0.06)' }}>
            All Enrolments
          </div>

          <input placeholder="Search student..." value={filterStud} onChange={e => setFilterStud(e.target.value)}
            style={{ ...inp, marginBottom:'12px', padding:'8px 12px', fontSize:'13px' }} />

          {loading ? (
            <div style={{ textAlign:'center', padding:'2rem', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>Loading...</div>
          ) : enrollments.filter(e => e.course_id).length === 0 ? (
            <div style={{ textAlign:'center', padding:'2rem', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>No enrolments yet.</div>
          ) : (
            <div style={{ maxHeight:'380px', overflowY:'auto', display:'grid', gap:'6px' }}>
              {filteredStudents.map(student => {
                const stuEnrolments = enrollments.filter(e => e.student_id === student.id && e.course_id)
                if (stuEnrolments.length === 0) return null
                return (
                  <div key={student.id} style={{ background:'rgba(255,255,255,0.03)', borderRadius:'10px', padding:'10px 12px', border:'0.5px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
                      <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:'rgba(16,185,129,0.2)', color:'#34d399', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:800, flexShrink:0 }}>
                        {(student.full_name||'?').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'13px', fontWeight:600, color:'rgba(255,255,255,0.85)' }}>{student.full_name}</div>
                        <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.3)' }}>{student.email} · {stuEnrolments.length} course{stuEnrolments.length>1?'s':''}</div>
                      </div>
                    </div>
                    {stuEnrolments.map(e => {
                      const course = courses.find(c => c.id === e.course_id)
                      if (!course) return null
                      return (
                        <div key={e.id} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'5px 8px', background:'rgba(16,185,129,0.06)', borderRadius:'7px', marginBottom:'3px', border:'0.5px solid rgba(16,185,129,0.15)' }}>
                          <span style={{ fontSize:'13px' }}>🎓</span>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.75)', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{course.title}</div>
                            {course.fee && <div style={{ fontSize:'10px', color:'#10b981' }}>₹{course.fee.toLocaleString('en-IN')}/mo</div>}
                          </div>
                          <button onClick={() => removeEnrollment(e.id, student.full_name, course.title)}
                            style={{ fontSize:'9px', padding:'3px 7px', borderRadius:'5px', background:'rgba(239,68,68,0.1)', color:'#f87171', border:'none', cursor:'pointer', flexShrink:0 }}>✕</button>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
