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
    // ── Step 1: Get Access Token ──────────────────────────
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

    // ── Step 2: Create Web Experience Profile (branding) ──
    // This sets the logo, brand name and checkout style
    let profileId = null
    try {
      const profileRes = await fetch('https://api-m.paypal.com/v1/payment-experience/web-profiles', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
        body: JSON.stringify({
          name:       `UniEDD-${Date.now()}`,
          temporary:  true,
          presentation: {
            brand_name:  'UniEDD Music & Arts Academy',
            logo_image:  'https://uniedd-lms.vercel.app/logo192.png',
            locale_code: 'en-IN',
          },
          input_fields: {
            allow_note:       false,
            no_shipping:      1,
            address_override: 1,
          },
          flow_config: {
            landing_page_type:  'billing',
            bank_txn_pending_url: 'https://uniedd-lms.vercel.app',
            user_action: 'commit',
          },
        }),
      })
      const profileData = await profileRes.json()
      profileId = profileData.id || null
    } catch(e) {
      // Profile creation failed — continue without it
      profileId = null
    }

    // ── Step 3: Convert amount to USD ─────────────────────
    const usdAmount = currency === 'INR'
      ? (parseFloat(amount) / 83).toFixed(2)
      : parseFloat(amount).toFixed(2)

    // ── Step 4: Create Order with branding ───────────────
    const orderBody = {
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id:    invoiceNo || `UNIEDD-${Date.now()}`,
        description:     description,
        custom_id:       invoiceNo || '',
        soft_descriptor: 'UNIEDD',
        amount: {
          currency_code: 'USD',
          value:         usdAmount,
        },
      }],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name:             'UniEDD Music & Arts Academy',
            logo_url:               'https://uniedd-lms.vercel.app/logo192.png',
            locale:                 'en-IN',
            // Show card payment option prominently
            landing_page:           'BILLING',
            shipping_preference:    'NO_SHIPPING',
            // PAY_NOW shows amount and Pay button directly
            user_action:            'PAY_NOW',
            payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
            return_url:             'https://uniedd-lms.vercel.app/payment-success',
            cancel_url:             'https://uniedd-lms.vercel.app',
          }
        }
      },
    }

    // Add web profile if created
    if (profileId) orderBody.experience_profile_id = profileId

    const orderRes = await fetch('https://api-m.paypal.com/v2/checkout/orders', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'Authorization':     `Bearer ${tokenData.access_token}`,
        'PayPal-Request-Id': invoiceNo || `UNIEDD-${Date.now()}`,
      },
      body: JSON.stringify(orderBody),
    })

    const order = await orderRes.json()
    if (!order.id) {
      return res.status(500).json({ error: 'Order creation failed', details: order })
    }

    const paymentLink =
      order.links?.find(l => l.rel === 'payer-action')?.href ||
      order.links?.find(l => l.rel === 'approve')?.href

    if (!paymentLink) {
      return res.status(500).json({ error: 'No payment link', links: order.links })
    }

    return res.status(200).json({
      success:          true,
      paymentLink,
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
