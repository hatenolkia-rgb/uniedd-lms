import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function RevenueChart() {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const [view,    setView]    = useState('bar') // bar | funnel

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: payments } = await supabase
      .from('payments')
      .select('amount, status, created_at')
      .order('created_at', { ascending: true })

    // Group by month for bar chart
    const byMonth = {}
    ;(payments || []).forEach(p => {
      const d = new Date(p.created_at)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (!byMonth[key]) byMonth[key] = { label: MONTHS[d.getMonth()], paid:0, pending:0, overdue:0 }
      if (p.status === 'paid')    byMonth[key].paid    += (p.amount||0)
      if (p.status === 'pending') byMonth[key].pending += (p.amount||0)
      if (p.status === 'overdue') byMonth[key].overdue += (p.amount||0)
    })

    const months = Object.values(byMonth).slice(-6) // last 6 months
    setData(months)
    setLoading(false)
  }

  const maxVal = Math.max(...data.map(d => d.paid + d.pending + d.overdue), 1)
  const totalPaid    = data.reduce((a,d) => a+d.paid, 0)
  const totalPending = data.reduce((a,d) => a+d.pending, 0)
  const totalOverdue = data.reduce((a,d) => a+d.overdue, 0)

  return (
    <div style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'1rem 1.1rem', marginTop:'14px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px', paddingBottom:'8px', borderBottom:'0.5px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.7)' }}>💰 Revenue Analytics</div>
        <div style={{ display:'flex', gap:'6px' }}>
          {['bar','summary'].map(v => (
            <button key={v} onClick={() => setView(v)} style={{ fontSize:'11px', padding:'4px 12px', borderRadius:'20px', border:'none', cursor:'pointer', fontFamily:'inherit', background:view===v?'#1e90ff':'rgba(255,255,255,0.07)', color:view===v?'#fff':'rgba(255,255,255,0.4)', textTransform:'capitalize' }}>{v}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'2rem', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>Loading...</div>
      ) : data.length === 0 ? (
        <div style={{ textAlign:'center', padding:'2rem', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>No payment data yet.</div>
      ) : view === 'bar' ? (
        <>
          {/* Bar chart */}
          <div style={{ display:'flex', alignItems:'flex-end', gap:'8px', height:'160px', padding:'0 4px' }}>
            {data.map((d, i) => {
              const total = d.paid + d.pending + d.overdue
              const paidH    = (d.paid    / maxVal) * 140
              const pendingH = (d.pending / maxVal) * 140
              const overdueH = (d.overdue / maxVal) * 140
              return (
                <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' }}>
                  <div style={{ fontSize:'9px', color:'rgba(255,255,255,0.3)' }}>
                    {total > 0 ? `₹${Math.round(total/1000)}k` : ''}
                  </div>
                  <div style={{ width:'100%', display:'flex', flexDirection:'column', alignItems:'stretch', gap:'1px', borderRadius:'4px', overflow:'hidden' }}>
                    {d.overdue > 0  && <div style={{ height:`${overdueH}px`, background:'rgba(239,68,68,0.6)',  minHeight:d.overdue>0?2:0 }} />}
                    {d.pending > 0  && <div style={{ height:`${pendingH}px`, background:'rgba(232,124,30,0.6)', minHeight:d.pending>0?2:0 }} />}
                    {d.paid > 0     && <div style={{ height:`${paidH}px`,    background:'rgba(16,185,129,0.7)', minHeight:d.paid>0?2:0 }} />}
                    {total === 0    && <div style={{ height:'4px', background:'rgba(255,255,255,0.06)', borderRadius:'2px' }} />}
                  </div>
                  <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.35)', fontWeight:600 }}>{d.label}</div>
                </div>
              )
            })}
          </div>
          {/* Legend */}
          <div style={{ display:'flex', gap:'16px', marginTop:'12px', paddingTop:'10px', borderTop:'0.5px solid rgba(255,255,255,0.05)' }}>
            {[['rgba(16,185,129,0.7)','Paid',totalPaid],['rgba(232,124,30,0.6)','Pending',totalPending],['rgba(239,68,68,0.6)','Overdue',totalOverdue]].map(([color, label, val]) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                <div style={{ width:'10px', height:'10px', borderRadius:'2px', background:color, flexShrink:0 }} />
                <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.4)' }}>{label}</span>
                <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.6)', fontWeight:600 }}>₹{val.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* Summary cards */
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px' }}>
          {[
            { label:'Total Collected', value:totalPaid,    color:'#10b981', bg:'rgba(16,185,129,0.1)',  border:'rgba(16,185,129,0.2)'  },
            { label:'Pending',         value:totalPending, color:'#f4a335', bg:'rgba(232,124,30,0.1)', border:'rgba(232,124,30,0.2)'  },
            { label:'Overdue',         value:totalOverdue, color:'#f87171', bg:'rgba(239,68,68,0.1)',  border:'rgba(239,68,68,0.2)'   },
          ].map(item => (
            <div key={item.label} style={{ background:item.bg, border:`0.5px solid ${item.border}`, borderRadius:'12px', padding:'14px' }}>
              <div style={{ fontSize:'10px', fontWeight:700, color:item.color, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'6px' }}>{item.label}</div>
              <div style={{ fontSize:'22px', fontWeight:800, color:'#fff' }}>₹{item.value.toLocaleString('en-IN')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
