import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Panel, Empty, Err, Ok, Btn } from './Layout'

/**
 * AttendanceManager — for teacher dashboard
 * - Shows all teacher's classes
 * - Auto-marks attendance if student joined Zoom (zoom_joined flag in enrollments)
 * - Teacher can manually mark Present / Absent per student
 */
export default function AttendanceManager({ profile, teacherClasses = [] }) {
  const [selectedClass, setSelectedClass]   = useState(null)
  const [students,      setStudents]        = useState([])  // students in selected class
  const [attendance,    setAttendance]      = useState({})  // { student_id: 'present'|'absent' }
  const [loading,       setLoading]         = useState(false)
  const [saving,        setSaving]          = useState(false)
  const [err,           setErr]             = useState('')
  const [ok,            setOk]             = useState('')

  const today = new Date().toISOString().slice(0,10)
  // Only show classes that are today or past (can't mark future attendance)
  const markableClasses = teacherClasses.filter(c => c.class_date <= today)

  useEffect(() => {
    if (selectedClass) loadClassAttendance(selectedClass)
  }, [selectedClass])

  async function loadClassAttendance(cls) {
    setLoading(true); setErr(''); setOk('')
    try {
      // 1. Get enrollments for this class → gives us student list + zoom_joined flag
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('student_id, zoom_joined')
        .eq('class_id', cls.id)

      if (!enrollments || enrollments.length === 0) {
        setStudents([]); setAttendance({}); setLoading(false); return
      }

      const studentIds = enrollments.map(e => e.student_id)

      // 2. Get student profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, student_id')
        .in('id', studentIds)

      // 3. Get existing attendance records for this class
      const { data: existing } = await supabase
        .from('attendance')
        .select('student_id, status')
        .eq('class_id', cls.id)

      // 4. Build attendance map — existing DB record → or auto-detect from zoom_joined
      const attMap = {}
      const existingMap = {}
      ;(existing || []).forEach(a => { existingMap[a.student_id] = a.status })

      enrollments.forEach(e => {
        if (existingMap[e.student_id]) {
          // Already marked in DB
          attMap[e.student_id] = existingMap[e.student_id]
        } else if (e.zoom_joined === true) {
          // Auto-mark present if they joined Zoom
          attMap[e.student_id] = 'present'
        } else if (e.zoom_joined === false) {
          // Auto-mark absent if explicitly not joined
          attMap[e.student_id] = 'absent'
        }
        // else: undefined → teacher needs to mark
      })

      setStudents(profiles || [])
      setAttendance(attMap)
    } catch (ex) {
      setErr(ex.message)
    }
    setLoading(false)
  }

  function mark(studentId, status) {
    setAttendance(prev => ({ ...prev, [studentId]: status }))
  }

  async function saveAttendance() {
    if (!selectedClass) return
    setSaving(true); setErr(''); setOk('')
    try {
      // Upsert attendance records for all students
      const records = students.map(s => ({
        class_id:   selectedClass.id,
        student_id: s.id,
        class_date: selectedClass.class_date,
        teacher_id: profile.id,
        status:     attendance[s.id] || 'absent',
      }))

      const { error } = await supabase
        .from('attendance')
        .upsert(records, { onConflict: 'class_id,student_id' })

      if (error) throw error

      // Notify absent students
      const absentIds = students.filter(s => attendance[s.id] === 'absent').map(s => s.id)
      if (absentIds.length > 0) {
        const notifs = absentIds.map(sid => ({
          user_id:  sid,
          type:     'attendance',
          title:    '❌ Marked Absent',
          message:  `You were marked absent for "${selectedClass.title}" on ${selectedClass.class_date}.`,
          is_read:  false,
        }))
        await supabase.from('notifications').insert(notifs)
      }

      const presentCount = students.filter(s => attendance[s.id] === 'present').length
      setOk(`✓ Attendance saved! ${presentCount}/${students.length} present.`)
    } catch (ex) {
      setErr(ex.message)
    }
    setSaving(false)
  }

  const present = students.filter(s => attendance[s.id] === 'present').length
  const absent  = students.filter(s => attendance[s.id] === 'absent').length
  const unmarked = students.filter(s => !attendance[s.id]).length

  return (
    <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:'14px', alignItems:'start' }}>

      {/* Left — class selector */}
      <Panel title="Select Class">
        {markableClasses.length === 0 ? (
          <Empty msg="No classes to mark attendance for yet." />
        ) : (
          <div style={{ display:'grid', gap:'5px' }}>
            {markableClasses.map(cls => {
              const active = selectedClass?.id === cls.id
              return (
                <button
                  key={cls.id}
                  onClick={() => setSelectedClass(cls)}
                  style={{
                    textAlign:'left', padding:'10px 12px', borderRadius:'10px',
                    background: active ? 'rgba(30,144,255,0.15)' : 'rgba(255,255,255,0.03)',
                    border: `0.5px solid ${active ? 'rgba(30,144,255,0.4)' : 'rgba(255,255,255,0.07)'}`,
                    cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s',
                  }}
                >
                  <div style={{ fontSize:'12px', fontWeight:600, color: active ? '#5aabff' : 'rgba(255,255,255,0.75)' }}>
                    {cls.is_emergency && '🚨 '}{cls.title}
                  </div>
                  <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.3)', marginTop:'2px' }}>
                    {cls.class_date} {cls.start_time && `· ${cls.start_time}`}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </Panel>

      {/* Right — attendance sheet */}
      <Panel title={selectedClass ? `Attendance — ${selectedClass.title}` : 'Attendance Sheet'}>
        {!selectedClass ? (
          <div style={{ textAlign:'center', padding:'3rem 1rem' }}>
            <div style={{ fontSize:'32px', marginBottom:'10px' }}>✅</div>
            <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.3)' }}>Select a class on the left to mark attendance.</div>
          </div>
        ) : loading ? (
          <Empty msg="Loading students..." />
        ) : students.length === 0 ? (
          <Empty msg="No students enrolled in this class." />
        ) : (
          <>
            {/* Stats bar */}
            <div style={{ display:'flex', gap:'8px', marginBottom:'14px', flexWrap:'wrap' }}>
              {[
                { label:'Present', count:present,  color:'#10b981', bg:'rgba(16,185,129,0.12)' },
                { label:'Absent',  count:absent,   color:'#f87171', bg:'rgba(239,68,68,0.12)'  },
                { label:'Unmarked',count:unmarked, color:'#f4a335', bg:'rgba(244,163,53,0.12)' },
              ].map(item => (
                <div key={item.label} style={{ padding:'6px 14px', borderRadius:'20px', background:item.bg, fontSize:'12px', fontWeight:700, color:item.color }}>
                  {item.label}: {item.count}
                </div>
              ))}
              <div style={{ marginLeft:'auto', fontSize:'11px', color:'rgba(255,255,255,0.2)', alignSelf:'center' }}>
                🤖 Auto-detected from Zoom join data
              </div>
            </div>

            {/* Student list */}
            <div style={{ display:'grid', gap:'6px', marginBottom:'14px' }}>
              {students.map(s => {
                const status = attendance[s.id]
                return (
                  <div key={s.id} style={{
                    display:'flex', alignItems:'center', gap:'12px',
                    padding:'10px 12px', borderRadius:'10px',
                    background: status === 'present' ? 'rgba(16,185,129,0.07)' : status === 'absent' ? 'rgba(239,68,68,0.07)' : 'rgba(255,255,255,0.03)',
                    border: `0.5px solid ${status === 'present' ? 'rgba(16,185,129,0.25)' : status === 'absent' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)'}`,
                    transition:'all 0.15s',
                  }}>
                    {/* Avatar */}
                    <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:'rgba(30,144,255,0.15)', color:'#5aabff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:800, flexShrink:0 }}>
                      {(s.full_name || s.email || '?').charAt(0).toUpperCase()}
                    </div>

                    {/* Name */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.85)', fontWeight:600 }}>{s.full_name || '—'}</div>
                      <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.28)' }}>{s.email} {s.student_id && `· ${s.student_id}`}</div>
                    </div>

                    {/* Status badge */}
                    {status && (
                      <span style={{
                        fontSize:'9px', fontWeight:700, padding:'2px 8px', borderRadius:'10px', flexShrink:0,
                        background: status === 'present' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        color: status === 'present' ? '#34d399' : '#f87171',
                        textTransform:'uppercase',
                      }}>
                        {status === 'present' ? '✓ Present' : '✗ Absent'}
                      </span>
                    )}

                    {/* Buttons */}
                    <div style={{ display:'flex', gap:'5px', flexShrink:0 }}>
                      <button
                        onClick={() => mark(s.id, 'present')}
                        style={{
                          padding:'5px 12px', borderRadius:'7px', fontSize:'11px', fontWeight:700,
                          cursor:'pointer', fontFamily:'inherit', border:'none',
                          background: status === 'present' ? '#10b981' : 'rgba(16,185,129,0.1)',
                          color: status === 'present' ? '#fff' : '#34d399',
                          transition:'all 0.15s',
                        }}
                      >✓ Present</button>
                      <button
                        onClick={() => mark(s.id, 'absent')}
                        style={{
                          padding:'5px 12px', borderRadius:'7px', fontSize:'11px', fontWeight:700,
                          cursor:'pointer', fontFamily:'inherit', border:'none',
                          background: status === 'absent' ? '#dc2626' : 'rgba(239,68,68,0.1)',
                          color: status === 'absent' ? '#fff' : '#f87171',
                          transition:'all 0.15s',
                        }}
                      >✗ Absent</button>
                    </div>
                  </div>
                )
              })}
            </div>

            <Err msg={err} />
            <Ok  msg={ok}  />

            <Btn busy={saving} onClick={saveAttendance} style={{ marginTop:'0' }}>
              {saving ? 'Saving...' : '💾 Save Attendance'}
            </Btn>
          </>
        )}
      </Panel>
    </div>
  )
}
