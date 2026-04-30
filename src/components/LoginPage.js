import React, { useState } from 'react'
import { supabase } from '../supabaseClient'

const S = {
  bg: { minHeight:'100vh', background:'linear-gradient(135deg,#0c1118 0%,#0f1923 60%,#0c1118 100%)',
        display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem' },
  card: { width:'100%', maxWidth:'400px', background:'#111820',
          border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'20px', padding:'2rem' },
  logoWrap: { textAlign:'center', marginBottom:'1.75rem' },
  logoBlue:   { color:'#1e90ff', fontWeight:900, fontSize:'38px', fontFamily:"'Arial Black',sans-serif", letterSpacing:'-1px' },
  logoOrange: { color:'#e87c1e', fontWeight:900, fontSize:'38px', fontFamily:"'Arial Black',sans-serif", letterSpacing:'-1px' },
  logoSub: { fontSize:'11px', color:'rgba(255,255,255,0.3)', letterSpacing:'0.12em',
             textTransform:'uppercase', marginTop:'6px' },
  lbl: { display:'block', fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.35)',
         letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'6px', marginTop:'16px' },
  input: { width:'100%', background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(255,255,255,0.1)',
           borderRadius:'10px', padding:'12px 14px', fontSize:'14px', color:'rgba(255,255,255,0.85)',
           outline:'none', transition:'border-color 0.2s' },
  forgotRow: { textAlign:'right', marginTop:'7px' },
  link: { color:'#1e90ff', fontSize:'12px', cursor:'pointer', background:'none', border:'none', fontFamily:'inherit' },
  btn: { width:'100%', marginTop:'20px', padding:'13px', background:'#1e90ff', color:'#fff',
         fontSize:'15px', fontWeight:700, border:'none', borderRadius:'11px', cursor:'pointer', fontFamily:'inherit' },
  err: { marginTop:'10px', padding:'9px 12px', background:'rgba(220,60,60,0.1)',
         border:'0.5px solid rgba(220,60,60,0.3)', borderRadius:'8px', fontSize:'13px', color:'#f09595' },
  ok:  { marginTop:'10px', padding:'9px 12px', background:'rgba(16,185,129,0.1)',
         border:'0.5px solid rgba(16,185,129,0.3)', borderRadius:'8px', fontSize:'13px', color:'#34d399' },
  infoBox: { background:'rgba(30,144,255,0.08)', border:'0.5px solid rgba(30,144,255,0.25)',
             borderRadius:'9px', padding:'10px 12px', fontSize:'13px', color:'rgba(90,171,255,0.9)',
             lineHeight:1.5, marginBottom:'8px' },
  divider: { display:'flex', alignItems:'center', gap:'10px', margin:'16px 0' },
  divLine: { flex:1, height:'0.5px', background:'rgba(255,255,255,0.1)' },
  divTxt: { fontSize:'12px', color:'rgba(255,255,255,0.25)' },
  regLink: { textAlign:'center', fontSize:'13px', color:'rgba(255,255,255,0.35)', marginTop:'4px' },
  backBtn: { display:'flex', alignItems:'center', gap:'5px', fontSize:'13px', color:'#1e90ff',
             cursor:'pointer', background:'none', border:'none', marginBottom:'16px', padding:0, fontFamily:'inherit' },
}

export default function LoginPage() {
  const [view,     setView]     = useState('signin')   // 'signin' | 'forgot' | 'register'
  const [email,    setEmail]    = useState('')
  const [pass,     setPass]     = useState('')
  const [name,     setName]     = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPass,  setRegPass]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [err,      setErr]      = useState('')
  const [ok,       setOk]       = useState('')

  function clearMsgs() { setErr(''); setOk('') }

  // ── Sign In ──────────────────────────────────────────────
  async function doLogin(e) {
    e.preventDefault()
    clearMsgs(); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
    if (error) setErr(error.message)
    setLoading(false)
  }

  // ── Forgot Password ──────────────────────────────────────
  async function doForgot(e) {
    e.preventDefault()
    clearMsgs(); setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/?reset=true',
    })
    if (error) setErr(error.message)
    else setOk('✓ Reset link sent! Check your inbox.')
    setLoading(false)
  }

  // ── Register (student by default) ───────────────────────
  async function doRegister(e) {
    e.preventDefault()
    clearMsgs()
    if (!name.trim())               return setErr('Please enter your full name.')
    if (regPass.length < 6)         return setErr('Password must be at least 6 characters.')
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: regEmail, password: regPass,
      options: { data: { full_name: name, role: 'student' } }
    })
    if (error) setErr(error.message)
    else setOk('✓ Account created! Check your email to confirm, then sign in.')
    setLoading(false)
  }

  return (
    <div style={S.bg}>
      <div style={S.card}>

        {/* Logo */}
        <div style={S.logoWrap}>
          <div>
            <span style={S.logoBlue}>UNI</span>
            <span style={S.logoOrange}>EDD</span>
          </div>
          <div style={S.logoSub}>Learning Management System</div>
        </div>

        {/* ── SIGN IN ── */}
        {view === 'signin' && (
          <form onSubmit={doLogin}>
            <label style={S.lbl}>Email</label>
            <input style={S.input} type="email" placeholder="you@uniedd.com"
              value={email} onChange={e => setEmail(e.target.value)} required autoFocus
              onFocus={e => e.target.style.borderColor='#1e90ff'}
              onBlur={e  => e.target.style.borderColor='rgba(255,255,255,0.1)'}/>

            <label style={S.lbl}>Password</label>
            <input style={S.input} type="password" placeholder="Your password"
              value={pass} onChange={e => setPass(e.target.value)} required
              onFocus={e => e.target.style.borderColor='#1e90ff'}
              onBlur={e  => e.target.style.borderColor='rgba(255,255,255,0.1)'}/>

            <div style={S.forgotRow}>
              <button type="button" style={S.link} onClick={() => { clearMsgs(); setView('forgot') }}>
                Forgot password?
              </button>
            </div>

            {err && <div style={S.err}>{err}</div>}
            {ok  && <div style={S.ok}>{ok}</div>}

            <button style={{...S.btn, opacity: loading ? 0.6 : 1}} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <div style={S.divider}>
              <div style={S.divLine}/><span style={S.divTxt}>new to uniedd?</span><div style={S.divLine}/>
            </div>
            <div style={S.regLink}>
              <button type="button" style={{...S.link, fontSize:'13px'}}
                onClick={() => { clearMsgs(); setView('register') }}>
                Create a student account
              </button>
            </div>
          </form>
        )}

        {/* ── FORGOT PASSWORD ── */}
        {view === 'forgot' && (
          <form onSubmit={doForgot}>
            <button type="button" style={S.backBtn} onClick={() => { clearMsgs(); setView('signin') }}>
              ← Back to sign in
            </button>
            <div style={S.infoBox}>
              Enter your email and we'll send a password reset link to your inbox.
            </div>
            <label style={S.lbl}>Email</label>
            <input style={S.input} type="email" placeholder="you@uniedd.com"
              value={email} onChange={e => setEmail(e.target.value)} required autoFocus
              onFocus={e => e.target.style.borderColor='#1e90ff'}
              onBlur={e  => e.target.style.borderColor='rgba(255,255,255,0.1)'}/>

            {err && <div style={S.err}>{err}</div>}
            {ok  && <div style={S.ok}>{ok}</div>}

            <button style={{...S.btn, opacity: loading ? 0.6 : 1}} disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        {/* ── REGISTER ── */}
        {view === 'register' && (
          <form onSubmit={doRegister}>
            <button type="button" style={S.backBtn} onClick={() => { clearMsgs(); setView('signin') }}>
              ← Back to sign in
            </button>

            <label style={S.lbl}>Full Name</label>
            <input style={S.input} type="text" placeholder="Your full name"
              value={name} onChange={e => setName(e.target.value)} required autoFocus
              onFocus={e => e.target.style.borderColor='#1e90ff'}
              onBlur={e  => e.target.style.borderColor='rgba(255,255,255,0.1)'}/>

            <label style={S.lbl}>Email</label>
            <input style={S.input} type="email" placeholder="you@email.com"
              value={regEmail} onChange={e => setRegEmail(e.target.value)} required
              onFocus={e => e.target.style.borderColor='#1e90ff'}
              onBlur={e  => e.target.style.borderColor='rgba(255,255,255,0.1)'}/>

            <label style={S.lbl}>Password</label>
            <input style={S.input} type="password" placeholder="Min. 6 characters"
              value={regPass} onChange={e => setRegPass(e.target.value)} required
              onFocus={e => e.target.style.borderColor='#1e90ff'}
              onBlur={e  => e.target.style.borderColor='rgba(255,255,255,0.1)'}/>

            {err && <div style={S.err}>{err}</div>}
            {ok  && <div style={S.ok}>{ok}</div>}

            <button style={{...S.btn, opacity: loading ? 0.6 : 1}} disabled={loading}>
              {loading ? 'Creating account...' : 'Create Student Account'}
            </button>
          </form>
        )}

      </div>
    </div>
  )
}
