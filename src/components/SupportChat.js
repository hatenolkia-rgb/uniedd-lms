import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Panel, Empty, Inp, Btn } from './Layout'

/**
 * SupportChat — shared component for teacher and student dashboards
 * - Students can raise a ticket / chat with admin
 * - Teachers can message admins
 * - Real-time updates via Supabase channel
 */
export default function SupportChat({ profile }) {
  const [messages, setMessages] = useState([])
  const [msg,      setMsg]      = useState('')
  const [sending,  setSending]  = useState(false)
  const [ticket,   setTicket]   = useState('')
  const [category, setCategory] = useState('general')
  const [showForm, setShowForm] = useState(false)
  const [ticketOk, setTicketOk] = useState('')
  const bottomRef = useRef(null)

  const isStudent = profile.role === 'student'
  const room = `support_${profile.id}` // each user has own support room with admin

  useEffect(() => {
    loadMessages()

    // Realtime subscription
    const channel = supabase
      .channel(`support-room-${profile.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
        filter: `room=eq.${room}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new])
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 100)
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [profile.id])

  async function loadMessages() {
    const { data } = await supabase
      .from('chat_messages')
      .select('*, profiles(full_name, role)')
      .eq('room', room)
      .order('created_at', { ascending: true })
      .limit(100)
    setMessages(data || [])
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 100)
  }

  async function sendMsg(e) {
    e.preventDefault()
    if (!msg.trim()) return
    setSending(true)
    await supabase.from('chat_messages').insert({
      sender_id: profile.id,
      room,
      content: msg.trim(),
    })
    setMsg('')
    setSending(false)
  }

  async function submitTicket(e) {
    e.preventDefault()
    if (!ticket.trim()) return
    setSending(true)

    // Send as a system message in the chat
    await supabase.from('chat_messages').insert({
      sender_id: profile.id,
      room,
      content: `[TICKET — ${category.toUpperCase()}] ${ticket.trim()}`,
    })

    // Also notify admin
    const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin')
    if (admins?.length) {
      const notifs = admins.map(a => ({
        user_id: a.id,
        type:    'support_ticket',
        title:   `🎫 New Support Ticket from ${profile.full_name || profile.email}`,
        message: `[${category}] ${ticket.trim()}`,
        is_read: false,
      }))
      await supabase.from('notifications').insert(notifs)
    }

    setTicket('')
    setShowForm(false)
    setTicketOk('✓ Ticket submitted! Admin will respond here shortly.')
    setTimeout(() => setTicketOk(''), 4000)
    setSending(false)
  }

  const categories = ['general', 'technical', 'payment', 'attendance', 'schedule', 'other']

  return (
    <Panel title="Support">
      {/* Ticket form toggle (students) */}
      {isStudent && (
        <div style={{ marginBottom:'12px' }}>
          <div style={{ display:'flex', gap:'8px', alignItems:'center', marginBottom:'8px' }}>
            <button
              onClick={() => setShowForm(!showForm)}
              style={{
                padding:'7px 14px', borderRadius:'9px', fontSize:'12px', fontWeight:700,
                background:'rgba(30,144,255,0.12)', color:'#5aabff',
                border:'0.5px solid rgba(30,144,255,0.25)', cursor:'pointer', fontFamily:'inherit',
              }}
            >
              🎫 {showForm ? 'Cancel Ticket' : 'Raise a Ticket'}
            </button>
            <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.25)' }}>or just chat below</span>
          </div>

          {showForm && (
            <form onSubmit={submitTicket} style={{ background:'rgba(30,144,255,0.06)', border:'0.5px solid rgba(30,144,255,0.2)', borderRadius:'12px', padding:'14px', marginBottom:'10px' }}>
              <div style={{ marginBottom:'10px' }}>
                <label style={{ fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.35)', letterSpacing:'0.1em', textTransform:'uppercase', display:'block', marginBottom:'6px' }}>Category</label>
                <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                  {categories.map(c => (
                    <button
                      key={c} type="button"
                      onClick={() => setCategory(c)}
                      style={{
                        padding:'4px 10px', borderRadius:'8px', fontSize:'11px', fontWeight:600,
                        cursor:'pointer', fontFamily:'inherit', border:'none', textTransform:'capitalize',
                        background: category === c ? '#1e90ff' : 'rgba(255,255,255,0.06)',
                        color: category === c ? '#fff' : 'rgba(255,255,255,0.4)',
                      }}
                    >{c}</button>
                  ))}
                </div>
              </div>
              <textarea
                value={ticket}
                onChange={e => setTicket(e.target.value)}
                placeholder="Describe your issue..."
                required
                style={{
                  width:'100%', background:'rgba(255,255,255,0.05)',
                  border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'10px',
                  padding:'10px 14px', fontSize:'13px', color:'rgba(255,255,255,0.8)',
                  outline:'none', resize:'vertical', minHeight:'80px',
                  fontFamily:'inherit', boxSizing:'border-box', marginBottom:'8px',
                }}
              />
              <Btn busy={sending} style={{ margin:0, width:'auto', padding:'8px 18px' }}>
                {sending ? 'Submitting...' : 'Submit Ticket'}
              </Btn>
            </form>
          )}

          {ticketOk && (
            <div style={{ padding:'9px 12px', background:'rgba(16,185,129,0.1)', border:'0.5px solid rgba(16,185,129,0.3)', borderRadius:'8px', fontSize:'13px', color:'#34d399', marginBottom:'8px' }}>
              {ticketOk}
            </div>
          )}
        </div>
      )}

      {/* Chat messages */}
      <div style={{
        maxHeight:'360px', overflowY:'auto', display:'flex', flexDirection:'column',
        gap:'8px', marginBottom:'12px', paddingRight:'4px',
      }}>
        {messages.length === 0
          ? <Empty msg={isStudent ? "No messages yet. Raise a ticket or send a message!" : "No messages yet. Start the conversation!"} />
          : messages.map((m, i) => {
              const isMe = m.sender_id === profile.id
              const isTicket = m.content?.startsWith('[TICKET')
              return (
                <div key={i} style={{ display:'flex', flexDirection:'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                  <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.22)', marginBottom:'3px', textAlign: isMe ? 'right' : 'left' }}>
                    {m.profiles?.full_name || 'Unknown'} · {m.profiles?.role}
                    {' · '}{new Date(m.created_at).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
                  </div>
                  <div style={{
                    maxWidth:'78%', padding:'9px 13px',
                    borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    background: isTicket
                      ? 'rgba(244,163,53,0.12)'
                      : isMe ? 'rgba(30,144,255,0.18)' : 'rgba(255,255,255,0.06)',
                    border: `0.5px solid ${isTicket ? 'rgba(244,163,53,0.3)' : isMe ? 'rgba(30,144,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    fontSize:'13px', color:'rgba(255,255,255,0.85)', lineHeight:1.5,
                  }}>
                    {isTicket && <div style={{ fontSize:'9px', fontWeight:700, color:'#f4a335', letterSpacing:'0.08em', marginBottom:'4px' }}>🎫 SUPPORT TICKET</div>}
                    {m.content?.replace(/^\[TICKET — \w+\] /, '')}
                  </div>
                </div>
              )
            })}
        <div ref={bottomRef} />
      </div>

      {/* Message input */}
      <form onSubmit={sendMsg} style={{ display:'flex', gap:'8px' }}>
        <Inp
          value={msg}
          onChange={e => setMsg(e.target.value)}
          placeholder={isStudent ? "Ask a question or send a message to admin..." : "Type a message to admin..."}
          style={{ margin:0 }}
        />
        <Btn busy={sending} style={{ width:'auto', padding:'0 20px', margin:0 }}>Send</Btn>
      </form>
    </Panel>
  )
}
