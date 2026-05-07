module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { amount, currency, description, studentName, invoiceNo } = req.body

  const usdAmount = currency === 'INR'
    ? (parseFloat(amount) / 83).toFixed(2)
    : parseFloat(amount).toFixed(2)

  // PayPal standard payment URL — no API needed, works for ALL PayPal accounts including India
  // Uses PayPal's hosted payment page directly
  const params = new URLSearchParams({
    cmd:           '_xclick',
    business:      'unieddllp@gmail.com',  // your PayPal email
    item_name:     description || 'UniEDD Course Fee',
    item_number:   invoiceNo || `UNIEDD-${Date.now()}`,
    amount:        usdAmount,
    currency_code: 'USD',
    no_shipping:   '1',
    return:        'https://uniedd-lms.vercel.app/payment-success',
    cancel_return: 'https://uniedd-lms.vercel.app',
    custom:        invoiceNo || '',
    charset:       'utf-8',
  })

  const paymentLink = `https://www.paypal.com/cgi-bin/webscr?${params.toString()}`

  return res.status(200).json({
    success:     true,
    paymentLink,
    amount:      usdAmount,
    currency:    'USD',
    type:        'standard',
  })
}
