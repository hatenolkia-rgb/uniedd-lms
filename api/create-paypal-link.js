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
    // Get token
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

    const usdAmount = currency === 'INR'
      ? (parseFloat(amount) / 83).toFixed(2)
      : parseFloat(amount).toFixed(2)

    // Create order — LOGIN landing page so student pays via PayPal account
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
          reference_id:    invoiceNo || `UNIEDD-${Date.now()}`,
          description:     description,
          soft_descriptor: 'UNIEDD',
          amount: {
            currency_code: 'USD',
            value:         usdAmount,
          },
        }],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name:          'UniEDD Music & Arts Academy',
              landing_page:        'LOGIN',        // PayPal login page
              shipping_preference: 'NO_SHIPPING',
              user_action:         'PAY_NOW',
              return_url:          'https://uniedd-lms.vercel.app/payment-success',
              cancel_url:          'https://uniedd-lms.vercel.app',
            }
          }
        }
      }),
    })

    const order = await orderRes.json()
    if (!order.id) {
      return res.status(500).json({ error: 'Order failed', details: order })
    }

    const paymentLink = order.links?.find(l => l.rel === 'payer-action')?.href

    return res.status(200).json({
      success:     true,
      paymentLink, // Direct PayPal link
      orderId:     order.id,
      amount:      usdAmount,
      currency:    'USD',
    })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
