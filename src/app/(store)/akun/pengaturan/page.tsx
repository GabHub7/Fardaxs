'use client'

import { useState, useEffect, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Shield, Bell, Trash2, LogOut, ChevronRight, AlertCircle, CheckCircle, Palette, Loader2 } from 'lucide-react'
import { ThemeSwitcher } from '@/components/theme-toggle'

type NotifPrefs = { order: boolean; promo: boolean }

export default function PengaturanPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{type:'success'|'error';message:string}|null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [notif, setNotif] = useState<NotifPrefs>({ order: true, promo: false })
  const [savingKey, setSavingKey] = useState<keyof NotifPrefs | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Load persisted notification preferences
  useEffect(() => {
    fetch('/api/account/notifications')
      .then((r) => r.json())
      .then((j) => { if (j.success) setNotif(j.data as NotifPrefs) })
      .catch(() => {})
  }, [])

  async function toggleNotif(key: keyof NotifPrefs) {
    const next = { ...notif, [key]: !notif[key] }
    setNotif(next)              // optimistic
    setSavingKey(key)
    try {
      const res = await fetch('/api/account/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: next[key] }),
      })
      const j = await res.json()
      if (!j.success) {
        setNotif(notif)          // revert on failure
        showFeedback('error', 'Gagal menyimpan preferensi.')
      }
    } catch {
      setNotif(notif)
      showFeedback('error', 'Gagal menyimpan preferensi.')
    } finally {
      setSavingKey(null)
    }
  }

  async function handleDeactivate() {
    setDeleting(true)
    try {
      const res = await fetch('/api/account/deactivate', { method: 'POST' })
      const j = await res.json()
      if (!j.success) {
        showFeedback('error', j.message ?? 'Gagal menonaktifkan akun.')
        setDeleting(false)
        return
      }
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login'); router.refresh()
    } catch {
      showFeedback('error', 'Terjadi kesalahan. Coba lagi.')
      setDeleting(false)
    }
  }

  function showFeedback(type:'success'|'error', message:string) {
    setFeedback({type,message})
    setTimeout(()=>setFeedback(null),4000)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login'); router.refresh()
  }

  async function handleChangePassword() {
    const supabase = createClient()
    const { data:{ user } } = await supabase.auth.getUser()
    if (!user?.email) return
    startTransition(async () => {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email!, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) showFeedback('error','Gagal mengirim email. Coba lagi.')
      else showFeedback('success','Link ubah password telah dikirim ke email kamu.')
    })
  }

  const card = { background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden' as const }
  const cardHeader = { borderBottom:'1px solid var(--border)', padding:'10px 16px', display:'flex', alignItems:'center', gap:8 }

  return (
    <div className="space-y-4 animate-fade-in-up px-4 py-4">
      <div>
        <h1 className="text-lg font-bold" style={{color:'var(--text-primary)'}}>Pengaturan</h1>
        <p className="text-sm mt-0.5" style={{color:'var(--text-secondary)'}}>Kelola tampilan, keamanan, dan preferensi akun</p>
      </div>

      {feedback && (
        <div className="animate-fade-in flex items-center gap-2 rounded-[12px] p-3 text-sm"
          style={{background:feedback.type==='success'?'rgba(22,163,74,.1)':'rgba(220,38,38,.1)',color:feedback.type==='success'?'#16a34a':'#dc2626'}}>
          {feedback.type==='success'?<CheckCircle size={16}/>:<AlertCircle size={16}/>}
          {feedback.message}
        </div>
      )}

      {/* TEMA */}
      <div style={card}>
        <div style={cardHeader}>
          <Palette size={16} style={{color:'#2563eb'}}/>
          <span className="text-xs font-semibold" style={{color:'var(--text-secondary)'}}>Tampilan</span>
        </div>
        <div className="p-4">
          <p className="text-xs mb-3" style={{color:'var(--text-secondary)'}}>Pilih tema yang nyaman untuk kamu</p>
          <ThemeSwitcher/>
        </div>
      </div>

      {/* NOTIFIKASI */}
      <div style={card}>
        <div style={cardHeader}>
          <Bell size={16} style={{color:'#f59e0b'}}/>
          <span className="text-xs font-semibold" style={{color:'var(--text-secondary)'}}>Notifikasi</span>
        </div>
        {([
          {key:'order' as const,label:'Notifikasi Pesanan',desc:'Update status pesanan kamu'},
          {key:'promo' as const,label:'Notifikasi Promo',desc:'Penawaran dan diskon eksklusif'},
        ]).map((item,i,arr)=>{
          const on = notif[item.key]
          return (
          <div key={item.key} className="flex items-center justify-between px-4 py-3.5"
            style={{borderBottom:i<arr.length-1?'1px solid var(--border)':'none'}}>
            <div>
              <p className="text-sm font-medium" style={{color:'var(--text-primary)'}}>{item.label}</p>
              <p className="text-xs mt-0.5" style={{color:'var(--text-secondary)'}}>{item.desc}</p>
            </div>
            <button
              onClick={()=>toggleNotif(item.key)}
              disabled={savingKey===item.key}
              aria-pressed={on}
              className="relative w-10 h-6 rounded-full cursor-pointer flex-shrink-0 press-effect disabled:opacity-70"
              style={{background:on?'#2563eb':'var(--border)',transition:'background .2s'}}>
              <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow flex items-center justify-center transition-all duration-200"
                style={{left:on?'18px':'2px'}}>
                {savingKey===item.key && <Loader2 size={11} className="animate-spin" style={{color:'#2563eb'}}/>}
              </span>
            </button>
          </div>
          )
        })}
      </div>

      {/* KEAMANAN */}
      <div style={card}>
        <div style={cardHeader}>
          <Shield size={16} style={{color:'#3b82f6'}}/>
          <span className="text-xs font-semibold" style={{color:'var(--text-secondary)'}}>Keamanan</span>
        </div>
        <button onClick={handleChangePassword} disabled={isPending}
          className="w-full flex items-center justify-between px-4 py-4 text-left hover-fade disabled:opacity-60">
          <div>
            <p className="text-sm font-medium" style={{color:'var(--text-primary)'}}>Ubah Password</p>
            <p className="text-xs mt-0.5" style={{color:'var(--text-secondary)'}}>Kirim link reset ke email</p>
          </div>
          <ChevronRight size={16} style={{color:'var(--text-muted)'}}/>
        </button>
      </div>

      {/* DANGER */}
      <div style={{...card,border:'1px solid rgba(220,38,38,.3)'}}>
        <div style={{...cardHeader,borderColor:'rgba(220,38,38,.2)'}}>
          <AlertCircle size={16} style={{color:'#dc2626'}}/>
          <span className="text-xs font-semibold" style={{color:'#dc2626'}}>Zona Berbahaya</span>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-4 text-left hover-fade"
          style={{borderBottom:'1px solid rgba(220,38,38,.15)'}}>
          <LogOut size={16} style={{color:'#dc2626'}}/>
          <div>
            <p className="text-sm font-medium" style={{color:'var(--text-primary)'}}>Keluar</p>
            <p className="text-xs mt-0.5" style={{color:'var(--text-secondary)'}}>Keluar dari semua perangkat</p>
          </div>
          <ChevronRight size={16} className="ml-auto" style={{color:'var(--text-muted)'}}/>
        </button>
        <div className="px-4 py-4">
          {!showDeleteConfirm?(
            <button onClick={()=>setShowDeleteConfirm(true)} className="flex items-center gap-3 hover-fade press-effect">
              <Trash2 size={16} style={{color:'#dc2626'}}/>
              <div className="text-left">
                <p className="text-sm font-medium" style={{color:'#dc2626'}}>Nonaktifkan Akun</p>
                <p className="text-xs mt-0.5" style={{color:'var(--text-secondary)'}}>Keluar &amp; nonaktifkan akun kamu</p>
              </div>
            </button>
          ):(
            <div className="animate-fade-in-scale rounded-[12px] border p-4 space-y-3"
              style={{borderColor:'rgba(220,38,38,.4)'}}>
              <p className="text-sm font-semibold" style={{color:'#dc2626'}}>Yakin ingin menonaktifkan akun?</p>
              <p className="text-xs" style={{color:'var(--text-secondary)'}}>Akun akan dinonaktifkan dan kamu akan keluar. Hubungi CS jika ingin mengaktifkan kembali.</p>
              <div className="flex gap-2">
                <button onClick={()=>setShowDeleteConfirm(false)} disabled={deleting}
                  className="press-effect flex-1 rounded-[10px] py-2 text-xs font-semibold border disabled:opacity-60"
                  style={{borderColor:'var(--border)',color:'var(--text-secondary)'}}>Batal</button>
                <button disabled={deleting}
                  className="press-effect flex-1 rounded-[10px] py-2 text-xs font-semibold text-white flex items-center justify-center gap-1.5 disabled:opacity-60"
                  style={{background:'#dc2626'}}
                  onClick={handleDeactivate}>
                  {deleting && <Loader2 size={13} className="animate-spin"/>}
                  {deleting ? 'Memproses...' : 'Nonaktifkan'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
