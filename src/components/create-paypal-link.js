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
          reference_id:    invoiceNo,
          description:     description,
          soft_descriptor: 'UNIEDD',
          amount: { currency_code: 'USD', value: usdAmount },
        }],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name:                'UniEDD Music & Arts Academy',
              locale:                    'en-IN',
              landing_page:              'BILLING',
              shipping_preference:       'NO_SHIPPING',
              user_action:               'PAY_NOW',
              payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
              return_url:                'https://uniedd-lms.vercel.app/payment-success',
              cancel_url:                'https://uniedd-lms.vercel.app',
            }
          }
        }
      }),
    })

    const order = await orderRes.json()
    if (!order.id) return res.status(500).json({ error: 'Order creation failed', details: order })

    const paymentLink =
      order.links?.find(l => l.rel === 'payer-action')?.href ||
      order.links?.find(l => l.rel === 'approve')?.href

    if (!paymentLink) return res.status(500).json({ error: 'No payment link', links: order.links })

    // Return both the PayPal link AND a custom checkout page URL
    const customCheckout = `https://uniedd-lms.vercel.app/checkout?` + new URLSearchParams({
      link:     paymentLink,
      amount:   usdAmount,
      currency: 'USD',
      desc:     description,
      name:     studentName || '',
      invoice:  invoiceNo || '',
    }).toString()

    return res.status(200).json({
      success:          true,
      paymentLink:      customCheckout,   // Students land on our custom page
      rawPayPalLink:    paymentLink,       // Direct PayPal link (backup)
      orderId:          order.id,
      amount:           usdAmount,
      currency:         'USD',
      originalAmount:   amount,
      originalCurrency: currency,
    })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
