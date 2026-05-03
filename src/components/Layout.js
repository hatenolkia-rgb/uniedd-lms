import React from 'react'
import { supabase } from '../supabaseClient'

const ROLES = {
  admin:   { label:'Admin',   color:'#e87c1e', bg:'rgba(232,124,30,0.15)', border:'rgba(232,124,30,0.3)'  },
  teacher: { label:'Teacher', color:'#1e90ff', bg:'rgba(30,144,255,0.15)', border:'rgba(30,144,255,0.3)'  },
  student: { label:'Student', color:'#10b981', bg:'rgba(16,185,129,0.15)', border:'rgba(16,185,129,0.3)'  },
  sales:   { label:'Sales',   color:'#8b5cf6', bg:'rgba(139,92,246,0.15)', border:'rgba(139,92,246,0.3)'  },
}

export default function Layout({ profile, pageTitle, children }) {
  const cfg = ROLES[profile.role] || ROLES.student
  const initials = (profile.full_name || profile.email || 'U')
    .split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()

  function scrollToCalendar() {
    const el = document.getElementById('uniedd-calendar')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div style={{ minHeight:'100vh', background:'#0c1118' }}>
      <nav style={{
        background:'#0f1923', borderBottom:'0.5px solid rgba(255,255,255,0.07)',
        height:'54px', display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 1.5rem', position:'sticky', top:0, zIndex:100,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
          <div style={{ fontFamily:"'Arial Black',sans-serif", fontWeight:900 }}>
            <span style={{ color:'#1e90ff', fontSize:'18px' }}>UNI</span>
            <span style={{ color:'#e87c1e', fontSize:'18px' }}>EDD</span>
          </div>
          {pageTitle && <span style={{ fontSize:'15px', fontWeight:600, color:'rgba(255,255,255,0.55)' }}>{pageTitle}</span>}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <span style={{ fontSize:'10px', padding:'3px 10px', borderRadius:'20px', fontWeight:700,
            letterSpacing:'0.05em', textTransform:'uppercase',
            background:cfg.bg, color:cfg.color, border:`0.5px solid ${cfg.border}` }}>
            {cfg.label}
          </span>
          <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:cfg.color,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'12px', fontWeight:800, color:'#fff' }}>
            {initials}
          </div>
          <button onClick={scrollToCalendar} style={{
            fontSize:'12px', color:'rgba(255,255,255,0.5)', background:'rgba(30,144,255,0.1)',
            border:'0.5px solid rgba(30,144,255,0.2)', borderRadius:'6px',
            padding:'5px 11px', cursor:'pointer', fontFamily:'inherit',
          }}>📅 Calendar</button>
          <button onClick={() => { const el=document.getElementById('uniedd-resources'); if(el) el.scrollIntoView({behavior:'smooth'}) }} style={{
            fontSize:'12px', color:'rgba(255,255,255,0.5)', background:'rgba(16,185,129,0.1)',
            border:'0.5px solid rgba(16,185,129,0.2)', borderRadius:'6px',
            padding:'5px 11px', cursor:'pointer', fontFamily:'inherit',
          }}>📚 Resources</button>
          <button onClick={() => window.open('mailto:support@uniedd.com','_blank')} style={{
            fontSize:'12px', color:'rgba(255,255,255,0.5)', background:'rgba(139,92,246,0.1)',
            border:'0.5px solid rgba(139,92,246,0.2)', borderRadius:'6px',
            padding:'5px 11px', cursor:'pointer', fontFamily:'inherit',
          }}>💬 Support</button>
          <button onClick={() => supabase.auth.signOut()} style={{
            fontSize:'12px', color:'rgba(255,255,255,0.4)', background:'none',
            border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'6px',
            padding:'5px 11px', cursor:'pointer', fontFamily:'inherit',
          }}>Sign out</button>
        </div>
      </nav>
      <main style={{ padding:'1.5rem', maxWidth:'1200px', margin:'0 auto' }}>
        {children}
      </main>
    </div>
  )
}

export function PageHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom:'1.25rem' }}>
      <h1 style={{ fontSize:'24px', fontWeight:800, color:'#fff', letterSpacing:'-0.02em' }}>{title}</h1>
      {subtitle && <p style={{ fontSize:'13px', color:'rgba(255,255,255,0.3)', marginTop:'3px' }}>{subtitle}</p>}
    </div>
  )
}

export function Grid4({ children }) {
  return <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'12px', marginBottom:'1.25rem' }}>{children}</div>
}

export function MetricCard({ icon, label, value }) {
  return (
    <div style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'14px' }}>
      <div style={{ fontSize:'18px', marginBottom:'8px' }}>{icon}</div>
      <div style={{ fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em', textTransform:'uppercase' }}>{label}</div>
      <div style={{ fontSize:'26px', fontWeight:800, color:'#fff', letterSpacing:'-0.02em', marginTop:'3px' }}>{value ?? '—'}</div>
    </div>
  )
}

export function Panel({ title, children, style }) {
  return (
    <div style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'1rem 1.1rem', ...style }}>
      {title && <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.7)', marginBottom:'12px', paddingBottom:'8px', borderBottom:'0.5px solid rgba(255,255,255,0.06)' }}>{title}</div>}
      {children}
    </div>
  )
}

export function TwoCol({ children }) {
  return <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>{children}</div>
}

export function Lbl({ children }) {
  return <label style={{ display:'block', fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.35)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'6px', marginTop:'14px' }}>{children}</label>
}

export function Inp(props) {
  return <input {...props} style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'11px 13px', fontSize:'14px', color:'rgba(255,255,255,0.85)', outline:'none', display:'block', ...props.style }}
    onFocus={e => e.target.style.borderColor='#1e90ff'}
    onBlur={e  => e.target.style.borderColor='rgba(255,255,255,0.1)'} />
}

export function Btn({ busy, children, style, ...props }) {
  return (
    <button {...props} disabled={busy || props.disabled} style={{ width:'100%', padding:'12px', background:'#1e90ff', color:'#fff', fontSize:'14px', fontWeight:700, border:'none', borderRadius:'10px', cursor:'pointer', marginTop:'12px', fontFamily:'inherit', opacity:(busy||props.disabled)?0.6:1, ...style }}>
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
    <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 0', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
      <div style={{ width:'28px', height:'28px', borderRadius:'50%', flexShrink:0, background:'rgba(139,92,246,0.2)', color:'#a78bfa', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:800 }}>{ini}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.85)', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</div>
        {sub && <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'1px' }}>{sub}</div>}
      </div>
      {right}
    </div>
  )
}

export function Empty({ msg }) {
  return <div style={{ textAlign:'center', padding:'2rem 1rem', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>{msg||'Nothing here yet.'}</div>
}

export function Pill({ status }) {
  const M = {
    new:            { bg:'rgba(16,185,129,0.15)',  c:'#10b981', t:'New'          },
    contacted:      { bg:'rgba(30,144,255,0.15)',  c:'#5aabff', t:'Contacted'    },
    'New':          { bg:'rgba(16,185,129,0.15)',  c:'#10b981', t:'New'          },
    'Contacted':    { bg:'rgba(30,144,255,0.15)',  c:'#5aabff', t:'Contacted'    },
    demo_scheduled: { bg:'rgba(232,124,30,0.15)',  c:'#f4a335', t:'Demo Set'     },
    'Demo Scheduled':{ bg:'rgba(232,124,30,0.15)', c:'#f4a335', t:'Demo Set'     },
    enrolled:       { bg:'rgba(139,92,246,0.15)',  c:'#a78bfa', t:'Enrolled'     },
    'Enrolled':     { bg:'rgba(139,92,246,0.15)',  c:'#a78bfa', t:'Enrolled'     },
    lost:           { bg:'rgba(100,100,100,0.15)', c:'#888',    t:'Lost'         },
    'Lost':         { bg:'rgba(100,100,100,0.15)', c:'#888',    t:'Lost'         },
    scheduled:      { bg:'rgba(30,144,255,0.15)',  c:'#5aabff', t:'Scheduled'    },
    completed:      { bg:'rgba(16,185,129,0.15)',  c:'#34d399', t:'Done'         },
  }
  const s = M[status] || { bg:'rgba(100,100,100,0.15)', c:'#aaa', t: status }
  return <span style={{ fontSize:'9px', fontWeight:700, padding:'3px 8px', borderRadius:'10px', background:s.bg, color:s.c, whiteSpace:'nowrap', flexShrink:0 }}>{s.t}</span>
}

export function ZoomBtn({ link }) {
  if (!link) return <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.2)', flexShrink:0 }}>Link pending</span>
  return <a href={link} target="_blank" rel="noreferrer" style={{ fontSize:'10px', fontWeight:700, padding:'3px 10px', borderRadius:'8px', background:'rgba(30,144,255,0.15)', color:'#5aabff', border:'0.5px solid rgba(30,144,255,0.25)', flexShrink:0, whiteSpace:'nowrap' }}>Join Zoom</a>
}
