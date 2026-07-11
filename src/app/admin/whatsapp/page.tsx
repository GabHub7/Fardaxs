'use client'

import { useState, useEffect } from 'react'
import { Loader2, RefreshCw, Clock, AlertTriangle } from 'lucide-react'

const NOTIF_DESCRIPTIONS = [
  { label: 'Notifikasi Pesanan & Pembayaran', desc: 'Kirim WA saat pesanan dibuat, dibayar, selesai, atau gagal. OTP login tidak terpengaruh — selalu aktif terlepas dari pengaturan ini.' },
]

export default function WhatsAppPage() {
  const [testPhone, setTestPhone] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  const [botStatus, setBotStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking')
  const [botNumber, setBotNumber] = useState<string | null>(null)
  const [uptimeSeconds, setUptimeSeconds] = useState<number | null>(null)
  const [debugInfo, setDebugInfo] = useState<{
    urlConfigured: boolean
    tokenConfigured: boolean
    urlPreview: string | null
    httpStatus: number | null
    responseBody: string | null
    errorMessage: string | null
    latencyMs: number | null
    cfRay: string | null
  } | null>(null)

  const [notifEnabled, setNotifEnabled] = useState(true)
  const [loadingToggle, setLoadingToggle] = useState(true)
  const [savingToggle, setSavingToggle] = useState(false)

  async function fetchHealth() {
    try {
      const res = await fetch('/api/admin/whatsapp/health', { cache: 'no-store' })
      const d = await res.json()
      setBotStatus(d.connected ? 'connected' : 'disconnected')
      setBotNumber(d.bot ?? null)
      setUptimeSeconds(typeof d.uptime === 'number' ? d.uptime : null)
      setDebugInfo(d.debug ?? null)
    } catch {
      setBotStatus('disconnected')
    }
  }

  // For the manual "Refresh" button.
  function checkHealth() {
    setBotStatus('checking')
    fetchHealth()
  }

  useEffect(() => {
    async function loadHealth() {
      try {
        const res = await fetch('/api/admin/whatsapp/health', { cache: 'no-store' })
        const d = await res.json()
        setBotStatus(d.connected ? 'connected' : 'disconnected')
        setBotNumber(d.bot ?? null)
        setUptimeSeconds(typeof d.uptime === 'number' ? d.uptime : null)
        setDebugInfo(d.debug ?? null)
      } catch {
        setBotStatus('disconnected')
      }
    }

    async function loadToggle() {
      const res = await fetch('/api/admin/whatsapp/notif-toggle')
      const d = await res.json()
      if (d.success) setNotifEnabled(d.data.enabled)
      setLoadingToggle(false)
    }

    loadHealth()
    loadToggle()

    // Auto-refresh bot connectivity every 30s.
    const interval = setInterval(loadHealth, 30_000)
    return () => clearInterval(interval)
  }, [])

  async function handleToggleNotif() {
    const next = !notifEnabled
    setSavingToggle(true)
    try {
      const res = await fetch('/api/admin/whatsapp/notif-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      })
      const json = await res.json()
      if (json.success) setNotifEnabled(next)
    } finally {
      setSavingToggle(false)
    }
  }

  async function handleTest() {
    if (!testPhone) {
      setTestResult({ ok: false, message: 'Masukkan nomor HP tujuan test terlebih dahulu.' })
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/admin/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: testPhone }),
      })
      const json = await res.json()
      setTestResult({
        ok: res.ok,
        message: res.ok ? `Pesan test berhasil dikirim ke ${testPhone}` : (json.message ?? 'Gagal kirim pesan.'),
      })
    } catch {
      setTestResult({ ok: false, message: 'Tidak dapat menghubungi server.' })
    } finally {
      setTesting(false)
    }
  }

  function formatUptime(seconds: number | null): string {
    if (seconds === null) return '—'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return h > 0 ? `${h} jam ${m} menit` : `${m} menit`
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
            Bot WhatsApp
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
            Status koneksi dan notifikasi WhatsApp. Bot (fardax-wabot) berjalan sebagai proses Node.js terpisah di VPS — bukan di Vercel.
          </p>
        </div>
        <button
          onClick={checkHealth}
          className="flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-[12px]"
          style={{ background: 'hsl(var(--background-muted))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))' }}
        >
          <RefreshCw size={13} className={botStatus === 'checking' ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Connection status */}
      <div
        className="rounded-[20px] border p-5 flex items-center justify-between flex-wrap gap-3"
        style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
      >
        <div className="flex items-center gap-3">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{
              background: botStatus === 'connected' ? 'hsl(var(--success))' : botStatus === 'checking' ? 'hsl(var(--warning))' : 'hsl(var(--destructive))',
            }}
          />
          <div>
            <p className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>
              {botStatus === 'connected'
                ? `Terhubung${botNumber ? ` · ${botNumber.split('@')[0]}` : ''}`
                : botStatus === 'checking'
                ? 'Memeriksa koneksi...'
                : 'Terputus'}
            </p>
            {botStatus !== 'connected' && (
              <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
                {botStatus === 'checking' ? 'Menghubungi bot...' : 'Bot tidak merespons. Pastikan proses bot berjalan di VPS dan WHATSAPP_BOT_URL sudah benar.'}
              </p>
            )}
          </div>
        </div>
        {botStatus === 'connected' && (
          <div className="text-right">
            <p className="text-[11px] flex items-center gap-1 justify-end" style={{ color: 'hsl(var(--foreground-muted))' }}>
              <Clock size={11} /> Uptime
            </p>
            <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
              {formatUptime(uptimeSeconds)}
            </p>
          </div>
        )}
      </div>

      {botStatus === 'disconnected' && debugInfo && (
        <div
          className="rounded-[16px] border p-4 space-y-2 font-mono text-[11px]"
          style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
        >
          <p className="font-sans text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
            Diagnostic (root cause)
          </p>
          <p style={{ color: debugInfo.urlConfigured ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }}>
            WHATSAPP_BOT_URL: {debugInfo.urlConfigured ? `terbaca (${debugInfo.urlPreview})` : 'KOSONG / tidak terbaca'}
          </p>
          <p style={{ color: debugInfo.tokenConfigured ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }}>
            WHATSAPP_BOT_TOKEN: {debugInfo.tokenConfigured ? 'terbaca' : 'KOSONG / tidak terbaca'}
          </p>
          {debugInfo.httpStatus !== null && (
            <p style={{ color: 'hsl(var(--foreground-muted))' }}>
              HTTP status dari bot: {debugInfo.httpStatus} (latency {debugInfo.latencyMs}ms)
            </p>
          )}
          {debugInfo.cfRay && (
            <p className="font-sans" style={{ color: 'hsl(var(--foreground))' }}>
              <strong>Cloudflare Ray ID: {debugInfo.cfRay}</strong> — kasih ID ini ke admin
              hosting bot untuk lacak persis request ini di Security Events mereka.
            </p>
          )}
          {debugInfo.responseBody && (
            <p style={{ color: 'hsl(var(--foreground-muted))' }}>
              Response: {debugInfo.responseBody}
            </p>
          )}
          {debugInfo.errorMessage && (
            <p className="font-sans" style={{ color: 'hsl(var(--warning))' }}>
              → {debugInfo.errorMessage}
            </p>
          )}
        </div>
      )}

      {botStatus === 'disconnected' && (
        <div
          className="rounded-[16px] border p-4 flex items-start gap-3"
          style={{ background: 'hsl(var(--warning) / 0.08)', borderColor: 'hsl(var(--warning) / 0.3)' }}
        >
          <AlertTriangle size={18} style={{ color: 'hsl(var(--warning))' }} className="flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1" style={{ color: 'hsl(var(--foreground-muted))' }}>
            <p className="text-sm font-semibold" style={{ color: 'hsl(var(--warning))' }}>Cara menghubungkan bot</p>
            <p>Alamat bot (<code className="font-mono px-1 rounded bg-black/10">WHATSAPP_BOT_URL</code>) dan token (<code className="font-mono px-1 rounded bg-black/10">WHATSAPP_BOT_TOKEN</code>) diatur sebagai environment variable di Vercel — bukan lewat form di halaman ini, karena keduanya juga dipakai oleh proses bot itu sendiri lewat file <code className="font-mono px-1 rounded bg-black/10">.env</code>-nya.</p>
            <ol className="list-decimal list-inside space-y-1 mt-2">
              <li>Di VPS, masuk ke folder bot lalu jalankan <code className="font-mono px-1 rounded bg-black/10">npm install && npm start</code>, scan QR code dengan WhatsApp yang akan jadi nomor bot.</li>
              <li>Gunakan PM2 supaya bot auto-restart: <code className="font-mono px-1 rounded bg-black/10">pm2 start index.js --name fardax-wabot</code></li>
              <li>Set <code className="font-mono px-1 rounded bg-black/10">WHATSAPP_BOT_URL</code> di Vercel ke alamat publik VPS (mis. <code className="font-mono px-1 rounded bg-black/10">https://wabot.fardaxstore.com</code>) dan <code className="font-mono px-1 rounded bg-black/10">WHATSAPP_BOT_TOKEN</code> harus identik dengan <code className="font-mono px-1 rounded bg-black/10">BOT_TOKEN</code> di <code className="font-mono px-1 rounded bg-black/10">.env</code> bot, lalu redeploy.</li>
              <li>Klik Refresh di atas untuk verifikasi.</li>
            </ol>
          </div>
        </div>
      )}

      {/* Test connection */}
      <div
        className="rounded-[20px] border p-5 space-y-3"
        style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
      >
        <h2 className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
          Kirim Pesan Test
        </h2>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            placeholder="6281234567890"
            className="flex-1 min-w-[200px] px-3 py-2.5 text-sm rounded-[12px] border outline-none"
            style={{ background: 'hsl(var(--background-muted))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
          />
          <button
            onClick={() => void handleTest()}
            disabled={testing}
            className="px-4 py-2.5 rounded-[12px] text-xs font-semibold disabled:opacity-60"
            style={{ background: 'hsl(var(--background-muted))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))' }}
          >
            {testing ? 'Mengirim...' : 'Kirim Test'}
          </button>
        </div>
        {testResult && (
          <p className="text-xs" style={{ color: testResult.ok ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }}>
            {testResult.message}
          </p>
        )}
      </div>

      {/* Notification toggle */}
      <div
        className="rounded-[20px] border p-5 space-y-3"
        style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
      >
        <h2 className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
          Pengaturan Notifikasi
        </h2>
        {loadingToggle ? (
          <div className="flex items-center gap-2 text-xs" style={{ color: 'hsl(var(--foreground-muted))' }}>
            <Loader2 size={13} className="animate-spin" /> Memuat...
          </div>
        ) : (
          <div className="space-y-3">
            {NOTIF_DESCRIPTIONS.map((item) => (
              <label key={item.label} className="flex items-start gap-3 cursor-pointer">
                <button
                  type="button"
                  onClick={handleToggleNotif}
                  disabled={savingToggle}
                  className="relative flex-shrink-0 mt-0.5 inline-flex h-[22px] w-10 items-center rounded-full transition-colors disabled:opacity-60"
                  style={{ background: notifEnabled ? 'hsl(var(--primary))' : 'hsl(var(--background-muted))' }}
                >
                  <span
                    className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                    style={{ transform: notifEnabled ? 'translateX(18px)' : 'translateX(2px)' }}
                  />
                </button>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>{item.label}</p>
                  <p className="text-xs" style={{ color: 'hsl(var(--foreground-muted))' }}>{item.desc}</p>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
