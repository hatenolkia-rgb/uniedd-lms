import React, { useEffect, useState } from 'react'
import { sendEmail } from '../emailService'
import { supabase } from '../supabaseClient'

const BUSINESS_NAME = 'UniEDD Music & Arts Academy'

const FOREIGN_CURRENCIES = [
  { code:'USD', symbol:'$',   label:'USD — US Dollar'          },
  { code:'GBP', symbol:'£',   label:'GBP — British Pound'      },
  { code:'EUR', symbol:'€',   label:'EUR — Euro'               },
  { code:'AED', symbol:'د.إ', label:'AED — UAE Dirham'         },
  { code:'SGD', symbol:'S$',  label:'SGD — Singapore Dollar'   },
  { code:'AUD', symbol:'A$',  label:'AUD — Australian Dollar'  },
  { code:'CAD', symbol:'C$',  label:'CAD — Canadian Dollar'    },
]

export default function PaymentsAdmin({ profile }) {
  const [payments,  setPayments]  = useState([])
  const [students,  setStudents]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [filter,    setFilter]    = useState('all')
  const [tab,       setTab]       = useState('list')
  const [mode,      setMode]      = useState('international') // international | india
  const [ok,        setOk]        = useState('')
  const [err,       setErr]       = useState('')
  const [busy,      setBusy]      = useState(false)
  const [copied,    setCopied]    = useState(null)
  const [generated, setGenerated] = useState(null)

  // Form
  const [selStudent, setSelStudent] = useState('')
  const [courseName, setCourseName] = useState('')
  const [amount,     setAmount]     = useState('')
  const [currency,   setCurrency]   = useState('USD')
  const [dueDate,    setDueDate]    = useState('')
  const [notes,      setNotes]      = useState('')
  // Manual payment fields
  const [manualMethod,  setManualMethod]  = useState('UPI')
  const [manualRef,     setManualRef]     = useState('')
  const [manualDate,    setManualDate]    = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: pays }, { data: studs }] = await Promise.all([
      supabase.from('payments').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id,full_name,email,student_id').eq('role','student'),
    ])
    setPayments(pays || [])
    setStudents(studs || [])
    setLoading(false)
  }

  function getSymbol(code) {
    return FOREIGN_CURRENCIES.find(c => c.code === code)?.symbol || '$'
  }

  // ── Generate PayPal link (international) ──────────────────
  async function generatePayPal(e) {
    e.preventDefault()
    setErr(''); setOk(''); setBusy(true); setGenerated(null)
    const student = students.find(s => s.id === selStudent)
    const amtNum  = parseFloat(amount)
    if (!selStudent)                           { setErr('Please select a student.');     setBusy(false); return }
    if (!courseName.trim())                    { setErr('Please enter course name.');    setBusy(false); return }
    if (!amount || isNaN(amtNum) || amtNum<=0) { setErr('Please enter a valid amount.'); setBusy(false); return }

    const invoiceNo = 'INV-' + Date.now().toString().slice(-6)
    const desc      = `${courseName.trim()} — ${student?.full_name} | ${invoiceNo}`

    try {
      const res = await fetch('/api/create-paypal-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amtNum, currency, description: desc, studentName: student?.full_name, studentEmail: student?.email, invoiceNo }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed')

      const { error } = await supabase.from('payments').insert({
        student_id:    selStudent,
        student_name:  student?.full_name,
        student_email: student?.email || null,
        course_name:   courseName.trim(),
        amount:        amtNum,
        currency,
        status:        'pending',
        invoice_no:    invoiceNo,
        payment_link:  data.paymentLink,
        gateway:       'paypal',
        due_date:      dueDate || null,
        generated_by:  profile.full_name,
        notes:         notes.trim() || null,
      })
      if (error) throw new Error(error.message)

      setGenerated({ link: data.paymentLink, invoiceNo, studentName: student?.full_name, amount: amtNum, currency, course: courseName.trim(), type: 'paypal' })
      setOk(`✓ PayPal link generated — ${invoiceNo}`)
      // Send payment link email to student
      if (student?.email) {
        sendEmail('payment_link', student.email, {
          name: student.full_name, courseName: courseName.trim(),
          amount: amtNum, currency, paymentLink: data.paymentLink,
          invoiceNo, dueDate: dueDate || null,
        })
      }
      resetForm(); load()
    } catch(e) { setErr('⚠ ' + e.message) }
    setBusy(false)
  }

  // ── Record manual payment (India) ─────────────────────────
  async function recordManual(e) {
    e.preventDefault()
    setErr(''); setOk(''); setBusy(true); setGenerated(null)
    const student = students.find(s => s.id === selStudent)
    const amtNum  = parseFloat(amount)
    if (!selStudent)                           { setErr('Please select a student.');     setBusy(false); return }
    if (!courseName.trim())                    { setErr('Please enter course name.');    setBusy(false); return }
    if (!amount || isNaN(amtNum) || amtNum<=0) { setErr('Please enter a valid amount.'); setBusy(false); return }

    const invoiceNo = 'INV-' + Date.now().toString().slice(-6)
    const isPaid    = !!manualRef  // if reference provided, mark as paid

    const { error } = await supabase.from('payments').insert({
      student_id:    selStudent,
      student_name:  student?.full_name,
      student_email: student?.email || null,
      course_name:   courseName.trim(),
      amount:        amtNum,
      currency:      'INR',
      status:        isPaid ? 'paid' : 'pending',
      invoice_no:    invoiceNo,
      payment_link:  null,
      gateway:       'manual',
      due_date:      dueDate || null,
      paid_date:     isPaid ? (manualDate || new Date().toISOString().slice(0,10)) : null,
      generated_by:  profile.full_name,
      notes:         [
        notes.trim(),
        manualMethod && `Method: ${manualMethod}`,
        manualRef    && `Reference: ${manualRef}`,
      ].filter(Boolean).join('\n') || null,
    })

    if (error) { setErr(error.message); setBusy(false); return }

    setGenerated({ invoiceNo, studentName: student?.full_name, amount: amtNum, currency: 'INR', course: courseName.trim(), type: 'manual', status: isPaid ? 'paid' : 'pending', method: manualMethod, ref: manualRef })
    setOk(`✓ Payment recorded — ${invoiceNo} (${isPaid ? 'Paid' : 'Pending'})`)
    resetForm(); load()
    setBusy(false)
  }

  function resetForm() {
    setSelStudent(''); setCourseName(''); setAmount(''); setCurrency('USD')
    setDueDate(''); setNotes(''); setManualMethod('UPI'); setManualRef(''); setManualDate('')
  }

  function copyText(text, key) {
    navigator.clipboard.writeText(text)
    setCopied(key); setTimeout(() => setCopied(null), 2500)
  }

  function whatsappMsg(link, studentName, amount, curr, course) {
    const sym = getSymbol(curr)
    const msg = `Hello ${studentName}! 👋\n\nYour fee for *${course}* at *${BUSINESS_NAME}* is due.\n\n💰 Amount: *${sym}${amount} ${curr}*\n\n💳 Pay via PayPal:\n${link}\n\nThank you! 🙏`
    return `https://wa.me/?text=${encodeURIComponent(msg)}`
  }

  async function markPaid(id) {
    await supabase.from('payments').update({ status:'paid', paid_date: new Date().toISOString().slice(0,10) }).eq('id', id)
    // Send receipt email
    const p = payments.find(pay => pay.id === id)
    if (p?.student_email) {
      sendEmail('payment_receipt', p.student_email, {
        name: p.student_name, courseName: p.course_name,
        amount: p.amount, currency: p.currency || 'USD',
        invoiceNo: p.invoice_no, paidDate: new Date().toISOString().slice(0,10),
      })
    }
    setOk('✓ Marked as paid · Receipt email sent'); setTimeout(() => setOk(''), 3000); load()
  }

  async function deletePay(id) {
    if (!window.confirm('Delete this payment record?')) return
    await supabase.from('payments').delete().eq('id', id); load()
  }

  const filtered  = filter === 'all' ? payments : payments.filter(p => p.status === filter)
  const totalPaid = payments.filter(p=>p.status==='paid').reduce((a,p)=>a+(p.amount||0),0)
  const totalDue  = payments.filter(p=>['pending','overdue'].includes(p.status)).reduce((a,p)=>a+(p.amount||0),0)

  const SC = { paid:'#10b981', pending:'#f4a335', overdue:'#f87171' }
  const SB = { paid:'rgba(16,185,129,0.12)', pending:'rgba(232,124,30,0.12)', overdue:'rgba(239,68,68,0.12)' }
  const inp = { width:'100%', background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'11px 13px', fontSize:'14px', color:'rgba(255,255,255,0.85)', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
  const lbl = { display:'block', fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.32)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'6px', marginTop:'14px' }

  return (
    <div id="uniedd-payments" style={{ marginTop:'14px' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px', flexWrap:'wrap', gap:'8px' }}>
        <div style={{ fontSize:'16px', fontWeight:700, color:'rgba(255,255,255,0.85)' }}>💳 Payments</div>
        <div style={{ display:'flex', gap:'6px' }}>
          {[['list','📋 All Payments'],['generate','+ New Payment']].map(([t,l]) => (
            <button key={t} onClick={()=>{ setTab(t); setGenerated(null); setOk(''); setErr('') }}
              style={{ fontSize:'12px', fontWeight:600, padding:'7px 14px', borderRadius:'10px', border:'none', cursor:'pointer', fontFamily:'inherit', background:tab===t?'#1e90ff':'rgba(255,255,255,0.07)', color:tab===t?'#fff':'rgba(255,255,255,0.5)' }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'14px' }}>
        {[
          { label:'Collected', value:`₹${totalPaid.toLocaleString('en-IN')} / $${payments.filter(p=>p.status==='paid'&&p.currency!=='INR').reduce((a,p)=>a+(p.amount||0),0).toFixed(2)}`, color:'#10b981', bg:'rgba(16,185,129,0.1)', bd:'rgba(16,185,129,0.2)' },
          { label:'Pending',   value:payments.filter(p=>['pending','overdue'].includes(p.status)).length + ' records', color:'#f4a335', bg:'rgba(232,124,30,0.1)', bd:'rgba(232,124,30,0.2)' },
          { label:'Total',     value:payments.length + ' records', color:'#5aabff', bg:'rgba(30,144,255,0.1)', bd:'rgba(30,144,255,0.2)' },
        ].map(c=>(
          <div key={c.label} style={{ background:c.bg, border:`0.5px solid ${c.bd}`, borderRadius:'12px', padding:'12px 14px' }}>
            <div style={{ fontSize:'10px', fontWeight:700, color:c.color, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'4px' }}>{c.label}</div>
            <div style={{ fontSize:'16px', fontWeight:800, color:'#fff' }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* ══ GENERATE TAB ══ */}
      {tab === 'generate' && (
        <div style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'1.2rem' }}>

          {/* Mode selector */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'20px' }}>
            <button onClick={()=>{ setMode('international'); setCurrency('USD') }} style={{ padding:'14px', borderRadius:'12px', border:`1.5px solid ${mode==='international'?'#1877f2':'rgba(255,255,255,0.08)'}`, background:mode==='international'?'rgba(24,119,242,0.12)':'rgba(255,255,255,0.03)', cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}>
              <div style={{ fontSize:'22px', marginBottom:'6px' }}>🌍</div>
              <div style={{ fontSize:'13px', fontWeight:700, color:mode==='international'?'#fff':'rgba(255,255,255,0.5)' }}>International Student</div>
              <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'3px' }}>UAE · US · UK · SG · AU</div>
              <div style={{ fontSize:'10px', fontWeight:700, color:'#5aabff', marginTop:'6px' }}>🅿️ Auto PayPal Link</div>
            </button>
            <button onClick={()=>{ setMode('india'); setCurrency('INR') }} style={{ padding:'14px', borderRadius:'12px', border:`1.5px solid ${mode==='india'?'#f4a335':'rgba(255,255,255,0.08)'}`, background:mode==='india'?'rgba(244,163,53,0.1)':'rgba(255,255,255,0.03)', cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}>
              <div style={{ fontSize:'22px', marginBottom:'6px' }}>🇮🇳</div>
              <div style={{ fontSize:'13px', fontWeight:700, color:mode==='india'?'#fff':'rgba(255,255,255,0.5)' }}>Indian Student</div>
              <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'3px' }}>UPI · Cash · Bank Transfer</div>
              <div style={{ fontSize:'10px', fontWeight:700, color:'#f4a335', marginTop:'6px' }}>📝 Manual Record</div>
            </button>
          </div>

          <form onSubmit={mode === 'international' ? generatePayPal : recordManual}>

            {/* Common fields */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              <div>
                <label style={lbl}>Student *</label>
                <select style={inp} value={selStudent} onChange={e=>setSelStudent(e.target.value)} required>
                  <option value="">— Select student —</option>
                  {students.map(s=><option key={s.id} value={s.id}>{s.full_name}{s.email?` (${s.email})`:''}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Course / Description *</label>
                <input style={inp} type="text" placeholder="e.g. Guitar — 3 months" value={courseName} onChange={e=>setCourseName(e.target.value)} required />
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              <div>
                <label style={lbl}>Amount * {mode==='india'?'(₹ INR)':'(USD)'}</label>
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute', left:'13px', top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.4)', fontSize:'14px' }}>{mode==='india'?'₹':'$'}</span>
                  <input style={{ ...inp, paddingLeft:'28px' }} type="number" placeholder={mode==='india'?'5000':'60'} min="1" step={mode==='india'?'1':'0.01'} value={amount} onChange={e=>setAmount(e.target.value)} required />
                </div>
              </div>
              {mode === 'international' ? (
                <div>
                  <label style={lbl}>Currency</label>
                  <select style={inp} value={currency} onChange={e=>setCurrency(e.target.value)}>
                    {FOREIGN_CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label style={lbl}>Payment Method</label>
                  <select style={inp} value={manualMethod} onChange={e=>setManualMethod(e.target.value)}>
                    <option value="UPI">UPI (GPay/PhonePe/Paytm)</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              )}
            </div>

            {/* India extra fields */}
            {mode === 'india' && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                <div>
                  <label style={lbl}>Transaction Reference (optional)</label>
                  <input style={inp} type="text" placeholder="UPI ref / UTR number" value={manualRef} onChange={e=>setManualRef(e.target.value)} />
                  <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.25)', marginTop:'4px' }}>If filled → marked as Paid automatically</div>
                </div>
                <div>
                  <label style={lbl}>Payment Date (optional)</label>
                  <input style={inp} type="date" value={manualDate} onChange={e=>setManualDate(e.target.value)} />
                </div>
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              <div>
                <label style={lbl}>Due Date (optional)</label>
                <input style={inp} type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} />
              </div>
              <div>
                <label style={lbl}>Notes (optional)</label>
                <input style={inp} type="text" placeholder="e.g. May 2026 fee" value={notes} onChange={e=>setNotes(e.target.value)} />
              </div>
            </div>

            {err && <div style={{ marginTop:'10px', padding:'9px 13px', background:'rgba(220,60,60,0.1)', border:'0.5px solid rgba(220,60,60,0.3)', borderRadius:'8px', fontSize:'13px', color:'#f09595' }}>{err}</div>}
            {ok  && <div style={{ marginTop:'10px', padding:'9px 13px', background:'rgba(16,185,129,0.1)', border:'0.5px solid rgba(16,185,129,0.3)', borderRadius:'8px', fontSize:'13px', color:'#34d399' }}>{ok}</div>}

            <button type="submit" disabled={busy} style={{ width:'100%', padding:'14px', background: busy ? 'rgba(100,100,100,0.3)' : mode==='international' ? 'linear-gradient(135deg,#1877f2,#0ea5e9)' : 'linear-gradient(135deg,#f4a335,#e87c1e)', color:'#fff', fontSize:'15px', fontWeight:800, border:'none', borderRadius:'10px', cursor:busy?'not-allowed':'pointer', marginTop:'14px', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
              {busy
                ? <><span style={{ display:'inline-block', width:'16px', height:'16px', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite' }}/> Processing...</>
                : mode === 'international'
                  ? '🅿️ Generate PayPal Link'
                  : '📝 Record Manual Payment'
              }
            </button>
          </form>

          {/* Result */}
          {generated && (
            <div style={{ marginTop:'18px', padding:'16px', background:'rgba(16,185,129,0.07)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:'14px' }}>
              <div style={{ fontSize:'13px', fontWeight:700, color:'#34d399', marginBottom:'10px' }}>
                ✅ {generated.type==='paypal'?'PayPal Link Ready':'Payment Recorded'} — {generated.invoiceNo}
              </div>
              <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.5)', marginBottom:'10px' }}>
                <span style={{ color:'rgba(255,255,255,0.8)', fontWeight:600 }}>{generated.studentName}</span>
                {' · '}
                <span style={{ color:'#10b981', fontWeight:700 }}>
                  {generated.currency==='INR' ? `₹${parseFloat(generated.amount).toLocaleString('en-IN')}` : `$${generated.amount} ${generated.currency}`}
                </span>
                {' · '}{generated.course}
                {generated.type==='manual' && <span style={{ marginLeft:'8px', fontSize:'10px', padding:'2px 8px', borderRadius:'8px', background:generated.status==='paid'?'rgba(16,185,129,0.2)':'rgba(244,163,53,0.2)', color:generated.status==='paid'?'#10b981':'#f4a335' }}>{generated.status}</span>}
              </div>

              {generated.type === 'paypal' && (
                <>
                  <div style={{ background:'rgba(0,0,0,0.35)', borderRadius:'8px', padding:'10px 13px', fontSize:'11px', fontFamily:'monospace', color:'#5aabff', wordBreak:'break-all', marginBottom:'12px', border:'0.5px solid rgba(30,144,255,0.2)' }}>
                    {generated.link}
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
                    <button onClick={()=>copyText(generated.link,'link')} style={{ padding:'10px 8px', fontSize:'12px', fontWeight:700, borderRadius:'9px', border:'none', cursor:'pointer', background:copied==='link'?'rgba(16,185,129,0.25)':'rgba(255,255,255,0.08)', color:copied==='link'?'#34d399':'rgba(255,255,255,0.7)', fontFamily:'inherit' }}>
                      {copied==='link'?'✓ Copied!':'📋 Copy Link'}
                    </button>
                    <a href={whatsappMsg(generated.link, generated.studentName, generated.amount, generated.currency, generated.course)}
                      target="_blank" rel="noreferrer"
                      style={{ padding:'10px 8px', fontSize:'12px', fontWeight:700, borderRadius:'9px', background:'rgba(37,211,102,0.18)', color:'#25d366', textAlign:'center', textDecoration:'none', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      📱 WhatsApp
                    </a>
                    <button onClick={()=>copyText(`${BUSINESS_NAME}\nInvoice: ${generated.invoiceNo}\nStudent: ${generated.studentName}\nCourse: ${generated.course}\nAmount: $${generated.amount} ${generated.currency}\n\nPay: ${generated.link}`,'inv')}
                      style={{ padding:'10px 8px', fontSize:'12px', fontWeight:700, borderRadius:'9px', border:'none', cursor:'pointer', background:copied==='inv'?'rgba(139,92,246,0.3)':'rgba(139,92,246,0.12)', color:copied==='inv'?'#c4b5fd':'#a78bfa', fontFamily:'inherit' }}>
                      {copied==='inv'?'✓ Copied!':'📝 Invoice'}
                    </button>
                  </div>
                </>
              )}
              {generated.type === 'manual' && (
                <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.4)', lineHeight:1.8 }}>
                  {generated.method && <div>📱 Method: <strong style={{ color:'rgba(255,255,255,0.7)' }}>{generated.method}</strong></div>}
                  {generated.ref    && <div>🔖 Reference: <strong style={{ color:'rgba(255,255,255,0.7)' }}>{generated.ref}</strong></div>}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ PAYMENTS LIST ══ */}
      {tab === 'list' && (
        <div style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'1.1rem 1.2rem' }}>
          <div style={{ display:'flex', gap:'6px', marginBottom:'14px', flexWrap:'wrap' }}>
            {[['all','All'],['pending','Pending'],['paid','Paid'],['overdue','Overdue']].map(([f,l])=>(
              <button key={f} onClick={()=>setFilter(f)} style={{ fontSize:'11px', fontWeight:600, padding:'5px 14px', borderRadius:'20px', border:'none', cursor:'pointer', fontFamily:'inherit', background:filter===f?'#1e90ff':'rgba(255,255,255,0.07)', color:filter===f?'#fff':'rgba(255,255,255,0.45)' }}>
                {l} {f!=='all'&&<span style={{opacity:0.6}}>({payments.filter(p=>p.status===f).length})</span>}
              </button>
            ))}
          </div>

          {ok && <div style={{ marginBottom:'10px', padding:'9px 13px', background:'rgba(16,185,129,0.1)', border:'0.5px solid rgba(16,185,129,0.3)', borderRadius:'8px', fontSize:'13px', color:'#34d399' }}>{ok}</div>}

          {loading ? (
            <div style={{ textAlign:'center', padding:'2.5rem', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:'2.5rem 1rem' }}>
              <div style={{ fontSize:'32px', marginBottom:'10px' }}>💳</div>
              <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.3)', marginBottom:'8px' }}>No records yet.</div>
              <button onClick={()=>setTab('generate')} style={{ fontSize:'12px', fontWeight:600, padding:'8px 18px', borderRadius:'10px', background:'rgba(30,144,255,0.15)', color:'#5aabff', border:'none', cursor:'pointer', fontFamily:'inherit' }}>+ New Payment</button>
            </div>
          ) : (
            <div style={{ display:'grid', gap:'8px' }}>
              {filtered.map(p=>{
                const isIndia = p.currency === 'INR' || p.gateway === 'manual'
                const displayAmt = isIndia
                  ? `₹${(p.amount||0).toLocaleString('en-IN')}`
                  : `$${(p.amount||0).toFixed(2)} ${p.currency||'USD'}`
                return (
                  <div key={p.id} style={{ padding:'12px 14px', background:'rgba(255,255,255,0.03)', borderRadius:'10px', borderLeft:`3px solid ${SC[p.status]||'rgba(255,255,255,0.15)'}` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'10px' }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap', marginBottom:'3px' }}>
                          <span style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.85)' }}>{p.student_name||'—'}</span>
                          {p.invoice_no&&<span style={{ fontSize:'9px', fontWeight:700, padding:'2px 7px', borderRadius:'8px', background:'rgba(232,124,30,0.15)', color:'#e87c1e' }}>{p.invoice_no}</span>}
                          <span style={{ fontSize:'9px', fontWeight:700, padding:'2px 7px', borderRadius:'8px', background:isIndia?'rgba(244,163,53,0.15)':'rgba(24,119,242,0.15)', color:isIndia?'#f4a335':'#5aabff' }}>
                            {isIndia ? '🇮🇳 Manual' : '🌍 PayPal'}
                          </span>
                        </div>
                        <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)' }}>
                          {p.course_name}{p.due_date&&` · Due: ${p.due_date}`}{p.paid_date&&` · Paid: ${p.paid_date}`}
                        </div>
                        {p.notes&&<div style={{ fontSize:'11px', color:'rgba(255,255,255,0.22)', marginTop:'2px' }}>{p.notes.split('\n')[0]}</div>}
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontSize:'16px', fontWeight:800, color:SC[p.status]||'#fff' }}>{displayAmt}</div>
                        <span style={{ fontSize:'9px', fontWeight:700, padding:'2px 8px', borderRadius:'10px', background:SB[p.status]||'rgba(255,255,255,0.05)', color:SC[p.status]||'#aaa', textTransform:'uppercase' }}>{p.status}</span>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:'6px', marginTop:'10px', flexWrap:'wrap' }}>
                      {p.payment_link&&<>
                        <button onClick={()=>copyText(p.payment_link,p.id)} style={{ fontSize:'10px', fontWeight:700, padding:'5px 10px', borderRadius:'7px', border:'none', cursor:'pointer', background:copied===p.id?'rgba(16,185,129,0.2)':'rgba(255,255,255,0.07)', color:copied===p.id?'#34d399':'rgba(255,255,255,0.6)', fontFamily:'inherit' }}>
                          {copied===p.id?'✓ Copied':'📋 Copy'}
                        </button>
                        <a href={whatsappMsg(p.payment_link,p.student_name,(p.amount||0).toFixed(2),p.currency||'USD',p.course_name)}
                          target="_blank" rel="noreferrer"
                          style={{ fontSize:'10px', fontWeight:700, padding:'5px 10px', borderRadius:'7px', background:'rgba(37,211,102,0.15)', color:'#25d366', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:'3px' }}>
                          📱 WhatsApp
                        </a>
                        <a href={p.payment_link} target="_blank" rel="noreferrer"
                          style={{ fontSize:'10px', fontWeight:700, padding:'5px 10px', borderRadius:'7px', background:'rgba(24,119,242,0.12)', color:'#5aabff', textDecoration:'none' }}>
                          🅿️ Open
                        </a>
                      </>}
                      {p.status!=='paid'&&(
                        <button onClick={()=>markPaid(p.id)} style={{ fontSize:'10px', fontWeight:700, padding:'5px 10px', borderRadius:'7px', border:'none', cursor:'pointer', background:'rgba(16,185,129,0.12)', color:'#10b981', fontFamily:'inherit' }}>
                          ✓ Mark Paid
                        </button>
                      )}
                      <button onClick={()=>deletePay(p.id)} style={{ fontSize:'10px', fontWeight:700, padding:'5px 10px', borderRadius:'7px', border:'none', cursor:'pointer', background:'rgba(239,68,68,0.1)', color:'#f87171', fontFamily:'inherit', marginLeft:'auto' }}>✕</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
