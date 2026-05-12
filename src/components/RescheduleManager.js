import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { sendEmail } from '../emailService'

const STATUS_STYLE = {
  pending:   { bg:'rgba(244,163,53,0.12)',  color:'#f4a335', label:'Pending'   },
  approved:  { bg:'rgba(16,185,129,0.12)',  color:'#34d399', label:'Approved'  },
  rejected:  { bg:'rgba(239,68,68,0.12)',   color:'#f87171', label:'Rejected'  },
  cancelled: { bg:'rgba(100,116,139,0.12)', color:'#94a3b8', label:'Cancelled' },
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' })
}
function fmtTime(t) {
  if (!t) return '—'
  return new Date('2000-01-01T' + t).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true })
}

// ── Request Reschedule Modal (Student) ───────────────────────
function RequestRescheduleModal({ cls, profile, onClose, onSave }) {
  const [proposedDate, setProposedDate] = useState('')
  const [proposedTime, setProposedTime] = useState(cls.start_time || '')
  const [reason,       setReason]       = useState('')
  const [saving,       setSaving]       = useState(false)
  const [err,          setErr]          = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!proposedDate) return setErr('Please select a proposed date.')
    if (!reason.trim()) return setErr('Please give a reason.')
    setSaving(true); setErr('')
    const { error } = await supabase.from('reschedule_requests').insert({
      class_id:       cls.id,
      class_title:    cls.title,
      original_date:  cls.class_date,
      original_time:  cls.start_time || null,
      requested_by:   profile.id,
      requester_name: profile.full_name,
      requester_role: 'student',
      proposed_date:  proposedDate,
      proposed_time:  proposedTime || null,
      reason:         reason.trim(),
      status:         'pending',
    })
    if (error) { setErr(error.message); setSaving(false); return }

    // Notify teacher via email if we can find them
    if (cls.teacher_id) {
      const { data: teacher } = await supabase.from('profiles').select('email,full_name').eq('id', cls.teacher_id).single()
      if (teacher?.email) {
        sendEmail('class_scheduled', teacher.email, {
          name:        teacher.full_name,
          classTitle:  `Reschedule Request: ${cls.title}`,
          classDate:   `${fmtDate(cls.class_date)} → ${fmtDate(proposedDate)}`,
          startTime:   proposedTime || null,
          teacherName: profile.full_name,
          zoomLink:    null,
        })
      }
    }
    onSave()
  }

  const inp = { width:'100%', background:'#1a2535', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'10px 13px', fontSize:'13px', color:'rgba(255,255,255,0.85)', outline:'none', fontFamily:'inherit', colorScheme:'dark', boxSizing:'border-box' }
  const lbl = { display:'block', fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'5px', marginTop:'12px' }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
      <div style={{ background:'#0f1923', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'16px', padding:'24px', width:'100%', maxWidth:'460px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
          <div style={{ fontSize:'15px', fontWeight:800, color:'#fff' }}>📅 Request Reschedule</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.4)', fontSize:'20px', cursor:'pointer' }}>×</button>
        </div>

        {/* Current class info */}
        <div style={{ padding:'12px', background:'rgba(255,255,255,0.04)', borderRadius:'10px', marginBottom:'4px' }}>
          <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.8)', marginBottom:'4px' }}>{cls.title}</div>
          <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.4)' }}>
            📅 {fmtDate(cls.class_date)} {cls.start_time && `· ⏰ ${fmtTime(cls.start_time)}`}
          </div>
        </div>

        <form onSubmit={submit}>
          <label style={lbl}>Proposed New Date *</label>
          <input style={inp} type="date" value={proposedDate} onChange={e=>setProposedDate(e.target.value)}
            min={new Date().toISOString().slice(0,10)} required />

          <label style={lbl}>Proposed New Time</label>
          <input style={inp} type="time" value={proposedTime} onChange={e=>setProposedTime(e.target.value)} />

          <label style={lbl}>Reason for Reschedule *</label>
          <textarea style={{ ...inp, minHeight:'80px', resize:'vertical' }} value={reason}
            onChange={e=>setReason(e.target.value)} placeholder="e.g. I have an exam on this day..." required />

          {err && <div style={{ marginTop:'8px', padding:'8px 12px', background:'rgba(239,68,68,0.1)', color:'#f87171', borderRadius:'8px', fontSize:'12px' }}>{err}</div>}

          <div style={{ display:'flex', gap:'8px', marginTop:'16px' }}>
            <button type="submit" disabled={saving} style={{ flex:1, padding:'11px', background:'linear-gradient(135deg,#1e90ff,#0ea5e9)', color:'#fff', fontSize:'13px', fontWeight:800, border:'none', borderRadius:'10px', cursor:'pointer', fontFamily:'inherit' }}>
              {saving ? 'Submitting...' : '📤 Submit Request'}
            </button>
            <button type="button" onClick={onClose} style={{ padding:'11px 18px', background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.5)', border:'none', borderRadius:'10px', cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Teacher: Cancel Class Modal ──────────────────────────────
function CancelClassModal({ cls, profile, onClose, onSave }) {
  const [reason,  setReason]  = useState('')
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!reason.trim()) return setErr('Please give a reason.')
    setSaving(true)
    const { error } = await supabase.from('classes').update({
      is_cancelled:  true,
      cancelled_by:  profile.id,
      cancelled_at:  new Date().toISOString(),
      cancel_reason: reason.trim(),
    }).eq('id', cls.id)
    if (error) { setErr(error.message); setSaving(false); return }

    // Notify enrolled students
    const { data: enrollments } = await supabase
      .from('enrollments').select('student_id, profiles:student_id(email,full_name,timezone)')
      .eq('class_id', cls.id)
    for (const e of (enrollments || [])) {
      if (e.profiles?.email) {
        sendEmail('class_scheduled', e.profiles.email, {
          name:        e.profiles.full_name,
          classTitle:  `CANCELLED: ${cls.title}`,
          classDate:   fmtDate(cls.class_date),
          startTime:   cls.start_time || null,
          teacherName: profile.full_name,
          zoomLink:    null,
          studentTZ:   e.profiles.timezone,
        })
      }
    }
    onSave()
  }

  const inp = { width:'100%', background:'#1a2535', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'10px 13px', fontSize:'13px', color:'rgba(255,255,255,0.85)', outline:'none', fontFamily:'inherit', colorScheme:'dark', boxSizing:'border-box' }
  const lbl = { display:'block', fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'5px', marginTop:'12px' }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
      <div style={{ background:'#0f1923', border:'0.5px solid rgba(239,68,68,0.3)', borderRadius:'16px', padding:'24px', width:'100%', maxWidth:'420px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
          <div style={{ fontSize:'15px', fontWeight:800, color:'#f87171' }}>🚫 Cancel Class</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.4)', fontSize:'20px', cursor:'pointer' }}>×</button>
        </div>
        <div style={{ padding:'12px', background:'rgba(239,68,68,0.08)', borderRadius:'10px', marginBottom:'12px', border:'0.5px solid rgba(239,68,68,0.2)' }}>
          <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.8)' }}>{cls.title}</div>
          <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.4)', marginTop:'3px' }}>{fmtDate(cls.class_date)} {cls.start_time && `· ${fmtTime(cls.start_time)}`}</div>
        </div>
        <form onSubmit={submit}>
          <label style={lbl}>Reason for Cancellation *</label>
          <textarea style={{ ...inp, minHeight:'80px', resize:'vertical' }} value={reason} onChange={e=>setReason(e.target.value)} placeholder="e.g. Teacher unwell, emergency, holiday..." required />
          {err && <div style={{ marginTop:'8px', padding:'8px 12px', background:'rgba(239,68,68,0.1)', color:'#f87171', borderRadius:'8px', fontSize:'12px' }}>{err}</div>}
          <div style={{ display:'flex', gap:'8px', marginTop:'16px' }}>
            <button type="submit" disabled={saving} style={{ flex:1, padding:'11px', background:'rgba(239,68,68,0.8)', color:'#fff', fontSize:'13px', fontWeight:800, border:'none', borderRadius:'10px', cursor:'pointer', fontFamily:'inherit' }}>
              {saving ? 'Cancelling...' : '🚫 Confirm Cancel'}
            </button>
            <button type="button" onClick={onClose} style={{ padding:'11px 18px', background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.5)', border:'none', borderRadius:'10px', cursor:'pointer', fontFamily:'inherit' }}>Back</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Teacher: Reschedule Class Directly ───────────────────────
function TeacherRescheduleModal({ cls, profile, onClose, onSave }) {
  const [newDate, setNewDate] = useState(cls.class_date || '')
  const [newTime, setNewTime] = useState(cls.start_time || '')
  const [reason,  setReason]  = useState('')
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!newDate) return setErr('Select new date.')
    setSaving(true)
    const { error } = await supabase.from('classes').update({
      class_date:             newDate,
      start_time:             newTime || null,
      rescheduled_from_date:  cls.class_date,
      rescheduled_from_time:  cls.start_time || null,
    }).eq('id', cls.id)
    if (error) { setErr(error.message); setSaving(false); return }

    // Update events table too
    await supabase.from('events').update({
      day:   new Date(newDate + 'T00:00:00').getDate(),
      month: new Date(newDate + 'T00:00:00').getMonth() + 1,
      year:  new Date(newDate + 'T00:00:00').getFullYear(),
      time:  newTime || null,
    }).eq('title', cls.title)

    // Notify students
    const { data: enrollments } = await supabase
      .from('enrollments').select('student_id, profiles:student_id(email,full_name,timezone)')
      .eq('class_id', cls.id)
    for (const enr of (enrollments || [])) {
      if (enr.profiles?.email) {
        sendEmail('class_scheduled', enr.profiles.email, {
          name:        enr.profiles.full_name,
          classTitle:  `RESCHEDULED: ${cls.title}`,
          classDate:   newDate,
          startTime:   newTime || null,
          teacherName: profile.full_name,
          zoomLink:    cls.meet_link || null,
          studentTZ:   enr.profiles.timezone,
        })
      }
    }
    onSave()
  }

  const inp = { width:'100%', background:'#1a2535', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'10px 13px', fontSize:'13px', color:'rgba(255,255,255,0.85)', outline:'none', fontFamily:'inherit', colorScheme:'dark', boxSizing:'border-box' }
  const lbl = { display:'block', fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'5px', marginTop:'12px' }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
      <div style={{ background:'#0f1923', border:'0.5px solid rgba(139,92,246,0.3)', borderRadius:'16px', padding:'24px', width:'100%', maxWidth:'440px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
          <div style={{ fontSize:'15px', fontWeight:800, color:'#a78bfa' }}>📅 Reschedule Class</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.4)', fontSize:'20px', cursor:'pointer' }}>×</button>
        </div>
        <div style={{ padding:'12px', background:'rgba(139,92,246,0.08)', borderRadius:'10px', marginBottom:'4px', border:'0.5px solid rgba(139,92,246,0.2)' }}>
          <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.8)' }}>{cls.title}</div>
          <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.4)', marginTop:'3px' }}>Currently: {fmtDate(cls.class_date)} {cls.start_time && `· ${fmtTime(cls.start_time)}`}</div>
        </div>
        <form onSubmit={submit}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            <div>
              <label style={lbl}>New Date *</label>
              <input style={inp} type="date" value={newDate} onChange={e=>setNewDate(e.target.value)} required />
            </div>
            <div>
              <label style={lbl}>New Time</label>
              <input style={inp} type="time" value={newTime} onChange={e=>setNewTime(e.target.value)} />
            </div>
          </div>
          <label style={lbl}>Reason (optional)</label>
          <input style={inp} type="text" value={reason} onChange={e=>setReason(e.target.value)} placeholder="e.g. Holiday, personal adjustment..." />
          {err && <div style={{ marginTop:'8px', padding:'8px 12px', background:'rgba(239,68,68,0.1)', color:'#f87171', borderRadius:'8px', fontSize:'12px' }}>{err}</div>}
          <div style={{ display:'flex', gap:'8px', marginTop:'16px' }}>
            <button type="submit" disabled={saving} style={{ flex:1, padding:'11px', background:'linear-gradient(135deg,#8b5cf6,#6d28d9)', color:'#fff', fontSize:'13px', fontWeight:800, border:'none', borderRadius:'10px', cursor:'pointer', fontFamily:'inherit' }}>
              {saving ? 'Saving...' : '✓ Confirm Reschedule'}
            </button>
            <button type="button" onClick={onClose} style={{ padding:'11px 18px', background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.5)', border:'none', borderRadius:'10px', cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main RescheduleManager Component ────────────────────────
export default function RescheduleManager({ profile }) {
  const [classes,   setClasses]   = useState([])
  const [requests,  setRequests]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState('classes')
  const [search,    setSearch]    = useState('')
  const [modal,     setModal]     = useState(null) // {type:'cancel'|'reschedule'|'request', cls}
  const [ok,        setOk]        = useState('')

  const isTeacher = profile.role === 'teacher'
  const isStudent = profile.role === 'student'
  const isAdmin   = profile.role === 'admin'

  const load = useCallback(async () => {
    setLoading(true)
    const today = new Date().toISOString().slice(0,10)

    // Load classes
    let clsQ = supabase.from('classes').select('*')
      .eq('is_cancelled', false)
      .gte('class_date', today)
      .order('class_date')
    if (isTeacher) clsQ = clsQ.eq('teacher_id', profile.id)
    else if (isStudent) {
      const { data: enrols } = await supabase.from('enrollments').select('class_id').eq('student_id', profile.id)
      const ids = (enrols||[]).map(e=>e.class_id).filter(Boolean)
      if (ids.length) clsQ = clsQ.in('id', ids)
      else { setClasses([]); setLoading(false); return }
    }
    const { data: cls } = await clsQ
    setClasses(cls || [])

    // Load reschedule requests
    let reqQ = supabase.from('reschedule_requests').select('*').order('created_at', { ascending:false })
    if (isStudent)      reqQ = reqQ.eq('requested_by', profile.id)
    else if (isTeacher) {
      const classIds = (cls||[]).map(c=>c.id)
      if (classIds.length) reqQ = reqQ.in('class_id', classIds)
    }
    const { data: reqs } = await reqQ
    setRequests(reqs || [])

    setLoading(false)
  }, [profile.id, profile.role, isTeacher, isStudent])

  useEffect(() => { load() }, [load])

  async function approveRequest(req) {
    // Update the actual class date
    await supabase.from('classes').update({
      class_date:             req.proposed_date,
      start_time:             req.proposed_time || null,
      rescheduled_from_date:  req.original_date,
      rescheduled_from_time:  req.original_time || null,
    }).eq('id', req.class_id)

    // Update events table
    await supabase.from('events').update({
      day:   new Date(req.proposed_date + 'T00:00:00').getDate(),
      month: new Date(req.proposed_date + 'T00:00:00').getMonth() + 1,
      year:  new Date(req.proposed_date + 'T00:00:00').getFullYear(),
      time:  req.proposed_time || null,
    }).eq('title', req.class_title)

    // Mark request approved
    await supabase.from('reschedule_requests').update({
      status:      'approved',
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', req.id)

    // Notify student
    const { data: student } = await supabase.from('profiles').select('email,full_name,timezone').eq('id', req.requested_by).single()
    if (student?.email) {
      sendEmail('class_scheduled', student.email, {
        name:        student.full_name,
        classTitle:  `✅ Reschedule Approved: ${req.class_title}`,
        classDate:   req.proposed_date,
        startTime:   req.proposed_time || null,
        teacherName: profile.full_name,
        zoomLink:    null,
        studentTZ:   student.timezone,
      })
    }
    setOk('✓ Request approved — class rescheduled!')
    setTimeout(()=>setOk(''),4000)
    load()
  }

  async function rejectRequest(req) {
    await supabase.from('reschedule_requests').update({
      status:      'rejected',
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', req.id)

    // Notify student
    const { data: student } = await supabase.from('profiles').select('email,full_name').eq('id', req.requested_by).single()
    if (student?.email) {
      sendEmail('class_scheduled', student.email, {
        name:        student.full_name,
        classTitle:  `❌ Reschedule Declined: ${req.class_title}`,
        classDate:   req.original_date,
        startTime:   req.original_time || null,
        teacherName: profile.full_name,
        zoomLink:    null,
      })
    }
    setOk('Request rejected.')
    setTimeout(()=>setOk(''),3000)
    load()
  }

  const pendingCount  = requests.filter(r=>r.status==='pending').length
  const filteredCls   = classes.filter(c => !search || c.title?.toLowerCase().includes(search.toLowerCase()))

  const inp = { background:'#1a2535', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'8px 12px', fontSize:'13px', color:'rgba(255,255,255,0.85)', outline:'none', fontFamily:'inherit', colorScheme:'dark' }

  return (
    <div id="uniedd-reschedule" style={{ marginTop:'14px' }}>
      <div style={{ fontSize:'16px', fontWeight:700, color:'rgba(255,255,255,0.85)', marginBottom:'4px' }}>📅 Reschedule & Cancellations</div>
      <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.3)', marginBottom:'14px' }}>
        {isStudent ? 'Request a reschedule for your upcoming classes' :
         isTeacher ? 'Reschedule or cancel your classes, review student requests' :
         'Manage all class reschedule and cancellation requests'}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'6px', marginBottom:'16px' }}>
        {[
          { id:'classes',  label:'📋 Upcoming Classes' },
          { id:'requests', label:`🔔 Requests${pendingCount>0?` (${pendingCount})`:''}`  },
          ...(isTeacher||isAdmin ? [{ id:'cancelled', label:'🚫 Cancelled' }] : []),
        ].map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ fontSize:'12px', fontWeight:700, padding:'7px 16px', borderRadius:'10px', border:'none', cursor:'pointer', fontFamily:'inherit', background:tab===t.id?'linear-gradient(135deg,#1e90ff,#0ea5e9)':'rgba(255,255,255,0.06)', color:tab===t.id?'#fff':'rgba(255,255,255,0.45)', position:'relative' }}>
            {t.label}
            {t.id==='requests' && pendingCount>0 && (
              <span style={{ position:'absolute', top:'-4px', right:'-4px', width:'16px', height:'16px', borderRadius:'50%', background:'#ef4444', fontSize:'9px', fontWeight:800, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {ok && <div style={{ padding:'8px 14px', background:'rgba(16,185,129,0.1)', border:'0.5px solid rgba(16,185,129,0.25)', borderRadius:'9px', fontSize:'13px', color:'#34d399', marginBottom:'10px' }}>{ok}</div>}

      {loading ? (
        <div style={{ textAlign:'center', padding:'3rem', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>Loading...</div>
      ) : (
        <>
          {/* ── UPCOMING CLASSES TAB ── */}
          {tab === 'classes' && (
            <>
              <input style={{ ...inp, width:'100%', marginBottom:'12px' }} type="text" placeholder="🔍 Search classes..." value={search} onChange={e=>setSearch(e.target.value)} />
              {filteredCls.length === 0 ? (
                <div style={{ textAlign:'center', padding:'3rem', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>No upcoming classes found</div>
              ) : (
                <div style={{ display:'grid', gap:'8px' }}>
                  {filteredCls.map(cls => (
                    <div key={cls.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 16px', background:'rgba(255,255,255,0.03)', borderRadius:'12px', border:'0.5px solid rgba(255,255,255,0.07)' }}>
                      {/* Rescheduled badge */}
                      {cls.rescheduled_from_date && (
                        <div style={{ position:'absolute', fontSize:'8px', color:'#a78bfa' }}>↺</div>
                      )}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:'13px', fontWeight:600, color:'rgba(255,255,255,0.85)' }}>{cls.title}</div>
                        <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)', marginTop:'2px', display:'flex', gap:'8px', flexWrap:'wrap' }}>
                          <span>📅 {fmtDate(cls.class_date)}</span>
                          {cls.start_time && <span>⏰ {fmtTime(cls.start_time)}</span>}
                          {cls.teacher_name && <span>👨‍🏫 {cls.teacher_name}</span>}
                          {cls.rescheduled_from_date && <span style={{ color:'#a78bfa' }}>↺ Rescheduled</span>}
                        </div>
                      </div>

                      {/* Action buttons by role */}
                      <div style={{ display:'flex', gap:'6px', flexShrink:0 }}>
                        {/* Student: can only request */}
                        {isStudent && (
                          <button onClick={()=>setModal({type:'request',cls})} style={{ fontSize:'11px', fontWeight:700, padding:'6px 12px', borderRadius:'8px', background:'rgba(30,144,255,0.12)', color:'#5aabff', border:'0.5px solid rgba(30,144,255,0.2)', cursor:'pointer', fontFamily:'inherit' }}>
                            📅 Request Reschedule
                          </button>
                        )}

                        {/* Teacher/Admin: can reschedule and cancel directly */}
                        {(isTeacher || isAdmin) && (
                          <>
                            <button onClick={()=>setModal({type:'reschedule',cls})} style={{ fontSize:'11px', fontWeight:700, padding:'6px 12px', borderRadius:'8px', background:'rgba(139,92,246,0.12)', color:'#a78bfa', border:'0.5px solid rgba(139,92,246,0.2)', cursor:'pointer', fontFamily:'inherit' }}>
                              ↺ Reschedule
                            </button>
                            <button onClick={()=>setModal({type:'cancel',cls})} style={{ fontSize:'11px', fontWeight:700, padding:'6px 12px', borderRadius:'8px', background:'rgba(239,68,68,0.1)', color:'#f87171', border:'0.5px solid rgba(239,68,68,0.2)', cursor:'pointer', fontFamily:'inherit' }}>
                              🚫 Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── REQUESTS TAB ── */}
          {tab === 'requests' && (
            <>
              {requests.length === 0 ? (
                <div style={{ textAlign:'center', padding:'3rem', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>
                  {isStudent ? 'You haven\'t made any reschedule requests yet.' : 'No reschedule requests from students yet.'}
                </div>
              ) : (
                <div style={{ display:'grid', gap:'10px' }}>
                  {requests.map(req => {
                    const ss = STATUS_STYLE[req.status] || STATUS_STYLE.pending
                    return (
                      <div key={req.id} style={{ background:'rgba(255,255,255,0.03)', borderRadius:'12px', padding:'14px 16px', border:`0.5px solid ${ss.color}22` }}>
                        <div style={{ display:'flex', alignItems:'flex-start', gap:'12px' }}>
                          <div style={{ flex:1 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px', flexWrap:'wrap' }}>
                              <span style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.85)' }}>{req.class_title}</span>
                              <span style={{ fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'6px', background:ss.bg, color:ss.color }}>{ss.label}</span>
                            </div>
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'8px' }}>
                              <div style={{ padding:'8px', background:'rgba(239,68,68,0.08)', borderRadius:'8px', border:'0.5px solid rgba(239,68,68,0.15)' }}>
                                <div style={{ fontSize:'9px', color:'rgba(255,255,255,0.3)', marginBottom:'2px' }}>ORIGINAL</div>
                                <div style={{ fontSize:'12px', fontWeight:600, color:'rgba(255,255,255,0.6)' }}>{fmtDate(req.original_date)}</div>
                                {req.original_time && <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.4)' }}>{fmtTime(req.original_time)}</div>}
                              </div>
                              <div style={{ padding:'8px', background:'rgba(16,185,129,0.08)', borderRadius:'8px', border:'0.5px solid rgba(16,185,129,0.15)' }}>
                                <div style={{ fontSize:'9px', color:'rgba(255,255,255,0.3)', marginBottom:'2px' }}>PROPOSED</div>
                                <div style={{ fontSize:'12px', fontWeight:600, color:'#34d399' }}>{fmtDate(req.proposed_date)}</div>
                                {req.proposed_time && <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.5)' }}>{fmtTime(req.proposed_time)}</div>}
                              </div>
                            </div>
                            <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.4)', marginBottom:'6px' }}>
                              <span style={{ color:'rgba(255,255,255,0.5)', fontWeight:600 }}>Reason: </span>{req.reason}
                            </div>
                            <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.25)' }}>
                              Requested by {req.requester_name} · {new Date(req.created_at).toLocaleDateString('en-IN')}
                            </div>
                          </div>

                          {/* Teacher/Admin actions on pending requests */}
                          {(isTeacher || isAdmin) && req.status === 'pending' && (
                            <div style={{ display:'flex', flexDirection:'column', gap:'6px', flexShrink:0 }}>
                              <button onClick={()=>approveRequest(req)} style={{ fontSize:'12px', fontWeight:700, padding:'7px 16px', borderRadius:'9px', background:'rgba(16,185,129,0.15)', color:'#34d399', border:'0.5px solid rgba(16,185,129,0.25)', cursor:'pointer', fontFamily:'inherit' }}>
                                ✓ Approve
                              </button>
                              <button onClick={()=>rejectRequest(req)} style={{ fontSize:'12px', fontWeight:700, padding:'7px 16px', borderRadius:'9px', background:'rgba(239,68,68,0.1)', color:'#f87171', border:'0.5px solid rgba(239,68,68,0.2)', cursor:'pointer', fontFamily:'inherit' }}>
                                ✕ Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* ── CANCELLED TAB ── */}
          {tab === 'cancelled' && (isTeacher || isAdmin) && (
            <CancelledClasses profile={profile} />
          )}
        </>
      )}

      {/* Modals */}
      {modal?.type === 'request'    && <RequestRescheduleModal    cls={modal.cls} profile={profile} onClose={()=>setModal(null)} onSave={()=>{setModal(null);setOk('✓ Request submitted — teacher will review it.');load()}} />}
      {modal?.type === 'cancel'     && <CancelClassModal          cls={modal.cls} profile={profile} onClose={()=>setModal(null)} onSave={()=>{setModal(null);setOk('✓ Class cancelled — students notified.');load()}} />}
      {modal?.type === 'reschedule' && <TeacherRescheduleModal    cls={modal.cls} profile={profile} onClose={()=>setModal(null)} onSave={()=>{setModal(null);setOk('✓ Class rescheduled — students notified.');load()}} />}
    </div>
  )
}

// ── Cancelled classes list ────────────────────────────────────
function CancelledClasses({ profile }) {
  const [cancelled, setCancelled] = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      let q = supabase.from('classes').select('*').eq('is_cancelled', true).order('cancelled_at', { ascending:false })
      if (profile.role === 'teacher') q = q.eq('teacher_id', profile.id)
      const { data } = await q
      setCancelled(data || [])
      setLoading(false)
    }
    load()
  }, [profile.id, profile.role])

  if (loading) return <div style={{ textAlign:'center', padding:'2rem', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>Loading...</div>
  if (!cancelled.length) return <div style={{ textAlign:'center', padding:'3rem', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>No cancelled classes.</div>

  return (
    <div style={{ display:'grid', gap:'8px' }}>
      {cancelled.map(cls => (
        <div key={cls.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 16px', background:'rgba(239,68,68,0.05)', borderRadius:'12px', border:'0.5px solid rgba(239,68,68,0.15)' }}>
          <span style={{ fontSize:'18px' }}>🚫</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'13px', fontWeight:600, color:'rgba(255,255,255,0.6)', textDecoration:'line-through' }}>{cls.title}</div>
            <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'2px' }}>
              Was: {fmtDate(cls.class_date)} {cls.start_time && `· ${fmtTime(cls.start_time)}`}
              {cls.cancel_reason && <span> · Reason: {cls.cancel_reason}</span>}
            </div>
          </div>
          <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.25)' }}>{cls.cancelled_at ? new Date(cls.cancelled_at).toLocaleDateString('en-IN') : ''}</span>
        </div>
      ))}
    </div>
  )
}
