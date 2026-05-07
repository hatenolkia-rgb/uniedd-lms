module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { amount, currency, description, studentName, studentEmail, invoiceNo } = req.body
  const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID
  const PAYPAL_SECRET    = process.env.PAYPAL_SECRET

  if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
    return res.status(500).json({ error: 'PayPal credentials missing' })
  }

  try {
    // Step 1: Get token
    const tokenRes = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64'),
      },
      body: 'grant_type=client_credentials',
    })
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      return res.status(500).json({ error: 'Token failed', details: tokenData })
    }
    const token = tokenData.access_token

    const usdAmount = parseFloat(amount).toFixed(2)

    // Step 2: Create invoice
    const invoiceRes = await fetch('https://api-m.paypal.com/v2/invoicing/invoices', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        detail: {
          invoice_number: invoiceNo || `UNIEDD-${Date.now()}`,
          invoice_date:   new Date().toISOString().slice(0,10),
          currency_code:  'USD',
          payment_term:   { term_type: 'DUE_ON_RECEIPT' },
          note:           `UniEDD Music & Arts Academy — ${description}`,
        },
        invoicer: {
          name:          { given_name: 'UniEDD', surname: 'Academy' },
          email_address: 'unieddllp@gmail.com',
        },
        primary_recipients: [{
          billing_info: {
            name: {
              given_name: studentName?.split(' ')[0] || 'Student',
              surname:    studentName?.split(' ').slice(1).join(' ') || '',
            },
            ...(studentEmail ? { email_address: studentEmail } : {}),
          },
        }],
        items: [{
          name:            description,
          quantity:        '1',
          unit_amount:     { currency_code: 'USD', value: usdAmount },
          unit_of_measure: 'QUANTITY',
        }],
        amount: {
          breakdown: {
            item_total: { currency_code: 'USD', value: usdAmount },
          },
        },
      }),
    })

    const invoiceData = await invoiceRes.json()
    const invoiceId   = invoiceData.href?.split('/').pop() || invoiceData.id
    if (!invoiceId) {
      return res.status(500).json({ error: 'Invoice creation failed', details: invoiceData })
    }

    // Step 3: SEND invoice — this activates the payer link
    const sendRes = await fetch(`https://api-m.paypal.com/v2/invoicing/invoices/${invoiceId}/send`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        send_to_recipient: false,
        send_to_invoicer:  false,
        subject:           `Payment for ${description}`,
        note:              'Please complete your payment at UniEDD Music & Arts Academy.',
      }),
    })
    const sendData = await sendRes.json()

    // Step 4: Fetch invoice to get activated payer link
    const detailRes = await fetch(`https://api-m.paypal.com/v2/invoicing/invoices/${invoiceId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    const detail = await detailRes.json()

    // Try all possible link fields
    const payerLink =
      detail.detail?.metadata?.payer_view_url       ||
      detail.links?.find(l => l.rel === 'payer-view')?.href ||
      `https://www.paypal.com/invoice/p/#${invoiceId}`

    return res.status(200).json({
      success:     true,
      paymentLink: payerLink,
      invoiceId,
      amount:      usdAmount,
      currency:    'USD',
      status:      detail.status,
    })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
