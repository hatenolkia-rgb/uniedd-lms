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
    // Step 1: Get access token
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

    const finalCurrency = 'USD' // PayPal India works best with USD

    // Step 2: Create PayPal Invoice (works for Indian merchants)
    const invoiceRes = await fetch('https://api-m.paypal.com/v2/invoicing/invoices', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
      body: JSON.stringify({
        detail: {
          invoice_number:  invoiceNo || `UNIEDD-${Date.now()}`,
          invoice_date:    new Date().toISOString().slice(0,10),
          currency_code:   finalCurrency,
          note:            `Payment for ${description}`,
          term:            'Due on receipt',
          memo:            `UniEDD Music & Arts Academy — ${invoiceNo}`,
          payment_term: {
            term_type: 'DUE_ON_RECEIPT',
          },
        },
        invoicer: {
          name: { given_name: 'UniEDD', surname: 'Academy' },
          email_address: 'unieddllp@gmail.com',
          website: 'https://uniedd-lms.vercel.app',
        },
        primary_recipients: [
          {
            billing_info: {
              name: {
                given_name: studentName?.split(' ')[0] || 'Student',
                surname:    studentName?.split(' ').slice(1).join(' ') || '',
              },
              email_address: studentEmail || undefined,
            },
          },
        ],
        items: [
          {
            name:        description,
            description: `${description} — UniEDD Music & Arts Academy`,
            quantity:    '1',
            unit_amount: { currency_code: finalCurrency, value: usdAmount },
            unit_of_measure: 'QUANTITY',
          },
        ],
        amount: {
          breakdown: {
            item_total: { currency_code: finalCurrency, value: usdAmount },
          },
        },
        configuration: {
          partial_payment: { allow_partial_payment: false },
          allow_tip: false,
          tax_calculated_after_discount: false,
          tax_inclusive: false,
        },
      }),
    })

    const invoiceData = await invoiceRes.json()

    if (!invoiceData.href && !invoiceData.id) {
      // Fallback to orders API if invoice fails
      return await createOrderFallback(tokenData.access_token, usdAmount, finalCurrency, description, invoiceNo, studentName, res)
    }

    const invoiceId = invoiceData.href?.split('/').pop() || invoiceData.id

    // Step 3: Send/publish the invoice to get payment link
    const sendRes = await fetch(`https://api-m.paypal.com/v2/invoicing/invoices/${invoiceId}/send`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
      body: JSON.stringify({ send_to_recipient: false, send_to_invoicer: false }),
    })

    // Step 4: Get invoice details to extract payment link
    const detailRes = await fetch(`https://api-m.paypal.com/v2/invoicing/invoices/${invoiceId}`, {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
    })
    const detail = await detailRes.json()

    const paymentLink = detail.detail?.metadata?.payer_view_url
      || detail.links?.find(l => l.rel === 'payer-view')?.href
      || `https://www.paypal.com/invoice/p/#${invoiceId}`

    // Build custom checkout URL
    const customCheckout = `https://uniedd-lms.vercel.app/checkout?` + new URLSearchParams({
      link:     paymentLink,
      amount:   usdAmount,
      currency: finalCurrency,
      desc:     description,
      name:     studentName || '',
      invoice:  invoiceNo || '',
    }).toString()

    return res.status(200).json({
      success:     true,
      paymentLink: customCheckout,
      rawLink:     paymentLink,
      invoiceId,
      amount:      usdAmount,
      currency:    finalCurrency,
    })

  } catch (err) {
    console.error('PayPal error:', err)
    return res.status(500).json({ error: err.message })
  }
}

async function createOrderFallback(accessToken, usdAmount, currency, description, invoiceNo, studentName, res) {
  try {
    const orderRes = await fetch('https://api-m.paypal.com/v2/checkout/orders', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'Authorization':     `Bearer ${accessToken}`,
        'PayPal-Request-Id': invoiceNo || `UNIEDD-${Date.now()}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: invoiceNo,
          description,
          amount: { currency_code: currency, value: usdAmount },
        }],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name:          'UniEDD Music & Arts Academy',
              landing_page:        'BILLING',
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
    const paymentLink = order.links?.find(l => l.rel === 'payer-action')?.href
    const customCheckout = `https://uniedd-lms.vercel.app/checkout?` + new URLSearchParams({
      link: paymentLink, amount: usdAmount, currency, desc: description, name: studentName || '', invoice: invoiceNo || '',
    }).toString()
    return res.status(200).json({ success: true, paymentLink: customCheckout, rawLink: paymentLink, orderId: order.id, amount: usdAmount, currency })
  } catch(err) {
    return res.status(500).json({ error: err.message })
  }
}
