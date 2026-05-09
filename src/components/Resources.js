import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabaseClient'

const TYPE_ICON  = { pdf:'📄', video:'🎥', doc:'📝', link:'🔗', other:'📎' }
const TYPE_COLOR = {
  pdf:   { bg:'rgba(239,68,68,0.1)',   color:'#f87171', border:'rgba(239,68,68,0.2)'   },
  video: { bg:'rgba(30,144,255,0.1)',  color:'#5aabff', border:'rgba(30,144,255,0.2)'  },
  doc:   { bg:'rgba(16,185,129,0.1)',  color:'#34d399', border:'rgba(16,185,129,0.2)'  },
  link:  { bg:'rgba(244,163,53,0.1)',  color:'#f4a335', border:'rgba(244,163,53,0.2)'  },
  other: { bg:'rgba(139,92,246,0.1)',  color:'#a78bfa', border:'rgba(139,92,246,0.2)'  },
}

// Who can see what
const AUDIENCE_OPTIONS = [
  { value: 'all',      label: '🌐 Everyone',          desc: 'All users see this'              },
  { value: 'students', label: '🎓 Students only',      desc: 'Only enrolled students'          },
  { value: 'teachers', label: '👨‍🏫 Teachers only',      desc: 'Only teachers'                  },
  { value: 'sales',    label: '💼 Sales only',          desc: 'Only sales staff'               },
  { value: 'admin',    label: '🔐 Admin only',          desc: 'Only admins'                    },
  { value: 'specific', label: '👤 Specific student',    desc: 'One particular student'         },
]

export default function Resources({ profile }) {
  const [resources,  setResources]  = useState([])
  const [students,   setStudents]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [uploading,  setUploading]  = useState(false)
  const [title,      setTitle]      = useState('')
  const [type,       setType]       = useState('pdf')
  const [url,        setUrl]        = useState('')
  const [file,       setFile]       = useState(null)
  const [audience,   setAudience]   = useState('all')
  const [targetUser, setTargetUser] = useState('')  // for specific student
  const [err,        setErr]        = useState('')
  const [ok,         setOk]        = useState('')
  const [filter,     setFilter]     = useState('all')
  const fileRef = useRef()

  const canUpload = ['admin','teacher','sales'].includes(profile.role)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)

    // Load resources visible to this user based on audience field
    let query = supabase.from('resources').select('*, profiles(full_name)').order('created_at', { ascending: false })

    // Filter by audience
    if (profile.role === 'student') {
      query = query.or(`audience.eq.all,audience.eq.students,and(audience.eq.specific,target_user_id.eq.${profile.id})`)
    } else if (profile.role === 'teacher') {
      query = query.or('audience.eq.all,audience.eq.teachers,audience.eq.admin')
    } else if (profile.role === 'sales') {
      query = query.or('audience.eq.all,audience.eq.sales,audience.eq.admin')
    }
    // admin sees everything

    const { data } = await query
    setResources(data || [])

    // Load students list for specific targeting
    if (canUpload) {
      const { data: studs } = await supabase.from('profiles').select('id,full_name').eq('role','student').order('full_name')
      setStudents(studs || [])
    }
    setLoading(false)
  }

  async function upload(e) {
    e.preventDefault()
    setErr(''); setOk('')
    if (!title.trim()) return setErr('Title is required.')
    if (!file && !url.trim()) return setErr('Upload a file or paste a URL.')
    if (audience === 'specific' && !targetUser) return setErr('Select a student to share with.')
    setUploading(true)

    let fileUrl = url.trim()

    if (file) {
      const fileName = `${Date.now()}-${file.name.replace(/\s+/g,'-')}`
      const { error: uploadErr } = await supabase.storage
        .from('resources').upload(fileName, file, { contentType: file.type })
      if (uploadErr) { setErr('Upload failed: ' + uploadErr.message); setUploading(false); return }
      const { data: { publicUrl } } = supabase.storage.from('resources').getPublicUrl(fileName)
      fileUrl = publicUrl
    }

    const { error } = await supabase.from('resources').insert({
      title:          title.trim(),
      type,
      url:            fileUrl,
      uploaded_by:    profile.id,
      audience,
      target_user_id: audience === 'specific' ? targetUser : null,
    })

    if (error) { setErr('Save failed: ' + error.message); setUploading(false); return }

    const audienceLabel = AUDIENCE_OPTIONS.find(a => a.value === audience)?.label || audience
    const studentName   = audience === 'specific' ? students.find(s => s.id === targetUser)?.full_name : null
    setOk(`✓ "${title}" uploaded → ${studentName || audienceLabel}`)
    setTitle(''); setType('pdf'); setUrl(''); setFile(null); setAudience('all'); setTargetUser('')
    if (fileRef.current) fileRef.current.value = ''
    setUploading(false)
    setTimeout(() => setOk(''), 5000)
    load()
  }

  async function deleteResource(id) {
    if (!window.confirm('Delete this resource?')) return
    await supabase.from('resources').delete().eq('id', id)
    load()
  }

  // Filter visible resources
  const filtered = filter === 'all' ? resources : resources.filter(r => r.type === filter || r.audience === filter)

  const inp = { width:'100%', background:'#1a2535', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'11px 13px', fontSize:'14px', color:'rgba(255,255,255,0.85)', outline:'none', fontFamily:'inherit', boxSizing:'border-box', colorScheme:'dark' }
  const lbl = { display:'block', fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.32)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'6px', marginTop:'14px' }

  return (
    <div id="uniedd-resources" style={{ marginTop:'14px' }}>
      <div style={{ fontSize:'16px', fontWeight:700, color:'rgba(255,255,255,0.85)', marginBottom:'4px' }}>📚 Resources</div>
      <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.3)', marginBottom:'14px' }}>
        {profile.role === 'student' ? 'Materials shared with you by your teachers' : 'Upload and share learning materials with specific audiences'}
      </div>

      <div style={{ display:'grid', gridTemplateColumns: canUpload ? '1fr 360px' : '1fr', gap:'16px' }}>

        {/* ── LEFT: Resource list ── */}
        <div style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'1rem' }}>

          {/* Filter tabs */}
          <div style={{ display:'flex', gap:'6px', marginBottom:'12px', flexWrap:'wrap' }}>
            {[
              { v:'all',    l:'All' },
              { v:'pdf',    l:'📄 PDF' },
              { v:'video',  l:'🎥 Video' },
              { v:'doc',    l:'📝 Doc' },
              { v:'link',   l:'🔗 Link' },
              ...(canUpload ? [
                { v:'students', l:'🎓 For Students' },
                { v:'specific', l:'👤 Specific' },
              ] : []),
            ].map(f => (
              <button key={f.v} onClick={() => setFilter(f.v)} style={{ fontSize:'11px', fontWeight:600, padding:'5px 12px', borderRadius:'8px', border:'none', cursor:'pointer', fontFamily:'inherit', background: filter===f.v ? '#1e90ff' : 'rgba(255,255,255,0.06)', color: filter===f.v ? '#fff' : 'rgba(255,255,255,0.5)' }}>
                {f.l}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign:'center', padding:'3rem', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:'3rem 1rem', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>
              {profile.role === 'student' ? 'No materials shared with you yet.' : 'No resources uploaded yet.'}
            </div>
          ) : (
            <div style={{ display:'grid', gap:'8px' }}>
              {filtered.map(r => {
                const tc      = TYPE_COLOR[r.type] || TYPE_COLOR.other
                const audOpt  = AUDIENCE_OPTIONS.find(a => a.value === r.audience)
                const stuName = r.audience === 'specific'
                  ? (students.find(s => s.id === r.target_user_id)?.full_name || 'Specific student')
                  : null

                return (
                  <div key={r.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 14px', background:'rgba(255,255,255,0.03)', borderRadius:'12px', border:`0.5px solid ${tc.border}` }}>
                    <div style={{ fontSize:'24px', flexShrink:0 }}>{TYPE_ICON[r.type] || '📎'}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'13px', fontWeight:600, color:'rgba(255,255,255,0.85)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.title}</div>
                      <div style={{ display:'flex', gap:'6px', marginTop:'4px', flexWrap:'wrap', alignItems:'center' }}>
                        <span style={{ fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'6px', background:tc.bg, color:tc.color }}>{r.type?.toUpperCase()}</span>
                        {/* Audience badge */}
                        <span style={{ fontSize:'10px', padding:'2px 8px', borderRadius:'6px', background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.4)' }}>
                          {stuName || audOpt?.label || r.audience}
                        </span>
                        {r.profiles?.full_name && (
                          <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.25)' }}>by {r.profiles.full_name}</span>
                        )}
                      </div>
                    </div>
                    <a href={r.url} target="_blank" rel="noreferrer" style={{ fontSize:'12px', fontWeight:700, padding:'7px 14px', borderRadius:'9px', background:tc.bg, color:tc.color, border:`0.5px solid ${tc.border}`, whiteSpace:'nowrap', textDecoration:'none', flexShrink:0 }}>
                      Open ↗
                    </a>
                    {(canUpload || r.uploaded_by === profile.id) && (
                      <button onClick={() => deleteResource(r.id)} style={{ fontSize:'11px', padding:'7px 10px', borderRadius:'9px', border:'none', cursor:'pointer', background:'rgba(239,68,68,0.1)', color:'#f87171', fontFamily:'inherit', flexShrink:0 }}>🗑</button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT: Upload form (admin/teacher/sales only) ── */}
        {canUpload && (
          <div style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'1rem' }}>
            <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.7)', marginBottom:'14px' }}>Upload Resource</div>

            <form onSubmit={upload}>
              <label style={lbl}>Title *</label>
              <input style={inp} type="text" placeholder="e.g. Guitar Scales PDF" value={title} onChange={e=>setTitle(e.target.value)} required />

              <label style={lbl}>Type</label>
              <select style={inp} value={type} onChange={e=>setType(e.target.value)}>
                <option value="pdf">📄 PDF</option>
                <option value="video">🎥 Video</option>
                <option value="doc">📝 Document</option>
                <option value="link">🔗 Link</option>
                <option value="other">📎 Other</option>
              </select>

              {/* ── AUDIENCE PICKER ── */}
              <label style={lbl}>Visible To</label>
              <div style={{ display:'grid', gap:'6px', marginBottom:'4px' }}>
                {AUDIENCE_OPTIONS.filter(a => {
                  // Teachers can't send to admin-only
                  if (profile.role === 'teacher' && a.value === 'admin') return false
                  // Sales can't send teacher-only
                  if (profile.role === 'sales' && a.value === 'teachers') return false
                  return true
                }).map(a => (
                  <button key={a.value} type="button" onClick={() => setAudience(a.value)} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 12px', borderRadius:'10px', border:`1px solid ${audience===a.value ? '#1e90ff' : 'rgba(255,255,255,0.06)'}`, background: audience===a.value ? 'rgba(30,144,255,0.12)' : 'rgba(255,255,255,0.03)', cursor:'pointer', textAlign:'left', width:'100%' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'12px', fontWeight:700, color: audience===a.value ? '#fff' : 'rgba(255,255,255,0.6)' }}>{a.label}</div>
                      <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.3)', marginTop:'1px' }}>{a.desc}</div>
                    </div>
                    {audience===a.value && <span style={{ fontSize:'14px', color:'#1e90ff' }}>✓</span>}
                  </button>
                ))}
              </div>

              {/* Specific student picker */}
              {audience === 'specific' && (
                <>
                  <label style={lbl}>Select Student</label>
                  <select style={inp} value={targetUser} onChange={e=>setTargetUser(e.target.value)} required={audience==='specific'}>
                    <option value="">— Choose student —</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                  </select>
                </>
              )}

              {/* File or URL */}
              <label style={lbl}>File or URL</label>
              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                <button type="button" onClick={() => fileRef.current?.click()} style={{ padding:'10px', borderRadius:'10px', border:'1.5px dashed rgba(255,255,255,0.15)', background:'rgba(255,255,255,0.03)', color:'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:'12px', fontFamily:'inherit' }}>
                  {file ? `✓ ${file.name}` : '📁 Click to upload file'}
                </button>
                <input ref={fileRef} type="file" onChange={e => { setFile(e.target.files[0]); setUrl('') }} style={{ display:'none' }} accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.mov,.jpg,.png,.zip" />
                <div style={{ textAlign:'center', fontSize:'11px', color:'rgba(255,255,255,0.2)' }}>— or paste a URL —</div>
                <input style={inp} type="url" placeholder="https://..." value={url} onChange={e => { setUrl(e.target.value); setFile(null) }} />
              </div>

              {err && <div style={{ marginTop:'10px', padding:'9px 13px', background:'rgba(220,60,60,0.1)', border:'0.5px solid rgba(220,60,60,0.3)', borderRadius:'8px', fontSize:'13px', color:'#f09595' }}>{err}</div>}
              {ok  && <div style={{ marginTop:'10px', padding:'9px 13px', background:'rgba(16,185,129,0.1)', border:'0.5px solid rgba(16,185,129,0.3)', borderRadius:'8px', fontSize:'13px', color:'#34d399' }}>{ok}</div>}

              <button type="submit" disabled={uploading} style={{ width:'100%', padding:'12px', background: uploading ? 'rgba(100,100,100,0.3)' : 'linear-gradient(135deg,#1e90ff,#0ea5e9)', color:'#fff', fontSize:'14px', fontWeight:800, border:'none', borderRadius:'10px', cursor: uploading ? 'not-allowed' : 'pointer', marginTop:'14px', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
                {uploading ? <><span style={{ display:'inline-block', width:'14px', height:'14px', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite' }}/> Uploading...</> : '📤 Upload Resource'}
              </button>
            </form>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
