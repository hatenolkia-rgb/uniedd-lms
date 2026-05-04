import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const LEVELS  = ['Beginner','Intermediate','Advanced']
const MODES   = ['Online','Offline','Hybrid']
const STATUS  = ['Active','Inactive','Coming Soon']

export default function ManageCourses({ profile }) {
  const [courses,  setCourses]  = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId,   setEditId]   = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [ok,       setOk]       = useState('')
  const [err,      setErr]      = useState('')
  const [search,   setSearch]   = useState('')

  const blank = { title:'', description:'', teacher_id:'', fee:'', duration_months:'', category:'', level:'Beginner', mode:'Online', batch_size:'30', syllabus:'', prerequisites:'', status:'Active' }
  const [form, setForm] = useState(blank)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: c }, { data: t }] = await Promise.all([
      supabase.from('courses').select('*, profiles(full_name)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name').eq('role', 'teacher'),
    ])
    setCourses(c || [])
    setTeachers(t || [])
    setLoading(false)
  }

  function openAdd() { setForm(blank); setEditId(null); setShowForm(true); setErr(''); setOk('') }

  function openEdit(c) {
    setForm({
      title:          c.title || '',
      description:    c.description || '',
      teacher_id:     c.teacher_id || '',
      fee:            c.fee || '',
      duration_months:c.duration_months || '',
      category:       c.category || '',
      level:          c.level || 'Beginner',
      mode:           c.mode || 'Online',
      batch_size:     c.batch_size || '30',
      syllabus:       c.syllabus || '',
      prerequisites:  c.prerequisites || '',
      status:         c.status || 'Active',
    })
    setEditId(c.id)
    setShowForm(true)
    setErr(''); setOk('')
  }

  async function saveCourse(e) {
    e.preventDefault()
    if (!form.title.trim()) return setErr('Course title is required.')
    setSaving(true)
    const payload = {
      title:          form.title.trim(),
      description:    form.description || null,
      teacher_id:     form.teacher_id  || null,
      fee:            parseFloat(form.fee) || 0,
      duration_months:parseInt(form.duration_months) || null,
      category:       form.category    || null,
      level:          form.level,
      mode:           form.mode,
      batch_size:     parseInt(form.batch_size) || 30,
      syllabus:       form.syllabus    || null,
      prerequisites:  form.prerequisites || null,
      status:         form.status,
    }
    const { error } = editId
      ? await supabase.from('courses').update(payload).eq('id', editId)
      : await supabase.from('courses').insert(payload)

    if (error) setErr(error.message)
    else {
      setOk(editId ? '✓ Course updated!' : '✓ Course created!')
      setShowForm(false); setEditId(null); setForm(blank); load()
    }
    setSaving(false)
    setTimeout(() => { setOk(''); setErr('') }, 3000)
  }

  async function deleteCourse(id, title) {
    if (!window.confirm('Delete course "' + title + '"?')) return
    await supabase.from('courses').delete().eq('id', id)
    load()
  }

  async function toggleStatus(id, current) {
    const next = current === 'Active' ? 'Inactive' : 'Active'
    await supabase.from('courses').update({ status: next }).eq('id', id)
    load()
  }

  const filtered = courses.filter(c =>
    !search || (c.title||'').toLowerCase().includes(search.toLowerCase()) ||
    (c.category||'').toLowerCase().includes(search.toLowerCase())
  )

  const inp  = { width:'100%', background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'8px', padding:'8px 12px', fontSize:'13px', color:'rgba(255,255,255,0.85)', outline:'none', fontFamily:'inherit', display:'block' }
  const lbl  = { display:'block', fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.35)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'5px', marginTop:'12px' }

  const STATUS_COLOR = {
    'Active':      { bg:'rgba(16,185,129,0.15)',  color:'#10b981' },
    'Inactive':    { bg:'rgba(100,100,100,0.15)', color:'#888'    },
    'Coming Soon': { bg:'rgba(232,124,30,0.15)',  color:'#e87c1e' },
  }

  return (
    <div id="uniedd-manage-courses" style={{ marginTop:'14px' }}>
      <div style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'1rem 1.1rem' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px', paddingBottom:'8px', borderBottom:'0.5px solid rgba(255,255,255,0.06)', flexWrap:'wrap', gap:'8px' }}>
          <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.7)' }}>🎓 Manage Courses</div>
          <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
            <input style={{ ...inp, width:'200px', padding:'6px 12px' }} placeholder="Search courses..."
              value={search} onChange={e=>setSearch(e.target.value)}
              onFocus={e=>e.target.style.borderColor='#1e90ff'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'}/>
            <button onClick={showForm ? () => { setShowForm(false); setEditId(null) } : openAdd} style={{
              fontSize:'12px', fontWeight:700, padding:'6px 14px', borderRadius:'8px',
              background: showForm ? 'rgba(255,255,255,0.07)' : '#1e90ff',
              color: showForm ? 'rgba(255,255,255,0.5)' : '#fff', border:'none', cursor:'pointer', whiteSpace:'nowrap',
            }}>
              {showForm ? '✕ Cancel' : '+ New Course'}
            </button>
          </div>
        </div>

        {ok  && <div style={{ marginBottom:'10px', padding:'8px 12px', background:'rgba(16,185,129,0.1)', border:'0.5px solid rgba(16,185,129,0.3)', borderRadius:'8px', fontSize:'13px', color:'#34d399' }}>{ok}</div>}
        {err && <div style={{ marginBottom:'10px', padding:'8px 12px', background:'rgba(220,60,60,0.1)', border:'0.5px solid rgba(220,60,60,0.3)', borderRadius:'8px', fontSize:'13px', color:'#f09595' }}>{err}</div>}

        {/* Course form */}
        {showForm && (
          <form onSubmit={saveCourse} style={{ background:'rgba(255,255,255,0.04)', borderRadius:'12px', padding:'16px', marginBottom:'16px' }}>
            <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.6)', marginBottom:'12px' }}>
              {editId ? '✏️ Edit Course' : '➕ New Course'}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
              <div>
                <label style={lbl}>Course Title *</label>
                <input style={inp} placeholder="e.g. IELTS Preparation" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} required
                  onFocus={e=>e.target.style.borderColor='#1e90ff'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'}/>
              </div>
              <div>
                <label style={lbl}>Category</label>
                <input style={inp} placeholder="e.g. Language, IELTS, Spoken" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}
                  onFocus={e=>e.target.style.borderColor='#1e90ff'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'}/>
              </div>
              <div>
                <label style={lbl}>Assigned Teacher</label>
                <select style={{ ...inp, cursor:'pointer' }} value={form.teacher_id} onChange={e=>setForm(f=>({...f,teacher_id:e.target.value}))}>
                  <option value="">— Select Teacher —</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Fee (₹)</label>
                <input style={inp} type="number" placeholder="0" value={form.fee} onChange={e=>setForm(f=>({...f,fee:e.target.value}))}
                  onFocus={e=>e.target.style.borderColor='#1e90ff'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'}/>
              </div>
              <div>
                <label style={lbl}>Duration (months)</label>
                <input style={inp} type="number" placeholder="3" value={form.duration_months} onChange={e=>setForm(f=>({...f,duration_months:e.target.value}))}
                  onFocus={e=>e.target.style.borderColor='#1e90ff'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'}/>
              </div>
              <div>
                <label style={lbl}>Batch Size</label>
                <input style={inp} type="number" placeholder="30" value={form.batch_size} onChange={e=>setForm(f=>({...f,batch_size:e.target.value}))}
                  onFocus={e=>e.target.style.borderColor='#1e90ff'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'}/>
              </div>
              <div>
                <label style={lbl}>Level</label>
                <select style={{ ...inp, cursor:'pointer' }} value={form.level} onChange={e=>setForm(f=>({...f,level:e.target.value}))}>
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Mode</label>
                <select style={{ ...inp, cursor:'pointer' }} value={form.mode} onChange={e=>setForm(f=>({...f,mode:e.target.value}))}>
                  {MODES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Status</label>
                <select style={{ ...inp, cursor:'pointer' }} value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                  {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={lbl}>Description</label>
              <textarea style={{ ...inp, minHeight:'70px', resize:'vertical' }} placeholder="Course description..." value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
                onFocus={e=>e.target.style.borderColor='#1e90ff'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'}/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
              <div>
                <label style={lbl}>Syllabus</label>
                <textarea style={{ ...inp, minHeight:'60px', resize:'vertical' }} placeholder="Topics covered..." value={form.syllabus} onChange={e=>setForm(f=>({...f,syllabus:e.target.value}))}
                  onFocus={e=>e.target.style.borderColor='#1e90ff'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'}/>
              </div>
              <div>
                <label style={lbl}>Prerequisites</label>
                <textarea style={{ ...inp, minHeight:'60px', resize:'vertical' }} placeholder="Required skills..." value={form.prerequisites} onChange={e=>setForm(f=>({...f,prerequisites:e.target.value}))}
                  onFocus={e=>e.target.style.borderColor='#1e90ff'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'}/>
              </div>
            </div>
            <button type="submit" disabled={saving} style={{ marginTop:'14px', padding:'10px 28px', background:'#1e90ff', color:'#fff', border:'none', borderRadius:'10px', fontSize:'14px', fontWeight:700, cursor:'pointer', opacity:saving?0.6:1, fontFamily:'inherit' }}>
              {saving ? 'Saving...' : editId ? 'Update Course' : 'Create Course'}
            </button>
          </form>
        )}

        {/* Course list */}
        {loading ? (
          <div style={{ textAlign:'center', padding:'2rem', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>Loading courses...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'2rem', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>
            {search ? 'No courses match your search.' : 'No courses yet. Click "+ New Course" to add one.'}
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px,1fr))', gap:'10px' }}>
            {filtered.map(c => {
              const sc = STATUS_COLOR[c.status] || STATUS_COLOR['Active']
              return (
                <div key={c.id} style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'12px', padding:'14px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px' }}>
                    <div style={{ fontSize:'14px', fontWeight:700, color:'rgba(255,255,255,0.85)', flex:1, marginRight:'8px' }}>{c.title}</div>
                    <span style={{ fontSize:'9px', fontWeight:700, padding:'2px 8px', borderRadius:'10px', background:sc.bg, color:sc.color, whiteSpace:'nowrap', flexShrink:0 }}>
                      {c.status}
                    </span>
                  </div>
                  {c.description && <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.35)', marginBottom:'8px', lineHeight:1.4 }}>{c.description.slice(0,80)}{c.description.length>80?'...':''}</div>}
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'5px', marginBottom:'10px' }}>
                    {c.category && <span style={{ fontSize:'10px', padding:'2px 8px', borderRadius:'10px', background:'rgba(30,144,255,0.12)', color:'#5aabff' }}>{c.category}</span>}
                    {c.level    && <span style={{ fontSize:'10px', padding:'2px 8px', borderRadius:'10px', background:'rgba(139,92,246,0.12)', color:'#a78bfa' }}>{c.level}</span>}
                    {c.mode     && <span style={{ fontSize:'10px', padding:'2px 8px', borderRadius:'10px', background:'rgba(16,185,129,0.12)', color:'#34d399' }}>{c.mode}</span>}
                    {c.fee > 0  && <span style={{ fontSize:'10px', padding:'2px 8px', borderRadius:'10px', background:'rgba(232,124,30,0.12)', color:'#f4a335' }}>₹{c.fee}</span>}
                    {c.duration_months && <span style={{ fontSize:'10px', padding:'2px 8px', borderRadius:'10px', background:'rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.4)' }}>{c.duration_months}mo</span>}
                  </div>
                  {c.profiles?.full_name && (
                    <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', marginBottom:'8px' }}>👨‍🏫 {c.profiles.full_name}</div>
                  )}
                  <div style={{ display:'flex', gap:'6px' }}>
                    <button onClick={() => openEdit(c)} style={{ flex:1, fontSize:'11px', padding:'5px', borderRadius:'7px', background:'rgba(30,144,255,0.15)', color:'#5aabff', border:'0.5px solid rgba(30,144,255,0.2)', cursor:'pointer' }}>
                      ✏️ Edit
                    </button>
                    <button onClick={() => toggleStatus(c.id, c.status)} style={{ flex:1, fontSize:'11px', padding:'5px', borderRadius:'7px', background:c.status==='Active'?'rgba(100,100,100,0.15)':'rgba(16,185,129,0.15)', color:c.status==='Active'?'#888':'#10b981', border:'0.5px solid rgba(255,255,255,0.1)', cursor:'pointer' }}>
                      {c.status === 'Active' ? '⏸ Deactivate' : '▶ Activate'}
                    </button>
                    <button onClick={() => deleteCourse(c.id, c.title)} style={{ fontSize:'11px', padding:'5px 8px', borderRadius:'7px', background:'rgba(239,68,68,0.1)', color:'#f87171', border:'0.5px solid rgba(239,68,68,0.2)', cursor:'pointer' }}>
                      🗑
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
