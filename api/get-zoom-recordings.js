// Vercel Serverless Function — Fetch Zoom Cloud Recordings
// GET /api/get-zoom-recordings?meetingId=XXX   (single meeting)
// GET /api/get-zoom-recordings?from=YYYY-MM-DD&to=YYYY-MM-DD  (date range)

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const ZOOM_ACCOUNT_ID    = process.env.ZOOM_ACCOUNT_ID    || '4YOY5UkwS-25HaPIdAsQmQ'
  const ZOOM_CLIENT_ID     = process.env.ZOOM_CLIENT_ID     || 'Qviz4evsSIaOxgr9QEySg'
  const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET || '1vihivmG4aiCoW65sd1iPQQJ6hF23f7A'

  const { meetingId, from, to } = req.query

  try {
    // ── Get OAuth token ──────────────────────────────────────
    const tokenRes = await fetch(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      return res.status(500).json({ error: 'Failed to get Zoom token', details: tokenData })
    }

    const headers = {
      'Authorization': `Bearer ${tokenData.access_token}`,
      'Content-Type': 'application/json',
    }

    let recordings = []

    if (meetingId) {
      // ── Get recordings for a specific meeting ────────────
      const r = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}/recordings`, { headers })
      const data = await r.json()
      if (data.recording_files) {
        recordings = [{
          meeting_id:    data.id,
          topic:         data.topic,
          start_time:    data.start_time,
          duration:      data.duration,
          total_size:    data.total_size,
          files:         data.recording_files.filter(f =>
            ['MP4','M4A','CHAT','TRANSCRIPT'].includes(f.file_type)
          ).map(f => ({
            id:           f.id,
            file_type:    f.file_type,
            file_size:    f.file_size,
            play_url:     f.play_url,
            download_url: f.download_url,
            status:       f.status,
            recording_start: f.recording_start,
            recording_end:   f.recording_end,
          })),
          password:      data.password,
        }]
      }
    } else {
      // ── Get all recordings in date range ──────────────────
      const fromDate = from || new Date(Date.now() - 30*24*60*60*1000).toISOString().slice(0,10)
      const toDate   = to   || new Date().toISOString().slice(0,10)

      const r = await fetch(
        `https://api.zoom.us/v2/users/me/recordings?from=${fromDate}&to=${toDate}&page_size=100`,
        { headers }
      )
      const data = await r.json()

      recordings = (data.meetings || []).map(m => ({
        meeting_id:    m.id,
        topic:         m.topic,
        start_time:    m.start_time,
        duration:      m.duration,
        total_size:    m.total_size,
        files:         (m.recording_files || []).filter(f =>
          ['MP4','M4A','CHAT','TRANSCRIPT'].includes(f.file_type)
        ).map(f => ({
          id:           f.id,
          file_type:    f.file_type,
          file_size:    f.file_size,
          play_url:     f.play_url,
          download_url: f.download_url,
          status:       f.status,
          recording_start: f.recording_start,
          recording_end:   f.recording_end,
        })),
        password:      m.password,
      })).filter(m => m.files.length > 0)
    }

    return res.status(200).json({ success: true, recordings, count: recordings.length })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
