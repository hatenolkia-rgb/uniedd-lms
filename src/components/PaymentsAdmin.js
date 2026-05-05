import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

// ── YOUR PAYPAL SETTINGS ─────────────────────────────────────
// Step 1: Log in to paypal.com
// Step 2: Go to paypal.com/paymentlinks → Create a payment link
// Step 3: Copy the link and paste it when sending to student
// OR use PayPal.me: paypal.me/YourUsername/Amount
const PAYPAL_ME_USERNAME = 'UniEDDPayments'  // ← Change to your PayPal.me username
const BUSINESS_NAME      = 'UniEDD Music & Arts Academy'
// ─────────────────────────────────────────────────────────────

const CURRENCIES = [
  { code:'INR', symbol:'₹', label:'INR — Indian Rupee',       rate:1    },
  { code:'USD', symbol:'$', label:'USD — US Dollar',           rate:0.012 },
  { code:'GBP', symbol:'£', label:'GBP — British Pound',       rate:0.0096},
  { code:'EUR', symbol:'€', label:'EUR — Euro',                rate:0.011 },
  { code:'AED', symbol:'د.إ',label:'AED — UAE Dirham',         rate:0.044 },
  { code:'SGD', symbol:'S$',label:'SGD — Singapore Dollar',    rate:0.016 },
  { code:'AUD', symbol:'A$',label:'AUD — Australian Dollar',   rate:0.019 },
]

// PayPal.me only supports these currencies natively
const PAYPAL_SUPPORTED = ['USD','GBP','EUR','AED','SGD','AUD','CAD']

export default function PaymentsAdmin({ profile }) {
  const [payments,  setPayments]  = useState([])
  const [students,  setStudents]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [filter,    setFilter]    = useState('all')
  const [tab,       setTab]       = useState('list')
  const [ok,        setOk]        = useState('')
  const [err,       setErr]       = useState('')
  const [busy,      setBusy]      = useState(false)
  const [copied,    setCopied]    = useState(null)

  // Form
  const [selStudent, setSelStudent] = useState('')
  const [courseName, setCourseName] = useState('')
  const [amountINR,  setAmountINR]  = useState('')   // always enter in INR
  const [currency,   setCurrency]   = useState('INR')
  const [dueDate,    setDueDate]    = useState('')
  const [notes,      setNotes]      = useState('')
  const [manualLink, setManualLink] = useState('')   // admin pastes PayPal link here
  const [generated,  setGenerated]  = useState(null)

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

  // ── Convert INR to selected currency ──────────────────────
  function convertAmount(inrAmount, toCurrency) {
    const cur = CURRENCIES.find(c => c.code === toCurrency)
    if (!cur || toCurrency === 'INR') return parseFloat(inrAmount)
    return parseFloat((inrAmount * cur.rate).toFixed(2))
  }

  function getCurrencySymbol(code) {
    return CURRENCIES.find(c => c.code === code)?.symbol || code
  }

  // ── Build PayPal.me link ────────────────────────────────
  function buildPayPalMeLink(amount, currCode) {
    // PayPal.me supports non-INR currencies
    const finalCurr   = PAYPAL_SUPPORTED.includes(currCode) ? currCode : 'USD'
    const finalAmount = finalCurr === currCode
      ? amount
      : convertAmount(amountINR, 'USD')  // fallback to USD if currency not supported
    return `https://paypal.me/${PAYPAL_ME_USERNAME}/${finalAmount}${finalCurr}`
  }

  // ── WhatsApp message ─────────────────────────────────────
  function whatsappMsg(link, studentName, amount, currCode, course) {
    const sym = getCurrencySymbol(currCode)
    const msg =
`Hello ${studentName}! 👋

Your fee for *${course}* at *${BUSINESS_NAME}* is due.

💰 Amount: *${sym}${amount} ${currCode}*
${dueDate ? `📅 Due Date: *${dueDate}*\n` : ''}
💳 Pay securely via PayPal:
${link}

Simply click the link above to pay using your PayPal account or any debit/credit card.

For any queries, reply to this message. Thank you! 🙏`
    return `https://wa.me/?text=${encodeURIComponent(msg)}`
  }

  // ── Generate & save payment record ──────────────────────
  async function generate(e) {
    e.preventDefault()
    setErr(''); setOk(''); setBusy(true); setGenerated(null)

    const student    = students.find(s => s.id === selStudent)
    const amtNum     = parseFloat(amountINR)
    const converted  = convertAmount(amtNum, currency)

    if (!selStudent)                      { setErr('Please select a student.');    setBusy(false); return }
    if (!courseName.trim())               { setErr('Please enter course name.');   setBusy(false); return }
    if (!amountINR || isNaN(amtNum) || amtNum <= 0) { setErr('Please enter a valid amount.'); setBusy(false); return }

    // Use manually pasted link if provided, else build PayPal.me link
    const paypalLink = manualLink.trim() || buildPayPalMeLink(converted, currency)
    const invoiceNo  = 'INV-' + Date.now().toString().slice(-6)

    const { error } = await supabase.from('payments').insert({
      student_id:    selStudent,
      student_name:  student?.full_name,
      student_email: student?.email || null,
      course_name:   courseName.trim(),
      amount:        amtNum,          // stored in INR
      amount_foreign: converted,      // in selected currency
      currency:      currency,
      status:        'pending',
      invoice_no:    invoiceNo,
      payment_link:  paypalLink,
      gateway:       'paypal',
      due_date:      dueDate || null,
      generated_by:  profile.full_name,
      notes:         notes.trim() || null,
    })

    if (error) { setErr(error.message); setBusy(false); return }

    setGenerated({
      link: paypalLink, invoiceNo,
      studentName: student?.full_name,
      studentEmail: student?.email,
      studentPhone: student?.phone,
      amount: amtNum, converted, currency,
      course: courseName.trim(),
    })
    setOk(`✓ Payment record created — ${invoiceNo}`)
    // Reset form
    setSelStudent(''); setCourseName(''); setAmountINR('')
    setCurrency('INR'); setDueDate(''); setNotes(''); setManualLink('')
    load()
    setBusy(false)
  }

  function copyText(text, key) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2500)
  }

  async function markPaid(id) {
    await supabase.from('payments')
      .update({ status:'paid', paid_date: new Date().toISOString().slice(0,10) })
      .eq('id', id)
    setOk('✓ Marked as paid'); setTimeout(() => setOk(''), 3000)
    load()
  }

  async function deletePay(id) {
    if (!window.confirm('Delete this payment record?')) return
    await supabase.from('payments').delete().eq('id', id)
    load()
  }

  const filtered   = filter === 'all' ? payments : payments.filter(p => p.status === filter)
  const totalPaid  = payments.filter(p=>p.status==='paid').reduce((a,p)=>a+(p.amount||0),0)
  const totalDue   = payments.filter(p=>['pending','overdue'].includes(p.status)).reduce((a,p)=>a+(p.amount||0),0)

  const SC = { paid:'#10b981', pending:'#f4a335', overdue:'#f87171' }
  const SB = { paid:'rgba(16,185,129,0.12)', pending:'rgba(232,124,30,0.12)', overdue:'rgba(239,68,68,0.12)' }

  const inp = { width:'100%', background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'11px 13px', fontSize:'14px', color:'rgba(255,255,255,0.85)', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
  const lbl = { display:'block', fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.32)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'6px', marginTop:'14px' }

  return (
    <div id="uniedd-payments" style={{ marginTop:'14px' }}>

      {/* ── HEADER ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px', flexWrap:'wrap', gap:'8px' }}>
        <div style={{ fontSize:'16px', fontWeight:700, color:'rgba(255,255,255,0.85)' }}>💳 Payments</div>
        <div style={{ display:'flex', gap:'6px' }}>
          {[['list','📋 Payments'],['generate','+ Generate Link']].map(([t,l]) => (
            <button key={t} onClick={() => { setTab(t); setGenerated(null); setOk(''); setErr('') }} style={{ fontSize:'12px', fontWeight:600, padding:'7px 14px', borderRadius:'10px', border:'none', cursor:'pointer', fontFamily:'inherit', background:tab===t?'#1e90ff':'rgba(255,255,255,0.07)', color:tab===t?'#fff':'rgba(255,255,255,0.5)' }}>{l}</button>
          ))}
        </div>
      </div>

      {/* ── SUMMARY ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'14px' }}>
        {[
          { label:'Collected (INR)', value:`₹${totalPaid.toLocaleString('en-IN')}`,  color:'#10b981', bg:'rgba(16,185,129,0.1)',  bd:'rgba(16,185,129,0.2)'  },
          { label:'Pending (INR)',   value:`₹${totalDue.toLocaleString('en-IN')}`,    color:'#f4a335', bg:'rgba(232,124,30,0.1)', bd:'rgba(232,124,30,0.2)'  },
          { label:'Total Records',  value:payments.length,                            color:'#5aabff', bg:'rgba(30,144,255,0.1)', bd:'rgba(30,144,255,0.2)'  },
        ].map(c => (
          <div key={c.label} style={{ background:c.bg, border:`0.5px solid ${c.bd}`, borderRadius:'12px', padding:'12px 14px' }}>
            <div style={{ fontSize:'10px', fontWeight:700, color:c.color, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'4px' }}>{c.label}</div>
            <div style={{ fontSize:'20px', fontWeight:800, color:'#fff' }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* ══════════════ GENERATE TAB ══════════════ */}
      {tab === 'generate' && (
        <div style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'1.2rem' }}>

          {/* PayPal info banner */}
          <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 14px', background:'rgba(24,119,242,0.08)', border:'0.5px solid rgba(24,119,242,0.25)', borderRadius:'10px', marginBottom:'16px' }}>
            <div style={{ fontSize:'28px', flexShrink:0 }}>🅿️</div>
            <div>
              <div style={{ fontSize:'13px', fontWeight:700, color:'#5aabff' }}>PayPal Payment Link</div>
              <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.4)', marginTop:'2px', lineHeight:1.5 }}>
                A PayPal.me link is auto-generated. Or paste your own PayPal Payment Link from <a href="https://www.paypal.com/invoice/create" target="_blank" rel="noreferrer" style={{ color:'#5aabff' }}>paypal.com</a>.
              </div>
            </div>
          </div>

          {/* Setup guide (collapsed) */}
          <details style={{ marginBottom:'16px', padding:'10px 14px', background:'rgba(255,255,255,0.03)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'10px', cursor:'pointer' }}>
            <summary style={{ fontSize:'12px', fontWeight:600, color:'rgba(255,255,255,0.5)', listStyle:'none' }}>⚙️ How to set up your PayPal.me username</summary>
            <ol style={{ marginTop:'10px', paddingLeft:'16px', fontSize:'12px', color:'rgba(255,255,255,0.4)', lineHeight:2 }}>
              <li>Go to <a href="https://paypal.me" target="_blank" rel="noreferrer" style={{ color:'#5aabff' }}>paypal.me</a> → Sign in</li>
              <li>Set up your PayPal.me link (e.g. paypal.me/UniEDD)</li>
              <li>Open <code style={{ color:'#e87c1e' }}>PaymentsAdmin.js</code> line 9</li>
              <li>Replace <code style={{ color:'#e87c1e' }}>UniEDDPayments</code> with your username</li>
              <li>Upload to GitHub → done!</li>
            </ol>
          </details>

          <form onSubmit={generate}>
            {/* Student + Course */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              <div>
                <label style={lbl}>Student *</label>
                <select style={inp} value={selStudent} onChange={e=>setSelStudent(e.target.value)} required>
                  <option value="">— Select student —</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.full_name}{s.email?` (${s.email})`:''}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Course / Description *</label>
                <input style={inp} type="text" placeholder="e.g. Guitar — 3 months" value={courseName} onChange={e=>setCourseName(e.target.value)} required />
              </div>
            </div>

            {/* Amount + Currency */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              <div>
                <label style={lbl}>Amount (in INR) *</label>
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute', left:'13px', top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.4)', fontSize:'14px' }}>₹</span>
                  <input style={{ ...inp, paddingLeft:'26px' }} type="number" placeholder="5000" min="1" value={amountINR} onChange={e=>setAmountINR(e.target.value)} required />
                </div>
              </div>
              <div>
                <label style={lbl}>Charge Student In</label>
                <select style={inp} value={currency} onChange={e=>setCurrency(e.target.value)}>
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
              </div>
            </div>

            {/* Live conversion preview */}
            {amountINR && currency !== 'INR' && !isNaN(parseFloat(amountINR)) && (
              <div style={{ marginTop:'8px', padding:'8px 14px', background:'rgba(16,185,129,0.08)', border:'0.5px solid rgba(16,185,129,0.2)', borderRadius:'8px', fontSize:'12px', color:'#34d399', display:'flex', justifyContent:'space-between' }}>
                <span>₹{parseFloat(amountINR).toLocaleString('en-IN')} INR</span>
                <span>≈ {getCurrencySymbol(currency)}{convertAmount(parseFloat(amountINR), currency)} {currency}</span>
                <span style={{ color:'rgba(255,255,255,0.3)', fontSize:'10px' }}>approx. (exchange rate may vary)</span>
              </div>
            )}

            {/* Due date + Notes */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              <div>
                <label style={lbl}>Due Date (optional)</label>
                <input style={inp} type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} />
              </div>
              <div>
                <label style={lbl}>Notes (optional)</label>
                <input style={inp} type="text" placeholder="e.g. May 2026 monthly fee" value={notes} onChange={e=>setNotes(e.target.value)} />
              </div>
            </div>

            {/* Manual PayPal link (optional override) */}
            <label style={lbl}>Paste Your Own PayPal Link (optional)</label>
            <input style={inp} type="url" placeholder="https://www.paypal.com/paymentlinks/pay/..." value={manualLink} onChange={e=>setManualLink(e.target.value)} />
            <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.25)', marginTop:'5px' }}>
              Leave blank to auto-generate a PayPal.me link. Or paste a link from <a href="https://www.paypal.com/invoice/create" target="_blank" rel="noreferrer" style={{ color:'#5aabff' }}>PayPal Invoices</a> / <a href="https://www.paypal.com/paymentlinks" target="_blank" rel="noreferrer" style={{ color:'#5aabff' }}>PayPal Payment Links</a>.
            </div>

            {err && <div style={{ marginTop:'10px', padding:'9px 13px', background:'rgba(220,60,60,0.1)', border:'0.5px solid rgba(220,60,60,0.3)', borderRadius:'8px', fontSize:'13px', color:'#f09595' }}>{err}</div>}
            {ok  && <div style={{ marginTop:'10px', padding:'9px 13px', background:'rgba(16,185,129,0.1)', border:'0.5px solid rgba(16,185,129,0.3)', borderRadius:'8px', fontSize:'13px', color:'#34d399' }}>{ok}</div>}

            <button type="submit" disabled={busy} style={{ width:'100%', padding:'13px', background:'linear-gradient(135deg,#1877f2,#0ea5e9)', color:'#fff', fontSize:'14px', fontWeight:700, border:'none', borderRadius:'10px', cursor:'pointer', marginTop:'14px', fontFamily:'inherit', opacity:busy?0.6:1 }}>
              {busy ? '⏳ Creating...' : '🅿️ Generate PayPal Payment Link'}
            </button>
          </form>

          {/* ── RESULT CARD ── */}
          {generated && (
            <div style={{ marginTop:'18px', padding:'16px', background:'rgba(16,185,129,0.07)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:'14px' }}>
              <div style={{ fontSize:'13px', fontWeight:700, color:'#34d399', marginBottom:'12px' }}>
                ✅ Payment Link Ready — {generated.invoiceNo}
              </div>

              {/* Student info */}
              <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.5)', marginBottom:'10px', lineHeight:1.8 }}>
                <span style={{ color:'rgba(255,255,255,0.7)', fontWeight:600 }}>{generated.studentName}</span>
                {generated.studentEmail && ` · ${generated.studentEmail}`}
                {' · '}
                <span style={{ color:'#10b981', fontWeight:700 }}>
                  {generated.currency === 'INR' ? '₹' : getCurrencySymbol(generated.currency)}{generated.currency === 'INR' ? generated.amount.toLocaleString('en-IN') : generated.converted} {generated.currency}
                </span>
                {' · '}{generated.course}
              </div>

              {/* Link box */}
              <div style={{ background:'rgba(0,0,0,0.35)', borderRadius:'8px', padding:'10px 13px', fontSize:'12px', fontFamily:'monospace', color:'#5aabff', wordBreak:'break-all', marginBottom:'12px', border:'0.5px solid rgba(30,144,255,0.2)' }}>
                {generated.link}
              </div>

              {/* Action buttons */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
                <button onClick={() => copyText(generated.link, 'link')} style={{ padding:'10px 8px', fontSize:'12px', fontWeight:700, borderRadius:'9px', border:'none', cursor:'pointer', background:copied==='link'?'rgba(16,185,129,0.25)':'rgba(255,255,255,0.08)', color:copied==='link'?'#34d399':'rgba(255,255,255,0.7)', fontFamily:'inherit' }}>
                  {copied==='link' ? '✓ Copied!' : '📋 Copy Link'}
                </button>
                <a href={whatsappMsg(generated.link, generated.studentName, generated.currency==='INR'?generated.amount:generated.converted, generated.currency, generated.course)}
                  target="_blank" rel="noreferrer"
                  style={{ padding:'10px 8px', fontSize:'12px', fontWeight:700, borderRadius:'9px', background:'rgba(37,211,102,0.18)', color:'#25d366', textAlign:'center', textDecoration:'none', display:'flex', alignItems:'center', justifyContent:'center', gap:'5px' }}>
                  📱 WhatsApp
                </a>
                <button onClick={() => {
                  const sym = getCurrencySymbol(generated.currency)
                  const amt = generated.currency==='INR' ? `₹${generated.amount.toLocaleString('en-IN')}` : `${sym}${generated.converted} ${generated.currency}`
                  copyText(`${BUSINESS_NAME}\nInvoice: ${generated.invoiceNo}\nStudent: ${generated.studentName}\nCourse: ${generated.course}\nAmount: ${amt}\nPay: ${generated.link}`, 'full')
                }} style={{ padding:'10px 8px', fontSize:'12px', fontWeight:700, borderRadius:'9px', border:'none', cursor:'pointer', background:copied==='full'?'rgba(139,92,246,0.3)':'rgba(139,92,246,0.12)', color:copied==='full'?'#c4b5fd':'#a78bfa', fontFamily:'inherit' }}>
                  {copied==='full' ? '✓ Copied!' : '📝 Copy Invoice'}
                </button>
              </div>

              {/* PayPal.me note */}
              {!manualLink && (
                <div style={{ marginTop:'12px', padding:'8px 12px', background:'rgba(255,193,7,0.07)', border:'0.5px solid rgba(255,193,7,0.2)', borderRadius:'8px', fontSize:'11px', color:'rgba(255,255,255,0.4)', lineHeight:1.6 }}>
                  💡 <strong style={{ color:'#fbbf24' }}>Tip:</strong> This is a PayPal.me link. For a more professional payment page with your logo and custom message, create a proper payment link at <a href="https://www.paypal.com/paymentlinks" target="_blank" rel="noreferrer" style={{ color:'#5aabff' }}>paypal.com/paymentlinks</a> and paste it in the form.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════ PAYMENTS LIST ══════════════ */}
      {tab === 'list' && (
        <div style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'1.1rem 1.2rem' }}>
          {/* Filter tabs */}
          <div style={{ display:'flex', gap:'6px', marginBottom:'14px', flexWrap:'wrap' }}>
            {[['all','All'],['pending','Pending'],['paid','Paid'],['overdue','Overdue']].map(([f,l]) => (
              <button key={f} onClick={()=>setFilter(f)} style={{ fontSize:'11px', fontWeight:600, padding:'5px 14px', borderRadius:'20px', border:'none', cursor:'pointer', fontFamily:'inherit', background:filter===f?'#1e90ff':'rgba(255,255,255,0.07)', color:filter===f?'#fff':'rgba(255,255,255,0.45)', textTransform:'capitalize' }}>
                {l} {f !== 'all' && <span style={{ opacity:0.6 }}>({payments.filter(p=>p.status===f).length})</span>}
              </button>
            ))}
          </div>

          {ok && <div style={{ marginBottom:'10px', padding:'9px 13px', background:'rgba(16,185,129,0.1)', border:'0.5px solid rgba(16,185,129,0.3)', borderRadius:'8px', fontSize:'13px', color:'#34d399' }}>{ok}</div>}

          {loading ? (
            <div style={{ textAlign:'center', padding:'2.5rem', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:'2.5rem 1rem' }}>
              <div style={{ fontSize:'32px', marginBottom:'12px' }}>💳</div>
              <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.3)', marginBottom:'6px' }}>No payment records yet.</div>
              <button onClick={()=>setTab('generate')} style={{ fontSize:'12px', fontWeight:600, padding:'8px 18px', borderRadius:'10px', background:'rgba(30,144,255,0.15)', color:'#5aabff', border:'none', cursor:'pointer', fontFamily:'inherit' }}>+ Generate First Link</button>
            </div>
          ) : (
            <div style={{ display:'grid', gap:'8px' }}>
              {filtered.map(p => {
                const sym = getCurrencySymbol(p.currency || 'INR')
                const displayAmt = p.currency && p.currency !== 'INR' && p.amount_foreign
                  ? `${sym}${p.amount_foreign} ${p.currency}`
                  : `₹${(p.amount||0).toLocaleString('en-IN')}`
                return (
                  <div key={p.id} style={{ padding:'12px 14px', background:'rgba(255,255,255,0.03)', borderRadius:'10px', borderLeft:`3px solid ${SC[p.status]||'rgba(255,255,255,0.15)'}` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'10px' }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap', marginBottom:'2px' }}>
                          <span style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.85)' }}>{p.student_name || '—'}</span>
                          {p.invoice_no && <span style={{ fontSize:'9px', fontWeight:700, padding:'2px 7px', borderRadius:'8px', background:'rgba(232,124,30,0.15)', color:'#e87c1e' }}>{p.invoice_no}</span>}
                          <span style={{ fontSize:'9px', fontWeight:700, padding:'2px 7px', borderRadius:'8px', background:'rgba(24,119,242,0.15)', color:'#5aabff' }}>PayPal</span>
                        </div>
                        <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)' }}>
                          {p.course_name}
                          {p.due_date && ` · Due: ${p.due_date}`}
                          {p.paid_date && ` · Paid: ${p.paid_date}`}
                        </div>
                        {p.notes && <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.22)', marginTop:'2px' }}>{p.notes}</div>}
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontSize:'16px', fontWeight:800, color:SC[p.status]||'#fff' }}>{displayAmt}</div>
                        {p.currency && p.currency !== 'INR' && p.amount && (
                          <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.25)' }}>≈ ₹{(p.amount||0).toLocaleString('en-IN')}</div>
                        )}
                        <span style={{ fontSize:'9px', fontWeight:700, padding:'2px 8px', borderRadius:'10px', background:SB[p.status]||'rgba(255,255,255,0.05)', color:SC[p.status]||'#aaa', textTransform:'uppercase' }}>{p.status}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display:'flex', gap:'6px', marginTop:'10px', flexWrap:'wrap' }}>
                      {p.payment_link && (
                        <>
                          <button onClick={()=>copyText(p.payment_link, p.id)} style={{ fontSize:'10px', fontWeight:700, padding:'5px 10px', borderRadius:'7px', border:'none', cursor:'pointer', background:copied===p.id?'rgba(16,185,129,0.2)':'rgba(255,255,255,0.07)', color:copied===p.id?'#34d399':'rgba(255,255,255,0.6)', fontFamily:'inherit' }}>
                            {copied===p.id ? '✓ Copied' : '📋 Copy'}
                          </button>
                          <a href={whatsappMsg(p.payment_link, p.student_name, p.currency!=='INR'&&p.amount_foreign?p.amount_foreign:p.amount, p.currency||'INR', p.course_name)}
                            target="_blank" rel="noreferrer"
                            style={{ fontSize:'10px', fontWeight:700, padding:'5px 10px', borderRadius:'7px', background:'rgba(37,211,102,0.15)', color:'#25d366', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:'3px' }}>
                            📱 WhatsApp
                          </a>
                          <a href={p.payment_link} target="_blank" rel="noreferrer"
                            style={{ fontSize:'10px', fontWeight:700, padding:'5px 10px', borderRadius:'7px', background:'rgba(24,119,242,0.12)', color:'#5aabff', textDecoration:'none' }}>
                            🅿️ Open
                          </a>
                        </>
                      )}
                      {p.status !== 'paid' && (
                        <button onClick={()=>markPaid(p.id)} style={{ fontSize:'10px', fontWeight:700, padding:'5px 10px', borderRadius:'7px', border:'none', cursor:'pointer', background:'rgba(16,185,129,0.12)', color:'#10b981', fontFamily:'inherit' }}>
                          ✓ Mark Paid
                        </button>
                      )}
                      <button onClick={()=>deletePay(p.id)} style={{ fontSize:'10px', fontWeight:700, padding:'5px 10px', borderRadius:'7px', border:'none', cursor:'pointer', background:'rgba(239,68,68,0.1)', color:'#f87171', fontFamily:'inherit', marginLeft:'auto' }}>
                        ✕
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
