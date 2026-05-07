module.exports = async function handler(req, res) {
  const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID
  const PAYPAL_SECRET    = process.env.PAYPAL_SECRET

  try {
    const tokenRes = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64'),
      },
      body: 'grant_type=client_credentials',
    })
    const token = await tokenRes.json()
    if (!token.access_token) return res.json({ error: 'Token failed' })

    // Create invoice
    const invoiceRes = await fetch('https://api-m.paypal.com/v2/invoicing/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token.access_token}` },
      body: JSON.stringify({
        detail: { invoice_number:`TEST-${Date.now()}`, invoice_date:new Date().toISOString().slice(0,10), currency_code:'USD', payment_term:{ term_type:'DUE_ON_RECEIPT' } },
        invoicer: { name:{ given_name:'UniEDD', surname:'Academy' }, email_address:'unieddllp@gmail.com' },
        primary_recipients: [{ billing_info: { name:{ given_name:'Test', surname:'Student' } } }],
        items: [{ name:'Guitar Class', quantity:'1', unit_amount:{ currency_code:'USD', value:'60.00' }, unit_of_measure:'QUANTITY' }],
        amount: { breakdown: { item_total:{ currency_code:'USD', value:'60.00' } } },
      }),
    })
    const inv = await invoiceRes.json()
    const invoiceId = inv.href?.split('/').pop() || inv.id
    if (!invoiceId) return res.json({ step:'create_failed', inv })

    // Send
    const sendRes = await fetch(`https://api-m.paypal.com/v2/invoicing/invoices/${invoiceId}/send`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${token.access_token}` },
      body: JSON.stringify({ send_to_recipient:false, send_to_invoicer:false }),
    })
    const sendData = await sendRes.json()

    // Wait
    await new Promise(r => setTimeout(r, 1500))

    // Fetch details
    const detailRes = await fetch(`https://api-m.paypal.com/v2/invoicing/invoices/${invoiceId}`, {
      headers: { 'Authorization':`Bearer ${token.access_token}` },
    })
    const detail = await detailRes.json()

    const payerLink =
      detail.detail?.metadata?.payer_view_url ||
      detail.links?.find(l => l.rel === 'payer-view')?.href ||
      `https://www.paypal.com/invoice/p/#${invoiceId}`

    return res.json({
      success:    true,
      invoiceId,
      payerLink,
      status:     detail.status,  // should be SENT now
      sendResult: sendData,
      allLinks:   detail.links,
    })

  } catch(err) {
    return res.json({ error: err.message })
  }
}
