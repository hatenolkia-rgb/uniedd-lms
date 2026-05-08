// Call the /api/send-email serverless function
export async function sendEmail(type, to, data) {
  if (!to) return
  try {
    // Auto-detect user's timezone and pass it with every email
    const userTZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'
    await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, to, data: { ...data, studentTZ: data.studentTZ || userTZ } }),
    })
  } catch(e) {
    console.log('Email send failed (non-critical):', e.message)
  }
}
