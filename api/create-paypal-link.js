// Vercel Serverless Function — Node.js CommonJS format
const https = require('https')

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { amount, currency, description, studentName, studentEmail, invoiceNo } = req.body

  if (!amount || !currency || !description) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID
  const PAYPAL_SECRET    = process.env.PAYPAL_SECRET
  const PAYPAL_BASE      = 'https://api-m.paypal.com'

  if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
    return res.status(500).json({ error: 'PayPal credentials not configured in Vercel environment variables' })
  }

  try {
    // ── Step 1: Get Access Token ──────────────────────────
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

    // ── Step 2: Convert INR to USD if needed ─────────────
    // PayPal Orders API supports USD, not INR
    const paypalCurrency = 'USD'
    const paypalAmount   = currency === 'INR'
      ? (parseFloat(amount) / 83).toFixed(2)
      : parseFloat(amount).toFixed(2)

    // ── Step 3: Create Order ──────────────────────────────
    const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type':     'application/json',
        'Authorization':    `Bearer ${accessToken}`,
        'PayPal-Request-Id': invoiceNo || `UNIEDD-${Date.now()}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id:    invoiceNo || `UNIEDD-${Date.now()}`,
          description:     description,
          custom_id:       invoiceNo || '',
          amount: {
            currency_code: paypalCurrency,
            value:         paypalAmount,
          },
        }],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name:          'UniEDD Music & Arts Academy',
              locale:              'en-IN',
              landing_page:        'LOGIN',
              shipping_preference: 'NO_SHIPPING',
              user_action:         'PAY_NOW',
              return_url:          'https://uniedd-lms.vercel.app',
              cancel_url:          'https://uniedd-lms.vercel.app',
            }
          }
        }
      }),
    })

    const orderData = await orderRes.json()

    if (!orderData.id) {
      return res.status(500).json({ error: 'Failed to create PayPal order', details: orderData })
    }

    // Extract payer-action link (the URL student clicks to pay)
    const paymentLink =
      orderData.links?.find(l => l.rel === 'payer-action')?.href ||
      orderData.links?.find(l => l.rel === 'approve')?.href

    if (!paymentLink) {
      return res.status(500).json({ error: 'No payment link returned', details: orderData })
    }

    return res.status(200).json({
      success:          true,
      paymentLink,
      orderId:          orderData.id,
      amount:           paypalAmount,
      currency:         paypalCurrency,
      originalAmount:   amount,
      originalCurrency: currency,
    })

  } catch (err) {
    console.error('PayPal error:', err)
    return res.status(500).json({ error: err.message })
  }
}
