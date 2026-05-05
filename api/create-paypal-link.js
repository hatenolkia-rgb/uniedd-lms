module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { amount, currency, description, invoiceNo } = req.body
  const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID
  const PAYPAL_SECRET    = process.env.PAYPAL_SECRET

  if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
    return res.status(500).json({ error: 'PayPal credentials missing in environment variables' })
  }

  try {
    // Step 1 — Get access token
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

    // Step 2 — Convert to USD (PayPal API requires USD for orders)
    const usdAmount = currency === 'INR'
      ? (parseFloat(amount) / 83).toFixed(2)
      : parseFloat(amount).toFixed(2)

    // Step 3 — Create order
    const orderRes = await fetch('https://api-m.paypal.com/v2/checkout/orders', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'Authorization':     `Bearer ${tokenData.access_token}`,
        'PayPal-Request-Id': invoiceNo || `UNIEDD-${Date.now()}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: invoiceNo,
          description:  description,
          amount: { currency_code: 'USD', value: usdAmount },
        }],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name:          'UniEDD Music & Arts Academy',
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

    const order = await orderRes.json()
    if (!order.id) {
      return res.status(500).json({ error: 'Order creation failed', details: order })
    }

    const paymentLink = order.links?.find(l => l.rel === 'payer-action')?.href
                     || order.links?.find(l => l.rel === 'approve')?.href

    if (!paymentLink) {
      return res.status(500).json({ error: 'No payment link in response', links: order.links })
    }

    return res.status(200).json({ success: true, paymentLink, orderId: order.id, amount: usdAmount, currency: 'USD' })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
