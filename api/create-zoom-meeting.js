// Vercel Serverless Function — Auto-generate Zoom meeting links
// Endpoint: POST /api/create-zoom-meeting

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const ZOOM_ACCOUNT_ID    = process.env.ZOOM_ACCOUNT_ID    || '4YOY5UkwS-25HaPIdAsQmQ'
  const ZOOM_CLIENT_ID     = process.env.ZOOM_CLIENT_ID     || 'Qviz4evsSIaOxgr9QEySg'
  const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET || '1vihivmG4aiCoW65sd1iPQQJ6hF23f7A'

  const { topic, date, time, durationMinutes = 60 } = req.body

  if (!topic || !date) {
    return res.status(400).json({ error: 'topic and date are required' })
  }

  try {
    // ── Step 1: Get OAuth token (Server-to-Server) ──────────────
    const tokenRes = await fetch('https://zoom.us/oauth/token?grant_type=account_credentials&account_id=' + ZOOM_ACCOUNT_ID, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      return res.status(500).json({ error: 'Failed to get Zoom token', details: tokenData })
    }

    // ── Step 2: Build start time in ISO format ──────────────────
    // date = "2026-05-15", time = "10:00" (India IST = UTC+5:30)
    const startDateTime = time
      ? `${date}T${time}:00+05:30`   // IST timezone
      : `${date}T09:00:00+05:30`     // default 9 AM IST

    // ── Step 3: Create Zoom Meeting ─────────────────────────────
    const meetingRes = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        topic:      topic,
        type:       2,                   // Scheduled meeting
        start_time: startDateTime,
        duration:   durationMinutes,
        timezone:   'Asia/Kolkata',
        agenda:     `UniEDD Music & Arts Academy — ${topic}`,
        settings: {
          host_video:        true,
          participant_video:  true,
          join_before_host:   true,       // Students can join before teacher
          mute_upon_entry:    true,
          waiting_room:       false,
          auto_recording:     'cloud',  // Auto-record to Zoom cloud
          approval_type:      0,          // Automatically approve
        },
      }),
    })

    const meeting = await meetingRes.json()

    if (!meeting.id) {
      return res.status(500).json({ error: 'Failed to create Zoom meeting', details: meeting })
    }

    return res.status(200).json({
      success:    true,
      meetingId:  meeting.id,
      joinUrl:    meeting.join_url,
      startUrl:   meeting.start_url,
      password:   meeting.password,
      topic:      meeting.topic,
      startTime:  meeting.start_time,
      duration:   meeting.duration,
    })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
