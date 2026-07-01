import { createServiceClient } from '@/lib/supabase/server'

const WA_URL = process.env.WHATSAPP_BOT_URL
const WA_TOKEN = process.env.WHATSAPP_BOT_TOKEN

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
    // Default to enabled if the row is missing — fail open, since this is a
    // notification convenience feature, not a security control.
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
    const res = await fetch(`${WA_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bot-token': WA_TOKEN,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
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
  // Bypasses the wa_notif_enabled toggle on purpose — OTP delivery is part
  // of the login/verification flow, not a notification an admin should be
  // able to silence by flipping a "disable WA notifications" switch.
  if (!WA_URL || !WA_TOKEN) return false
  try {
    const res = await fetch(`${WA_URL}/api/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-bot-token': WA_TOKEN },
      body: JSON.stringify({ phone }),
      signal: AbortSignal.timeout(8000),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function waVerifyOtp(phone: string, otp: string): Promise<{ valid: boolean; message: string }> {
  if (!WA_URL || !WA_TOKEN) return { valid: false, message: 'WA Bot tidak terkonfigurasi.' }
  try {
    const res = await fetch(`${WA_URL}/api/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-bot-token': WA_TOKEN },
      body: JSON.stringify({ phone, otp }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return { valid: false, message: 'Gagal verifikasi OTP.' }
    return res.json()
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

export async function waHealthCheck(): Promise<{ connected: boolean; bot: string | null }> {
  if (!WA_URL || !WA_TOKEN) return { connected: false, bot: null }
  try {
    const res = await fetch(`${WA_URL}/health`, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return { connected: false, bot: null }
    const data = await res.json()
    return { connected: data.status === 'connected', bot: data.bot }
  } catch {
    return { connected: false, bot: null }
  }
}
