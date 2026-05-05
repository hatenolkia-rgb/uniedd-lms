// Vercel Serverless Function — runs on server, keeps Secret safe
// Endpoint: POST /api/create-paypal-link

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { amount, currency, description, studentName, studentEmail, invoiceNo } = req.body

  if (!amount || !currency || !description) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID
  const PAYPAL_SECRET    = process.env.PAYPAL_SECRET
  const PAYPAL_BASE      = 'https://api-m.paypal.com'  // Live endpoint

  try {
    // ── Step 1: Get PayPal Access Token ──────────────────
    const tokenRes = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64'),
      },
      body: 'grant_type=client_credentials',
    })

    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      return res.status(500).json({ error: 'Failed to get PayPal token', details: tokenData })
    }

    const accessToken = tokenData.access_token

    // ── Step 2: Create PayPal Payment Link ───────────────
    // PayPal supports INR for invoices/payment links (different from checkout)
    const paypalCurrency = currency === 'INR' ? 'USD' : currency
    const paypalAmount   = currency === 'INR'
      ? (parseFloat(amount) / 83).toFixed(2)   // convert INR → USD
      : parseFloat(amount).toFixed(2)

    const linkRes = await fetch(`${PAYPAL_BASE}/v1/payment-experience/web-profiles`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    })

    // Use PayPal Orders API to create a payment link
    const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'PayPal-Request-Id': invoiceNo || `UNIEDD-${Date.now()}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id:  invoiceNo || `UNIEDD-${Date.now()}`,
          description:   description,
          custom_id:     invoiceNo || '',
          soft_descriptor: 'UNIEDD',
          amount: {
            currency_code: paypalCurrency,
            value:         paypalAmount,
          },
          payee: {
            email_address: 'unieddllp@gmail.com', // ← your PayPal business email
          },
          ...(studentEmail ? {
            shipping: {
              name: { full_name: studentName || 'Student' },
            }
          } : {})
        }],
        payment_source: {
          paypal: {
            experience_context: {
              payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
              brand_name:    'UniEDD Music & Arts Academy',
              locale:        'en-IN',
              landing_page:  'LOGIN',
              shipping_preference: 'NO_SHIPPING',
              user_action:   'PAY_NOW',
              return_url:    'https://uniedd-lms.vercel.app/payment-success',
              cancel_url:    'https://uniedd-lms.vercel.app/payment-cancel',
            }
          }
        }
      }),
    })

    const orderData = await orderRes.json()

    if (!orderData.id) {
      return res.status(500).json({ error: 'Failed to create PayPal order', details: orderData })
    }

    // Extract the payment link from the response
    const paymentLink = orderData.links?.find(l => l.rel === 'payer-action')?.href
      || orderData.links?.find(l => l.rel === 'approve')?.href

    if (!paymentLink) {
      return res.status(500).json({ error: 'No payment link in response', details: orderData })
    }

    return res.status(200).json({
      success:      true,
      paymentLink,
      orderId:      orderData.id,
      amount:       paypalAmount,
      currency:     paypalCurrency,
      originalAmount: amount,
      originalCurrency: currency,
    })

  } catch (err) {
    console.error('PayPal API error:', err)
    return res.status(500).json({ error: err.message })
  }
}
