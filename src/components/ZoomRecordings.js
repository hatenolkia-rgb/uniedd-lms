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

// ── Last Class Hero Card ─────────────────────────────────────
function LastClassCard({ recording }) {
  const videoFile = recording.files?.find(f => f.file_type === 'MP4')
  const audioFile = recording.files?.find(f => f.file_type === 'M4A')
  const chatFile  = recording.files?.find(f => f.file_type === 'CHAT')
  const transFile = recording.files?.find(f => f.file_type === 'TRANSCRIPT')

  return (
    <div style={{ background:'linear-gradient(135deg,rgba(30,144,255,0.12),rgba(139,92,246,0.08))', border:'1px solid rgba(30,144,255,0.3)', borderRadius:'16px', overflow:'hidden', marginBottom:'20px' }}>

      {/* Header badge */}
      <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'12px 18px', background:'rgba(30,144,255,0.1)', borderBottom:'0.5px solid rgba(30,144,255,0.2)' }}>
        <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#ef4444', boxShadow:'0 0 6px #ef4444', animation:'pulse 1.5s infinite' }}/>
        <span style={{ fontSize:'11px', fontWeight:800, color:'#5aabff', letterSpacing:'0.1em', textTransform:'uppercase' }}>Last Class Recording</span>
        <span style={{ marginLeft:'auto', fontSize:'11px', color:'rgba(255,255,255,0.35)' }}>{fmtDate(recording.start_time)}</span>
      </div>

      <div style={{ padding:'18px' }}>
        {/* Title + meta */}
        <div style={{ fontSize:'17px', fontWeight:800, color:'#fff', marginBottom:'6px' }}>{recording.topic || 'Class Recording'}</div>
        <div style={{ display:'flex', gap:'14px', marginBottom:'16px', flexWrap:'wrap' }}>
          {[
            { icon:'⏱', val: fmtDuration(recording.duration) },
            { icon:'💾', val: fmtSize(recording.total_size)   },
            { icon:'📁', val: `${recording.files?.length||0} files` },
          ].map(m => (
            <span key={m.icon} style={{ fontSize:'12px', color:'rgba(255,255,255,0.4)' }}>{m.icon} {m.val}</span>
          ))}
        </div>

        {/* Big Watch button + secondary actions */}
        <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', marginBottom:'16px' }}>
          {videoFile?.play_url ? (
            <a href={videoFile.play_url} target="_blank" rel="noreferrer"
              style={{ display:'flex', alignItems:'center', gap:'8px', padding:'12px 24px', background:'linear-gradient(135deg,#1e90ff,#0ea5e9)', color:'#fff', borderRadius:'12px', textDecoration:'none', fontWeight:800, fontSize:'14px' }}>
              ▶ Watch Recording
            </a>
          ) : (
            <div style={{ padding:'12px 24px', background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.3)', borderRadius:'12px', fontSize:'13px' }}>
              Video processing... check back soon
            </div>
          )}
          {videoFile?.download_url && (
            <a href={videoFile.download_url} target="_blank" rel="noreferrer"
              style={{ display:'flex', alignItems:'center', gap:'8px', padding:'12px 20px', background:'rgba(16,185,129,0.12)', color:'#34d399', border:'0.5px solid rgba(16,185,129,0.25)', borderRadius:'12px', textDecoration:'none', fontWeight:700, fontSize:'13px' }}>
              ↓ Download
            </a>
          )}
          {audioFile?.play_url && (
            <a href={audioFile.play_url} target="_blank" rel="noreferrer"
              style={{ display:'flex', alignItems:'center', gap:'8px', padding:'12px 20px', background:'rgba(139,92,246,0.12)', color:'#a78bfa', border:'0.5px solid rgba(139,92,246,0.25)', borderRadius:'12px', textDecoration:'none', fontWeight:700, fontSize:'13px' }}>
              🎵 Audio Only
            </a>
          )}
        </div>

        {/* Extra files row */}
        {(chatFile || transFile) && (
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
            {chatFile?.download_url && (
              <a href={chatFile.download_url} target="_blank" rel="noreferrer"
                style={{ fontSize:'11px', fontWeight:700, padding:'5px 12px', borderRadius:'8px', background:'rgba(244,163,53,0.1)', color:'#f4a335', border:'0.5px solid rgba(244,163,53,0.2)', textDecoration:'none' }}>
                💬 Chat Log
              </a>
            )}
            {transFile?.download_url && (
              <a href={transFile.download_url} target="_blank" rel="noreferrer"
                style={{ fontSize:'11px', fontWeight:700, padding:'5px 12px', borderRadius:'8px', background:'rgba(16,185,129,0.1)', color:'#34d399', border:'0.5px solid rgba(16,185,129,0.2)', textDecoration:'none' }}>
                📝 Transcript
              </a>
            )}
            {recording.password && (
              <span style={{ fontSize:'11px', padding:'5px 12px', borderRadius:'8px', background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.4)' }}>
                🔐 Password: {recording.password}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────
export default function ZoomRecordings({ profile }) {
  const [recordings,  setRecordings]  = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [dateFrom,    setDateFrom]    = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 60)
    return d.toISOString().slice(0,10)
  })
  const [dateTo,      setDateTo]      = useState(new Date().toISOString().slice(0,10))
  const [search,      setSearch]      = useState('')
  const [expanded,    setExpanded]    = useState({})

  const isAdminSales = ['admin','sales'].includes(profile.role)

  const loadRecordings = useCallback(async () => {
    setLoading(true); setError('')
    try {
      let meetingIds = []

      if (profile.role === 'student') {
        const { data: enrollments } = await supabase
          .from('enrollments').select('class_id').eq('student_id', profile.id)
        const classIds = (enrollments||[]).map(e=>e.class_id).filter(Boolean)
        if (classIds.length) {
          const { data: cls } = await supabase.from('classes')
            .select('id,title,meet_link,class_date')
            .in('id', classIds).not('meet_link','is',null)
            .lte('class_date', new Date().toISOString().slice(0,10)) // only past classes
            .order('class_date', { ascending: false })
          meetingIds = (cls||[]).map(c => c.meet_link?.match(/\/j\/(\d+)/)?.[1]).filter(Boolean)
        }
      } else if (profile.role === 'teacher') {
        const { data: cls } = await supabase.from('classes')
          .select('id,title,meet_link,class_date')
          .eq('teacher_id', profile.id).not('meet_link','is',null)
          .lte('class_date', new Date().toISOString().slice(0,10))
          .order('class_date', { ascending: false })
        meetingIds = (cls||[]).map(c => c.meet_link?.match(/\/j\/(\d+)/)?.[1]).filter(Boolean)
      }

      if (isAdminSales) {
        const res  = await fetch(`/api/get-zoom-recordings?from=${dateFrom}&to=${dateTo}`)
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        setRecordings((data.recordings||[]).sort((a,b) => new Date(b.start_time)-new Date(a.start_time)))
      } else if (meetingIds.length) {
        const results = await Promise.all(
          [...new Set(meetingIds)].slice(0, 30).map(async id => {
            const res  = await fetch(`/api/get-zoom-recordings?meetingId=${id}`)
            const data = await res.json()
            return data.recordings || []
          })
        )
        const all = results.flat().sort((a,b) => new Date(b.start_time)-new Date(a.start_time))
        setRecordings(all)
      } else {
        setRecordings([])
      }
    } catch(e) {
      setError('Could not load recordings: ' + e.message)
    }
    setLoading(false)
  }, [profile.id, profile.role, dateFrom, dateTo, isAdminSales])

  useEffect(() => { loadRecordings() }, [loadRecordings])

  // Most recent recording with a video file
  const lastRecording = recordings.find(r => r.files?.some(f => f.file_type === 'MP4' && f.play_url))
    || recordings[0]

  const olderRecordings = recordings.filter(r => r !== lastRecording)
  const filtered = olderRecordings.filter(r =>
    !search || r.topic?.toLowerCase().includes(search.toLowerCase())
  )

  const inp = { background:'#1a2535', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'8px 12px', fontSize:'13px', color:'rgba(255,255,255,0.85)', outline:'none', fontFamily:'inherit', colorScheme:'dark' }

  return (
    <div id="uniedd-recordings" style={{ marginTop:'14px' }}>
      <div style={{ fontSize:'16px', fontWeight:700, color:'rgba(255,255,255,0.85)', marginBottom:'4px' }}>🎬 Class Recordings</div>
      <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.3)', marginBottom:'16px' }}>
        {profile.role === 'student' ? 'Recordings from your enrolled classes' :
         profile.role === 'teacher' ? 'Recordings from your classes' :
         'All Zoom cloud recordings'}
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'4rem', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>
          <div style={{ display:'inline-block', width:'28px', height:'28px', border:'2.5px solid rgba(255,255,255,0.08)', borderTopColor:'#1e90ff', borderRadius:'50%', animation:'spin .7s linear infinite', marginBottom:'14px' }}/>
          <div>Loading recordings from Zoom cloud...</div>
        </div>
      ) : error ? (
        <div style={{ padding:'12px 16px', background:'rgba(239,68,68,0.1)', border:'0.5px solid rgba(239,68,68,0.3)', borderRadius:'10px', fontSize:'13px', color:'#f87171' }}>⚠ {error}</div>
      ) : recordings.length === 0 ? (
        <div style={{ textAlign:'center', padding:'4rem 1rem', background:'rgba(255,255,255,0.03)', borderRadius:'14px', border:'0.5px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize:'44px', marginBottom:'12px' }}>🎬</div>
          <div style={{ fontSize:'14px', color:'rgba(255,255,255,0.4)', fontWeight:600 }}>No recordings yet</div>
          <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.2)', marginTop:'6px', maxWidth:'320px', margin:'8px auto 0' }}>
            Recordings appear here after Zoom classes end. Cloud recording must be enabled on your Zoom account.
          </div>
        </div>
      ) : (
        <>
          {/* ── LAST CLASS HERO ── */}
          {lastRecording && <LastClassCard recording={lastRecording} />}

          {/* ── OLDER RECORDINGS ── */}
          {olderRecordings.length > 0 && (
            <>
              {/* Filter bar */}
              <div style={{ display:'flex', gap:'10px', marginBottom:'12px', flexWrap:'wrap', alignItems:'center' }}>
                <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.5)', flex:1 }}>
                  Previous Recordings ({olderRecordings.length})
                </div>
                <input style={{ ...inp, width:'200px' }} type="text" placeholder="🔍 Search..." value={search} onChange={e=>setSearch(e.target.value)} />
                {isAdminSales && (
                  <>
                    <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={inp} />
                    <span style={{ color:'rgba(255,255,255,0.3)', fontSize:'12px' }}>to</span>
                    <input type="date" value={dateTo}   onChange={e=>setDateTo(e.target.value)}   style={inp} />
                  </>
                )}
                <button onClick={loadRecordings} style={{ padding:'8px 14px', borderRadius:'9px', background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.4)', border:'none', cursor:'pointer', fontSize:'12px', fontFamily:'inherit' }}>↻</button>
              </div>

              <div style={{ display:'grid', gap:'8px' }}>
                {filtered.map((rec, i) => {
                  const isOpen    = expanded[rec.meeting_id]
                  const videoFile = rec.files?.find(f => f.file_type === 'MP4')

                  return (
                    <div key={rec.meeting_id||i} style={{ background:'rgba(255,255,255,0.03)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'12px', overflow:'hidden' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 16px', cursor:'pointer' }}
                        onClick={()=>setExpanded(e=>({...e,[rec.meeting_id]:!e[rec.meeting_id]}))}>
                        <div style={{ width:'40px', height:'32px', borderRadius:'6px', background:'rgba(30,144,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', flexShrink:0 }}>🎬</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:'13px', fontWeight:600, color:'rgba(255,255,255,0.8)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{rec.topic||'Class Recording'}</div>
                          <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'2px' }}>
                            {fmtDate(rec.start_time)} · {fmtDuration(rec.duration)} · {fmtSize(rec.total_size)}
                          </div>
                        </div>
                        {videoFile?.play_url && (
                          <a href={videoFile.play_url} target="_blank" rel="noreferrer"
                            onClick={e=>e.stopPropagation()}
                            style={{ fontSize:'11px', fontWeight:700, padding:'6px 14px', borderRadius:'8px', background:'rgba(30,144,255,0.15)', color:'#5aabff', border:'0.5px solid rgba(30,144,255,0.2)', textDecoration:'none', flexShrink:0 }}>
                            ▶ Watch
                          </a>
                        )}
                        <span style={{ fontSize:'13px', color:'rgba(255,255,255,0.25)', flexShrink:0, transform:isOpen?'rotate(180deg)':'none', transition:'transform 0.2s' }}>▾</span>
                      </div>

                      {isOpen && (
                        <div style={{ borderTop:'0.5px solid rgba(255,255,255,0.05)', padding:'10px 16px', display:'grid', gap:'6px' }}>
                          {rec.password && (
                            <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', padding:'5px 10px', background:'rgba(255,255,255,0.03)', borderRadius:'6px', marginBottom:'4px' }}>
                              🔐 Password: <strong style={{ color:'rgba(255,255,255,0.55)' }}>{rec.password}</strong>
                            </div>
                          )}
                          {(rec.files||[]).map((f,fi) => {
                            const ft = FILE_TYPE_STYLE[f.file_type] || FILE_TYPE_STYLE.MP4
                            return (
                              <div key={fi} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 10px', background:'rgba(255,255,255,0.02)', borderRadius:'8px' }}>
                                <span style={{ fontSize:'15px' }}>{ft.icon}</span>
                                <span style={{ fontSize:'11px', fontWeight:700, padding:'2px 8px', borderRadius:'5px', background:ft.bg, color:ft.color }}>{ft.label}</span>
                                <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', flex:1 }}>{fmtSize(f.file_size)}</span>
                                <div style={{ display:'flex', gap:'6px' }}>
                                  {f.play_url && <a href={f.play_url} target="_blank" rel="noreferrer" style={{ fontSize:'11px', fontWeight:700, padding:'4px 10px', borderRadius:'7px', background:'rgba(30,144,255,0.12)', color:'#5aabff', textDecoration:'none' }}>▶ Play</a>}
                                  {f.download_url && <a href={f.download_url} target="_blank" rel="noreferrer" style={{ fontSize:'11px', fontWeight:700, padding:'4px 10px', borderRadius:'7px', background:'rgba(16,185,129,0.1)', color:'#34d399', textDecoration:'none' }}>↓</a>}
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
            </>
          )}
        </>
      )}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
      `}</style>
    </div>
  )
}
