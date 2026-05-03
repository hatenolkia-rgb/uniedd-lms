import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabaseClient'

const TYPE_ICON = { pdf:'📄', video:'🎥', doc:'📝', other:'📎' }
const TYPE_COLOR = {
  pdf:   { bg:'rgba(239,68,68,0.1)',   color:'#f87171', border:'rgba(239,68,68,0.2)'   },
  video: { bg:'rgba(30,144,255,0.1)',  color:'#5aabff', border:'rgba(30,144,255,0.2)'  },
  doc:   { bg:'rgba(16,185,129,0.1)',  color:'#34d399', border:'rgba(16,185,129,0.2)'  },
  other: { bg:'rgba(139,92,246,0.1)',  color:'#a78bfa', border:'rgba(139,92,246,0.2)'  },
}

export default function Resources({ profile }) {
  const [resources, setResources] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)
  const [title,     setTitle]     = useState('')
  const [type,      setType]      = useState('pdf')
  const [url,       setUrl]       = useState('')
  const [file,      setFile]      = useState(null)
  const [err,       setErr]       = useState('')
  const [ok,        setOk]        = useState('')
  const [filter,    setFilter]    = useState('all')
  const fileRef = useRef()

  const canUpload = ['teacher','admin'].includes(profile.role)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('resources')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false })
    setResources(data || [])
    setLoading(false)
  }

  async function upload(e) {
    e.preventDefault()
    setErr(''); setOk('')
    if (!title.trim()) return setErr('Title is required.')
    if (!file && !url.trim()) return setErr('Please upload a file or paste a URL.')
    setUploading(true)

    let fileUrl = url.trim()

    // Upload file to Supabase Storage if file selected
    if (file) {
      const ext      = file.name.split('.').pop()
      const fileName = `${Date.now()}-${file.name.replace(/\s+/g,'-')}`
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('resources')
        .upload(fileName, file, { contentType: file.type })

      if (uploadErr) {
        setErr('Upload failed: ' + uploadErr.message)
        setUploading(false)
        return
      }

      const { data: urlData } = supabase.storage
        .from('resources')
        .getPublicUrl(uploadData.path)
      fileUrl = urlData.publicUrl
    }

    const { error } = await supabase.from('resources').insert({
      title,
      resource_type: type,
      file_url:      fileUrl,
      uploaded_by:   profile.id,
    })

    if (error) setErr(error.message)
    else {
      setOk('✓ Resource added successfully!')
      setTitle(''); setUrl(''); setFile(null); setType('pdf')
      if (fileRef.current) fileRef.current.value = ''
      load()
    }
    setUploading(false)
  }

  async function deleteResource(id, fileUrl) {
    if (!window.confirm('Delete this resource?')) return
    // Delete from storage if it's a Supabase storage URL
    if (fileUrl?.includes('supabase')) {
      const path = fileUrl.split('/resources/')[1]
      if (path) await supabase.storage.from('resources').remove([path])
    }
    await supabase.from('resources').delete().eq('id', id)
    load()
  }

  const filtered = filter === 'all' ? resources : resources.filter(r => r.resource_type === filter)

  const inp = { width:'100%', background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'10px 13px', fontSize:'14px', color:'rgba(255,255,255,0.85)', outline:'none', display:'block', fontFamily:'inherit' }
  const lbl = { display:'block', fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.35)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'6px', marginTop:'14px' }

  return (
    <div id="uniedd-resources" style={{ marginTop:'14px' }}>
      <div style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'1rem 1.1rem' }}>

        {/* Header + filter */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px', flexWrap:'wrap', gap:'8px' }}>
          <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.7)' }}>📚 Resources</div>
          <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
            {['all','pdf','video','doc','other'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                fontSize:'11px', fontWeight:600, padding:'4px 12px', borderRadius:'20px',
                background: filter===f ? '#1e90ff' : 'rgba(255,255,255,0.06)',
                color: filter===f ? '#fff' : 'rgba(255,255,255,0.45)',
                border: filter===f ? 'none' : '0.5px solid rgba(255,255,255,0.1)',
                cursor:'pointer', textTransform:'capitalize',
              }}>
                {f === 'all' ? 'All' : `${TYPE_ICON[f]} ${f.toUpperCase()}`}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns: canUpload ? '1fr 340px' : '1fr', gap:'16px' }}>

          {/* Resource list */}
          <div>
            {loading ? (
              <div style={{ textAlign:'center', padding:'2rem', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>Loading...</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign:'center', padding:'2rem', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>
                {filter === 'all' ? 'No resources yet.' : `No ${filter} resources yet.`}
              </div>
            ) : (
              <div style={{ display:'grid', gap:'8px' }}>
                {filtered.map(r => {
                  const tc = TYPE_COLOR[r.resource_type] || TYPE_COLOR.other
                  return (
                    <div key={r.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px', background:'rgba(255,255,255,0.04)', border:`0.5px solid ${tc.border}`, borderRadius:'10px' }}>
                      <div style={{ fontSize:'24px', flexShrink:0 }}>{TYPE_ICON[r.resource_type] || '📎'}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:'14px', fontWeight:600, color:'rgba(255,255,255,0.85)', marginBottom:'3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {r.title}
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
                          <span style={{ fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'10px', background:tc.bg, color:tc.color, textTransform:'uppercase' }}>
                            {r.resource_type}
                          </span>
                          {r.profiles?.full_name && (
                            <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)' }}>by {r.profiles.full_name}</span>
                          )}
                          <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.2)' }}>
                            {new Date(r.created_at).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:'6px', flexShrink:0 }}>
                        {r.file_url && (
                          <a href={r.file_url} target="_blank" rel="noreferrer" style={{ fontSize:'11px', fontWeight:700, padding:'5px 12px', borderRadius:'8px', background:'rgba(30,144,255,0.15)', color:'#5aabff', border:'0.5px solid rgba(30,144,255,0.25)', whiteSpace:'nowrap' }}>
                            Open ↗
                          </a>
                        )}
                        {canUpload && (
                          <button onClick={() => deleteResource(r.id, r.file_url)} style={{ fontSize:'11px', padding:'5px 10px', borderRadius:'8px', background:'rgba(239,68,68,0.1)', color:'#f87171', border:'0.5px solid rgba(239,68,68,0.2)', cursor:'pointer' }}>
                            🗑
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Upload form — teachers/admin only */}
          {canUpload && (
            <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:'12px', padding:'14px' }}>
              <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.7)', marginBottom:'4px' }}>Upload Resource</div>
              <form onSubmit={upload}>
                <label style={lbl}>Title *</label>
                <input style={inp} type="text" placeholder="Resource name" value={title} onChange={e=>setTitle(e.target.value)} required
                  onFocus={e=>e.target.style.borderColor='#1e90ff'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'}/>

                <label style={lbl}>Type</label>
                <select value={type} onChange={e=>setType(e.target.value)} style={{ ...inp }}>
                  <option value="pdf">📄 PDF</option>
                  <option value="video">🎥 Video</option>
                  <option value="doc">📝 Document</option>
                  <option value="other">📎 Other</option>
                </select>

                <label style={lbl}>Upload File</label>
                <input ref={fileRef} style={{ ...inp, padding:'8px 13px' }} type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.mov,.avi"
                  onChange={e => { setFile(e.target.files[0]); setUrl('') }}/>

                <div style={{ textAlign:'center', fontSize:'11px', color:'rgba(255,255,255,0.25)', margin:'8px 0' }}>— or paste a URL —</div>

                <input style={inp} type="url" placeholder="https://drive.google.com/..."
                  value={url} onChange={e => { setUrl(e.target.value); setFile(null); if(fileRef.current) fileRef.current.value='' }}
                  onFocus={e=>e.target.style.borderColor='#1e90ff'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'}/>

                {err && <div style={{ marginTop:'8px', padding:'8px 12px', background:'rgba(220,60,60,0.1)', border:'0.5px solid rgba(220,60,60,0.3)', borderRadius:'8px', fontSize:'13px', color:'#f09595' }}>{err}</div>}
                {ok  && <div style={{ marginTop:'8px', padding:'8px 12px', background:'rgba(16,185,129,0.1)', border:'0.5px solid rgba(16,185,129,0.3)', borderRadius:'8px', fontSize:'13px', color:'#34d399' }}>{ok}</div>}

                <button type="submit" disabled={uploading} style={{ width:'100%', padding:'11px', background:'#1e90ff', color:'#fff', fontSize:'14px', fontWeight:700, border:'none', borderRadius:'10px', cursor:'pointer', marginTop:'12px', opacity:uploading?0.6:1, fontFamily:'inherit' }}>
                  {uploading ? 'Uploading...' : 'Upload Resource'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
