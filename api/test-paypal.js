module.exports = async function handler(req, res) {
  const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID
  const PAYPAL_SECRET    = process.env.PAYPAL_SECRET

  if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
    return res.status(200).json({ 
      error: 'Credentials missing',
      hasClientId: !!PAYPAL_CLIENT_ID,
      hasSecret: !!PAYPAL_SECRET
    })
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
      return res.status(200).json({ step: 'token_failed', error: tokenData })
    }

    // Try creating a simple order
    const orderRes = await fetch('https://api-m.paypal.com/v2/checkout/orders', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${tokenData.access_token}`,
        'PayPal-Request-Id': `TEST-${Date.now()}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: { currency_code: 'USD', value: '1.00' },
          description: 'UniEDD Test Payment'
        }],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: 'UniEDD',
              landing_page: 'LOGIN',
              shipping_preference: 'NO_SHIPPING',
              user_action: 'PAY_NOW',
              return_url: 'https://uniedd-lms.vercel.app',
              cancel_url: 'https://uniedd-lms.vercel.app',
            }
          }
        }
      }),
    })

    const order = await orderRes.json()
    const payerLink = order.links?.find(l => l.rel === 'payer-action')?.href

    return res.status(200).json({
      step: 'order_created',
      orderId: order.id,
      status: order.status,
      paymentLink: payerLink,
      allLinks: order.links,
      error: order.error || order.message || null,
      full: order
    })

  } catch (err) {
    return res.status(200).json({ step: 'exception', error: err.message })
  }
}
