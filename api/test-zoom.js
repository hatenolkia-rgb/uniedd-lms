module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const ZOOM_ACCOUNT_ID    = '4YOY5UkwS-25HaPIdAsQmQ'
  const ZOOM_CLIENT_ID     = 'Qviz4evsSIaOxgr9QEySg'
  const ZOOM_CLIENT_SECRET = '1vihivmG4aiCoW65sd1iPQQJ6hF23f7A'

  try {
    // Step 1: Get token
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
    const tokenText = await tokenRes.text()
    let tokenData
    try { tokenData = JSON.parse(tokenText) } catch(e) { tokenData = { raw: tokenText } }

    if (!tokenData.access_token) {
      return res.status(200).json({ step: 'token_failed', status: tokenRes.status, tokenData })
    }

    // Step 2: Try creating a meeting
    const meetRes = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic:      'UniEDD Test Class',
        type:       2,
        start_time: '2026-05-20T10:00:00+05:30',
        duration:   60,
        timezone:   'Asia/Kolkata',
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: true,
          mute_upon_entry: true,
          waiting_room: false,
        },
      }),
    })
    const meetText = await meetRes.text()
    let meetData
    try { meetData = JSON.parse(meetText) } catch(e) { meetData = { raw: meetText } }

    return res.status(200).json({
      step: 'meeting_attempt',
      meetStatus: meetRes.status,
      meetData,
      hasToken: true,
      tokenScope: tokenData.scope,
    })

  } catch (err) {
    return res.status(200).json({ step: 'exception', error: err.message })
  }
}
