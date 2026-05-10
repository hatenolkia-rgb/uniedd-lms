import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'

// ── Constants ────────────────────────────────────────────────
const STATUS_STYLE = {
  draft:     { bg:'rgba(100,116,139,0.15)', color:'#94a3b8', label:'Draft'     },
  ready:     { bg:'rgba(244,163,53,0.15)',  color:'#f4a335', label:'Ready'     },
  scheduled: { bg:'rgba(139,92,246,0.15)', color:'#a78bfa', label:'Scheduled' },
  posted:    { bg:'rgba(16,185,129,0.15)', color:'#34d399', label:'Posted'     },
  failed:    { bg:'rgba(239,68,68,0.15)',  color:'#f87171', label:'Failed'     },
}
const PLATFORM_STYLE = {
  instagram: { color:'#e1306c', icon:'📸', label:'Instagram' },
  facebook:  { color:'#1877f2', icon:'👥', label:'Facebook'  },
  youtube:   { color:'#ff0000', icon:'🎥', label:'YouTube'   },
}
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmt(n) { return Number(n||0).toLocaleString('en-IN') }
function fmtCur(n, sym='₹') { return sym + Number(n||0).toLocaleString('en-IN') }

// ── Ads Overview Component ───────────────────────────────────
function AdsOverview() {
  const [data,      setData]      = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [dateRange, setDateRange] = useState('last_30d')
  const [since,     setSince]     = useState('')
  const [until,     setUntil]     = useState('')
  const [isDemo,    setIsDemo]    = useState(false)

  useEffect(() => { loadAds() }, [dateRange, since, until])

  async function loadAds() {
    setLoading(true)
    try {
      let url = '/api/meta-ads?type=account'
      if (dateRange === 'custom' && since && until) url += `&since=${since}&until=${until}`
      const [acctRes, campRes] = await Promise.all([
        fetch(url), fetch('/api/meta-ads?type=campaigns' + (dateRange==='custom'&&since&&until?`&since=${since}&until=${until}`:''))
      ])
      const acct = await acctRes.json()
      const camp = await campRes.json()
      setIsDemo(acct.demo || camp.demo)
      setData(acct.demo ? acct.account_summary : acct.insights)
      setCampaigns(acct.demo ? camp.campaigns : (camp.campaigns||[]))
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  const inp = { background:'#1a2535', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'9px', padding:'7px 11px', fontSize:'12px', color:'rgba(255,255,255,0.85)', outline:'none', fontFamily:'inherit', colorScheme:'dark' }

  const getLeads = (c) => {
    const ins = c.insights || c
    const acts = ins.actions || []
    return parseInt(acts.find(a=>a.action_type==='lead')?.value || 0)
  }
  const getCPL = (c) => {
    const ins = c.insights || c
    const cpts = ins.cost_per_action_type || []
    return parseFloat(cpts.find(a=>a.action_type==='lead')?.value || 0)
  }

  return (
    <div>
      {isDemo && (
        <div style={{ padding:'8px 14px', background:'rgba(244,163,53,0.1)', border:'0.5px solid rgba(244,163,53,0.2)', borderRadius:'10px', fontSize:'12px', color:'#f4a335', marginBottom:'14px' }}>
          ⚡ Showing demo data — add META_ACCESS_TOKEN + META_AD_ACCOUNT_ID in Vercel env vars to see live data
        </div>
      )}

      {/* Date range selector */}
      <div style={{ display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap', alignItems:'center' }}>
        {['last_7d','last_30d','last_90d','custom'].map(r => (
          <button key={r} onClick={() => setDateRange(r)} style={{ fontSize:'11px', fontWeight:700, padding:'5px 12px', borderRadius:'8px', border:'none', cursor:'pointer', fontFamily:'inherit', background:dateRange===r?'#1e90ff':'rgba(255,255,255,0.06)', color:dateRange===r?'#fff':'rgba(255,255,255,0.4)' }}>
            {r==='last_7d'?'7 Days':r==='last_30d'?'30 Days':r==='last_90d'?'90 Days':'Custom'}
          </button>
        ))}
        {dateRange==='custom' && (
          <>
            <input type="date" value={since} onChange={e=>setSince(e.target.value)} style={inp} />
            <span style={{ color:'rgba(255,255,255,0.3)', fontSize:'12px' }}>to</span>
            <input type="date" value={until} onChange={e=>setUntil(e.target.value)} style={inp} />
          </>
        )}
        <button onClick={loadAds} style={{ marginLeft:'auto', fontSize:'11px', padding:'5px 12px', borderRadius:'8px', background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.4)', border:'none', cursor:'pointer', fontFamily:'inherit' }}>↻ Refresh</button>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div style={{ textAlign:'center', padding:'3rem', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>Loading ad data...</div>
      ) : (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px', marginBottom:'16px' }}>
            {[
              { label:'Total Spend',    value: fmtCur(data?.spend||0,'₹'), sub:'INR',            color:'#ef4444', icon:'💸' },
              { label:'Impressions',    value: fmt(data?.impressions),       sub:'Total views',    color:'#5aabff', icon:'👁' },
              { label:'Clicks',         value: fmt(data?.clicks),            sub:'Link clicks',    color:'#a78bfa', icon:'🖱' },
              { label:'Leads',          value: fmt(data?.leads || campaigns.reduce((a,c)=>a+getLeads(c),0)), sub:'From ads', color:'#34d399', icon:'🎯' },
            ].map(k => (
              <div key={k.label} style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'14px 16px' }}>
                <div style={{ fontSize:'20px', marginBottom:'6px' }}>{k.icon}</div>
                <div style={{ fontSize:'22px', fontWeight:800, color:k.color }}>{k.value}</div>
                <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.3)', marginTop:'3px', textTransform:'uppercase', letterSpacing:'0.05em' }}>{k.label}</div>
                <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.2)', marginTop:'1px' }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Secondary metrics */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px', marginBottom:'20px' }}>
            {[
              { label:'CPC',           value:`₹${parseFloat(data?.cpc||data?.spend/Math.max(data?.clicks,1)||0).toFixed(2)}`,  color:'#f4a335' },
              { label:'CPL',           value:`₹${parseFloat(data?.cpl||campaigns.reduce((a,c)=>a+getCPL(c),0)/Math.max(campaigns.length,1)||0).toFixed(2)}`, color:'#f4a335' },
              { label:'Reach',         value:fmt(data?.reach),  color:'#5aabff' },
              { label:'CTR',           value:`${((data?.clicks/Math.max(data?.impressions,1))*100||0).toFixed(2)}%`, color:'#34d399' },
            ].map(k => (
              <div key={k.label} style={{ background:'rgba(255,255,255,0.03)', border:'0.5px solid rgba(255,255,255,0.06)', borderRadius:'12px', padding:'12px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.4)' }}>{k.label}</span>
                <span style={{ fontSize:'15px', fontWeight:800, color:k.color }}>{k.value}</span>
              </div>
            ))}
          </div>

          {/* Campaign breakdown */}
          <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.6)', marginBottom:'10px' }}>📊 Campaign Breakdown</div>
          <div style={{ display:'grid', gap:'8px' }}>
            {campaigns.map((c,i) => {
              const ins    = c.insights || c
              const leads  = getLeads(c)
              const cpl    = getCPL(c)
              const spend  = parseFloat(ins.spend||0)
              const imps   = parseInt(ins.impressions||0)
              const clicks = parseInt(ins.clicks||0)
              const isActive = c.status === 'ACTIVE'

              return (
                <div key={c.id||i} style={{ display:'flex', alignItems:'center', gap:'14px', padding:'14px 16px', background:'rgba(255,255,255,0.03)', borderRadius:'12px', border:`0.5px solid rgba(255,255,255,0.07)` }}>
                  <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:isActive?'#34d399':'#94a3b8', flexShrink:0, boxShadow:isActive?'0 0 6px #34d399':'none' }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'13px', fontWeight:600, color:'rgba(255,255,255,0.85)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</div>
                    <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'2px' }}>{c.objective?.replace(/_/g,' ')} · {c.status}</div>
                  </div>
                  {[
                    { label:'Spend',   val:`₹${spend.toFixed(0)}`,      color:'#ef4444' },
                    { label:'Impress', val:fmt(imps),                    color:'#5aabff' },
                    { label:'Clicks',  val:fmt(clicks),                  color:'#a78bfa' },
                    { label:'Leads',   val:leads,                        color:'#34d399' },
                    { label:'CPL',     val:cpl?`₹${cpl.toFixed(0)}`:'—',color:'#f4a335' },
                  ].map(m => (
                    <div key={m.label} style={{ textAlign:'center', minWidth:'56px', flexShrink:0 }}>
                      <div style={{ fontSize:'14px', fontWeight:800, color:m.color }}>{m.val}</div>
                      <div style={{ fontSize:'9px', color:'rgba(255,255,255,0.25)' }}>{m.label.toUpperCase()}</div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>

          {/* Leads funnel from DB */}
          <LeadsFunnel />
        </>
      )}
    </div>
  )
}

// Pull lead data from Supabase to show funnel
function LeadsFunnel() {
  const [stats, setStats] = useState(null)
  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('leads').select('status,source')
      if (!data) return
      const total     = data.length
      const fromAds   = data.filter(l=>l.source?.toLowerCase().includes('google')||l.source?.toLowerCase().includes('facebook')||l.source?.toLowerCase().includes('instagram')||l.source?.toLowerCase().includes('ads')).length
      const contacted = data.filter(l=>['contacted','demo_scheduled','enrolled'].includes(l.status)).length
      const enrolled  = data.filter(l=>l.status==='enrolled').length
      setStats({ total, fromAds, contacted, enrolled })
    }
    load()
  }, [])

  if (!stats) return null
  const steps = [
    { label:'Total Leads',   value:stats.total,     color:'#5aabff', pct:100 },
    { label:'From Ads',      value:stats.fromAds,   color:'#a78bfa', pct:Math.round(stats.fromAds/Math.max(stats.total,1)*100) },
    { label:'Contacted',     value:stats.contacted, color:'#f4a335', pct:Math.round(stats.contacted/Math.max(stats.total,1)*100) },
    { label:'Enrolled',      value:stats.enrolled,  color:'#34d399', pct:Math.round(stats.enrolled/Math.max(stats.total,1)*100) },
  ]
  return (
    <div style={{ marginTop:'20px' }}>
      <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.6)', marginBottom:'10px' }}>🎯 Leads Funnel (from LMS)</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px' }}>
        {steps.map(s => (
          <div key={s.label} style={{ background:'rgba(255,255,255,0.03)', borderRadius:'12px', padding:'14px', border:`0.5px solid ${s.color}22` }}>
            <div style={{ fontSize:'24px', fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:'11px', fontWeight:600, color:'rgba(255,255,255,0.5)', margin:'4px 0 8px' }}>{s.label}</div>
            <div style={{ height:'4px', borderRadius:'2px', background:'rgba(255,255,255,0.07)' }}>
              <div style={{ height:'4px', borderRadius:'2px', background:s.color, width:`${s.pct}%`, transition:'width 1s' }}/>
            </div>
            <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.25)', marginTop:'4px' }}>{s.pct}%</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Content Calendar Component ───────────────────────────────
function ContentCalendar({ profile }) {
  const now   = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [posts, setPosts] = useState([])
  const [selDay,setSelDay]= useState(null)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => { loadPosts() }, [year, month])

  async function loadPosts() {
    const start = `${year}-${String(month+1).padStart(2,'0')}-01`
    const end   = `${year}-${String(month+1).padStart(2,'0')}-31`
    const { data } = await supabase.from('marketing_posts')
      .select('*').gte('scheduled_at', start).lte('scheduled_at', end + 'T23:59:59')
      .order('scheduled_at')
    setPosts(data || [])
  }

  const firstDay   = new Date(year, month, 1).getDay()
  const daysInMonth= new Date(year, month+1, 0).getDate()
  const cells = []
  for (let i=0; i<firstDay; i++) cells.push(null)
  for (let d=1; d<=daysInMonth; d++) cells.push(d)
  const todayDay = now.getFullYear()===year&&now.getMonth()===month ? now.getDate() : null

  function getPostsForDay(day) {
    const dateKey = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    return posts.filter(p => p.scheduled_at?.startsWith(dateKey))
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px', flexWrap:'wrap', gap:'10px' }}>
        <div style={{ fontSize:'14px', fontWeight:700, color:'rgba(255,255,255,0.7)' }}>
          {MONTHS[month]} {year}
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          <button onClick={()=>setShowCreate(true)} style={{ fontSize:'12px', fontWeight:700, padding:'7px 16px', borderRadius:'10px', background:'linear-gradient(135deg,#1e90ff,#0ea5e9)', color:'#fff', border:'none', cursor:'pointer', fontFamily:'inherit' }}>+ New Post</button>
          <button onClick={()=>{if(month===0){setMonth(11);setYear(y=>y-1)}else setMonth(m=>m-1)}} style={{ width:'28px',height:'28px',borderRadius:'6px',background:'rgba(255,255,255,0.07)',border:'none',color:'#fff',cursor:'pointer',fontSize:'14px'}}>‹</button>
          <button onClick={()=>{if(month===11){setMonth(0);setYear(y=>y+1)}else setMonth(m=>m+1)}} style={{ width:'28px',height:'28px',borderRadius:'6px',background:'rgba(255,255,255,0.07)',border:'none',color:'#fff',cursor:'pointer',fontSize:'14px'}}>›</button>
        </div>
      </div>

      {/* Day headers */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'2px', marginBottom:'4px' }}>
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>(
          <div key={d} style={{ textAlign:'center', fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.25)', padding:'4px 0', letterSpacing:'0.05em' }}>{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'3px' }}>
        {cells.map((day,i) => {
          if (!day) return <div key={`e${i}`}/>
          const dayPosts = getPostsForDay(day)
          const isToday  = day === todayDay
          const isSel    = day === selDay
          return (
            <div key={day} onClick={()=>setSelDay(isSel?null:day)}
              style={{ minHeight:'52px', borderRadius:'8px', padding:'4px', cursor:'pointer',
                background:isSel?'rgba(30,144,255,0.2)':isToday?'rgba(30,144,255,0.08)':'rgba(255,255,255,0.03)',
                border:isSel?'1px solid #1e90ff':isToday?'1px solid rgba(30,144,255,0.3)':'1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize:'12px', fontWeight:isToday?700:400, color:isToday?'#1e90ff':'rgba(255,255,255,0.6)', marginBottom:'3px' }}>{day}</div>
              {dayPosts.slice(0,2).map((p,pi) => {
                const plat = p.platforms?.[0]
                const ps   = PLATFORM_STYLE[plat] || PLATFORM_STYLE.instagram
                const ss   = STATUS_STYLE[p.status] || STATUS_STYLE.draft
                return (
                  <div key={pi} style={{ fontSize:'9px', fontWeight:700, padding:'2px 5px', borderRadius:'4px', marginBottom:'2px', background:ss.bg, color:ss.color, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {ps.icon} {p.title}
                  </div>
                )
              })}
              {dayPosts.length > 2 && <div style={{ fontSize:'9px', color:'rgba(255,255,255,0.3)' }}>+{dayPosts.length-2}</div>}
            </div>
          )
        })}
      </div>

      {/* Selected day posts */}
      {selDay && (
        <div style={{ marginTop:'14px', borderTop:'0.5px solid rgba(255,255,255,0.07)', paddingTop:'14px' }}>
          <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.6)', marginBottom:'10px' }}>
            {MONTHS[month]} {selDay} — {getPostsForDay(selDay).length} post{getPostsForDay(selDay).length!==1?'s':''}
          </div>
          {getPostsForDay(selDay).length === 0
            ? <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.2)', textAlign:'center', padding:'1rem' }}>No posts scheduled — click "+ New Post" to add one</div>
            : getPostsForDay(selDay).map(p => <PostCard key={p.id} post={p} onUpdate={loadPosts} profile={profile} />)
          }
        </div>
      )}

      {/* Create post modal */}
      {showCreate && <CreatePostModal day={selDay} month={month} year={year} profile={profile} onClose={()=>setShowCreate(false)} onSave={()=>{setShowCreate(false);loadPosts()}} />}
    </div>
  )
}

// ── Post Card ────────────────────────────────────────────────
function PostCard({ post, onUpdate, profile }) {
  const [posting, setPosting] = useState(false)
  const [msg,     setMsg]     = useState('')
  const ss = STATUS_STYLE[post.status] || STATUS_STYLE.draft

  async function publishNow() {
    if (!window.confirm('Post to selected platforms now?')) return
    setPosting(true); setMsg('')
    try {
      const res  = await fetch('/api/meta-post', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ caption:post.caption, mediaUrl:post.media_url, mediaType:post.media_type, platforms:post.platforms })
      })
      const data = await res.json()
      if (data.success || data.demo) {
        await supabase.from('marketing_posts').update({ status:'posted', posted_at: new Date().toISOString(), post_ids: data.results || {} }).eq('id', post.id)
        setMsg('✓ Posted successfully!')
        onUpdate()
      } else {
        setMsg('Post failed: ' + JSON.stringify(data.error))
      }
    } catch(e) { setMsg('Error: ' + e.message) }
    setPosting(false)
  }

  async function updateStatus(status) {
    await supabase.from('marketing_posts').update({ status }).eq('id', post.id)
    onUpdate()
  }

  async function deletePost() {
    if (!window.confirm('Delete this post?')) return
    await supabase.from('marketing_posts').delete().eq('id', post.id)
    onUpdate()
  }

  return (
    <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:'12px', padding:'14px', marginBottom:'10px', border:`0.5px solid ${ss.color}22` }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:'12px' }}>
        {post.media_url && (
          <img src={post.media_url} alt="" style={{ width:'60px', height:'60px', borderRadius:'8px', objectFit:'cover', flexShrink:0 }} onError={e=>e.target.style.display='none'} />
        )}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px', flexWrap:'wrap' }}>
            <span style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.85)' }}>{post.title}</span>
            <span style={{ fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'6px', background:ss.bg, color:ss.color }}>{ss.label}</span>
            {(post.platforms||[]).map(p => <span key={p} style={{ fontSize:'12px' }}>{PLATFORM_STYLE[p]?.icon}</span>)}
          </div>
          {post.caption && <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.4)', lineHeight:1.5, marginBottom:'8px', overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{post.caption}</div>}
          {post.scheduled_at && <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)' }}>📅 {new Date(post.scheduled_at).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hour12:true})}</div>}
        </div>
      </div>
      {msg && <div style={{ fontSize:'12px', color:msg.startsWith('✓')?'#34d399':'#f87171', marginTop:'8px' }}>{msg}</div>}
      <div style={{ display:'flex', gap:'6px', marginTop:'10px', flexWrap:'wrap' }}>
        {post.status !== 'posted' && (
          <button onClick={publishNow} disabled={posting} style={{ fontSize:'11px', fontWeight:700, padding:'6px 14px', borderRadius:'8px', background:'linear-gradient(135deg,#1e90ff,#0ea5e9)', color:'#fff', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
            {posting ? '⏳ Posting...' : '📤 Post Now'}
          </button>
        )}
        {post.status === 'draft' && <button onClick={()=>updateStatus('ready')} style={{ fontSize:'11px', fontWeight:700, padding:'6px 12px', borderRadius:'8px', background:'rgba(244,163,53,0.15)', color:'#f4a335', border:'none', cursor:'pointer', fontFamily:'inherit' }}>✓ Mark Ready</button>}
        {post.status === 'ready' && <button onClick={()=>updateStatus('scheduled')} style={{ fontSize:'11px', fontWeight:700, padding:'6px 12px', borderRadius:'8px', background:'rgba(139,92,246,0.15)', color:'#a78bfa', border:'none', cursor:'pointer', fontFamily:'inherit' }}>📅 Mark Scheduled</button>}
        <button onClick={deletePost} style={{ fontSize:'11px', fontWeight:700, padding:'6px 10px', borderRadius:'8px', background:'rgba(239,68,68,0.1)', color:'#f87171', border:'none', cursor:'pointer', fontFamily:'inherit' }}>🗑</button>
      </div>
    </div>
  )
}

// ── Create Post Modal ────────────────────────────────────────
function CreatePostModal({ day, month, year, profile, onClose, onSave }) {
  const [title,     setTitle]     = useState('')
  const [caption,   setCaption]   = useState('')
  const [mediaUrl,  setMediaUrl]  = useState('')
  const [mediaType, setMediaType] = useState('image')
  const [platforms, setPlatforms] = useState(['instagram','facebook'])
  const [status,    setStatus]    = useState('draft')
  const [schedTime, setSchedTime] = useState('10:00')
  const [file,      setFile]      = useState(null)
  const [uploading, setUploading] = useState(false)
  const [err,       setErr]       = useState('')
  const fileRef = useRef()

  const schedDate = day
    ? `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    : new Date().toISOString().slice(0,10)

  function togglePlatform(p) {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x=>x!==p) : [...prev,p])
  }

  async function uploadFile() {
    if (!file) return mediaUrl
    setUploading(true)
    const path = `posts/${Date.now()}-${file.name.replace(/\s+/g,'-')}`
    const { error } = await supabase.storage.from('marketing').upload(path, file, { contentType:file.type, upsert:true })
    if (error) { setErr('Upload failed: ' + error.message); setUploading(false); return null }
    const { data:{ publicUrl } } = supabase.storage.from('marketing').getPublicUrl(path)
    setUploading(false)
    return publicUrl
  }

  async function save() {
    if (!title.trim()) return setErr('Title required')
    if (!platforms.length) return setErr('Select at least one platform')
    setErr('')
    const url = file ? await uploadFile() : mediaUrl
    if (file && !url) return
    await supabase.from('marketing_posts').insert({
      title: title.trim(), caption, media_url: url, media_type: mediaType,
      platforms, status, created_by: profile.id,
      scheduled_at: `${schedDate}T${schedTime}:00`,
    })
    onSave()
  }

  const inp = { width:'100%', background:'#1a2535', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'10px 13px', fontSize:'13px', color:'rgba(255,255,255,0.85)', outline:'none', fontFamily:'inherit', colorScheme:'dark', boxSizing:'border-box' }
  const lbl = { display:'block', fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'5px', marginTop:'12px' }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
      <div style={{ background:'#0f1923', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'16px', padding:'24px', width:'100%', maxWidth:'520px', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
          <div style={{ fontSize:'15px', fontWeight:800, color:'#fff' }}>✍ New Post</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.4)', fontSize:'20px', cursor:'pointer', lineHeight:1 }}>×</button>
        </div>

        <label style={lbl}>Title *</label>
        <input style={inp} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Post title (internal reference)" />

        <label style={lbl}>Caption / Copy</label>
        <textarea style={{ ...inp, minHeight:'80px', resize:'vertical' }} value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Write your post caption here..." />

        <label style={lbl}>Platforms</label>
        <div style={{ display:'flex', gap:'8px' }}>
          {['instagram','facebook','youtube'].map(p => {
            const ps = PLATFORM_STYLE[p]
            return (
              <button key={p} type="button" onClick={()=>togglePlatform(p)} style={{ flex:1, padding:'8px', borderRadius:'10px', border:`1.5px solid ${platforms.includes(p)?ps.color:'rgba(255,255,255,0.08)'}`, background:platforms.includes(p)?`${ps.color}18`:'rgba(255,255,255,0.03)', cursor:'pointer', fontFamily:'inherit', textAlign:'center' }}>
                <div style={{ fontSize:'18px' }}>{ps.icon}</div>
                <div style={{ fontSize:'10px', fontWeight:700, color:platforms.includes(p)?'#fff':'rgba(255,255,255,0.4)', marginTop:'3px' }}>{ps.label}</div>
              </button>
            )
          })}
        </div>

        <label style={lbl}>Media Type</label>
        <select style={inp} value={mediaType} onChange={e=>setMediaType(e.target.value)}>
          <option value="image">🖼 Image</option>
          <option value="video">🎥 Video</option>
          <option value="reel">🎬 Reel</option>
          <option value="story">📱 Story</option>
        </select>

        <label style={lbl}>Media</label>
        <button type="button" onClick={()=>fileRef.current?.click()} style={{ width:'100%', padding:'10px', borderRadius:'10px', border:'1.5px dashed rgba(255,255,255,0.15)', background:'rgba(255,255,255,0.03)', color:'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:'12px', fontFamily:'inherit', marginBottom:'6px' }}>
          {file ? `✓ ${file.name}` : '📁 Upload image or video'}
        </button>
        <input ref={fileRef} type="file" onChange={e=>setFile(e.target.files[0])} style={{ display:'none' }} accept="image/*,video/*" />
        <input style={inp} type="url" placeholder="OR paste media URL" value={mediaUrl} onChange={e=>setMediaUrl(e.target.value)} />

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
          <div>
            <label style={lbl}>Schedule Date</label>
            <input style={inp} type="date" defaultValue={schedDate} />
          </div>
          <div>
            <label style={lbl}>Time</label>
            <input style={inp} type="time" value={schedTime} onChange={e=>setSchedTime(e.target.value)} />
          </div>
        </div>

        <label style={lbl}>Status</label>
        <select style={inp} value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="draft">Draft</option>
          <option value="ready">Ready</option>
          <option value="scheduled">Scheduled</option>
        </select>

        {err && <div style={{ marginTop:'10px', padding:'8px 12px', background:'rgba(239,68,68,0.1)', color:'#f87171', borderRadius:'8px', fontSize:'12px' }}>{err}</div>}

        <div style={{ display:'flex', gap:'8px', marginTop:'16px' }}>
          <button onClick={save} disabled={uploading} style={{ flex:1, padding:'12px', background:'linear-gradient(135deg,#1e90ff,#0ea5e9)', color:'#fff', fontSize:'14px', fontWeight:800, border:'none', borderRadius:'10px', cursor:'pointer', fontFamily:'inherit' }}>
            {uploading ? '⏳ Uploading...' : '💾 Save Post'}
          </button>
          <button onClick={onClose} style={{ padding:'12px 20px', background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.5)', border:'none', borderRadius:'10px', cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Asset Library Component ──────────────────────────────────
function AssetLibrary({ profile }) {
  const [assets,   setAssets]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('all')
  const [uploading,setUploading]= useState(false)
  const [ok,       setOk]       = useState('')
  const fileRef = useRef()

  useEffect(() => { loadAssets() }, [])

  async function loadAssets() {
    setLoading(true)
    const { data } = await supabase.from('marketing_assets').select('*, profiles(full_name)').order('created_at', { ascending:false })
    setAssets(data || [])
    setLoading(false)
  }

  async function handleUpload(e) {
    const file = e.target.files[0]; if (!file) return
    setUploading(true)
    const path = `assets/${Date.now()}-${file.name.replace(/\s+/g,'-')}`
    const { error } = await supabase.storage.from('marketing').upload(path, file, { contentType:file.type, upsert:true })
    if (error) { alert('Upload failed: ' + error.message); setUploading(false); return }
    const { data:{ publicUrl } } = supabase.storage.from('marketing').getPublicUrl(path)
    const type = file.type.startsWith('video') ? 'video' : 'image'
    await supabase.from('marketing_assets').insert({
      name: file.name, type, url: publicUrl, size_bytes: file.size,
      status:'uploaded', uploaded_by: profile.id
    })
    setOk('✓ Uploaded: ' + file.name)
    setTimeout(()=>setOk(''),4000)
    loadAssets()
    setUploading(false)
  }

  async function updateAssetStatus(id, status) {
    await supabase.from('marketing_assets').update({ status, approved_by: status==='approved'?profile.id:null }).eq('id',id)
    loadAssets()
  }

  const filtered = filter === 'all' ? assets : assets.filter(a => a.type===filter||a.status===filter)
  const STATUS_ASSET = {
    uploaded:  { bg:'rgba(30,144,255,0.1)',  color:'#5aabff'  },
    editing:   { bg:'rgba(244,163,53,0.1)',  color:'#f4a335'  },
    approved:  { bg:'rgba(16,185,129,0.1)',  color:'#34d399'  },
    published: { bg:'rgba(139,92,246,0.1)',  color:'#a78bfa'  },
  }

  return (
    <div>
      <div style={{ display:'flex', gap:'10px', marginBottom:'14px', flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ display:'flex', gap:'6px', flex:1, flexWrap:'wrap' }}>
          {['all','image','video','uploaded','editing','approved'].map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{ fontSize:'11px', fontWeight:600, padding:'5px 12px', borderRadius:'8px', border:'none', cursor:'pointer', fontFamily:'inherit', background:filter===f?'#1e90ff':'rgba(255,255,255,0.06)', color:filter===f?'#fff':'rgba(255,255,255,0.4)', textTransform:'capitalize' }}>{f}</button>
          ))}
        </div>
        <button onClick={()=>fileRef.current?.click()} disabled={uploading} style={{ fontSize:'12px', fontWeight:700, padding:'7px 16px', borderRadius:'10px', background:'linear-gradient(135deg,#8b5cf6,#6d28d9)', color:'#fff', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
          {uploading ? '⏳ Uploading...' : '⬆ Upload Asset'}
        </button>
        <input ref={fileRef} type="file" onChange={handleUpload} style={{ display:'none' }} accept="image/*,video/*" />
      </div>
      {ok && <div style={{ padding:'8px 12px', background:'rgba(16,185,129,0.1)', color:'#34d399', borderRadius:'8px', fontSize:'12px', marginBottom:'10px' }}>{ok}</div>}

      {loading ? (
        <div style={{ textAlign:'center', padding:'3rem', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'3rem', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>No assets yet — upload your first image or video</div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:'10px' }}>
          {filtered.map(a => {
            const st = STATUS_ASSET[a.status] || STATUS_ASSET.uploaded
            return (
              <div key={a.id} style={{ background:'rgba(255,255,255,0.04)', borderRadius:'12px', overflow:'hidden', border:'0.5px solid rgba(255,255,255,0.07)' }}>
                {/* Thumbnail */}
                <div style={{ height:'120px', background:'rgba(255,255,255,0.05)', position:'relative', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
                  {a.type==='image' ? (
                    <img src={a.url} alt={a.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>e.target.style.display='none'} />
                  ) : (
                    <div style={{ fontSize:'36px' }}>🎥</div>
                  )}
                  <span style={{ position:'absolute', top:6, right:6, fontSize:'9px', fontWeight:700, padding:'2px 7px', borderRadius:'6px', background:st.bg, color:st.color }}>{a.status}</span>
                </div>
                <div style={{ padding:'10px' }}>
                  <div style={{ fontSize:'11px', fontWeight:600, color:'rgba(255,255,255,0.7)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:'6px' }}>{a.name}</div>
                  <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.25)', marginBottom:'8px' }}>
                    {a.type} · {a.size_bytes ? (a.size_bytes/1024/1024).toFixed(1)+'MB' : ''}
                  </div>
                  <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
                    {a.status==='uploaded' && <button onClick={()=>updateAssetStatus(a.id,'editing')} style={{ fontSize:'9px', fontWeight:700, padding:'3px 8px', borderRadius:'5px', background:'rgba(244,163,53,0.12)', color:'#f4a335', border:'none', cursor:'pointer', fontFamily:'inherit' }}>Editing</button>}
                    {a.status==='editing'  && <button onClick={()=>updateAssetStatus(a.id,'approved')} style={{ fontSize:'9px', fontWeight:700, padding:'3px 8px', borderRadius:'5px', background:'rgba(16,185,129,0.12)', color:'#34d399', border:'none', cursor:'pointer', fontFamily:'inherit' }}>✓ Approve</button>}
                    <a href={a.url} target="_blank" rel="noreferrer" style={{ fontSize:'9px', fontWeight:700, padding:'3px 8px', borderRadius:'5px', background:'rgba(30,144,255,0.12)', color:'#5aabff', textDecoration:'none' }}>↗ Open</a>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main Marketing Hub ───────────────────────────────────────
const TABS = [
  { id:'ads',      label:'📊 Ads Analytics',    },
  { id:'calendar', label:'📅 Content Calendar', },
  { id:'assets',   label:'🎬 Asset Library',    },
]

export default function MarketingHub({ profile }) {
  const [tab, setTab] = useState('ads')

  return (
    <div id="uniedd-marketing" style={{ marginTop:'14px' }}>
      <div style={{ fontSize:'16px', fontWeight:700, color:'rgba(255,255,255,0.85)', marginBottom:'4px' }}>🚀 Marketing Hub</div>
      <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.3)', marginBottom:'16px' }}>
        Meta Ads analytics · Content calendar · Post to Instagram & Facebook · Asset library
      </div>

      {/* Tab bar */}
      <div style={{ display:'flex', gap:'6px', marginBottom:'20px', borderBottom:'0.5px solid rgba(255,255,255,0.07)', paddingBottom:'12px' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ fontSize:'12px', fontWeight:700, padding:'8px 18px', borderRadius:'10px', border:'none', cursor:'pointer', fontFamily:'inherit', background:tab===t.id?'linear-gradient(135deg,#1e90ff,#0ea5e9)':'rgba(255,255,255,0.05)', color:tab===t.id?'#fff':'rgba(255,255,255,0.45)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'ads'      && <AdsOverview />}
      {tab === 'calendar' && <ContentCalendar profile={profile} />}
      {tab === 'assets'   && <AssetLibrary profile={profile} />}
    </div>
  )
}
