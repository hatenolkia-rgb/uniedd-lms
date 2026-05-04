import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const ROLES = ['student','teacher','sales','admin']
const ROLE_COLOR = {
  admin:   { bg:'rgba(232,124,30,0.15)',  color:'#e87c1e' },
  teacher: { bg:'rgba(30,144,255,0.15)',  color:'#1e90ff' },
  student: { bg:'rgba(16,185,129,0.15)',  color:'#10b981' },
  sales:   { bg:'rgba(139,92,246,0.15)',  color:'#8b5cf6' },
}

export default function ManageUsers({ profile }) {
  const [users,    setUsers]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState('all')
  const [editing,  setEditing]  = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [ok,       setOk]       = useState('')
  const [err,      setErr]      = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }

  async function updateRole(id, role) {
    setSaving(true)
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
    if (error) setErr(error.message)
    else { setOk('Role updated!'); setEditing(null); load() }
    setSaving(false)
    setTimeout(() => { setOk(''); setErr('') }, 3000)
  }

  async function deleteUser(id, email) {
    if (!window.confirm('Delete user ' + email + '? This cannot be undone.')) return
    await supabase.from('profiles').delete().eq('id', id)
    load()
  }

  const filtered = users.filter(u => {
    const matchRole   = filter === 'all' || u.role === filter
    const matchSearch = !search ||
      (u.full_name||'').toLowerCase().includes(search.toLowerCase()) ||
      (u.email||'').toLowerCase().includes(search.toLowerCase())
    return matchRole && matchSearch
  })

  const inp = { background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'8px', padding:'8px 12px', fontSize:'13px', color:'rgba(255,255,255,0.85)', outline:'none', fontFamily:'inherit' }

  return (
    <div id="uniedd-manage-users" style={{ marginTop:'14px' }}>
      <div style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'1rem 1.1rem' }}>

        <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.7)', marginBottom:'14px', paddingBottom:'8px', borderBottom:'0.5px solid rgba(255,255,255,0.06)' }}>
          👥 Manage Users & Roles
        </div>

        {/* Stats */}
        <div style={{ display:'flex', gap:'8px', marginBottom:'12px', flexWrap:'wrap' }}>
          {ROLES.map(r => {
            const count = users.filter(u => u.role === r).length
            const rc = ROLE_COLOR[r]
            return (
              <div key={r} style={{ padding:'5px 12px', borderRadius:'20px', background:rc.bg, fontSize:'11px', fontWeight:700, color:rc.color, textTransform:'capitalize' }}>
                {r}: {count}
              </div>
            )
          })}
          <div style={{ padding:'5px 12px', borderRadius:'20px', background:'rgba(255,255,255,0.07)', fontSize:'11px', fontWeight:700, color:'rgba(255,255,255,0.4)' }}>
            Total: {users.length}
          </div>
        </div>

        {/* Search + filter */}
        <div style={{ display:'flex', gap:'8px', marginBottom:'12px', flexWrap:'wrap' }}>
          <input style={{ ...inp, flex:1, minWidth:'180px' }} placeholder="Search by name or email..."
            value={search} onChange={e=>setSearch(e.target.value)}
            onFocus={e=>e.target.style.borderColor='#1e90ff'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'}/>
          <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
            {['all',...ROLES].map(r => (
              <button key={r} onClick={() => setFilter(r)} style={{
                fontSize:'11px', fontWeight:600, padding:'6px 12px', borderRadius:'20px', cursor:'pointer', border:'none',
                background: filter===r ? '#1e90ff' : 'rgba(255,255,255,0.07)',
                color: filter===r ? '#fff' : 'rgba(255,255,255,0.45)',
                textTransform:'capitalize',
              }}>{r}</button>
            ))}
          </div>
        </div>

        {ok  && <div style={{ marginBottom:'8px', padding:'8px 12px', background:'rgba(16,185,129,0.1)', border:'0.5px solid rgba(16,185,129,0.3)', borderRadius:'8px', fontSize:'13px', color:'#34d399' }}>{ok}</div>}
        {err && <div style={{ marginBottom:'8px', padding:'8px 12px', background:'rgba(220,60,60,0.1)', border:'0.5px solid rgba(220,60,60,0.3)', borderRadius:'8px', fontSize:'13px', color:'#f09595' }}>{err}</div>}

        {loading ? (
          <div style={{ textAlign:'center', padding:'2rem', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'2rem', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>No users found.</div>
        ) : (
          <div style={{ display:'grid', gap:'6px' }}>
            {filtered.map(u => {
              const rc = ROLE_COLOR[u.role] || ROLE_COLOR.student
              const isMe = u.id === profile.id
              const isEditing = editing === u.id
              return (
                <div key={u.id} style={{
                  display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', flexWrap:'wrap',
                  background: isEditing ? 'rgba(30,144,255,0.08)' : 'rgba(255,255,255,0.03)',
                  border: isEditing ? '0.5px solid rgba(30,144,255,0.3)' : '0.5px solid rgba(255,255,255,0.05)',
                  borderRadius:'10px',
                }}>
                  <div style={{ width:'34px', height:'34px', borderRadius:'50%', background:rc.bg, color:rc.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:800, flexShrink:0 }}>
                    {(u.full_name||u.email||'?').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:'120px' }}>
                    <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.85)', fontWeight:600 }}>
                      {u.full_name || '—'} {isMe && <span style={{ fontSize:'10px', color:'#e87c1e' }}>(you)</span>}
                    </div>
                    <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'1px' }}>
                      {u.email} {u.phone && '· ' + u.phone} {u.student_id && '· ' + u.student_id}
                    </div>
                  </div>
                  {isEditing ? (
                    <select value={u.role} onChange={e => updateRole(u.id, e.target.value)} disabled={saving}
                      style={{ ...inp, fontSize:'12px', cursor:'pointer' }}>
                      {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
                    </select>
                  ) : (
                    <span style={{ fontSize:'10px', fontWeight:700, padding:'3px 10px', borderRadius:'20px', background:rc.bg, color:rc.color, textTransform:'capitalize', flexShrink:0 }}>
                      {u.role}
                    </span>
                  )}
                  <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.2)', flexShrink:0 }}>
                    {new Date(u.created_at).toLocaleDateString('en-IN')}
                  </div>
                  <div style={{ display:'flex', gap:'5px', flexShrink:0 }}>
                    {isEditing ? (
                      <button onClick={() => setEditing(null)} style={{ fontSize:'11px', padding:'4px 10px', borderRadius:'6px', background:'rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.5)', border:'none', cursor:'pointer' }}>
                        Cancel
                      </button>
                    ) : (
                      <button onClick={() => { setEditing(u.id); setErr(''); setOk('') }} style={{ fontSize:'11px', padding:'4px 10px', borderRadius:'6px', background:'rgba(30,144,255,0.15)', color:'#5aabff', border:'0.5px solid rgba(30,144,255,0.2)', cursor:'pointer' }}>
                        Change Role
                      </button>
                    )}
                    {!isMe && (
                      <button onClick={() => deleteUser(u.id, u.email)} style={{ fontSize:'11px', padding:'4px 8px', borderRadius:'6px', background:'rgba(239,68,68,0.1)', color:'#f87171', border:'0.5px solid rgba(239,68,68,0.2)', cursor:'pointer' }}>
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
    </div>
  )
}
