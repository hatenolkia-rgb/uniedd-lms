// Vercel Function — Post to Instagram + Facebook
// POST /api/meta-post

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN
  const PAGE_ID           = process.env.META_PAGE_ID
  const IG_USER_ID        = process.env.META_IG_USER_ID

  if (!PAGE_ACCESS_TOKEN) {
    return res.status(200).json({ demo: true, message: 'Meta credentials not set — post simulated', postId: 'demo_' + Date.now() })
  }

  const { caption, mediaUrl, mediaType = 'image', platforms = ['facebook','instagram'] } = req.body
  const results = {}

  try {
    // ── Post to Facebook Page ────────────────────────────────
    if (platforms.includes('facebook') && PAGE_ID) {
      if (mediaType === 'video') {
        const fbR = await fetch(`https://graph.facebook.com/v19.0/${PAGE_ID}/videos`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ file_url: mediaUrl, description: caption, access_token: PAGE_ACCESS_TOKEN })
        })
        const fb = await fbR.json()
        results.facebook = { id: fb.id, error: fb.error }
      } else {
        const fbR = await fetch(`https://graph.facebook.com/v19.0/${PAGE_ID}/photos`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ url: mediaUrl, caption, access_token: PAGE_ACCESS_TOKEN })
        })
        const fb = await fbR.json()
        results.facebook = { id: fb.id, error: fb.error }
      }
    }

    // ── Post to Instagram ────────────────────────────────────
    if (platforms.includes('instagram') && IG_USER_ID) {
      // Step 1: Create media container
      const igType = mediaType === 'video' || mediaType === 'reel' ? 'REELS' : 'IMAGE'
      const containerBody = igType === 'REELS'
        ? { media_type:'REELS', video_url: mediaUrl, caption, access_token: PAGE_ACCESS_TOKEN }
        : { image_url: mediaUrl, caption, access_token: PAGE_ACCESS_TOKEN }

      const containerR = await fetch(`https://graph.facebook.com/v19.0/${IG_USER_ID}/media`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(containerBody)
      })
      const container = await containerR.json()

      if (container.id) {
        // Step 2: Publish
        await new Promise(r => setTimeout(r, igType==='REELS'?5000:1000)) // wait for video processing
        const pubR = await fetch(`https://graph.facebook.com/v19.0/${IG_USER_ID}/media_publish`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ creation_id: container.id, access_token: PAGE_ACCESS_TOKEN })
        })
        const pub = await pubR.json()
        results.instagram = { id: pub.id, error: pub.error }
      } else {
        results.instagram = { error: container.error }
      }
    }

    return res.status(200).json({ success: true, results })
  } catch(err) {
    return res.status(500).json({ error: err.message })
  }
}
