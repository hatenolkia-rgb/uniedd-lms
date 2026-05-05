import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

// Shared attendance component used by Teacher (mark) and Student (view history)
export default function Attendance({ profile }) {
  const isTeacher = profile.role === 'teacher'
  const isStudent = profile.role === 'student'
  const [classes,    setClasses]    = useState([])
  const [records,    setRecords]    = useState([])   // attendance rows
  const [students,   setStudents]   = useState([])
  const [selected,   setSelected]   = useState(null) // selected class id (teacher view)
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [ok,         setOk]         = useState('')

  useEffect(() => { load() }, [profile.id])

  async function load() {
    setLoading(true)
    if (isTeacher) {
      const [{ data: cls }, { data: att }, { data: studs }] = await Promise.all([
        supabase.from('classes').select('*').eq('teacher_id', profile.id).order('class_date', { ascending: false }).limit(20),
        supabase.from('attendance').select('*').in('class_id', []),   // will reload per class
        supabase.from('profiles').select('id, full_name, email').eq('role', 'student'),
      ])
      setClasses(cls || [])
      setStudents(studs || [])
    } else if (isStudent) {
      const [{ data: cls }, { data: att }] = await Promise.all([
        supabase.from('classes').select('*').order('class_date', { ascending: false }).limit(30),
        supabase.from('attendance').select('*').eq('student_id', profile.id),
      ])
      setClasses(cls || [])
      setRecords(att || [])
    }
    setLoading(false)
  }

  async function loadAttendanceForClass(classId) {
    const { data } = await supabase.from('attendance').select('*').eq('class_id', classId)
    setRecords(data || [])
  }

  async function selectClass(cls) {
    setSelected(cls)
    await loadAttendanceForClass(cls.id)
  }

  async function markAttendance(studentId, status) {
    setSaving(true)
    const existing = records.find(r => r.student_id === studentId && r.class_id === selected.id)
    if (existing) {
      await supabase.from('attendance').update({ status }).eq('id', existing.id)
    } else {
      await supabase.from('attendance').insert({
        class_id:   selected.id,
        student_id: studentId,
        teacher_id: profile.id,
        status,
        class_date: selected.class_date,
      })
    }
    await loadAttendanceForClass(selected.id)
    setSaving(false)
    setOk('Saved!')
    setTimeout(() => setOk(''), 2000)
  }

  async function markAllPresent() {
    setSaving(true)
    const ops = students.map(s => {
      const existing = records.find(r => r.student_id === s.id && r.class_id === selected.id)
      if (existing) return supabase.from('attendance').update({ status:'present' }).eq('id', existing.id)
      return supabase.from('attendance').insert({ class_id:selected.id, student_id:s.id, teacher_id:profile.id, status:'present', class_date:selected.class_date })
    })
    await Promise.all(ops)
    await loadAttendanceForClass(selected.id)
    setSaving(false)
    setOk('All marked present!')
    setTimeout(() => setOk(''), 2000)
  }

  function getStatus(studentId) {
    return records.find(r => r.student_id === studentId && r.class_id === selected?.id)?.status || null
  }

  const btnStyle = (active, color) => ({
    fontSize:'10px', fontWeight:700, padding:'4px 10px', borderRadius:'6px', border:'none', cursor:'pointer', fontFamily:'inherit',
    background: active ? `rgba(${color},0.25)` : 'rgba(255,255,255,0.06)',
    color:      active ? `rgb(${color})`       : 'rgba(255,255,255,0.3)',
    transition:'all 0.15s',
  })

  // ── TEACHER VIEW ─────────────────────────────────────────────
  if (isTeacher) {
    const presentCount = records.filter(r => r.status === 'present').length
    const absentCount  = records.filter(r => r.status === 'absent').length

    return (
      <div style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'1rem 1.1rem', marginTop:'14px' }}>
        <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.7)', marginBottom:'14px', paddingBottom:'8px', borderBottom:'0.5px solid rgba(255,255,255,0.06)' }}>
          ✅ Mark Attendance
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:'2rem', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>Loading...</div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:'14px' }}>
            {/* Class list */}
            <div>
              <div style={{ fontSize:'11px', fontWeight:700, color:'rgba(255,255,255,0.3)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'8px' }}>Select Class</div>
              {classes.length === 0 ? (
                <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.2)' }}>No classes yet.</div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                  {classes.map(cls => (
                    <button key={cls.id} onClick={() => selectClass(cls)} style={{ padding:'8px 10px', borderRadius:'8px', border:'none', cursor:'pointer', fontFamily:'inherit', textAlign:'left', background:selected?.id===cls.id?'rgba(30,144,255,0.15)':'rgba(255,255,255,0.04)', color:selected?.id===cls.id?'#5aabff':'rgba(255,255,255,0.6)', fontSize:'12px', fontWeight:selected?.id===cls.id?600:400, borderLeft:selected?.id===cls.id?'2px solid #1e90ff':'2px solid transparent' }}>
                      <div style={{ fontWeight:600 }}>{cls.title}</div>
                      <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.3)', marginTop:'2px' }}>{cls.class_date} {cls.start_time && `· ${cls.start_time}`}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Attendance panel */}
            <div>
              {!selected ? (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'120px', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>← Select a class to mark attendance</div>
              ) : (
                <>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px', flexWrap:'wrap', gap:'8px' }}>
                    <div>
                      <div style={{ fontSize:'14px', fontWeight:700, color:'rgba(255,255,255,0.85)' }}>{selected.title}</div>
                      <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)', marginTop:'2px' }}>{selected.class_date} {selected.batch && `· Batch: ${selected.batch}`}</div>
                    </div>
                    <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                      {ok && <span style={{ fontSize:'11px', color:'#34d399' }}>{ok}</span>}
                      <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.4)' }}>
                        ✓ {presentCount} present · ✗ {absentCount} absent
                      </div>
                      <button onClick={markAllPresent} disabled={saving || students.length===0} style={{ fontSize:'11px', fontWeight:700, padding:'5px 12px', borderRadius:'8px', background:'rgba(16,185,129,0.15)', color:'#10b981', border:'0.5px solid rgba(16,185,129,0.25)', cursor:'pointer', fontFamily:'inherit' }}>
                        Mark All Present
                      </button>
                    </div>
                  </div>

                  {students.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'1.5rem', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>No students enrolled yet.</div>
                  ) : (
                    <div style={{ display:'grid', gap:'4px' }}>
                      {students.map(s => {
                        const status = getStatus(s.id)
                        return (
                          <div key={s.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 10px', background:'rgba(255,255,255,0.03)', borderRadius:'8px', border:'0.5px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ width:'26px', height:'26px', borderRadius:'50%', background:'rgba(139,92,246,0.2)', color:'#a78bfa', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:800, flexShrink:0 }}>
                              {(s.full_name||s.email||'?').charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.8)', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.full_name || s.email}</div>
                              <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.25)' }}>{s.email}</div>
                            </div>
                            <div style={{ display:'flex', gap:'4px' }}>
                              <button onClick={() => markAttendance(s.id,'present')} disabled={saving} style={btnStyle(status==='present','16,185,129')}>✓ P</button>
                              <button onClick={() => markAttendance(s.id,'absent')}  disabled={saving} style={btnStyle(status==='absent', '239,68,68')}>✗ A</button>
                              <button onClick={() => markAttendance(s.id,'late')}    disabled={saving} style={btnStyle(status==='late',   '232,124,30')}>~ L</button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── STUDENT VIEW ─────────────────────────────────────────────
  if (isStudent) {
    const presentCount = records.filter(r => r.status === 'present').length
    const absentCount  = records.filter(r => r.status === 'absent').length
    const lateCount    = records.filter(r => r.status === 'late').length
    const totalMarked  = records.length
    const pct = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : null

    return (
      <div style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'1rem 1.1rem', marginTop:'14px' }}>
        <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.7)', marginBottom:'14px', paddingBottom:'8px', borderBottom:'0.5px solid rgba(255,255,255,0.06)' }}>
          📊 Attendance History
        </div>

        {/* Summary pills */}
        <div style={{ display:'flex', gap:'10px', marginBottom:'14px', flexWrap:'wrap' }}>
          {[
            { label:'Present', count:presentCount, color:'#10b981', bg:'rgba(16,185,129,0.12)' },
            { label:'Absent',  count:absentCount,  color:'#f87171', bg:'rgba(239,68,68,0.12)'  },
            { label:'Late',    count:lateCount,    color:'#f4a335', bg:'rgba(232,124,30,0.12)' },
          ].map(item => (
            <div key={item.label} style={{ padding:'6px 14px', borderRadius:'20px', background:item.bg, fontSize:'12px', fontWeight:700, color:item.color }}>
              {item.label}: {item.count}
            </div>
          ))}
          {pct !== null && (
            <div style={{ padding:'6px 14px', borderRadius:'20px', background:'rgba(30,144,255,0.1)', fontSize:'12px', fontWeight:700, color:'#5aabff' }}>
              {pct}% attendance
            </div>
          )}
        </div>

        {/* Progress bar */}
        {totalMarked > 0 && (
          <div style={{ marginBottom:'14px' }}>
            <div style={{ height:'6px', background:'rgba(255,255,255,0.06)', borderRadius:'3px', overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pct}%`, background: pct>=75?'#10b981':pct>=50?'#f4a335':'#f87171', borderRadius:'3px', transition:'width 0.5s ease' }} />
            </div>
            <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.25)', marginTop:'4px' }}>
              {pct >= 75 ? '✓ Good attendance' : pct >= 50 ? '⚠ Attendance needs improvement' : '✗ Low attendance — please catch up'}
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign:'center', padding:'2rem', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>Loading...</div>
        ) : records.length === 0 ? (
          <div style={{ textAlign:'center', padding:'2rem', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>No attendance recorded yet.</div>
        ) : (
          <div style={{ display:'grid', gap:'4px' }}>
            {classes
              .filter(c => records.some(r => r.class_id === c.id))
              .map(c => {
                const rec = records.find(r => r.class_id === c.id)
                const statusColor = { present:'#10b981', absent:'#f87171', late:'#f4a335' }
                const statusIcon  = { present:'✓', absent:'✗', late:'~' }
                const s = rec?.status || 'unmarked'
                return (
                  <div key={c.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 10px', background:'rgba(255,255,255,0.03)', borderRadius:'8px', borderLeft:`3px solid ${statusColor[s]||'rgba(255,255,255,0.1)'}` }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.8)', fontWeight:500 }}>{c.title}</div>
                      <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'1px' }}>{c.class_date} {c.start_time && `· ${c.start_time}`}</div>
                    </div>
                    <span style={{ fontSize:'11px', fontWeight:700, padding:'3px 10px', borderRadius:'10px', background:`${statusColor[s]||'#888'}22`, color:statusColor[s]||'#888', flexShrink:0 }}>
                      {statusIcon[s]||'?'} {s.charAt(0).toUpperCase()+s.slice(1)}
                    </span>
                  </div>
                )
              })}
          </div>
        )}
      </div>
    )
  }

  return null
}
