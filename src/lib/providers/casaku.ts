import { getEnvVars } from '@/lib/env-vars'

// Casaku.id payment gateway (QRIS dinamis).
//
// Auth: satu header `x-license-key` per request — tidak ada request signing
// (HMAC) terpisah dan tidak ada `merchant_id` sebagai konsep sendiri. ID
// merchant/toko yang dipakai di setiap request adalah `qr_id` (UUID QRIS
// yang terdaftar di dashboard Casaku), bukan license key.
//
// Base URL produksi: https://api.casaku.id (JANGAN tambahkan suffix /api —
// setiap path endpoint sudah menyertakan /api sendiri, mis. /api/generate/v2/qris).
//
// Credentials dibaca lewat lib/env-vars.ts (Supabase-first, fallback ke
// process.env) sehingga perubahan di panel admin langsung aktif tanpa redeploy.

export function checkCasakuEnvVars(values: {
  CASAKU_BASE_URL: string
  CASAKU_LICENSE_KEY: string
  CASAKU_QR_ID: string
}): string | null {
  if (!values.CASAKU_BASE_URL) return 'CASAKU_BASE_URL belum dikonfigurasi.'
  if (!values.CASAKU_LICENSE_KEY) return 'CASAKU_LICENSE_KEY belum dikonfigurasi.'
  if (!values.CASAKU_QR_ID) return 'CASAKU_QR_ID belum dikonfigurasi.'
  return null
}

export interface CreatePaymentRequest {
  invoiceNumber: string
  amount: number
  /** QRIS | GOPAY | OVO | DANA | SHOPEEPAY — VA_* sudah tidak didukung, Casaku hanya QRIS/e-wallet */
  paymentMethod: string
  expiredAt: string
  customerName?: string
  customerEmail?: string
}

export interface CreatePaymentResult {
  success: boolean
  /** raw QRIS payload string dari Casaku — render jadi gambar QR di frontend (pakai lib `qrcode`, lihat components/qris-code.tsx) */
  qrString?: string
  paymentCode?: string
  gatewayReference?: string
  message?: string
  rawResponse?: unknown
}

// TODO: package ID untuk GOPAY dan OVO ini masih tebakan (docs Casaku cuma
// contohin "id.dana" dan "com.shopee.id" secara eksplisit). Cek daftar
// packageIds yang valid di dashboard Casaku sebelum pakai metode ini di
// production — kalau salah, request kemungkinan tetap sukses generate QRIS
// tapi opsi deep-link app-nya tidak akan tampil/tidak sesuai.
const EWALLET_PACKAGE_IDS: Record<string, string[]> = {
  DANA: ['id.dana'],
  SHOPEEPAY: ['com.shopee.id'],
  GOPAY: ['com.gojek.app'], // TODO: verifikasi ke Casaku
  OVO: ['com.ovo.id'], // TODO: verifikasi ke Casaku
}

// QRIS generik (scan dari m-banking / e-wallet apapun) — packageIds wajib
// diisi oleh API meski tidak membatasi metode scan, jadi kirim semua app
// yang didukung sebagai daftar lengkap.
const QRIS_GENERIC_PACKAGE_IDS = ['id.dana', 'com.shopee.id', 'com.gojek.app', 'com.ovo.id']

/**
 * Turns Casaku's raw qr_string into an actual image URL — needed for contexts
 * that can't render a QR client-side (e.g. a WhatsApp bot sending a link/image),
 * unlike the web checkout/topup pages which render qr_string directly via the
 * `qrcode` npm package (see components/qris-code.tsx).
 *
 * Uses the QR render tool Casaku's own docs page links to under "Tools".
 * NOTE: this is a third-party service, not part of Casaku's core API — if it
 * ever goes down, swap this for a self-hosted render (e.g. same `qrcode`
 * library used on the web, run server-side and uploaded to Supabase Storage).
 */
export function casakuQrImageUrl(qrString: string): string {
  const params = new URLSearchParams({ size: '400x400', style: '2', color: '111111', data: qrString })
  return `https://larabert-qrgen.hf.space/v1/create-qr-code?${params.toString()}`
}

function expiryMinutesFromNow(expiredAtIso: string): number {
  const diffMs = new Date(expiredAtIso).getTime() - Date.now()
  return Math.max(1, Math.round(diffMs / 60000))
}

/** Prefix ID transaksi Casaku, maks 8 karakter — dipakai buat gampang telusur di dashboard mereka. */
function shortPrefix(invoiceNumber: string): string {
  return invoiceNumber.replace(/[^A-Za-z0-9]/g, '').slice(0, 8) || 'ORD'
}

export async function createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResult> {
  const env = await getEnvVars(['CASAKU_BASE_URL', 'CASAKU_LICENSE_KEY', 'CASAKU_QR_ID'])

  const envError = checkCasakuEnvVars(env)
  if (envError) return { success: false, message: envError }

  const method = request.paymentMethod.toUpperCase()
  const isQris = method === 'QRIS'
  const packageIds = isQris ? QRIS_GENERIC_PACKAGE_IDS : EWALLET_PACKAGE_IDS[method]

  if (!packageIds) {
    return { success: false, message: `Metode pembayaran ${request.paymentMethod} tidak didukung oleh Casaku.` }
  }

  try {
    const baseUrl = env.CASAKU_BASE_URL.replace(/\/$/, '')
    const response = await fetch(`${baseUrl}/api/generate/v2/qris`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-license-key': env.CASAKU_LICENSE_KEY,
      },
      body: JSON.stringify({
        qr_id: env.CASAKU_QR_ID,
        amount: request.amount,
        useUniqueCode: true,
        packageIds,
        expiredInMinutes: expiryMinutesFromNow(request.expiredAt),
        qrType: 'dynamic',
        paymentMethod: isQris ? 'qris' : 'ewallet',
        useQris: true,
        prefix: shortPrefix(request.invoiceNumber),
      }),
      signal: AbortSignal.timeout(20000),
    })

    const rawText = await response.text()
    let data: {
      status?: number
      message?: string
      data?: {
        transactionId?: string
        amount?: number
        totalAmount?: number
        qr_string?: string
      }
    }
    try {
      data = JSON.parse(rawText)
    } catch {
      return {
        success: false,
        message: `Gateway merespons dengan status ${response.status} (bukan JSON): ${rawText.slice(0, 200)}`,
      }
    }

    if (!response.ok || !data.data?.transactionId) {
      return {
        success: false,
        message: data.message ?? `Gateway merespons dengan status ${response.status}`,
        rawResponse: data,
      }
    }

    return {
      success: true,
      qrString: data.data.qr_string,
      paymentCode: data.data.transactionId,
      gatewayReference: data.data.transactionId,
      rawResponse: data,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown gateway error'
    return { success: false, message }
  }
}

export interface CheckStatusResult {
  success: boolean
  status?: 'pending' | 'paid' | 'cancel' | 'expired'
  message?: string
}

export async function checkPaymentStatus(transactionId: string): Promise<CheckStatusResult> {
  const env = await getEnvVars(['CASAKU_BASE_URL', 'CASAKU_LICENSE_KEY'])
  if (!env.CASAKU_BASE_URL || !env.CASAKU_LICENSE_KEY) {
    return { success: false, message: 'Casaku env vars belum dikonfigurasi.' }
  }

  try {
    const baseUrl = env.CASAKU_BASE_URL.replace(/\/$/, '')
    const response = await fetch(`${baseUrl}/api/generate/check-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-license-key': env.CASAKU_LICENSE_KEY,
      },
      body: JSON.stringify({ transactionId }),
      signal: AbortSignal.timeout(15000),
    })

    const data = (await response.json()) as { data?: { status?: string }; message?: string }
    if (!response.ok) {
      return { success: false, message: data.message ?? `Gateway merespons dengan status ${response.status}` }
    }

    return { success: true, status: data.data?.status as CheckStatusResult['status'] }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown gateway error'
    return { success: false, message }
  }
}
