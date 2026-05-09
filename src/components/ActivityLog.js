import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabaseClient'

const EVENT_COLOR = {
  login:      { bg:'rgba(16,185,129,0.12)',  color:'#34d399', icon:'🟢' },
  logout:     { bg:'rgba(239,68,68,0.1)',    color:'#f87171', icon:'🔴' },
  heartbeat:  { bg:'rgba(30,144,255,0.08)',  color:'#5aabff', icon:'💙' },
  page_view:  { bg:'rgba(139,92,246,0.1)',   color:'#a78bfa', icon:'👁'  },
}
const ROLE_COLOR = {
  admin:   '#ef4444',
  teacher: '#8b5cf6',
  sales:   '#f4a335',
  student: '#1e90ff',
}

function fmtDuration(sec) {
  if (!sec || sec < 0) return '—'
  if (sec < 60)   return `${sec}s`
  if (sec < 3600) return `${Math.floor(sec/60)}m ${sec%60}s`
  return `${Math.floor(sec/3600)}h ${Math.floor((sec%3600)/60)}m`
}

function fmtTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-IN', {
    day:'2-digit', month:'short', year:'numeric',
    hour:'2-digit', minute:'2-digit', hour12:true
  })
}

function timeAgo(ts) {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff/60000)
  if (m < 1)   return 'just now'
  if (m < 60)  return `${m}m ago`
  if (m < 1440) return `${Math.floor(m/60)}h ago`
  return `${Math.floor(m/1440)}d ago`
}

export default function ActivityLog() {
  const [logs,      setLogs]      = useState([])
  const [users,     setUsers]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [view,      setView]      = useState('summary')  // summary | detail | user
  const [selUser,   setSelUser]   = useState(null)
  const [dateFrom,  setDateFrom]  = useState('')
  const [dateTo,    setDateTo]    = useState('')
  const [roleFilter,setRoleFilter]= useState('all')
  const [page,      setPage]      = useState(0)
  const PER_PAGE = 50

  const loadLogs = useCallback(async () => {
    setLoading(true)

    let q = supabase.from('user_activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)

    if (selUser)   q = q.eq('user_id', selUser)
    if (dateFrom)  q = q.gte('created_at', dateFrom + 'T00:00:00')
    if (dateTo)    q = q.lte('created_at', dateTo   + 'T23:59:59')
    if (roleFilter !== 'all') q = q.eq('user_role', roleFilter)

    const { data } = await q
    setLogs(data || [])
    setLoading(false)
  }, [selUser, dateFrom, dateTo, roleFilter])

  async function loadUsers() {
    const { data } = await supabase.from('profiles').select('id,full_name,email,role').order('full_name')
    setUsers(data || [])
  }

  useEffect(() => { loadUsers() }, [])
  useEffect(() => { loadLogs() }, [loadLogs])

  // ── Compute per-user summary from logs ────────────────────────
  const userSummary = React.useMemo(() => {
    const map = {}
    logs.forEach(l => {
      if (!map[l.user_id]) {
        map[l.user_id] = {
          user_id:    l.user_id,
          user_name:  l.user_name,
          user_email: l.user_email,
          user_role:  l.user_role,
          logins:     0,
          logouts:    0,
          totalSec:   0,
          lastSeen:   null,
          firstSeen:  null,
          sessions:   new Set(),
        }
      }
      const u = map[l.user_id]
      if (l.event_type === 'login')  u.logins++
      if (l.event_type === 'logout') { u.logouts++; u.totalSec += (l.duration_sec||0) }
      if (l.session_id) u.sessions.add(l.session_id)
      if (!u.lastSeen  || l.created_at > u.lastSeen)  u.lastSeen  = l.created_at
      if (!u.firstSeen || l.created_at < u.firstSeen) u.firstSeen = l.created_at
    })
    return Object.values(map).sort((a,b) => (b.lastSeen||'') > (a.lastSeen||'') ? 1 : -1)
  }, [logs])

  // ── Group logs by session for detail view ─────────────────────
  const sessionGroups = React.useMemo(() => {
    if (!selUser) return []
    const userLogs = logs.filter(l => l.user_id === selUser)
    const groups   = {}
    userLogs.forEach(l => {
      const sid = l.session_id || 'unknown'
      if (!groups[sid]) groups[sid] = { session_id: sid, events: [], start: null, end: null, duration: 0 }
      groups[sid].events.push(l)
      if (!groups[sid].start || l.created_at < groups[sid].start) groups[sid].start = l.created_at
      if (!groups[sid].end   || l.created_at > groups[sid].end)   groups[sid].end   = l.created_at
      if (l.event_type === 'logout') groups[sid].duration = l.duration_sec || 0
    })
    return Object.values(groups).sort((a,b) => (b.start||'') > (a.start||'') ? 1 : -1)
  }, [logs, selUser])

  const paginatedLogs = logs.slice(page * PER_PAGE, (page+1) * PER_PAGE)
  const totalPages    = Math.ceil(logs.length / PER_PAGE)

  const inp = { background:'#1a2535', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'8px 12px', fontSize:'13px', color:'rgba(255,255,255,0.85)', outline:'none', fontFamily:'inherit', colorScheme:'dark' }

  return (
    <div id="uniedd-activity-log" style={{ marginTop:'14px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px', flexWrap:'wrap', gap:'10px' }}>
        <div>
          <div style={{ fontSize:'16px', fontWeight:700, color:'rgba(255,255,255,0.85)' }}>📊 User Activity Log</div>
          <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.3)', marginTop:'2px' }}>Login times, session durations, page views — every user tracked</div>
        </div>
        <button onClick={loadLogs} style={{ fontSize:'12px', padding:'7px 14px', borderRadius:'9px', background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.5)', border:'none', cursor:'pointer', fontFamily:'inherit' }}>↻ Refresh</button>
      </div>

      {/* ── Filters ── */}
      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'14px', alignItems:'center' }}>
        <select value={roleFilter} onChange={e=>{setRoleFilter(e.target.value);setSelUser(null)}} style={{ ...inp, width:'auto' }}>
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="teacher">Teacher</option>
          <option value="sales">Sales</option>
          <option value="student">Student</option>
        </select>

        <select value={selUser||''} onChange={e=>{setSelUser(e.target.value||null);setView(e.target.value?'user':'summary')}} style={{ ...inp, width:'auto', minWidth:'160px' }}>
          <option value="">All Users</option>
          {users.filter(u => roleFilter==='all' || u.role===roleFilter).map(u=>(
            <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
          ))}
        </select>

        <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{ ...inp }} title="From date" />
        <span style={{ color:'rgba(255,255,255,0.3)', fontSize:'12px' }}>to</span>
        <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{ ...inp }} title="To date" />

        {(dateFrom||dateTo||selUser||roleFilter!=='all') && (
          <button onClick={()=>{setDateFrom('');setDateTo('');setSelUser(null);setRoleFilter('all');setView('summary')}} style={{ fontSize:'11px', padding:'7px 12px', borderRadius:'8px', background:'rgba(239,68,68,0.1)', color:'#f87171', border:'none', cursor:'pointer', fontFamily:'inherit' }}>✕ Clear</button>
        )}
      </div>

      {/* ── View tabs ── */}
      <div style={{ display:'flex', gap:'6px', marginBottom:'14px' }}>
        {[
          { id:'summary', label:'👥 User Summary' },
          { id:'detail',  label:'📋 All Events'   },
          ...(selUser ? [{ id:'user', label:'👤 Session Detail' }] : []),
        ].map(t=>(
          <button key={t.id} onClick={()=>setView(t.id)} style={{ fontSize:'12px', fontWeight:600, padding:'7px 14px', borderRadius:'10px', border:'none', cursor:'pointer', fontFamily:'inherit', background:view===t.id?'#1e90ff':'rgba(255,255,255,0.06)', color:view===t.id?'#fff':'rgba(255,255,255,0.5)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'4rem', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>Loading activity logs...</div>
      ) : (

        <>
          {/* ── SUMMARY VIEW ── */}
          {view === 'summary' && (
            <>
              {/* Stats row */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px', marginBottom:'16px' }}>
                {[
                  { label:'Total Logins',    value: logs.filter(l=>l.event_type==='login').length,   color:'#34d399' },
                  { label:'Active Users',    value: new Set(logs.map(l=>l.user_id)).size,             color:'#5aabff' },
                  { label:'Total Sessions',  value: new Set(logs.map(l=>l.session_id)).size,          color:'#a78bfa' },
                  { label:'Events Today',    value: logs.filter(l=>l.created_at?.startsWith(new Date().toISOString().slice(0,10))).length, color:'#f4a335' },
                ].map(s=>(
                  <div key={s.label} style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'12px', padding:'14px', textAlign:'center' }}>
                    <div style={{ fontSize:'24px', fontWeight:800, color:s.color }}>{s.value}</div>
                    <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.3)', marginTop:'3px', letterSpacing:'0.05em' }}>{s.label.toUpperCase()}</div>
                  </div>
                ))}
              </div>

              {/* Per-user table */}
              {userSummary.length === 0 ? (
                <div style={{ textAlign:'center', padding:'4rem', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>No activity logged yet. Logs are collected as users log in.</div>
              ) : (
                <div style={{ background:'rgba(255,255,255,0.03)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'14px', overflow:'hidden' }}>
                  {/* Table header */}
                  <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 80px 80px 80px 100px 120px', gap:'0', padding:'10px 16px', background:'rgba(255,255,255,0.04)', borderBottom:'0.5px solid rgba(255,255,255,0.07)' }}>
                    {['User','Role','Logins','Sessions','Total Time','Last Seen',''].map(h=>(
                      <div key={h} style={{ fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.3)', letterSpacing:'0.08em', textTransform:'uppercase' }}>{h}</div>
                    ))}
                  </div>

                  {userSummary.map((u,i)=>(
                    <div key={u.user_id} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 80px 80px 80px 100px 120px', gap:'0', padding:'12px 16px', borderBottom: i < userSummary.length-1 ? '0.5px solid rgba(255,255,255,0.04)' : 'none', alignItems:'center', transition:'background 0.1s' }}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.03)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                    >
                      {/* User */}
                      <div>
                        <div style={{ fontSize:'13px', fontWeight:600, color:'rgba(255,255,255,0.85)' }}>{u.user_name||'—'}</div>
                        <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'1px' }}>{u.user_email}</div>
                      </div>
                      {/* Role */}
                      <div>
                        <span style={{ fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'6px', background:`${ROLE_COLOR[u.user_role]||'#888'}18`, color:ROLE_COLOR[u.user_role]||'#aaa', textTransform:'capitalize' }}>{u.user_role}</span>
                      </div>
                      {/* Logins */}
                      <div style={{ fontSize:'14px', fontWeight:700, color:'#34d399' }}>{u.logins}</div>
                      {/* Sessions */}
                      <div style={{ fontSize:'14px', fontWeight:700, color:'#5aabff' }}>{u.sessions.size}</div>
                      {/* Total time */}
                      <div style={{ fontSize:'13px', fontWeight:600, color:'#a78bfa' }}>{fmtDuration(u.totalSec)}</div>
                      {/* Last seen */}
                      <div>
                        <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.6)' }}>{timeAgo(u.lastSeen)}</div>
                        <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.25)' }}>{u.lastSeen ? new Date(u.lastSeen).toLocaleDateString('en-IN') : '—'}</div>
                      </div>
                      {/* View detail */}
                      <div>
                        <button onClick={()=>{ setSelUser(u.user_id); setView('user') }} style={{ fontSize:'11px', fontWeight:700, padding:'5px 12px', borderRadius:'8px', background:'rgba(30,144,255,0.12)', color:'#5aabff', border:'0.5px solid rgba(30,144,255,0.2)', cursor:'pointer', fontFamily:'inherit' }}>
                          View Sessions →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── SESSION DETAIL VIEW (single user) ── */}
          {view === 'user' && selUser && (
            <>
              {/* User header */}
              {(() => {
                const u = userSummary.find(x => x.user_id === selUser)
                return u ? (
                  <div style={{ display:'flex', alignItems:'center', gap:'14px', padding:'14px 16px', background:'rgba(255,255,255,0.04)', borderRadius:'12px', marginBottom:'14px', border:'0.5px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ width:'44px', height:'44px', borderRadius:'50%', background:`${ROLE_COLOR[u.user_role]||'#888'}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', fontWeight:800, color:ROLE_COLOR[u.user_role]||'#aaa' }}>
                      {(u.user_name||'?').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'15px', fontWeight:700, color:'#fff' }}>{u.user_name}</div>
                      <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.4)' }}>{u.user_email} · {u.user_role}</div>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,80px)', gap:'10px', textAlign:'center' }}>
                      {[
                        { label:'Logins',   value: u.logins,        color:'#34d399' },
                        { label:'Sessions', value: u.sessions.size,  color:'#5aabff' },
                        { label:'Time',     value: fmtDuration(u.totalSec), color:'#a78bfa' },
                      ].map(s=>(
                        <div key={s.label} style={{ background:'rgba(255,255,255,0.05)', borderRadius:'10px', padding:'8px' }}>
                          <div style={{ fontSize:'16px', fontWeight:800, color:s.color }}>{s.value}</div>
                          <div style={{ fontSize:'9px', color:'rgba(255,255,255,0.3)' }}>{s.label.toUpperCase()}</div>
                        </div>
                      ))}
                    </div>
                    <button onClick={()=>{setSelUser(null);setView('summary')}} style={{ fontSize:'12px', padding:'7px 14px', borderRadius:'9px', background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.4)', border:'none', cursor:'pointer', fontFamily:'inherit' }}>← Back</button>
                  </div>
                ) : null
              })()}

              {/* Sessions list */}
              {sessionGroups.length === 0 ? (
                <div style={{ textAlign:'center', padding:'3rem', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>No sessions found.</div>
              ) : sessionGroups.map((sess, si) => (
                <div key={sess.session_id} style={{ background:'rgba(255,255,255,0.03)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'12px', marginBottom:'10px', overflow:'hidden' }}>
                  {/* Session header */}
                  <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 16px', background:'rgba(255,255,255,0.04)', borderBottom:'0.5px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize:'11px', fontWeight:700, padding:'3px 10px', borderRadius:'8px', background:'rgba(30,144,255,0.15)', color:'#5aabff' }}>Session #{sessionGroups.length - si}</div>
                    <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.7)' }}>
                      {fmtTime(sess.start)}
                    </div>
                    {sess.duration > 0 && (
                      <div style={{ fontSize:'12px', fontWeight:700, padding:'3px 10px', borderRadius:'8px', background:'rgba(139,92,246,0.12)', color:'#a78bfa' }}>
                        ⏱ {fmtDuration(sess.duration)}
                      </div>
                    )}
                    <div style={{ marginLeft:'auto', fontSize:'11px', color:'rgba(255,255,255,0.3)' }}>{sess.events.length} events</div>
                  </div>

                  {/* Events in session */}
                  <div style={{ padding:'8px 16px' }}>
                    {sess.events.sort((a,b)=>a.created_at>b.created_at?1:-1).map((ev,ei)=>{
                      const ec = EVENT_COLOR[ev.event_type] || EVENT_COLOR.page_view
                      return (
                        <div key={ev.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'6px 0', borderBottom: ei < sess.events.length-1 ? '0.5px solid rgba(255,255,255,0.04)' : 'none' }}>
                          <span style={{ fontSize:'12px' }}>{ec.icon}</span>
                          <span style={{ fontSize:'11px', fontWeight:700, padding:'2px 8px', borderRadius:'6px', background:ec.bg, color:ec.color, minWidth:'70px', textAlign:'center' }}>{ev.event_type}</span>
                          <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.5)', flex:1 }}>{ev.page || '/'}</span>
                          {ev.event_type==='logout' && ev.duration_sec && (
                            <span style={{ fontSize:'11px', color:'#a78bfa', fontWeight:600 }}>⏱ {fmtDuration(ev.duration_sec)}</span>
                          )}
                          <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.25)', flexShrink:0 }}>{fmtTime(ev.created_at)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ── ALL EVENTS (raw log) ── */}
          {view === 'detail' && (
            <>
              <div style={{ background:'rgba(255,255,255,0.03)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'14px', overflow:'hidden' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 100px 1fr 120px', padding:'10px 16px', background:'rgba(255,255,255,0.04)', borderBottom:'0.5px solid rgba(255,255,255,0.07)' }}>
                  {['User','Role','Event','Page','Time'].map(h=>(
                    <div key={h} style={{ fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.3)', letterSpacing:'0.08em', textTransform:'uppercase' }}>{h}</div>
                  ))}
                </div>
                {paginatedLogs.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'3rem', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>No events found for selected filters.</div>
                ) : paginatedLogs.map((l,i)=>{
                  const ec = EVENT_COLOR[l.event_type] || EVENT_COLOR.page_view
                  return (
                    <div key={l.id} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 100px 1fr 120px', padding:'10px 16px', borderBottom: i < paginatedLogs.length-1 ? '0.5px solid rgba(255,255,255,0.04)' : 'none', alignItems:'center' }}>
                      <div>
                        <div style={{ fontSize:'12px', fontWeight:600, color:'rgba(255,255,255,0.8)' }}>{l.user_name||'—'}</div>
                        <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.3)' }}>{l.user_email}</div>
                      </div>
                      <span style={{ fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'6px', background:`${ROLE_COLOR[l.user_role]||'#888'}18`, color:ROLE_COLOR[l.user_role]||'#aaa', width:'fit-content', textTransform:'capitalize' }}>{l.user_role}</span>
                      <span style={{ fontSize:'11px', fontWeight:700, padding:'3px 8px', borderRadius:'6px', background:ec.bg, color:ec.color, width:'fit-content' }}>{ec.icon} {l.event_type}</span>
                      <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.4)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.page||'/'}</span>
                      <div>
                        <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.5)' }}>{timeAgo(l.created_at)}</div>
                        <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.25)' }}>{new Date(l.created_at).toLocaleString('en-IN',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'short'})}</div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display:'flex', gap:'6px', justifyContent:'center', marginTop:'12px' }}>
                  <button onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0} style={{ padding:'6px 14px', borderRadius:'8px', border:'none', cursor:'pointer', background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.5)', fontFamily:'inherit', opacity:page===0?0.3:1 }}>← Prev</button>
                  <span style={{ padding:'6px 14px', fontSize:'12px', color:'rgba(255,255,255,0.4)' }}>Page {page+1} of {totalPages}</span>
                  <button onClick={()=>setPage(p=>Math.min(totalPages-1,p+1))} disabled={page===totalPages-1} style={{ padding:'6px 14px', borderRadius:'8px', border:'none', cursor:'pointer', background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.5)', fontFamily:'inherit', opacity:page===totalPages-1?0.3:1 }}>Next →</button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
