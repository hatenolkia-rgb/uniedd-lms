import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

function fmtSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024*1024) return `${(bytes/1024).toFixed(1)} KB`
  return `${(bytes/(1024*1024)).toFixed(1)} MB`
}

function fmtDuration(mins) {
  if (!mins) return '—'
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins/60)}h ${mins%60}m`
}

function fmtDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-IN', {
    day:'2-digit', month:'short', year:'numeric',
    hour:'2-digit', minute:'2-digit', hour12:true,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  })
}

const FILE_TYPE_STYLE = {
  MP4:        { bg:'rgba(30,144,255,0.15)',  color:'#5aabff',  icon:'🎬', label:'Video'      },
  M4A:        { bg:'rgba(139,92,246,0.15)',  color:'#a78bfa',  icon:'🎵', label:'Audio'      },
  CHAT:       { bg:'rgba(244,163,53,0.15)',  color:'#f4a335',  icon:'💬', label:'Chat'       },
  TRANSCRIPT: { bg:'rgba(16,185,129,0.15)',  color:'#34d399',  icon:'📝', label:'Transcript' },
}

export default function ZoomRecordings({ profile }) {
  const [recordings,  setRecordings]  = useState([])
  const [classes,     setClasses]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [dateFrom,    setDateFrom]    = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0,10)
  })
  const [dateTo,      setDateTo]      = useState(new Date().toISOString().slice(0,10))
  const [search,      setSearch]      = useState('')
  const [expanded,    setExpanded]    = useState({})

  const loadRecordings = useCallback(async () => {
    setLoading(true); setError('')
    try {
      // For students/teachers: fetch their enrolled/assigned classes with meet_links
      // then look up recordings for those specific meeting IDs
      let meetingIds = []

      if (profile.role === 'student') {
        const { data: enrollments } = await supabase
          .from('enrollments').select('class_id').eq('student_id', profile.id)
        const classIds = (enrollments||[]).map(e=>e.class_id).filter(Boolean)
        if (classIds.length) {
          const { data: cls } = await supabase.from('classes').select('id,title,meet_link,class_date,start_time')
            .in('id', classIds).not('meet_link','is',null)
          setClasses(cls||[])
          meetingIds = (cls||[])
            .map(c => c.meet_link?.match(/\/j\/(\d+)/)?.[1])
            .filter(Boolean)
        }
      } else if (profile.role === 'teacher') {
        const { data: cls } = await supabase.from('classes').select('id,title,meet_link,class_date,start_time')
          .eq('teacher_id', profile.id).not('meet_link','is',null)
        setClasses(cls||[])
        meetingIds = (cls||[]).map(c => c.meet_link?.match(/\/j\/(\d+)/)?.[1]).filter(Boolean)
      }

      // Admin/Sales: fetch all recordings by date range
      const isAdminSales = ['admin','sales'].includes(profile.role)
      const url = isAdminSales
        ? `/api/get-zoom-recordings?from=${dateFrom}&to=${dateTo}`
        : null

      if (isAdminSales && url) {
        const res  = await fetch(url)
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        setRecordings(data.recordings || [])
      } else if (meetingIds.length) {
        // Fetch recordings for each meeting ID
        const results = await Promise.all(
          [...new Set(meetingIds)].slice(0, 20).map(async id => {
            const res  = await fetch(`/api/get-zoom-recordings?meetingId=${id}`)
            const data = await res.json()
            return data.recordings || []
          })
        )
        setRecordings(results.flat())
      } else {
        setRecordings([])
      }
    } catch(e) {
      setError('Could not load recordings: ' + e.message)
    }
    setLoading(false)
  }, [profile.id, profile.role, dateFrom, dateTo])

  useEffect(() => { loadRecordings() }, [loadRecordings])

  const filtered = recordings.filter(r =>
    !search || r.topic?.toLowerCase().includes(search.toLowerCase())
  )

  const inp = { background:'#1a2535', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'8px 12px', fontSize:'13px', color:'rgba(255,255,255,0.85)', outline:'none', fontFamily:'inherit', colorScheme:'dark' }

  return (
    <div id="uniedd-recordings" style={{ marginTop:'14px' }}>
      <div style={{ fontSize:'16px', fontWeight:700, color:'rgba(255,255,255,0.85)', marginBottom:'4px' }}>🎬 Class Recordings</div>
      <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.3)', marginBottom:'14px' }}>
        {profile.role === 'student' ? 'Recordings from your enrolled classes' :
         profile.role === 'teacher' ? 'Recordings from your classes' :
         'All Zoom cloud recordings'}
      </div>

      {/* Controls */}
      <div style={{ display:'flex', gap:'10px', marginBottom:'14px', flexWrap:'wrap', alignItems:'center' }}>
        <input style={{ ...inp, flex:1, minWidth:'180px' }} type="text" placeholder="🔍 Search by topic..." value={search} onChange={e=>setSearch(e.target.value)} />
        {['admin','sales'].includes(profile.role) && (
          <>
            <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={inp} />
            <span style={{ color:'rgba(255,255,255,0.3)', fontSize:'12px' }}>to</span>
            <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={inp} />
          </>
        )}
        <button onClick={loadRecordings} style={{ padding:'8px 16px', borderRadius:'9px', background:'rgba(30,144,255,0.12)', color:'#5aabff', border:'0.5px solid rgba(30,144,255,0.2)', cursor:'pointer', fontSize:'12px', fontWeight:700, fontFamily:'inherit' }}>
          ↻ Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding:'10px 14px', background:'rgba(239,68,68,0.1)', border:'0.5px solid rgba(239,68,68,0.3)', borderRadius:'10px', fontSize:'13px', color:'#f87171', marginBottom:'10px' }}>
          ⚠ {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div style={{ textAlign:'center', padding:'4rem', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>
          <div style={{ display:'inline-block', width:'24px', height:'24px', border:'2px solid rgba(255,255,255,0.1)', borderTopColor:'#1e90ff', borderRadius:'50%', animation:'spin .7s linear infinite', marginBottom:'12px' }}/>
          <div>Loading recordings from Zoom cloud...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'4rem 1rem', background:'rgba(255,255,255,0.03)', borderRadius:'14px', border:'0.5px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize:'40px', marginBottom:'12px' }}>🎬</div>
          <div style={{ fontSize:'14px', color:'rgba(255,255,255,0.4)', fontWeight:600 }}>No recordings found</div>
          <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.2)', marginTop:'6px' }}>
            {profile.role === 'student'
              ? 'Recordings will appear here after your classes are held'
              : 'Recordings appear here after Zoom classes end — cloud recording must be enabled'}
          </div>
        </div>
      ) : (
        <div style={{ display:'grid', gap:'10px' }}>
          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'4px' }}>
            {[
              { label:'Total Recordings', value: filtered.length, color:'#5aabff' },
              { label:'Total Duration',   value: filtered.reduce((a,r)=>a+(r.duration||0),0) + ' min', color:'#a78bfa' },
              { label:'Total Size',       value: fmtSize(filtered.reduce((a,r)=>a+(r.total_size||0),0)), color:'#34d399' },
            ].map(s=>(
              <div key={s.label} style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'12px', padding:'12px', textAlign:'center' }}>
                <div style={{ fontSize:'20px', fontWeight:800, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.3)', marginTop:'2px' }}>{s.label.toUpperCase()}</div>
              </div>
            ))}
          </div>

          {/* Recording cards */}
          {filtered.map((rec, i) => {
            const isExpanded = expanded[rec.meeting_id]
            const videoFile  = rec.files?.find(f => f.file_type === 'MP4')

            return (
              <div key={rec.meeting_id || i} style={{ background:'rgba(255,255,255,0.03)', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:'14px', overflow:'hidden' }}>

                {/* Card header */}
                <div style={{ display:'flex', alignItems:'center', gap:'14px', padding:'14px 16px', cursor:'pointer' }}
                  onClick={()=>setExpanded(e=>({...e,[rec.meeting_id]:!e[rec.meeting_id]}))}>

                  {/* Thumbnail placeholder */}
                  <div style={{ width:'56px', height:'42px', borderRadius:'8px', background:'rgba(30,144,255,0.15)', border:'0.5px solid rgba(30,144,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', flexShrink:0 }}>
                    🎬
                  </div>

                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.85)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {rec.topic || 'Zoom Class Recording'}
                    </div>
                    <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)', marginTop:'3px', display:'flex', gap:'10px', flexWrap:'wrap' }}>
                      <span>📅 {fmtDate(rec.start_time)}</span>
                      <span>⏱ {fmtDuration(rec.duration)}</span>
                      <span>💾 {fmtSize(rec.total_size)}</span>
                      <span style={{ color:'rgba(255,255,255,0.2)' }}>{rec.files?.length || 0} files</span>
                    </div>
                  </div>

                  {/* Quick play button for video */}
                  {videoFile?.play_url && (
                    <a href={videoFile.play_url} target="_blank" rel="noreferrer"
                      onClick={e=>e.stopPropagation()}
                      style={{ fontSize:'12px', fontWeight:700, padding:'7px 16px', borderRadius:'9px', background:'linear-gradient(135deg,#1e90ff,#0ea5e9)', color:'#fff', textDecoration:'none', whiteSpace:'nowrap', flexShrink:0 }}>
                      ▶ Watch
                    </a>
                  )}

                  {/* Expand chevron */}
                  <span style={{ fontSize:'14px', color:'rgba(255,255,255,0.3)', flexShrink:0, transform:isExpanded?'rotate(180deg)':'none', transition:'transform 0.2s' }}>▾</span>
                </div>

                {/* Expanded file list */}
                {isExpanded && (
                  <div style={{ borderTop:'0.5px solid rgba(255,255,255,0.06)', padding:'12px 16px', display:'grid', gap:'8px' }}>
                    {rec.password && (
                      <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', background:'rgba(255,255,255,0.04)', padding:'6px 12px', borderRadius:'8px', marginBottom:'4px' }}>
                        🔐 Recording password: <strong style={{ color:'rgba(255,255,255,0.6)' }}>{rec.password}</strong>
                      </div>
                    )}

                    {(rec.files||[]).map((f,fi) => {
                      const ft = FILE_TYPE_STYLE[f.file_type] || FILE_TYPE_STYLE.MP4
                      const duration = f.recording_start && f.recording_end
                        ? Math.round((new Date(f.recording_end)-new Date(f.recording_start))/60000) + 'm'
                        : null

                      return (
                        <div key={f.id||fi} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 12px', background:'rgba(255,255,255,0.03)', borderRadius:'10px', border:`0.5px solid ${ft.color}22` }}>
                          <span style={{ fontSize:'18px', flexShrink:0 }}>{ft.icon}</span>
                          <div style={{ flex:1 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                              <span style={{ fontSize:'11px', fontWeight:700, padding:'2px 8px', borderRadius:'6px', background:ft.bg, color:ft.color }}>{ft.label}</span>
                              {duration && <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)' }}>⏱ {duration}</span>}
                              {f.file_size && <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)' }}>{fmtSize(f.file_size)}</span>}
                            </div>
                            {f.recording_start && (
                              <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.25)', marginTop:'3px' }}>
                                {new Date(f.recording_start).toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit',hour12:true})}
                                {' → '}
                                {new Date(f.recording_end).toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit',hour12:true})}
                              </div>
                            )}
                          </div>

                          {/* Action buttons */}
                          <div style={{ display:'flex', gap:'6px', flexShrink:0 }}>
                            {f.play_url && (
                              <a href={f.play_url} target="_blank" rel="noreferrer"
                                style={{ fontSize:'11px', fontWeight:700, padding:'6px 12px', borderRadius:'8px', background:'rgba(30,144,255,0.15)', color:'#5aabff', border:'0.5px solid rgba(30,144,255,0.25)', textDecoration:'none' }}>
                                ▶ Play
                              </a>
                            )}
                            {f.download_url && (
                              <a href={f.download_url} target="_blank" rel="noreferrer"
                                style={{ fontSize:'11px', fontWeight:700, padding:'6px 12px', borderRadius:'8px', background:'rgba(16,185,129,0.12)', color:'#34d399', border:'0.5px solid rgba(16,185,129,0.2)', textDecoration:'none' }}>
                                ↓ Download
                              </a>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
