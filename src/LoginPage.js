import React, { useState } from 'react'
import { supabase } from '../supabaseClient'

const css = {
  bg:    { minHeight:'100vh', background:'linear-gradient(135deg,#0c1118 0%,#0f1923 60%,#0c1118 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem' },
  card:  { width:'100%', maxWidth:'400px', background:'#111820', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'20px', padding:'2rem' },
  logo:  { textAlign:'center', marginBottom:'1.75rem' },
  blue:  { color:'#1e90ff', fontWeight:900, fontSize:'38px', fontFamily:"'Arial Black',sans-serif", letterSpacing:'-1px' },
  orng:  { color:'#e87c1e', fontWeight:900, fontSize:'38px', fontFamily:"'Arial Black',sans-serif", letterSpacing:'-1px' },
  sub:   { fontSize:'11px', color:'rgba(255,255,255,0.3)', letterSpacing:'0.12em', textTransform:'uppercase', marginTop:'6px' },
  lbl:   { display:'block', fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.35)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'6px', marginTop:'16px' },
  inp:   { width:'100%', background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'12px 14px', fontSize:'14px', color:'rgba(255,255,255,0.85)', outline:'none', display:'block' },
  btn:   { width:'100%', marginTop:'20px', padding:'13px', background:'#1e90ff', color:'#fff', fontSize:'15px', fontWeight:700, border:'none', borderRadius:'11px', cursor:'pointer' },
  err:   { marginTop:'10px', padding:'9px 12px', background:'rgba(220,60,60,0.1)', border:'0.5px solid rgba(220,60,60,0.3)', borderRadius:'8px', fontSize:'13px', color:'#f09595' },
  ok:    { marginTop:'10px', padding:'9px 12px', background:'rgba(16,185,129,0.1)', border:'0.5px solid rgba(16,185,129,0.3)', borderRadius:'8px', fontSize:'13px', color:'#34d399' },
  info:  { background:'rgba(30,144,255,0.08)', border:'0.5px solid rgba(30,144,255,0.25)', borderRadius:'9px', padding:'10px 12px', fontSize:'13px', color:'rgba(90,171,255,0.9)', lineHeight:1.5, marginBottom:'8px' },
  link:  { color:'#1e90ff', fontSize:'12px', cursor:'pointer', background:'none', border:'none', fontFamily:'inherit', padding:0 },
  frow:  { textAlign:'right', marginTop:'7px' },
  div:   { display:'flex', alignItems:'center', gap:'10px', margin:'16px 0' },
  dline: { flex:1, height:'0.5px', background:'rgba(255,255,255,0.1)' },
  dtxt:  { fontSize:'12px', color:'rgba(255,255,255,0.25)' },
  back:  { display:'flex', alignItems:'center', gap:'5px', fontSize:'13px', color:'#1e90ff', cursor:'pointer', background:'none', border:'none', marginBottom:'16px', padding:0, fontFamily:'inherit' },
  reg:   { textAlign:'center', fontSize:'13px', color:'rgba(255,255,255,0.35)', marginTop:'4px' },
}

function Field({ label, ...props }) {
  return (
    <>
      <label style={css.lbl}>{label}</label>
      <input {...props} style={css.inp}
        onFocus={e => e.target.style.borderColor = '#1e90ff'}
        onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
      />
    </>
  )
}

export default function LoginPage() {
  const [view,    setView]    = useState('signin')
  const [email,   setEmail]   = useState('')
  const [pass,    setPass]    = useState('')
  const [name,    setName]    = useState('')
  const [rEmail,  setREmail]  = useState('')
  const [rPass,   setRPass]   = useState('')
  const [busy,    setBusy]    = useState(false)
  const [err,     setErr]     = useState('')
  const [ok,      setOk]      = useState('')

  function reset() { setErr(''); setOk('') }
  function go(v)   { reset(); setView(v) }

  async function doLogin(e) {
    e.preventDefault(); reset(); setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
    if (error) setErr(error.message)
    setBusy(false)
  }

  async function doForgot(e) {
    e.preventDefault(); reset(); setBusy(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    if (error) setErr(error.message)
    else setOk('✓ Reset link sent! Check your inbox.')
    setBusy(false)
  }

  async function doRegister(e) {
    e.preventDefault(); reset()
    if (!name.trim())      return setErr('Please enter your full name.')
    if (rPass.length < 6)  return setErr('Password must be at least 6 characters.')
    setBusy(true)
    const { error } = await supabase.auth.signUp({
      email: rEmail, password: rPass,
      options: { data: { full_name: name, role: 'student' } },
    })
    if (error) setErr(error.message)
    else setOk('✓ Account created! Check your email to confirm, then sign in.')
    setBusy(false)
  }

  return (
    <div style={css.bg}>
      <div style={css.card}>

        <div style={css.logo}>
          <div><span style={css.blue}>UNI</span><span style={css.orng}>EDD</span></div>
          <div style={css.sub}>Learning Management System</div>
        </div>

        {/* ── SIGN IN ── */}
        {view === 'signin' && (
          <form onSubmit={doLogin}>
            <Field label="Email" type="email" placeholder="you@uniedd.com"
              value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            <Field label="Password" type="password" placeholder="Your password"
              value={pass}  onChange={e => setPass(e.target.value)}  required />
            <div style={css.frow}>
              <button type="button" style={css.link} onClick={() => go('forgot')}>Forgot password?</button>
            </div>
            {err && <div style={css.err}>{err}</div>}
            {ok  && <div style={css.ok}>{ok}</div>}
            <button style={{ ...css.btn, opacity: busy ? 0.6 : 1 }} disabled={busy}>
              {busy ? 'Signing in...' : 'Sign In'}
            </button>
            <div style={css.div}><div style={css.dline}/><span style={css.dtxt}>new to uniedd?</span><div style={css.dline}/></div>
            <div style={css.reg}>
              <button type="button" style={{ ...css.link, fontSize:'13px' }} onClick={() => go('register')}>
                Create Account
              </button>
            </div>
          </form>
        )}

        {/* ── FORGOT ── */}
        {view === 'forgot' && (
          <form onSubmit={doForgot}>
            <button type="button" style={css.back} onClick={() => go('signin')}>← Back to sign in</button>
            <div style={css.info}>Enter your email and we'll send a password reset link.</div>
            <Field label="Email" type="email" placeholder="you@uniedd.com"
              value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            {err && <div style={css.err}>{err}</div>}
            {ok  && <div style={css.ok}>{ok}</div>}
            <button style={{ ...css.btn, opacity: busy ? 0.6 : 1 }} disabled={busy}>
              {busy ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        {/* ── REGISTER ── */}
        {view === 'register' && (
          <form onSubmit={doRegister}>
            <button type="button" style={css.back} onClick={() => go('signin')}>← Back to sign in</button>
            <Field label="Full Name" type="text" placeholder="Your full name"
              value={name}   onChange={e => setName(e.target.value)}   required autoFocus />
            <Field label="Email" type="email" placeholder="you@email.com"
              value={rEmail} onChange={e => setREmail(e.target.value)} required />
            <Field label="Password" type="password" placeholder="Min. 6 characters"
              value={rPass}  onChange={e => setRPass(e.target.value)}  required />
            {err && <div style={css.err}>{err}</div>}
            {ok  && <div style={css.ok}>{ok}</div>}
            <button style={{ ...css.btn, opacity: busy ? 0.6 : 1 }} disabled={busy}>
              {busy ? 'Creating...' : 'Create Account'}
            </button>
          </form>
        )}

      </div>
    </div>
  )
}
