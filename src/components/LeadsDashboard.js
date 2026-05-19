import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import Papa from 'papaparse'

function normalise(row) {
  const g = k => {
    const found = Object.keys(row).find(h => h.trim().toLowerCase() === k.toLowerCase())
    return found ? (row[found] || '').toString().trim() : ''
  }
  function cleanPhone(val) {
    if (!val) return null
    if (/e\+/i.test(val)) {
      try { return Math.round(parseFloat(val)).toString() } catch { return val.replace(/\D/g,'') || null }
    }
    const clean = val.replace(/\D/g, '')
    return clean || null
  }
  const phone    = cleanPhone(g('Phone') || g('phone_number'))
  const whatsapp = cleanPhone(g('WhatsApp number') || g('whatsapp') || g('whatsapp number')) || phone
  const fullName = g('Name') || g('full_name') || g('full name') || 'Unknown'
  return {
    full_name:       fullName,
    created_date:    g('Created') || new Date().toLocaleDateString('en-IN'),
    email:           g('Email') || null,
    source:          g('Source') || 'Facebook Ads',
    channel:         g('Channel') || null,
    stage:           g('Stage') || 'Intake',
    owner:           g('Owner') || 'Unassigned',
    labels:          g('Labels') || null,
    phone,
    secondary:       g('Secondary') || null,
    whatsapp_number: whatsapp,
    status:          'New',
    import_date:     new Date().toISOString().slice(0, 10),
  }
}

function formatDate(d) {
  if (!d) return '—'
  try {
    const dt = new Date(d)
    if (isNaN(dt)) return d
    return dt.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
  } catch { return d }
}

function groupByDate(leads) {
  const map = {}
  leads.forEach(l => {
    const key = l.import_date || 'Unknown'
    if (!map[key]) map[key] = []
    map[key].push(l)
  })
  return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
}

const STATUS_META = {
  New:       { label:'New',       color:'#60a5fa', bg:'rgba(96,165,250,0.12)',   dot:'#3b82f6' },
  Contacted: { label:'Contacted', color:'#fbbf24', bg:'rgba(251,191,36,0.12)',  dot:'#f59e0b' },
  Converted: { label:'Converted', color:'#34d399', bg:'rgba(52,211,153,0.12)',  dot:'#10b981' },
  Lost:      { label:'Lost',      color:'#f87171', bg:'rgba(248,113,113,0.12)', dot:'#ef4444' },
}

const S = {
  wrap:   { fontFamily:"'DM Sans', sans-serif" },
  card:   { background:'rgba(255,255,255,0.03)', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:'16px', padding:'20px' },
  metric: { background:'rgba(255,255,255,0.03)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'16px' },
  badge:  (s) => ({ display:'inline-flex', alignItems:'center', gap:'5px', padding:'3px 10px', borderRadius:'20px', fontSize:'10px', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', background: STATUS_META[s]?.bg || 'rgba(255,255,255,0.07)', color: STATUS_META[s]?.color || '#aaa' }),
  th:     { fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em', textTransform:'uppercase', padding:'8px 12px', textAlign:'left', borderBottom:'0.5px solid rgba(255,255,255,0.07)', whiteSpace:'nowrap' },
  td:     { fontSize:'12px', color:'rgba(255,255,255,0.75)', padding:'10px 12px', borderBottom:'0.5px solid rgba(255,255,255,0.04)', verticalAlign:'middle' },
  btn:    (variant='primary') => ({
    padding: variant==='sm' ? '6px 14px' : '11px 22px',
    borderRadius:'10px', fontSize: variant==='sm' ? '11px' : '13px',
    fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans', sans-serif", border:'none',
    background: variant==='danger' ? 'rgba(239,68,68,0.15)' : variant==='ghost' ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg,#1e90ff,#0066cc)',
    color:      variant==='danger' ? '#f87171'              : variant==='ghost' ? 'rgba(255,255,255,0.5)'   : '#fff',
    transition:'all 0.15s',
  }),
}

export default function LeadsDashboard({ profile }) {
  const [leads,        setLeads]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [uploadMsg,    setUploadMsg]    = useState(null)
  const [search,       setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterDate,   setFilterDate]   = useState('all')
  const [expandedDay,  setExpandedDay]  = useState(null)
  const [dragOver,     setDragOver]     = useState(false)
  const [preview,      setPreview]      = useState(null)
  const [importing,    setImporting]    = useState(false)
  const fileRef = useRef()

  useEffect(() => { loadLeads() }, [])

  useEffect(() => {
    const ch = supabase.channel('leads-rt')
      .on('postgres_changes', { event:'*', schema:'public', table:'leads' }, loadLeads)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  async function loadLeads() {
    setLoading(true)
    const { data } = await supabase.from('leads').select('*')
      .order('import_date', { ascending: false })
      .order('created_at',  { ascending: false })
    setLeads(data || [])
    setLoading(false)
  }

  function handleFile(file) {
    if (!file) return
    if (!file.name.endsWith('.csv')) { setUploadMsg({ type:'err', text:'Please upload a CSV file.' }); return }
    setUploadMsg(null)
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (results) => {
        if (!results.data?.length) { setUploadMsg({ type:'err', text:'CSV is empty.' }); return }
        const rows = results.data.map(normalise).filter(r => r.phone || (r.full_name && r.full_name !== 'Unknown'))
        if (!rows.length) { setUploadMsg({ type:'err', text:'No valid leads found.' }); return }
        setPreview(rows)
      },
      error: () => setUploadMsg({ type:'err', text:'Failed to parse CSV.' }),
    })
  }

  function onFileChange(e) { handleFile(e.target.files[0]) }
  function onDrop(e) { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }

  async function confirmImport() {
    if (!preview?.length) return
    setImporting(true); setUploadMsg(null)
    let imported = 0, skipped = 0
    try {
      for (const row of preview) {
        const { error } = await supabase.from('leads').insert(row)
        if (error) {
          if (error.code === '23505') skipped++  // duplicate phone — skip silently
          else throw error
        } else imported++
      }
      setUploadMsg({ type:'ok', text:`✓ ${imported} leads imported!${skipped > 0 ? ` (${skipped} duplicates skipped)` : ''}` })
      setPreview(null)
      if (fileRef.current) fileRef.current.value = ''
      loadLeads()
    } catch (ex) {
      setUploadMsg({ type:'err', text: ex.message || 'Import failed.' })
    }
    setImporting(false)
  }

  async function updateStatus(id, status) {
    await supabase.from('leads').update({ status }).eq('id', id)
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))
  }

  async function deleteLead(id) {
    if (!window.confirm('Delete this lead?')) return
    await supabase.from('leads').delete().eq('id', id)
    setLeads(prev => prev.filter(l => l.id !== id))
  }

  const today   = new Date().toISOString().slice(0,10)
  const weekAgo = new Date(Date.now() - 7*86400000).toISOString().slice(0,10)

  const filtered = leads.filter(l => {
    if (filterStatus !== 'all' && l.status !== filterStatus) return false
    if (filterDate === 'today' && l.import_date !== today) return false
    if (filterDate === 'week'  && l.import_date < weekAgo) return false
    if (search) {
      const q = search.toLowerCase()
      return (l.full_name||'').toLowerCase().includes(q)
          || (l.phone||'').includes(q)
          || (l.email||'').toLowerCase().includes(q)
    }
    return true
  })

  const grouped    = groupByDate(filtered)
  const todayLeads = leads.filter(l => l.import_date === today).length
  const newLeads   = leads.filter(l => l.status === 'New').length
  const converted  = leads.filter(l => l.status === 'Converted').length

  return (
    <div style={S.wrap}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <div style={{ marginBottom:'20px' }}>
        <div style={{ fontSize:'22px', fontWeight:800, color:'#fff', letterSpacing:'-0.5px' }}>Leads Dashboard</div>
        <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.3)', marginTop:'3px' }}>Upload your Facebook/Instagram CSV — leads save automatically</div>
      </div>

      {/* Metrics */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px', marginBottom:'20px' }}>
        {[
          { icon:'📥', label:"Today's Leads",    value: todayLeads,   color:'#60a5fa' },
          { icon:'👥', label:'Total Leads',       value: leads.length, color:'#a78bfa' },
          { icon:'🔔', label:'New / Uncontacted', value: newLeads,     color:'#fbbf24' },
          { icon:'✅', label:'Converted',         value: converted,    color:'#34d399' },
        ].map(m => (
          <div key={m.label} style={S.metric}>
            <div style={{ fontSize:'20px', marginBottom:'8px' }}>{m.icon}</div>
            <div style={{ fontSize:'24px', fontWeight:800, color:m.color, fontFamily:"'DM Mono',monospace" }}>{m.value}</div>
            <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.3)', marginTop:'3px', fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase' }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Upload */}
      <div style={{ ...S.card, marginBottom:'16px' }}>
        <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.7)', marginBottom:'12px', display:'flex', alignItems:'center', gap:'8px' }}>
          <span>📤</span> Upload Facebook Leads CSV
        </div>
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          style={{ border:`1.5px dashed ${dragOver ? '#1e90ff' : 'rgba(255,255,255,0.12)'}`, borderRadius:'12px', padding:'28px 20px', textAlign:'center', cursor:'pointer', background: dragOver ? 'rgba(30,144,255,0.06)' : 'rgba(255,255,255,0.02)', transition:'all 0.2s' }}
        >
          <div style={{ fontSize:'28px', marginBottom:'8px' }}>📄</div>
          <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.55)', fontWeight:600 }}>{dragOver ? 'Drop it!' : 'Drag & drop CSV here, or click to browse'}</div>
          <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.2)', marginTop:'4px' }}>Supports Facebook Leads CSV format</div>
          <input ref={fileRef} type="file" accept=".csv" onChange={onFileChange} style={{ display:'none' }} />
        </div>

        {uploadMsg && (
          <div style={{ marginTop:'10px', padding:'10px 14px', borderRadius:'10px', fontSize:'13px', background: uploadMsg.type==='ok' ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)', border:`0.5px solid ${uploadMsg.type==='ok' ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)'}`, color: uploadMsg.type==='ok' ? '#34d399' : '#f87171' }}>
            {uploadMsg.text}
          </div>
        )}

        {preview && (
          <div style={{ marginTop:'14px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
              <div style={{ fontSize:'13px', fontWeight:700, color:'#60a5fa' }}>Preview — {preview.length} leads found</div>
              <div style={{ display:'flex', gap:'8px' }}>
                <button style={S.btn('ghost')} onClick={() => { setPreview(null); if(fileRef.current) fileRef.current.value='' }}>Cancel</button>
                <button style={S.btn()} onClick={confirmImport} disabled={importing}>
                  {importing ? 'Importing...' : `Import ${preview.length} Leads`}
                </button>
              </div>
            </div>
            <div style={{ overflowX:'auto', borderRadius:'10px', border:'0.5px solid rgba(255,255,255,0.08)' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'460px' }}>
                <thead>
                  <tr style={{ background:'rgba(255,255,255,0.03)' }}>
                    {['Name','Phone','WhatsApp','Email','Stage'].map(h => <th key={h} style={S.th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0,5).map((r,i) => (
                    <tr key={i}>
                      <td style={S.td}>{r.full_name||'—'}</td>
                      <td style={{ ...S.td, fontFamily:"'DM Mono',monospace", fontSize:'11px' }}>{r.phone||'—'}</td>
                      <td style={{ ...S.td, fontFamily:"'DM Mono',monospace", fontSize:'11px' }}>{r.whatsapp_number||'—'}</td>
                      <td style={S.td}>{r.email||'—'}</td>
                      <td style={S.td}>{r.stage||'—'}</td>
                    </tr>
                  ))}
                  {preview.length > 5 && <tr><td colSpan={5} style={{ ...S.td, textAlign:'center', color:'rgba(255,255,255,0.25)', fontStyle:'italic' }}>+ {preview.length-5} more</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:'8px', marginBottom:'14px', flexWrap:'wrap', alignItems:'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Search name, phone, email..."
          style={{ flex:1, minWidth:'180px', background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'9px 14px', fontSize:'13px', color:'rgba(255,255,255,0.8)', outline:'none', fontFamily:"'DM Sans',sans-serif" }} />
        {['all','today','week'].map(d => (
          <button key={d} onClick={() => setFilterDate(d)} style={{ ...S.btn(filterDate===d?'primary':'ghost'), padding:'8px 14px', fontSize:'12px' }}>
            {d==='all'?'All Time':d==='today'?'Today':'This Week'}
          </button>
        ))}
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ background:'rgba(255,255,255,0.06)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'8px 12px', fontSize:'12px', color:'rgba(255,255,255,0.7)', outline:'none', fontFamily:"'DM Sans',sans-serif", cursor:'pointer' }}>
          <option value="all">All Status</option>
          {Object.entries(STATUS_META).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.25)', marginLeft:'auto' }}>{filtered.length} lead{filtered.length!==1?'s':''}</div>
      </div>

      {/* Leads by day */}
      {loading ? (
        <div style={{ textAlign:'center', padding:'3rem', color:'rgba(255,255,255,0.3)', fontSize:'13px' }}>Loading leads...</div>
      ) : grouped.length === 0 ? (
        <div style={{ textAlign:'center', padding:'4rem 2rem', background:'rgba(255,255,255,0.02)', borderRadius:'16px', border:'0.5px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize:'40px', marginBottom:'12px' }}>📭</div>
          <div style={{ fontSize:'15px', fontWeight:700, color:'rgba(255,255,255,0.4)', marginBottom:'6px' }}>No leads yet</div>
          <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.2)' }}>Upload your Facebook leads CSV above to get started</div>
        </div>
      ) : (
        <div style={{ display:'grid', gap:'10px' }}>
          {grouped.map(([dateKey, dayLeads]) => {
            const isToday    = dateKey === today
            const isExpanded = expandedDay === dateKey || isToday
            const newCount   = dayLeads.filter(l => l.status === 'New').length
            return (
              <div key={dateKey} style={{ ...S.card, padding:'0', overflow:'hidden' }}>
                <div onClick={() => setExpandedDay(isExpanded ? null : dateKey)}
                  style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px 18px', cursor:'pointer', borderBottom: isExpanded ? '0.5px solid rgba(255,255,255,0.07)' : 'none', background: isToday ? 'rgba(30,144,255,0.06)' : 'transparent' }}>
                  <div style={{ fontSize:'18px' }}>{isToday ? '🔴' : '📅'}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'14px', fontWeight:700, color: isToday ? '#60a5fa' : 'rgba(255,255,255,0.8)' }}>
                      {isToday ? 'Today' : formatDate(dateKey)}
                      {isToday && <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', fontWeight:400, marginLeft:'8px' }}>{dateKey}</span>}
                    </div>
                    <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'2px' }}>
                      {dayLeads.length} lead{dayLeads.length!==1?'s':''}
                      {newCount > 0 && <span style={{ color:'#fbbf24', marginLeft:'6px', fontWeight:700 }}>· {newCount} new</span>}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:'5px', flexWrap:'wrap', justifyContent:'flex-end' }}>
                    {Object.entries(STATUS_META).map(([s, meta]) => {
                      const count = dayLeads.filter(l => l.status === s).length
                      if (!count) return null
                      return (
                        <span key={s} style={{ ...S.badge(s), fontSize:'9px' }}>
                          <span style={{ width:'5px', height:'5px', borderRadius:'50%', background:meta.dot, display:'inline-block' }} />
                          {count} {meta.label}
                        </span>
                      )
                    })}
                  </div>
                  <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.2)', marginLeft:'4px' }}>{isExpanded?'▲':'▼'}</div>
                </div>

                {isExpanded && (
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'600px' }}>
                      <thead>
                        <tr style={{ background:'rgba(255,255,255,0.02)' }}>
                          {['Name','Phone','WhatsApp','Email','Source','Status','Actions'].map(h => <th key={h} style={S.th}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {dayLeads.map((lead, i) => (
                          <tr key={lead.id||i}
                            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.02)'}
                            onMouseLeave={e => e.currentTarget.style.background='transparent'}
                            style={{ transition:'background 0.1s' }}>
                            <td style={S.td}>
                              <div style={{ fontWeight:600, color:'rgba(255,255,255,0.9)' }}>{lead.full_name||'—'}</div>
                              {lead.stage && <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.25)' }}>{lead.stage}</div>}
                            </td>
                            <td style={{ ...S.td, fontFamily:"'DM Mono',monospace", fontSize:'11px' }}>
                              {lead.phone ? <a href={`tel:+${lead.phone}`} style={{ color:'#60a5fa', textDecoration:'none' }}>+{lead.phone}</a> : '—'}
                            </td>
                            <td style={{ ...S.td, fontFamily:"'DM Mono',monospace", fontSize:'11px' }}>
                              {(lead.whatsapp_number||lead.phone)
                                ? <a href={`https://wa.me/${lead.whatsapp_number||lead.phone}`} target="_blank" rel="noreferrer" style={{ color:'#34d399', textDecoration:'none', display:'flex', alignItems:'center', gap:'4px' }}>💬 +{lead.whatsapp_number||lead.phone}</a>
                                : '—'}
                            </td>
                            <td style={S.td}>
                              {lead.email ? <a href={`mailto:${lead.email}`} style={{ color:'rgba(255,255,255,0.6)', textDecoration:'none' }}>{lead.email}</a> : '—'}
                            </td>
                            <td style={S.td}>
                              <span style={{ fontSize:'10px', padding:'2px 8px', borderRadius:'6px', background:'rgba(167,139,250,0.12)', color:'#a78bfa', fontWeight:600 }}>{lead.source||'—'}</span>
                            </td>
                            <td style={S.td}>
                              <select value={lead.status||'New'} onChange={e => updateStatus(lead.id, e.target.value)}
                                style={{ background: STATUS_META[lead.status]?.bg||'rgba(255,255,255,0.06)', border:`0.5px solid ${STATUS_META[lead.status]?.color||'rgba(255,255,255,0.1)'}40`, borderRadius:'8px', padding:'4px 8px', fontSize:'11px', color: STATUS_META[lead.status]?.color||'#aaa', fontFamily:"'DM Sans',sans-serif", fontWeight:700, cursor:'pointer', outline:'none' }}>
                                {Object.entries(STATUS_META).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                              </select>
                            </td>
                            <td style={S.td}>
                              <div style={{ display:'flex', gap:'5px' }}>
                                <a href={`https://wa.me/${lead.whatsapp_number||lead.phone}?text=Hi ${encodeURIComponent(lead.full_name||'there')}, thank you for your interest in UniEDD!`}
                                  target="_blank" rel="noreferrer"
                                  style={{ ...S.btn('sm'), textDecoration:'none', padding:'5px 10px', fontSize:'11px', background:'rgba(37,211,102,0.15)', color:'#25d366' }}>WA</a>
                                <button onClick={() => deleteLead(lead.id)} style={{ ...S.btn('danger'), padding:'5px 10px', fontSize:'11px' }}>✕</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
