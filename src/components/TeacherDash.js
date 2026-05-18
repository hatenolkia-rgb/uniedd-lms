import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Calendar from './Calendar'
import Resources from './Resources'
import Layout, { PageHeader, Grid4, MetricCard, TwoCol, Panel, Lbl, Inp, Btn, Err, Ok, Empty, ZoomBtn } from './Layout'
import ZoomRecordings from './ZoomRecordings'
import RescheduleManager from './RescheduleManager'
import EmergencyClass from './EmergencyClass'
import AttendanceManager from './AttendanceManager'
import SupportChat from './SupportChat'

function isZoomVisible(classDate, startTime, role) {
  if (role === 'admin') return true
  if (!classDate) return false
  try {
    const classIST = new Date(`${classDate}T${startTime||'00:00'}:00+05:30`)
    const diffHrs  = (classIST - new Date()) / 3600000
    return diffHrs <= 24 && diffHrs >= -2
  } catch(e) { return false }
}

export default function TeacherDash({ profile }) {
  const [tab,      setTab]      = useState('classes')
  const [classes,  setClasses]  = useState([])
  const [students, setStudents] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [meetLink, setMeetLink] = useState('')
  const [editId,   setEditId]   = useState(null)
  const [busy,     setBusy]     = useState(false)
  const [err,      setErr]      = useState('')
  const [ok,       setOk]       = useState('')

  const today    = new Date().toISOString().slice(0,10)
  const upcoming = classes.filter(c => c.class_date >= today)
  const done     = classes.filter(c => c.class_date <  today)
  const emergency = classes.filter(c => c.is_emergency)

  useEffect(() => { loadClasses() }, [profile.id])
  useEffect(() => { if (tab === 'students') loadMyStudents() }, [tab, classes])

  // Realtime — refresh when classes table changes for this teacher
  useEffect(() => {
    const channel = supabase
      .channel('teacher-classes-rt')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'classes',
        filter: `teacher_id=eq.${profile.id}`,
      }, () => loadClasses())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [profile.id])

  async function loadClasses() {
    setLoading(true)
    const { data } = await supabase
      .from('classes').select('*')
      .eq('teacher_id', profile.id)
      .order('class_date', { ascending: true })
    setClasses(data || [])
    setLoading(false)
  }

  async function loadMyStudents() {
    if (classes.length === 0) { setStudents([]); return }
    const classIds = classes.map(c => c.id)
    const { data: enrollments } = await supabase
      .from('enrollments').select('student_id').in('class_id', classIds)

    if (!enrollments || enrollments.length === 0) {
      const { data: attRecords } = await supabase
        .from('attendance').select('student_id').in('class_id', classIds)
      const ids = [...new Set((attRecords || []).map(a => a.student_id))]
      if (ids.length === 0) { setStudents([]); return }
      const { data: studs } = await supabase
        .from('profiles').select('id,full_name,email,created_at,student_id').in('id', ids)
      setStudents(studs || [])
      return
    }
    const studentIds = [...new Set(enrollments.map(e => e.student_id))]
    const { data: studs } = await supabase
      .from('profiles').select('id,full_name,email,created_at,student_id').in('id', studentIds)
    setStudents(studs || [])
  }

  async function updateZoomLink(e) {
    e.preventDefault(); setErr(''); setOk('')
    if (!editId) return
    setBusy(true)
    const { error } = await supabase.from('classes')
      .update({ meet_link: meetLink.trim() || null })
      .eq('id', editId).eq('teacher_id', profile.id)
    if (error) setErr(error.message)
    else { setOk('✓ Zoom link updated!'); setMeetLink(''); setEditId(null); loadClasses() }
    setBusy(false)
  }

  function startEditZoom(cls) {
    setEditId(cls.id); setMeetLink(cls.meet_link || ''); setErr(''); setOk('')
  }

  const firstName = (profile.full_name || profile.email).split(/[ @]/)[0]

  return (
    <Layout profile={profile} activeTab={tab} onTabChange={setTab}>

      {/* ── CLASSES ── */}
      {tab === 'classes' && (
        <>
          <PageHeader title={`Welcome back, ${firstName} 👋`} subtitle="Your assigned classes." />

          <Grid4>
            <MetricCard icon="📹" label="Upcoming"      value={upcoming.length} />
            <MetricCard icon="✅" label="Completed"     value={done.length} />
            <MetricCard icon="👥" label="My Students"   value={students.length || '—'} />
            <MetricCard icon="🚨" label="Emergency"     value={emergency.length} />
          </Grid4>

          {/* Action bar */}
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px', flexWrap:'wrap' }}>
            <div style={{ flex:1, padding:'10px 14px', background:'rgba(30,144,255,0.07)', border:'0.5px solid rgba(30,144,255,0.18)', borderRadius:'10px', fontSize:'12px', color:'rgba(255,255,255,0.45)', lineHeight:1.6 }}>
              📋 Classes are assigned to you by Admin or Sales. Add your <strong style={{ color:'#5aabff' }}>Zoom link</strong> for each class below.
            </div>
            {/* Emergency class button — only for teachers */}
            <EmergencyClass
              profile={profile}
              myStudents={students}
              onClassCreated={loadClasses}
            />
          </div>

          <TwoCol>
            <Panel title={`Upcoming Classes (${upcoming.length})`}>
              {loading ? <Empty msg="Loading..." /> : upcoming.length === 0 ? <Empty msg="No classes assigned yet." /> :
                upcoming.map(c => (
                  <div key={c.id} style={{ padding:'10px 0', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.85)', fontWeight:500 }}>
                          {c.is_emergency && <span style={{ fontSize:'10px', color:'#f87171', fontWeight:700, marginRight:'5px' }}>🚨 EMERGENCY</span>}
                          {c.title}
                        </div>
                        <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'2px' }}>
                          {c.class_date} {c.start_time && `· ${c.start_time}`} {c.batch && `· ${c.batch}`}
                        </div>
                      </div>
                      <ZoomBtn link={c.meet_link} />
                      <button onClick={() => startEditZoom(c)} style={{ fontSize:'10px', padding:'4px 10px', borderRadius:'6px', background:'rgba(30,144,255,0.1)', color:'#5aabff', border:'0.5px solid rgba(30,144,255,0.2)', cursor:'pointer', whiteSpace:'nowrap' }}>
                        + Zoom
                      </button>
                    </div>
                    {editId === c.id && (
                      <form onSubmit={updateZoomLink} style={{ display:'flex', gap:'6px', marginTop:'8px', alignItems:'center' }}>
                        <Inp type="url" placeholder="https://zoom.us/j/..." value={meetLink} onChange={e=>setMeetLink(e.target.value)} style={{ margin:0, flex:1 }} />
                        <Btn busy={busy} style={{ width:'auto', padding:'0 14px', margin:0, fontSize:'12px' }}>Save</Btn>
                        <button type="button" onClick={() => setEditId(null)} style={{ padding:'8px 12px', background:'transparent', color:'rgba(255,255,255,0.3)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'8px', cursor:'pointer', fontSize:'12px' }}>✕</button>
                      </form>
                    )}
                  </div>
                ))}
              {!loading && done.length > 0 && (
                <div style={{ marginTop:'12px', paddingTop:'12px', borderTop:'0.5px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize:'11px', fontWeight:600, color:'rgba(255,255,255,0.25)', marginBottom:'8px', letterSpacing:'0.05em', textTransform:'uppercase' }}>Past ({done.length})</div>
                  {done.slice(0,4).map(c => (
                    <div key={c.id} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'7px 0', borderBottom:'0.5px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.4)' }}>{c.title}</div>
                        <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.2)' }}>{c.class_date}</div>
                      </div>
                      <span style={{ fontSize:'9px', fontWeight:700, padding:'2px 7px', borderRadius:'6px', background:'rgba(16,185,129,0.1)', color:'#34d399' }}>Done</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Class Info">
              <Err msg={err}/><Ok msg={ok}/>
              {editId ? (
                <div style={{ padding:'14px', background:'rgba(30,144,255,0.07)', borderRadius:'10px', border:'0.5px solid rgba(30,144,255,0.18)' }}>
                  <div style={{ fontSize:'13px', color:'#5aabff', fontWeight:600, marginBottom:'4px' }}>Update Zoom Link</div>
                  <form onSubmit={updateZoomLink}>
                    <Lbl>Zoom / Meet URL</Lbl>
                    <Inp type="url" placeholder="https://zoom.us/j/123456789" value={meetLink} onChange={e=>setMeetLink(e.target.value)} />
                    <Btn busy={busy}>Save Zoom Link</Btn>
                    <button type="button" onClick={() => setEditId(null)} style={{ width:'100%', padding:'9px', marginTop:'6px', background:'transparent', color:'rgba(255,255,255,0.3)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', cursor:'pointer', fontFamily:'inherit', fontSize:'13px' }}>Cancel</button>
                  </form>
                </div>
              ) : (
                <div style={{ textAlign:'center', padding:'2rem 1rem' }}>
                  <div style={{ fontSize:'32px', marginBottom:'10px' }}>📹</div>
                  <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.3)' }}>Click <strong style={{ color:'#5aabff' }}>+ Zoom</strong> on any class to add your meeting link.</div>
                </div>
              )}
              {!loading && classes.length > 0 && (
                <div style={{ marginTop:'16px', paddingTop:'14px', borderTop:'0.5px solid rgba(255,255,255,0.06)', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                  {[
                    { label:'With Zoom link', value: classes.filter(c=>c.meet_link).length, color:'#10b981' },
                    { label:'No link yet',    value: classes.filter(c=>!c.meet_link).length, color:'#f4a335' },
                  ].map(item => (
                    <div key={item.label} style={{ padding:'10px', background:'rgba(255,255,255,0.03)', borderRadius:'8px', textAlign:'center' }}>
                      <div style={{ fontSize:'20px', fontWeight:800, color:item.color }}>{item.value}</div>
                      <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.3)', marginTop:'2px' }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </TwoCol>
        </>
      )}

      {/* ── MY STUDENTS ── */}
      {tab === 'students' && (
        <>
          <PageHeader title="My Students" subtitle="Students enrolled in your classes." />
          <Panel>
            {students.length === 0 ? (
              <div style={{ textAlign:'center', padding:'2.5rem 1rem' }}>
                <div style={{ fontSize:'32px', marginBottom:'10px' }}>👥</div>
                <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.3)' }}>No students assigned to your classes yet.</div>
              </div>
            ) : (
              <div style={{ display:'grid', gap:'6px' }}>
                {students.map(s => (
                  <div key={s.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 12px', background:'rgba(255,255,255,0.03)', borderRadius:'10px', border:'0.5px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width:'34px', height:'34px', borderRadius:'50%', background:'rgba(16,185,129,0.18)', color:'#34d399', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:800, flexShrink:0 }}>
                      {(s.full_name||s.email||'?').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.85)', fontWeight:600 }}>{s.full_name || '—'}</div>
                      <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.28)' }}>{s.email} {s.student_id && `· ID: ${s.student_id}`}</div>
                    </div>
                    <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.2)', flexShrink:0 }}>Joined {new Date(s.created_at).toLocaleDateString('en-IN')}</div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </>
      )}

      {/* ── ATTENDANCE ── */}
      {tab === 'attendance' && (
        <>
          <PageHeader title="Attendance" subtitle="Mark attendance for your classes. Auto-detected from Zoom join data." />
          <AttendanceManager profile={profile} teacherClasses={classes} />
        </>
      )}

      {/* ── CALENDAR ── */}
      {tab === 'calendar' && (
        <>
          <PageHeader title="Calendar" subtitle="Your class schedule." />
          <Calendar profile={profile} />
        </>
      )}

      {/* ── RESOURCES ── */}
      {tab === 'resources' && (
        <>
          <PageHeader title="Resources" subtitle="Upload and manage study materials." />
          <Resources profile={profile} />
        </>
      )}

      {/* ── SUPPORT ── */}
      {tab === 'support' && (
        <>
          <PageHeader title="Support" subtitle="Message admins and get help." />
          <SupportChat profile={profile} />
        </>
      )}

      <ZoomRecordings profile={profile} />
      <RescheduleManager profile={profile} />
    </Layout>
  )
}
