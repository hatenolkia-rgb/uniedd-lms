// Call the /api/send-email serverless function
export async function sendEmail(type, to, data) {
  if (!to) return  // no email = skip silently
  try {
    await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, to, data }),
    })
  } catch(e) {
    console.log('Email send failed (non-critical):', e.message)
  }
}
