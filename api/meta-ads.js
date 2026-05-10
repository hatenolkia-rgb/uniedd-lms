// Vercel Function — Meta Ads Analytics
// GET /api/meta-ads?type=campaigns|insights|account

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN
  const AD_ACCOUNT   = process.env.META_AD_ACCOUNT_ID  // act_XXXXXXXXXX

  if (!ACCESS_TOKEN || !AD_ACCOUNT) {
    return res.status(200).json({
      demo: true,
      message: 'Meta credentials not configured — showing demo data',
      campaigns: getDemoData(),
      account_summary: getDemoSummary(),
    })
  }

  const { type = 'campaigns', since, until } = req.query
  const dateRange = since && until
    ? `&time_range={"since":"${since}","until":"${until}"}`
    : `&date_preset=last_30d`

  try {
    if (type === 'campaigns') {
      const fields = 'name,status,objective,spend,impressions,clicks,reach,cpc,cpm,actions,cost_per_action_type'
      const url = `https://graph.facebook.com/v19.0/${AD_ACCOUNT}/campaigns?fields=id,${fields},insights{${fields}}&limit=20&access_token=${ACCESS_TOKEN}${dateRange}`
      const r    = await fetch(url)
      const data = await r.json()
      return res.status(200).json({ campaigns: data.data || [], error: data.error })
    }

    if (type === 'account') {
      const fields = 'spend,impressions,clicks,reach,actions,cost_per_action_type,cpc,cpm,frequency'
      const url = `https://graph.facebook.com/v19.0/${AD_ACCOUNT}/insights?fields=${fields}&level=account&access_token=${ACCESS_TOKEN}${dateRange}`
      const r   = await fetch(url)
      const data = await r.json()
      return res.status(200).json({ insights: data.data?.[0] || {}, error: data.error })
    }

  } catch(err) {
    return res.status(500).json({ error: err.message })
  }
}

function getDemoData() {
  return [
    { id:'c1', name:'UniEDD — Guitar Beginners', status:'ACTIVE',  objective:'LEAD_GENERATION',
      insights:{ spend:'4200', impressions:'38500', clicks:'920', reach:'24000', cpc:'4.57',
        actions:[{action_type:'lead',value:'47'}], cost_per_action_type:[{action_type:'lead',value:'89.36'}] }},
    { id:'c2', name:'UniEDD — Piano Course Launch', status:'ACTIVE', objective:'LEAD_GENERATION',
      insights:{ spend:'2800', impressions:'21000', clicks:'610', reach:'15500', cpc:'4.59',
        actions:[{action_type:'lead',value:'28'}], cost_per_action_type:[{action_type:'lead',value:'100.0'}] }},
    { id:'c3', name:'UniEDD — Brand Awareness',    status:'PAUSED', objective:'REACH',
      insights:{ spend:'1500', impressions:'95000', clicks:'210', reach:'72000', cpc:'7.14',
        actions:[{action_type:'lead',value:'8'}], cost_per_action_type:[{action_type:'lead',value:'187.5'}] }},
  ]
}
function getDemoSummary() {
  return { spend:'8500', impressions:'154500', clicks:'1740', reach:'111500', leads:'83', cpl:'102.4', cpc:'4.89' }
}
