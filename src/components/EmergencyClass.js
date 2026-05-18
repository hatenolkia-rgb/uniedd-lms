import React, { useState } from 'react'
import { supabase } from '../supabaseClient'
import { Lbl, Inp, Btn, Err, Ok, Panel } from './Layout'

/**
 * EmergencyClass — teacher generates an emergency class for their assigned students only.
 * Sends a notification to admin automatically.
 */
export default function EmergencyClass({ profile, myStudents = [], onClassCreated }) {
  const [open,      setOpen]      = useState(false)
  const [title,     setTitle]     = useState('')
  const [date,      setDate]      = useState(new Date().toISOString().slice(0,10))
  const [time,      setTime]      = useState('')
  const [link,      setLink]      = useState('')
  const [notes,     setNotes]     = useState('')
  const [selected,  setSelected]  = useState([]) // selected student ids
  const [busy,      setBusy]      = useState(false)
  const [err,       setErr]       = useState('')
  const [ok,        setOk]        = useState('')

  function toggleStudent(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  function selectAll() {
    setSelected(myStudents.map(s => s.id))
  }

  function reset() {
    setTitle(''); setDate(new Date().toISOString().slice(0,10))
    setTime(''); setLink(''); setNotes(''); setSelected([])
    setErr(''); setOk('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErr(''); setOk('')
    if (!title.trim())       return setErr('Please enter a class title.')
    if (!date)               return setErr('Please select a date.')
    if (selected.length === 0) return setErr('Please select at least one student.')

    setBusy(true)
    try {
      // 1. Create the emergency class
      const { data: cls, error: clsErr } = await supabase
        .from('classes')
        .insert({
          title:       title.trim(),
          class_date:  date,
          start_time:  time || null,
          meet_link:   link.trim() || null,
          teacher_id:  profile.id,
          teacher_name: profile.full_name,
          is_emergency: true,
          notes:       notes.trim() || null,
          status:      'scheduled',
        })
        .select()
        .single()

      if (clsErr) throw clsErr

      // 2. Enroll selected students into this class
      const enrollments = selected.map(sid => ({
        class_id:   cls.id,
        student_id: sid,
      }))
      await supabase.from('enrollments').insert(enrollments)

      // 3. Notify each selected student
      const studentNotifs = selected.map(sid => ({
        user_id:  sid,
        type:     'emergency_class',
        title:    '🚨 Emergency Class Scheduled',
        message:  `${profile.full_name || 'Your teacher'} has scheduled an emergency class: "${cls.title}" on ${date}${time ? ' at ' + time : ''}.`,
        is_read:  false,
      }))

      // 4. Notify admin
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')

      const adminNotifs = (admins || []).map(a => ({
        user_id:  a.id,
        type:     'emergency_class',
        title:    '🚨 Emergency Class by ' + (profile.full_name || 'Teacher'),
        message:  `Emergency class "${cls.title}" created for ${selected.length} student(s) on ${date}${time ? ' at ' + time : ''}. Zoom: ${link || 'TBD'}.`,
        is_read:  false,
      }))

      await supabase.from('notifications').insert([...studentNotifs, ...adminNotifs])

      setOk(`✓ Emergency class created and ${adminNotifs.length} admin(s) + ${selected.length} student(s) notified!`)
      reset()
      if (onClassCreated) onClassCreated()
      setTimeout(() => { setOpen(false); setOk('') }, 2500)
    } catch (ex) {
      setErr(ex.message || 'Something went wrong.')
    }
    setBusy(false)
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => { setOpen(true); reset() }}
        style={{
          display:'flex', alignItems:'center', gap:'8px',
          padding:'10px 18px', borderRadius:'11px',
          background:'rgba(239,68,68,0.12)',
          border:'0.5px solid rgba(239,68,68,0.35)',
          color:'#f87171', fontSize:'13px', fontWeight:700,
          cursor:'pointer', fontFamily:'inherit',
        }}
      >
        🚨 Emergency Class
      </button>

      {/* Modal */}
      {open && (
        <div style={{
          position:'fixed', inset:0, zIndex:1000,
          background:'rgba(0,0,0,0.7)', backdropFilter:'blur(4px)',
          display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem',
        }}>
          <div style={{
            width:'100%', maxWidth:'520px', background:'#111820',
            border:'0.5px solid rgba(239,68,68,0.3)',
            borderRadius:'20px', padding:'1.75rem', maxHeight:'90vh', overflowY:'auto',
          }}>
            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem' }}>
              <div>
                <div style={{ fontSize:'16px', fontWeight:800, color:'#f87171' }}>🚨 Emergency Class</div>
                <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'2px' }}>Admin will be notified automatically</div>
              </div>
              <button onClick={() => setOpen(false)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.3)', fontSize:'18px', cursor:'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <Lbl>Class Title *</Lbl>
              <Inp placeholder="e.g. Emergency Piano Session" value={title} onChange={e => setTitle(e.target.value)} required />

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                <div>
                  <Lbl>Date *</Lbl>
                  <Inp type="date" value={date} onChange={e => setDate(e.target.value)} required />
                </div>
                <div>
                  <Lbl>Time</Lbl>
                  <Inp type="time" value={time} onChange={e => setTime(e.target.value)} />
                </div>
              </div>

              <Lbl>Zoom / Meet Link</Lbl>
              <Inp type="url" placeholder="https://zoom.us/j/..." value={link} onChange={e => setLink(e.target.value)} />

              <Lbl>Notes (optional)</Lbl>
              <textarea
                value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Reason for emergency class, topics to cover..."
                style={{
                  width:'100%', background:'rgba(255,255,255,0.05)',
                  border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px',
                  padding:'10px 14px', fontSize:'13px', color:'rgba(255,255,255,0.8)',
                  outline:'none', resize:'vertical', minHeight:'70px',
                  fontFamily:'inherit', boxSizing:'border-box',
                }}
              />

              {/* Student selector */}
              <div style={{ marginTop:'14px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
                  <span style={{ fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.35)', letterSpacing:'0.1em', textTransform:'uppercase' }}>
                    Select Students * ({selected.length} selected)
                  </span>
                  {myStudents.length > 0 && (
                    <button type="button" onClick={selectAll}
                      style={{ fontSize:'11px', color:'#1e90ff', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
                      Select All
                    </button>
                  )}
                </div>

                {myStudents.length === 0 ? (
                  <div style={{ padding:'12px', background:'rgba(255,255,255,0.03)', borderRadius:'10px', fontSize:'12px', color:'rgba(255,255,255,0.3)', textAlign:'center' }}>
                    No students assigned to your classes yet.
                  </div>
                ) : (
                  <div style={{ maxHeight:'160px', overflowY:'auto', display:'grid', gap:'5px' }}>
                    {myStudents.map(s => {
                      const checked = selected.includes(s.id)
                      return (
                        <label key={s.id} style={{
                          display:'flex', alignItems:'center', gap:'10px',
                          padding:'8px 12px', borderRadius:'9px', cursor:'pointer',
                          background: checked ? 'rgba(30,144,255,0.1)' : 'rgba(255,255,255,0.03)',
                          border: `0.5px solid ${checked ? 'rgba(30,144,255,0.3)' : 'rgba(255,255,255,0.06)'}`,
                          transition:'all 0.15s',
                        }}>
                          <input
                            type="checkbox" checked={checked}
                            onChange={() => toggleStudent(s.id)}
                            style={{ accentColor:'#1e90ff', width:'14px', height:'14px' }}
                          />
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.85)', fontWeight:600 }}>{s.full_name || '—'}</div>
                            <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.3)' }}>{s.email}</div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>

              <Err msg={err} />
              <Ok  msg={ok}  />

              <div style={{ display:'flex', gap:'8px', marginTop:'16px' }}>
                <Btn busy={busy} style={{ flex:1, margin:0, background:'#dc2626' }}>
                  {busy ? 'Creating...' : '🚨 Create & Notify'}
                </Btn>
                <button type="button" onClick={() => setOpen(false)}
                  style={{ padding:'12px 18px', background:'transparent', color:'rgba(255,255,255,0.3)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'11px', cursor:'pointer', fontFamily:'inherit', fontSize:'13px' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
