import { Agent, fetch as undiciFetch } from 'undici'
import { createServiceClient } from '@/lib/supabase/server'

// .replace(/\/$/, '') buang trailing slash — kalau WHATSAPP_BOT_URL diisi
// dengan "/" di ujung (gampang kejadian pas copy-paste), tanpa ini semua
// endpoint jadi double-slash (mis. ".../health" jadi ".../ /health") dan
// Express membalas 404, bikin status selalu "Terputus" walau bot sehat.
const WA_URL = process.env.WHATSAPP_BOT_URL?.replace(/\/$/, '')
const WA_TOKEN = process.env.WHATSAPP_BOT_TOKEN

// ─── HTTP/2 AGENT ───────────────────────────────────────────────────────────
// Node.js `fetch()` global (via undici bawaan Node) SELALU pakai HTTP/1.1,
// tidak ada cara memaksanya negosiasi HTTP/2. Cloudflare Bot Fight Mode
// secara spesifik mencurigai koneksi HTTP/1.1 sebagai traffic bot (browser
// asli & traffic "manusia" hampir selalu negosiasi HTTP/2) — ini dikonfirmasi
// langsung oleh admin hosting bot lewat Cloudflare Ray ID.
// Solusinya: pakai package `undici` eksplisit dengan `allowH2: true`, yang
// menegosiasikan HTTP/2 via ALPN saat TLS handshake, dan otomatis fallback
// ke HTTP/1.1 kalau server tujuan ternyata tidak mendukung H2 (tidak seperti
// `node:http2` mentah yang bisa gagal keras tanpa fallback).
const h2Agent = new Agent({ allowH2: true })

async function fetchBot(
  path: string,
  options: { method?: string; headers?: Record<string, string>; body?: string; timeoutMs?: number } = {}
) {
  if (!WA_URL) throw new Error('WHATSAPP_BOT_URL tidak dikonfigurasi')
  return undiciFetch(`${WA_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: options.headers,
    body: options.body,
    signal: AbortSignal.timeout(options.timeoutMs ?? 8000),
    dispatcher: h2Agent,
  })
}

// Cached per-process (short TTL) so we don't hit Supabase on every single
// notification call — the toggle in Pengaturan → Bot WhatsApp doesn't need
// to take effect within milliseconds, a few seconds of staleness is fine.
let toggleCache: { value: boolean; loadedAt: number } | null = null
const TOGGLE_CACHE_TTL_MS = 15_000

async function isWaNotifEnabled(): Promise<boolean> {
  const now = Date.now()
  if (toggleCache && now - toggleCache.loadedAt < TOGGLE_CACHE_TTL_MS) {
    return toggleCache.value
  }
  try {
    const client = createServiceClient()
    const { data } = await client.from('site_settings').select('value').eq('key', 'wa_notif_enabled').maybeSingle()
    const value = data?.value === false ? false : true
    toggleCache = { value, loadedAt: now }
    return value
  } catch {
    return true
  }
}

async function waPost(endpoint: string, body: Record<string, unknown>): Promise<boolean> {
  if (!WA_URL || !WA_TOKEN) return false
  if (!(await isWaNotifEnabled())) return false
  try {
    const res = await fetchBot(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-bot-token': WA_TOKEN },
      body: JSON.stringify(body),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function waSend(phone: string, message: string): Promise<boolean> {
  return waPost('/api/send', { phone, message })
}

export async function waSendOtp(phone: string): Promise<boolean> {
  if (!WA_URL || !WA_TOKEN) return false
  try {
    const res = await fetchBot('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-bot-token': WA_TOKEN },
      body: JSON.stringify({ phone }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function waVerifyOtp(phone: string, otp: string): Promise<{ valid: boolean; message: string }> {
  if (!WA_URL || !WA_TOKEN) return { valid: false, message: 'WA Bot tidak terkonfigurasi.' }
  try {
    const res = await fetchBot('/api/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-bot-token': WA_TOKEN },
      body: JSON.stringify({ phone, otp }),
    })
    if (!res.ok) return { valid: false, message: 'Gagal verifikasi OTP.' }
    return (await res.json()) as { valid: boolean; message: string }
  } catch {
    return { valid: false, message: 'WA Bot tidak tersedia.' }
  }
}

export async function waNotifyOrderCreated(params: {
  phone: string
  name: string
  order_number: string
  amount: number
  expired_at?: string
}): Promise<boolean> {
  return waPost('/api/send-order-created', params)
}

export async function waNotifyPaymentSuccess(params: {
  phone: string
  name: string
  order_number: string
  amount: number
}): Promise<boolean> {
  return waPost('/api/send-payment-success', params)
}

export async function waNotifyOrderSuccess(params: {
  phone: string
  name: string
  order_number: string
  product_name: string
  target: string
}): Promise<boolean> {
  return waPost('/api/send-order-success', params)
}

export async function waNotifyOrderFailed(params: {
  phone: string
  name: string
  order_number: string
  reason?: string
}): Promise<boolean> {
  return waPost('/api/send-order-failed', params)
}

export async function waNotifyPaymentReminder(params: {
  phone: string
  name: string
  order_number: string
  amount: number
  expired_at?: string
}): Promise<boolean> {
  return waPost('/api/send-payment-reminder', params)
}

export interface WaHealthDebug {
  urlConfigured: boolean
  tokenConfigured: boolean
  urlPreview: string | null
  httpStatus: number | null
  responseBody: string | null
  errorMessage: string | null
  latencyMs: number | null
  cfRay: string | null
}

function maskUrl(url: string): string {
  if (url.length <= 20) return url
  return `${url.slice(0, 14)}...${url.slice(-8)}`
}

export async function waHealthCheck(): Promise<{ connected: boolean; bot: string | null; uptime: number | null; debug: WaHealthDebug }> {
  const debug: WaHealthDebug = {
    urlConfigured: Boolean(WA_URL),
    tokenConfigured: Boolean(WA_TOKEN),
    urlPreview: WA_URL ? maskUrl(WA_URL) : null,
    httpStatus: null,
    responseBody: null,
    errorMessage: null,
    latencyMs: null,
    cfRay: null,
  }

  if (!WA_URL) {
    debug.errorMessage = 'WHATSAPP_BOT_URL kosong/tidak terbaca di environment saat ini. Kalau baru ditambahkan di Vercel, WAJIB redeploy — env var tidak otomatis ke-refresh tanpa deployment baru.'
    return { connected: false, bot: null, uptime: null, debug }
  }

  const startedAt = Date.now()
  try {
    const res = await fetchBot('/health', {
      headers: WA_TOKEN ? { 'x-fardax-request': WA_TOKEN } : undefined,
    })
    debug.latencyMs = Date.now() - startedAt
    debug.httpStatus = res.status
    debug.cfRay = res.headers.get('cf-ray')

    const text = await res.text()
    debug.responseBody = text.slice(0, 300)

    if (!res.ok) {
      debug.errorMessage = `Server bot membalas HTTP ${res.status} (bukan 200). Kalau ini 521/502/403/timeout dari Cloudflare, bot atau reverse proxy-nya belum bisa diakses dari internet.`
      console.error('[waHealthCheck]', new Date().toISOString(), JSON.stringify(debug))
      return { connected: false, bot: null, uptime: null, debug }
    }

    let data: { status?: string; bot?: string | null; uptime?: number }
    try {
      data = JSON.parse(text)
    } catch {
      debug.errorMessage = 'Response bukan JSON valid — kemungkinan bukan bot Express kita yang membalas (misal halaman error Cloudflare/HTML).'
      console.error('[waHealthCheck]', new Date().toISOString(), JSON.stringify(debug))
      return { connected: false, bot: null, uptime: null, debug }
    }

    if (data.status !== 'connected') {
      debug.errorMessage = `Bot terjangkau, tapi WhatsApp-nya belum login (status: "${data.status}"). Scan QR di console bot.`
    }

    console.log('[waHealthCheck]', new Date().toISOString(), `HTTP ${debug.httpStatus} status=${data.status} latency=${debug.latencyMs}ms`)
    return { connected: data.status === 'connected', bot: data.bot ?? null, uptime: typeof data.uptime === 'number' ? data.uptime : null, debug }
  } catch (err) {
    debug.latencyMs = Date.now() - startedAt
    if (err instanceof Error && err.name === 'TimeoutError') {
      debug.errorMessage = 'Request timeout (8 detik) — server bot tidak merespons sama sekali. Biasanya firewall/reverse proxy belum meneruskan trafik ke container, atau bot-nya down.'
    } else if (err instanceof Error) {
      debug.errorMessage = `${err.name}: ${err.message}`
    } else {
      debug.errorMessage = 'Error tidak diketahui saat menghubungi bot.'
    }
    console.error('[waHealthCheck]', new Date().toISOString(), JSON.stringify(debug))
    return { connected: false, bot: null, uptime: null, debug }
  }
}
