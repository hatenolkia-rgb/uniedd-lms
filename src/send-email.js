// Resend Email Service — all UniEDD email templates
const RESEND_API_KEY  = 're_apRjqpV7_32MJG44xi885oP6GJzt5Uuep'
const FROM_EMAIL      = 'UniEDD Academy <no-reply@uniedd.com>'
const ADMIN_EMAIL     = 'kum4r.p1yush@gmail.com'
const BRAND_COLOR     = '#1e90ff'
const ACCENT_COLOR    = '#e87c1e'
const APP_URL         = 'https://uniedd-lms.vercel.app'

// ── HTML Email Base Template ─────────────────────────────────
function baseTemplate(content, title) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${title}</title></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#0a1622,#0d1f33);padding:28px 32px;text-align:center;">
          <div style="font-family:Arial Black,sans-serif;font-size:28px;font-weight:900;letter-spacing:-1px;">
            <span style="color:${BRAND_COLOR}">UNI</span><span style="color:${ACCENT_COLOR}">EDD</span>
          </div>
          <div style="color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:0.15em;text-transform:uppercase;margin-top:4px;">Music &amp; Arts Academy</div>
        </td></tr>
        <!-- Content -->
        <tr><td style="padding:32px;">${content}</td></tr>
        <!-- Footer -->
        <tr><td style="background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">UniEDD Music &amp; Arts Academy · <a href="${APP_URL}" style="color:${BRAND_COLOR};text-decoration:none;">lms.uniedd.com</a></p>
          <p style="margin:6px 0 0;font-size:11px;color:#cbd5e1;">You received this email because you are enrolled with UniEDD.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ── Email Templates ──────────────────────────────────────────

function welcomeEmail(name) {
  return baseTemplate(`
    <h1 style="margin:0 0 8px;font-size:24px;color:#0f172a;">Welcome to UniEDD, ${name}! 🎉</h1>
    <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 24px;">We're thrilled to have you join our community of music and arts learners. Your journey starts here!</p>
    <table cellpadding="0" cellspacing="0" width="100%">
      ${['📚 Access your enrolled courses and class schedule','💳 View your payment history and invoices','📅 Check your upcoming classes on the calendar','🔗 Join live classes with one click via Zoom'].map(item => `
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
        <span style="font-size:14px;color:#334155;">${item}</span>
      </td></tr>`).join('')}
    </table>
    <div style="text-align:center;margin-top:28px;">
      <a href="${APP_URL}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,${BRAND_COLOR},#0ea5e9);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;">Go to Dashboard →</a>
    </div>
  `, `Welcome to UniEDD, ${name}!`)
}

function enrolmentEmail(name, courseName, fee) {
  return baseTemplate(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:56px;height:56px;background:#dcfce7;border-radius:50%;line-height:56px;font-size:28px;text-align:center;">🎓</div>
    </div>
    <h1 style="margin:0 0 8px;font-size:22px;color:#0f172a;text-align:center;">Enrolment Confirmed!</h1>
    <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 24px;text-align:center;">Hi ${name}, you have been successfully enrolled in:</p>
    <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:12px;padding:20px 24px;margin-bottom:24px;text-align:center;">
      <div style="font-size:20px;font-weight:800;color:#15803d;">${courseName}</div>
      ${fee ? `<div style="font-size:14px;color:#16a34a;margin-top:6px;">₹${fee}/month</div>` : ''}
    </div>
    <p style="color:#64748b;font-size:13px;line-height:1.7;margin:0 0 24px;">Our team will reach out on WhatsApp to schedule your first class. Please complete your payment to get started.</p>
    <div style="text-align:center;">
      <a href="${APP_URL}" style="display:inline-block;padding:13px 28px;background:linear-gradient(135deg,${BRAND_COLOR},#0ea5e9);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">View Dashboard →</a>
    </div>
  `, `Enrolment Confirmed — ${courseName}`)
}

function paymentLinkEmail(name, courseName, amount, currency, paymentLink, invoiceNo, dueDate) {
  const sym = currency === 'INR' ? '₹' : '$'
  return baseTemplate(`
    <h1 style="margin:0 0 8px;font-size:22px;color:#0f172a;">Payment Due 💳</h1>
    <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 20px;">Hi ${name}, your payment for <strong>${courseName}</strong> is due.</p>
    <div style="background:#fff7ed;border:1.5px solid #fed7aa;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="font-size:13px;color:#92400e;padding:4px 0;">Invoice No</td><td style="font-size:13px;color:#0f172a;font-weight:600;text-align:right;">${invoiceNo}</td></tr>
        <tr><td style="font-size:13px;color:#92400e;padding:4px 0;">Course</td><td style="font-size:13px;color:#0f172a;font-weight:600;text-align:right;">${courseName}</td></tr>
        <tr><td style="font-size:13px;color:#92400e;padding:4px 0;">Amount</td><td style="font-size:18px;color:#ea580c;font-weight:800;text-align:right;">${sym}${amount} ${currency}</td></tr>
        ${dueDate ? `<tr><td style="font-size:13px;color:#92400e;padding:4px 0;">Due Date</td><td style="font-size:13px;color:#0f172a;font-weight:600;text-align:right;">${dueDate}</td></tr>` : ''}
      </table>
    </div>
    ${paymentLink ? `
    <div style="text-align:center;margin-bottom:16px;">
      <a href="${paymentLink}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#1877f2,#0ea5e9);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;">🅿️ Pay Now via PayPal →</a>
    </div>
    <p style="text-align:center;font-size:12px;color:#94a3b8;">Click the button above to pay securely via PayPal</p>
    ` : `<p style="color:#64748b;font-size:13px;">Please transfer the amount via UPI/Bank Transfer and share the reference with us on WhatsApp.</p>`}
  `, `Payment Due — ${courseName}`)
}

function paymentReceiptEmail(name, courseName, amount, currency, invoiceNo, paidDate) {
  const sym = currency === 'INR' ? '₹' : '$'
  return baseTemplate(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:64px;height:64px;background:#dcfce7;border-radius:50%;line-height:64px;font-size:32px;">✅</div>
    </div>
    <h1 style="margin:0 0 8px;font-size:22px;color:#0f172a;text-align:center;">Payment Received!</h1>
    <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 20px;text-align:center;">Thank you ${name}! Your payment has been confirmed.</p>
    <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="font-size:13px;color:#166534;padding:5px 0;">Receipt No</td><td style="font-size:13px;color:#0f172a;font-weight:600;text-align:right;">${invoiceNo}</td></tr>
        <tr><td style="font-size:13px;color:#166534;padding:5px 0;">Course</td><td style="font-size:13px;color:#0f172a;font-weight:600;text-align:right;">${courseName}</td></tr>
        <tr><td style="font-size:13px;color:#166534;padding:5px 0;">Amount Paid</td><td style="font-size:18px;color:#16a34a;font-weight:800;text-align:right;">${sym}${amount} ${currency}</td></tr>
        <tr><td style="font-size:13px;color:#166534;padding:5px 0;">Date</td><td style="font-size:13px;color:#0f172a;font-weight:600;text-align:right;">${paidDate}</td></tr>
      </table>
    </div>
    <p style="color:#64748b;font-size:13px;line-height:1.7;text-align:center;">Keep this email as your payment receipt. See you in class! 🎵</p>
    <div style="text-align:center;margin-top:20px;">
      <a href="${APP_URL}" style="display:inline-block;padding:13px 28px;background:linear-gradient(135deg,${BRAND_COLOR},#0ea5e9);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">View Dashboard →</a>
    </div>
  `, `Payment Receipt — ${invoiceNo}`)
}

function convertISTtoLocal(date, time, targetTZ) {
  if (!time || !targetTZ || targetTZ === 'Asia/Kolkata') return { localTime: time, localDate: date }
  try {
    const dt = new Date(`${date}T${time}:00+05:30`)
    const localTime = dt.toLocaleTimeString('en-GB', { timeZone: targetTZ, hour:'2-digit', minute:'2-digit', hour12:false })
    const localDate = dt.toLocaleDateString('en-GB', { timeZone: targetTZ, weekday:'long', day:'numeric', month:'long', year:'numeric' })
    const tzName    = dt.toLocaleString('en', { timeZone: targetTZ, timeZoneName:'shortOffset' }).split(' ').pop()
    return { localTime, localDate, tzName }
  } catch(e) { return { localTime: time, localDate: date } }
}

function classScheduledEmail(name, classTitle, classDate, startTime, teacherName, zoomLink, studentTZ) {
  // Convert IST to student's local timezone
  const tz = studentTZ || 'Asia/Kolkata'
  const local = startTime ? convertISTtoLocal(classDate, startTime, tz) : null
  const showDual = local && local.localTime !== startTime && tz !== 'Asia/Kolkata'

  return baseTemplate(`
    <h1 style="margin:0 0 8px;font-size:22px;color:#0f172a;">Class Scheduled! 📅</h1>
    <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 20px;">Hi ${name}, a new class has been scheduled for you:</p>
    <div style="background:#eff6ff;border:1.5px solid #93c5fd;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
      <div style="font-size:18px;font-weight:800;color:#1d4ed8;margin-bottom:12px;">${classTitle}</div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="font-size:13px;color:#1e40af;padding:4px 0;">📅 Date</td><td style="font-size:13px;color:#0f172a;font-weight:600;text-align:right;">${local ? local.localDate : classDate}</td></tr>
        ${local ? `<tr><td style="font-size:13px;color:#1e40af;padding:4px 0;">⏰ Your Time</td><td style="font-size:13px;color:#0f172a;font-weight:600;text-align:right;">${local.localTime}${local.tzName ? ' ' + local.tzName : ''}</td></tr>` : ''}
        ${showDual ? `<tr><td style="font-size:13px;color:#94a3b8;padding:4px 0;">⏰ IST (India)</td><td style="font-size:12px;color:#94a3b8;text-align:right;">${startTime} IST</td></tr>` : ''}
        ${teacherName ? `<tr><td style="font-size:13px;color:#1e40af;padding:4px 0;">👨‍🏫 Teacher</td><td style="font-size:13px;color:#0f172a;font-weight:600;text-align:right;">${teacherName}</td></tr>` : ''}
      </table>
    </div>
    ${zoomLink ? `
    <div style="text-align:center;margin-bottom:16px;">
      <a href="${zoomLink}" style="display:inline-block;padding:13px 28px;background:#2d8cff;color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">🔗 Join Zoom Class →</a>
    </div>` : `<p style="color:#64748b;font-size:13px;text-align:center;">Zoom link will be shared before the class.</p>`}
    <div style="text-align:center;margin-top:16px;">
      <a href="${APP_URL}" style="display:inline-block;padding:11px 24px;background:#f1f5f9;color:#475569;text-decoration:none;border-radius:10px;font-weight:600;font-size:13px;">View Calendar →</a>
    </div>
  `, `Class Scheduled — ${classTitle}`)
}

// ── Send email via Resend ────────────────────────────────────
async function sendEmail(to, subject, html) {
  if (!RESEND_API_KEY) {
    console.log('RESEND_API_KEY not set — email not sent to:', to)
    return { skipped: true }
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })
  return await res.json()
}

// ── Main handler ─────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { type, to, data } = req.body

  if (!to || !type) return res.status(400).json({ error: 'Missing to or type' })

  try {
    let subject, html

    switch (type) {
      case 'welcome':
        subject = `Welcome to UniEDD, ${data.name}! 🎉`
        html    = welcomeEmail(data.name)
        break

      case 'enrolment':
        subject = `Enrolment Confirmed — ${data.courseName}`
        html    = enrolmentEmail(data.name, data.courseName, data.fee)
        break

      case 'payment_link':
        subject = `Payment Due — ${data.courseName} (${data.invoiceNo})`
        html    = paymentLinkEmail(data.name, data.courseName, data.amount, data.currency, data.paymentLink, data.invoiceNo, data.dueDate)
        break

      case 'payment_receipt':
        subject = `Payment Receipt — ${data.invoiceNo} ✅`
        html    = paymentReceiptEmail(data.name, data.courseName, data.amount, data.currency, data.invoiceNo, data.paidDate)
        // Also notify admin
        await sendEmail(ADMIN_EMAIL, `Payment received — ${data.name} · ${data.invoiceNo}`, html)
        break

      case 'class_scheduled':
        subject = `Class Scheduled — ${data.classTitle} 📅`
        html    = classScheduledEmail(data.name, data.classTitle, data.classDate, data.startTime, data.teacherName, data.zoomLink)
        break

      default:
        return res.status(400).json({ error: `Unknown email type: ${type}` })
    }

    const result = await sendEmail(to, subject, html)
    return res.status(200).json({ success: true, result, type, to })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
