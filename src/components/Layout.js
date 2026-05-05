import React, { useState } from 'react'
import { supabase } from '../supabaseClient'

const ROLES = {
  admin:   { label:'Admin',   color:'#e87c1e', bg:'rgba(232,124,30,0.15)', border:'rgba(232,124,30,0.3)', accent:'#e87c1e' },
  teacher: { label:'Teacher', color:'#1e90ff', bg:'rgba(30,144,255,0.15)', border:'rgba(30,144,255,0.3)', accent:'#1e90ff' },
  student: { label:'Student', color:'#10b981', bg:'rgba(16,185,129,0.15)', border:'rgba(16,185,129,0.3)', accent:'#10b981' },
  sales:   { label:'Sales',   color:'#8b5cf6', bg:'rgba(139,92,246,0.15)', border:'rgba(139,92,246,0.3)', accent:'#8b5cf6' },
}

const ROLE_PORTAL = {
  admin:   'Admin Portal',
  teacher: 'Teacher Portal',
  sales:   'Sales Portal',
  student: 'Student Portal',
}

const NAV_ITEMS = {
  admin: [
    { id:'uniedd-top',            icon:'chart',   label:'Overview'  },
    { id:'uniedd-manage-users',   icon:'users',   label:'Users'     },
    { id:'uniedd-payments',       icon:'card',    label:'Payments'  },
    { id:'uniedd-manage-courses', icon:'courses', label:'Courses'   },
    { id:'uniedd-calendar',       icon:'cal',     label:'Calendar'  },
    { id:'uniedd-resources',      icon:'book',    label:'Resources' },
  ],
  teacher: [
    { id:'classes',    icon:'video',   label:'Classes'     },
    { id:'students',   icon:'users',   label:'My Students' },
    { id:'attendance', icon:'check',   label:'Attendance'  },
    { id:'calendar',   icon:'cal',     label:'Calendar'    },
    { id:'resources',  icon:'book',    label:'Resources'   },
    { id:'support',    icon:'chat',    label:'Support'     },
  ],
  sales: [
    { id:'leads',   icon:'leads',   label:'Leads'          },
    { id:'bulk',    icon:'upload',  label:'Bulk Upload'    },
    { id:'funnel',  icon:'funnel',  label:'Funnel'         },
    { id:'demo',    icon:'play',    label:'Schedule Demo'  },
    { id:'classes', icon:'cal',     label:'Teacher Classes'},
    { id:'invoice', icon:'invoice', label:'Invoice'        },
    { id:'calendar',icon:'cal2',    label:'Calendar'       },
    { id:'resources',icon:'book',   label:'Resources'      },
  ],
}

// SVG icons — clean monoline
function NavIcon({ type, size = 16 }) {
  const s = { width: size, height: size, flexShrink: 0 }
  const icons = {
    chart:    <svg {...s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="1" y="8" width="3" height="6" rx="0.5"/><rect x="6" y="5" width="3" height="9" rx="0.5"/><rect x="11" y="2" width="3" height="12" rx="0.5"/></svg>,
    users:    <svg {...s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="6" cy="5" r="2.5"/><path d="M1 13c0-2.76 2.24-5 5-5s5 2.24 5 5"/><circle cx="12" cy="5" r="2"/><path d="M15 13c0-2-1.34-3.7-3.2-4.3"/></svg>,
    card:     <svg {...s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="1" y="3" width="14" height="10" rx="1.5"/><path d="M1 7h14"/><path d="M4 10.5h2"/></svg>,
    courses:  <svg {...s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M8 2L14 5v4c0 3-2.5 4.5-6 5C2.5 13.5 0 12 0 9V5l6-3z" transform="translate(1,0)"/><path d="M8 2v12M5 6l3 2 3-2"/></svg>,
    cal:      <svg {...s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="1" y="2" width="14" height="13" rx="1.5"/><path d="M1 7h14M5 1v3M11 1v3"/></svg>,
    cal2:     <svg {...s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="1" y="2" width="14" height="13" rx="1.5"/><path d="M1 7h14M5 1v3M11 1v3M5 10h2M9 10h2"/></svg>,
    book:     <svg {...s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 2h9a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"/><path d="M8 2v12M5 5h1.5M5 7.5h1.5M5 10h1.5"/></svg>,
    video:    <svg {...s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="1" y="3" width="9" height="10" rx="1.5"/><path d="M10 6l4-2v8l-4-2"/></svg>,
    check:    <svg {...s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6.5"/><path d="M5 8l2 2 4-4"/></svg>,
    chat:     <svg {...s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M14 9.5a6 6 0 01-8.4 5.5L2 16l1-3.6A6 6 0 118 2h.5A6 6 0 0114 8v1.5z"/></svg>,
    leads:    <svg {...s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="5" r="3"/><path d="M2 14c0-3.31 2.69-6 6-6s6 2.69 6 6"/><path d="M10.5 3.5l2-2M12.5 1.5l1.5 1.5"/></svg>,
    upload:   <svg {...s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M8 10V2M5 5l3-3 3 3"/><path d="M2 12v1a1 1 0 001 1h10a1 1 0 001-1v-1"/></svg>,
    funnel:   <svg {...s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2h12l-4.5 6v5l-3-1.5V8z"/></svg>,
    play:     <svg {...s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6.5"/><path d="M6.5 5.5l5 2.5-5 2.5z"/></svg>,
    invoice:  <svg {...s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="1" width="12" height="14" rx="1.5"/><path d="M5 5h6M5 8h6M5 11h4"/></svg>,
  }
  return icons[type] || icons.book
}

function SidebarLayout({ profile, navItems, activeTab, onNavClick, portalLabel, children }) {
  const cfg      = ROLES[profile.role] || ROLES.student
  const initials = (profile.full_name || profile.email || 'U').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()

  return (
    <div style={{ minHeight:'100vh', background:'#0c1118', display:'flex' }}>
      {/* ── SIDEBAR ── */}
      <div style={{
        width:'220px', flexShrink:0, background:'#0f1923',
        borderRight:'0.5px solid rgba(255,255,255,0.07)',
        display:'flex', flexDirection:'column',
        position:'sticky', top:0, height:'100vh', overflowY:'auto',
      }}>
        {/* Logo */}
        <div style={{ padding:'22px 18px 16px', borderBottom:'0.5px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontFamily:"'Arial Black',sans-serif", fontWeight:900, letterSpacing:'-0.02em' }}>
            <span style={{ color:'#1e90ff', fontSize:'22px' }}>UNI</span>
            <span style={{ color:'#e87c1e', fontSize:'22px' }}>EDD</span>
          </div>
          <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.22)', marginTop:'4px', letterSpacing:'0.07em', textTransform:'uppercase' }}>{portalLabel}</div>
        </div>

        {/* User card */}
        <div style={{ padding:'14px 16px', borderBottom:'0.5px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'34px', height:'34px', borderRadius:'50%', background:cfg.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:800, color:'#fff', flexShrink:0, letterSpacing:'-0.02em' }}>
            {initials}
          </div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:'13px', fontWeight:600, color:'rgba(255,255,255,0.85)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.2 }}>
              {profile.full_name || profile.email}
            </div>
            <span style={{ display:'inline-block', marginTop:'4px', fontSize:'9px', padding:'2px 8px', borderRadius:'10px', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', background:cfg.bg, color:cfg.color, border:`0.5px solid ${cfg.border}` }}>
              {cfg.label}
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding:'10px 10px', flex:1 }}>
          {navItems.map(item => {
            const isActive = activeTab === item.id
            return (
              <button key={item.id} onClick={() => onNavClick(item.id)} style={{
                display:'flex', alignItems:'center', gap:'11px',
                width:'100%', padding:'10px 10px', borderRadius:'9px', border:'none', cursor:'pointer',
                fontFamily:'inherit', textAlign:'left', marginBottom:'2px', transition:'all 0.12s',
                background: isActive ? `${cfg.bg}` : 'transparent',
                color:      isActive ? cfg.color       : 'rgba(255,255,255,0.38)',
                fontWeight: isActive ? 600              : 400,
                fontSize:   '13px',
              }}>
                <NavIcon type={item.icon} size={15} />
                <span style={{ flex:1 }}>{item.label}</span>
                {isActive && (
                  <div style={{ width:'3px', height:'18px', background:cfg.color, borderRadius:'2px', flexShrink:0 }} />
                )}
              </button>
            )
          })}
        </nav>

        {/* Sign out */}
        <div style={{ padding:'12px', borderTop:'0.5px solid rgba(255,255,255,0.06)' }}>
          <button onClick={() => supabase.auth.signOut()} style={{
            width:'100%', padding:'9px', fontSize:'12px',
            color:'rgba(255,255,255,0.3)',
            background:'rgba(255,255,255,0.03)',
            border:'0.5px solid rgba(255,255,255,0.07)',
            borderRadius:'8px', cursor:'pointer', fontFamily:'inherit',
            transition:'all 0.15s',
          }}>Sign out</button>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <main style={{ flex:1, padding:'2rem', minWidth:0, maxWidth:'1200px' }}>
        {children}
      </main>
    </div>
  )
}

// ── PUBLIC LAYOUT COMPONENT ──────────────────────────────────
export default function Layout({ profile, pageTitle, children, activeTab, onTabChange }) {
  const role = profile.role
  const [internalTab, setInternalTab] = useState(
    role === 'admin' ? 'uniedd-top' :
    role === 'teacher' ? 'classes' :
    role === 'sales' ? 'leads' : null
  )

  const navItems = NAV_ITEMS[role]
  const portalLabel = ROLE_PORTAL[role] || 'Portal'

  // Sidebar-based roles
  if (navItems) {
    const currentTab  = activeTab  ?? internalTab
    const handleClick = onTabChange ?? ((id) => {
      setInternalTab(id)
      // For admin: scroll-to sections. For others: tab switching handled by caller.
      if (role === 'admin') {
        if (id === 'uniedd-top') { window.scrollTo({ top:0, behavior:'smooth' }); return }
        const el = document.getElementById(id)
        if (el) el.scrollIntoView({ behavior:'smooth', block:'start' })
      }
    })

    return (
      <SidebarLayout
        profile={profile}
        navItems={navItems}
        activeTab={currentTab}
        onNavClick={handleClick}
        portalLabel={portalLabel}
      >
        {children}
      </SidebarLayout>
    )
  }

  // Student: keep simple top-nav (no sidebar needed)
  const cfg      = ROLES[role] || ROLES.student
  const initials = (profile.full_name || profile.email || 'U').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()

  return (
    <div style={{ minHeight:'100vh', background:'#0c1118' }}>
      <nav style={{ background:'#0f1923', borderBottom:'0.5px solid rgba(255,255,255,0.07)', height:'54px', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 1.5rem', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
          <div style={{ fontFamily:"'Arial Black',sans-serif", fontWeight:900 }}>
            <span style={{ color:'#1e90ff', fontSize:'18px' }}>UNI</span>
            <span style={{ color:'#e87c1e', fontSize:'18px' }}>EDD</span>
          </div>
          {pageTitle && <span style={{ fontSize:'15px', fontWeight:600, color:'rgba(255,255,255,0.55)' }}>{pageTitle}</span>}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <span style={{ fontSize:'10px', padding:'3px 10px', borderRadius:'20px', fontWeight:700, letterSpacing:'0.05em', textTransform:'uppercase', background:cfg.bg, color:cfg.color, border:`0.5px solid ${cfg.border}` }}>{cfg.label}</span>
          <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:cfg.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:800, color:'#fff' }}>{initials}</div>
          <button onClick={() => { const el=document.getElementById('uniedd-calendar'); if(el) el.scrollIntoView({behavior:'smooth'}) }} style={{ fontSize:'12px', color:'rgba(255,255,255,0.5)', background:'rgba(30,144,255,0.1)', border:'0.5px solid rgba(30,144,255,0.2)', borderRadius:'6px', padding:'5px 11px', cursor:'pointer', fontFamily:'inherit' }}>📅 Calendar</button>
          <button onClick={() => { const el=document.getElementById('uniedd-resources'); if(el) el.scrollIntoView({behavior:'smooth'}) }} style={{ fontSize:'12px', color:'rgba(255,255,255,0.5)', background:'rgba(16,185,129,0.1)', border:'0.5px solid rgba(16,185,129,0.2)', borderRadius:'6px', padding:'5px 11px', cursor:'pointer', fontFamily:'inherit' }}>📚 Resources</button>
          <button onClick={() => supabase.auth.signOut()} style={{ fontSize:'12px', color:'rgba(255,255,255,0.4)', background:'none', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'6px', padding:'5px 11px', cursor:'pointer', fontFamily:'inherit' }}>Sign out</button>
        </div>
      </nav>
      <main style={{ padding:'1.5rem', maxWidth:'1200px', margin:'0 auto' }}>
        {children}
      </main>
    </div>
  )
}

// ── SHARED UI PRIMITIVES ─────────────────────────────────────
export function PageHeader({ title, subtitle }) {
  return (
    <div id="uniedd-top" style={{ marginBottom:'1.5rem' }}>
      <h1 style={{ fontSize:'26px', fontWeight:800, color:'#fff', letterSpacing:'-0.03em', margin:0 }}>{title}</h1>
      {subtitle && <p style={{ fontSize:'13px', color:'rgba(255,255,255,0.28)', marginTop:'5px' }}>{subtitle}</p>}
    </div>
  )
}

export function Grid4({ children }) {
  return <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'12px', marginBottom:'1.25rem' }}>{children}</div>
}

export function MetricCard({ icon, label, value, sub, onClick, accentColor }) {
  return (
    <div onClick={onClick} style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'16px', cursor:onClick?'pointer':'default', transition:'border-color 0.15s' }}
      onMouseOver={e=>onClick&&(e.currentTarget.style.borderColor='rgba(255,255,255,0.15)')}
      onMouseOut={e=>onClick&&(e.currentTarget.style.borderColor='rgba(255,255,255,0.07)')}>
      <div style={{ fontSize:'20px', marginBottom:'10px' }}>{icon}</div>
      <div style={{ fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.28)', letterSpacing:'0.1em', textTransform:'uppercase' }}>{label}</div>
      <div style={{ fontSize:'26px', fontWeight:800, color: accentColor || '#fff', letterSpacing:'-0.02em', marginTop:'4px' }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.22)', marginTop:'2px' }}>{sub}</div>}
    </div>
  )
}

export function Panel({ title, children, style }) {
  return (
    <div style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'1.1rem 1.2rem', ...style }}>
      {title && <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.65)', marginBottom:'14px', paddingBottom:'10px', borderBottom:'0.5px solid rgba(255,255,255,0.06)' }}>{title}</div>}
      {children}
    </div>
  )
}

export function TwoCol({ children }) {
  return <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>{children}</div>
}

export function Lbl({ children }) {
  return <label style={{ display:'block', fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.32)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'6px', marginTop:'14px' }}>{children}</label>
}

export function Inp(props) {
  return <input {...props} style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'11px 13px', fontSize:'14px', color:'rgba(255,255,255,0.85)', outline:'none', display:'block', fontFamily:'inherit', boxSizing:'border-box', ...props.style }}
    onFocus={e => e.target.style.borderColor='#1e90ff'}
    onBlur={e  => e.target.style.borderColor='rgba(255,255,255,0.1)'} />
}

export function Btn({ busy, children, style, color, ...props }) {
  const bg = color || '#1e90ff'
  return (
    <button {...props} disabled={busy || props.disabled} style={{ width:'100%', padding:'12px', background:bg, color:'#fff', fontSize:'14px', fontWeight:700, border:'none', borderRadius:'10px', cursor:'pointer', marginTop:'12px', fontFamily:'inherit', opacity:(busy||props.disabled)?0.6:1, ...style }}>
      {busy ? 'Please wait...' : children}
    </button>
  )
}

export function Err({ msg }) {
  if (!msg) return null
  return <div style={{ marginTop:'8px', padding:'8px 12px', background:'rgba(220,60,60,0.1)', border:'0.5px solid rgba(220,60,60,0.3)', borderRadius:'8px', fontSize:'13px', color:'#f09595' }}>{msg}</div>
}

export function Ok({ msg }) {
  if (!msg) return null
  return <div style={{ marginTop:'8px', padding:'8px 12px', background:'rgba(16,185,129,0.1)', border:'0.5px solid rgba(16,185,129,0.3)', borderRadius:'8px', fontSize:'13px', color:'#34d399' }}>{msg}</div>
}

export function Row({ name, sub, right }) {
  const ini = (name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 0', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
      <div style={{ width:'30px', height:'30px', borderRadius:'50%', flexShrink:0, background:'rgba(139,92,246,0.2)', color:'#a78bfa', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:800 }}>{ini}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.85)', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</div>
        {sub && <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'1px' }}>{sub}</div>}
      </div>
      {right}
    </div>
  )
}

export function Empty({ msg }) {
  return <div style={{ textAlign:'center', padding:'2.5rem 1rem', color:'rgba(255,255,255,0.18)', fontSize:'13px' }}>{msg||'Nothing here yet.'}</div>
}

export function Pill({ status }) {
  const M = {
    new:{bg:'rgba(16,185,129,0.15)',c:'#10b981',t:'New'}, contacted:{bg:'rgba(30,144,255,0.15)',c:'#5aabff',t:'Contacted'}, 'New':{bg:'rgba(16,185,129,0.15)',c:'#10b981',t:'New'}, 'Contacted':{bg:'rgba(30,144,255,0.15)',c:'#5aabff',t:'Contacted'}, demo_scheduled:{bg:'rgba(232,124,30,0.15)',c:'#f4a335',t:'Demo Set'}, 'Demo Scheduled':{bg:'rgba(232,124,30,0.15)',c:'#f4a335',t:'Demo Set'}, enrolled:{bg:'rgba(139,92,246,0.15)',c:'#a78bfa',t:'Enrolled'}, 'Enrolled':{bg:'rgba(139,92,246,0.15)',c:'#a78bfa',t:'Enrolled'}, lost:{bg:'rgba(100,100,100,0.15)',c:'#888',t:'Lost'}, 'Lost':{bg:'rgba(100,100,100,0.15)',c:'#888',t:'Lost'}, scheduled:{bg:'rgba(30,144,255,0.15)',c:'#5aabff',t:'Scheduled'}, completed:{bg:'rgba(16,185,129,0.15)',c:'#34d399',t:'Done'}
  }
  const s = M[status] || { bg:'rgba(100,100,100,0.15)', c:'#aaa', t:status }
  return <span style={{ fontSize:'9px', fontWeight:700, padding:'3px 8px', borderRadius:'10px', background:s.bg, color:s.c, whiteSpace:'nowrap', flexShrink:0 }}>{s.t}</span>
}

export function ZoomBtn({ link }) {
  if (!link) return <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.2)', flexShrink:0 }}>Link pending</span>
  return <a href={link} target="_blank" rel="noreferrer" style={{ fontSize:'10px', fontWeight:700, padding:'4px 12px', borderRadius:'8px', background:'rgba(30,144,255,0.15)', color:'#5aabff', border:'0.5px solid rgba(30,144,255,0.25)', flexShrink:0, whiteSpace:'nowrap' }}>Join Zoom</a>
}
