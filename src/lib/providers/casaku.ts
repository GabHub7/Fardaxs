import crypto from 'crypto'
import { getEnvVars } from '@/lib/env-vars'

// Casaku.id (formerly "Cashify") payment gateway.
// Semua request ke API Casaku.id wajib menyertakan header x-license-key
// (dari halaman API Keys di dashboard Casaku.id), selain x-merchant-id dan
// x-signature. Casaku.id hanya menerbitkan satu key ("secret key" / API key)
// per merchant — itulah nilai yang dikirim sebagai x-license-key, jadi tidak
// ada CASAKU_LICENSE_KEY terpisah. Credentials dibaca dari lib/env-vars.ts
// (Supabase-first, fallback ke process.env) sehingga perubahan di panel
// admin langsung aktif tanpa redeploy.

export function checkCasakuEnvVars(values: {
  CASAKU_API_URL: string
  CASAKU_MERCHANT_ID: string
  CASAKU_SECRET_KEY: string
}): string | null {
  if (!values.CASAKU_API_URL) return 'CASAKU_API_URL belum dikonfigurasi.'
  if (!values.CASAKU_MERCHANT_ID || !values.CASAKU_SECRET_KEY) return 'CASAKU_MERCHANT_ID / CASAKU_SECRET_KEY belum dikonfigurasi.'
  return null
}

export interface CreatePaymentRequest {
  invoiceNumber: string
  amount: number
  paymentMethod: string
  expiredAt: string
  customerName?: string
  customerEmail?: string
}

export interface CreatePaymentResult {
  success: boolean
  paymentUrl?: string
  qrUrl?: string
  paymentCode?: string
  gatewayReference?: string
  message?: string
  rawResponse?: unknown
}

function signRequest(secretKey: string, merchantId: string, invoiceNumber: string, amount: number): string {
  return crypto
    .createHmac('sha256', secretKey)
    .update(`${merchantId}${invoiceNumber}${amount}`)
    .digest('hex')
}

export async function createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResult> {
  const env = await getEnvVars([
    'CASAKU_API_URL',
    'CASAKU_MERCHANT_ID',
    'CASAKU_SECRET_KEY',
  ])

  const envError = checkCasakuEnvVars(env)
  if (envError) return { success: false, message: envError }

  try {
    const signature = signRequest(env.CASAKU_SECRET_KEY, env.CASAKU_MERCHANT_ID, request.invoiceNumber, request.amount)

    const response = await fetch(`${env.CASAKU_API_URL}/v1/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-license-key': env.CASAKU_SECRET_KEY,
        'x-merchant-id': env.CASAKU_MERCHANT_ID,
        'x-signature': signature,
      },
      body: JSON.stringify({
        invoice_number: request.invoiceNumber,
        amount: request.amount,
        payment_method: request.paymentMethod,
        expired_at: request.expiredAt,
        customer_name: request.customerName,
        customer_email: request.customerEmail,
      }),
      signal: AbortSignal.timeout(20000),
    })

    const rawText = await response.text()
    let data: {
      status?: string
      data?: {
        payment_url?: string
        qr_url?: string
        payment_code?: string
        gateway_transaction_id?: string
      }
      message?: string
    }
    try {
      data = JSON.parse(rawText)
    } catch {
      return {
        success: false,
        message: `Gateway merespons dengan status ${response.status} (bukan JSON): ${rawText.slice(0, 200)}`,
      }
    }

    if (!response.ok || data.status !== 'SUCCESS') {
      return {
        success: false,
        message: data.message ?? `Gateway merespons dengan status ${response.status}`,
        rawResponse: data,
      }
    }

    return {
      success: true,
      paymentUrl: data.data?.payment_url,
      qrUrl: data.data?.qr_url,
      paymentCode: data.data?.payment_code,
      gatewayReference: data.data?.gateway_transaction_id,
      rawResponse: data,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown gateway error'
    return { success: false, message }
  }
}
