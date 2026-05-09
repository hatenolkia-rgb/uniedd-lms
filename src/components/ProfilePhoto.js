import React, { useState, useRef } from 'react'
import { supabase } from '../supabaseClient'

// Shared component — shows avatar + click to upload new photo
export default function ProfilePhoto({ profile, size = 40, onUpdate }) {
  const [uploading, setUploading] = useState(false)
  const [preview,   setPreview]   = useState(profile?.avatar_url || null)
  const [hover,     setHover]     = useState(false)
  const fileRef = useRef()

  const initials = (profile?.full_name || profile?.email || '?')
    .split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase()

  const roleColor = {
    admin:   '#ef4444',
    teacher: '#8b5cf6',
    sales:   '#f4a335',
    student: '#1e90ff',
  }[profile?.role] || '#5aabff'

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { alert('Image must be under 2MB'); return }

    // Show local preview instantly
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target.result)
    reader.readAsDataURL(file)

    setUploading(true)
    try {
      const ext  = file.name.split('.').pop()
      const path = `avatars/${profile.id}.${ext}`

      // Upload to Supabase Storage bucket "avatars"
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (uploadErr) throw uploadErr

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(path)

      // Save to profiles
      await supabase.from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id)

      setPreview(publicUrl)
      if (onUpdate) onUpdate(publicUrl)

    } catch(err) {
      console.error('Upload error:', err)
      alert('Upload failed: ' + err.message)
      setPreview(profile?.avatar_url || null)
    }
    setUploading(false)
  }

  return (
    <div
      onClick={() => !uploading && fileRef.current?.click()}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position:'relative', width:size, height:size, borderRadius:'50%', cursor:'pointer', flexShrink:0 }}
    >
      {/* Avatar image or initials */}
      {preview
        ? <img src={preview} alt="avatar" style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover', border:`2px solid ${roleColor}66`, display:'block' }} />
        : <div style={{ width:size, height:size, borderRadius:'50%', background:`${roleColor}22`, border:`2px solid ${roleColor}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.35, fontWeight:800, color:roleColor, userSelect:'none' }}>
            {initials}
          </div>
      }

      {/* Hover overlay */}
      {(hover || uploading) && (
        <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          {uploading
            ? <span style={{ display:'inline-block', width:size*0.3, height:size*0.3, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite' }} />
            : <span style={{ fontSize:size*0.35, lineHeight:1 }}>📷</span>
          }
        </div>
      )}

      {/* Hidden file input */}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} style={{ display:'none' }} />

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
