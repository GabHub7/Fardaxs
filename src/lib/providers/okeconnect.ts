import type { ProviderAdapter, FulfillmentRequest, FulfillmentResult, BalanceResult } from './adapter'
import { getEnvVars } from '@/lib/env-vars'

// ─── OkeConnect H2H Provider ─────────────────────────────────────────────────
//
// OkeConnect (orderkuota.com) adalah provider H2H untuk pulsa, token listrik,
// paket data, dan produk PPOB lainnya. Base URL: https://h2h.okeconnect.com
//
// PENTING — format response OkeConnect BUKAN JSON standar.
// Responnya adalah plain text mentah, contoh:
//   Sukses: "TRX123#082100000000#PULSA10#SUKSES#SN:REFF1234567890"
//   Gagal:  "R#.GAGAL#Member ID / PIN Salah"
//   Saldo:  "Saldo: Rp 1.234.567"
//   Pending:"TRX123#082100000000#PULSA10#PENDING"
//
// Endpoint berbeda untuk tiap aksi:
//   Transaksi : GET /trx?product=...&dest=...&refID=...&memberID=...&pin=...&password=...
//   Cek saldo : GET /trx/balance?memberID=...&pin=...&password=...
//   Cek status: GET /trx/status?refID=...&memberID=...&pin=...&password=...
//
// Kredensial dibaca dari lib/env-vars.ts (Supabase-first, fallback process.env).

interface OkeConnectCreds {
  baseUrl: string
  memberId: string
  pin: string
  password: string
}

async function loadCreds(): Promise<OkeConnectCreds> {
  const env = await getEnvVars([
    'OKECONNECT_API_URL',
    'OKECONNECT_MEMBER_ID',
    'OKECONNECT_PIN',
    'OKECONNECT_PASSWORD',
  ])
  return {
    baseUrl: (env.OKECONNECT_API_URL || 'https://h2h.okeconnect.com').replace(/\/$/, ''),
    memberId: env.OKECONNECT_MEMBER_ID,
    pin: env.OKECONNECT_PIN,
    password: env.OKECONNECT_PASSWORD,
  }
}

function checkCreds(creds: OkeConnectCreds): void {
  if (!creds.memberId || !creds.pin || !creds.password) {
    throw new Error(
      'OkeConnect belum dikonfigurasi — set OKECONNECT_MEMBER_ID, OKECONNECT_PIN, OKECONNECT_PASSWORD di panel Env Pembayaran.'
    )
  }
}

// ─── Plain-text response parser ───────────────────────────────────────────────
// OkeConnect H2H mengembalikan plain text, bukan JSON. Kita harus parse manual.
interface ParsedH2HResponse {
  success: boolean
  pending: boolean
  message: string
  serialNumber: string | null
  balance: number | null
  raw: string
}

function parseH2HText(raw: string): ParsedH2HResponse {
  const text = raw.trim()

  // Fast path: beberapa proxy/versi tertentu OkeConnect mengembalikan JSON
  try {
    const json = JSON.parse(text) as {
      status?: string | boolean
      rc?: string
      message?: string
      sn?: string
      balance?: number | string
      data?: { balance?: number | string; sn?: string }
    }

    const statusStr = String(json.status ?? '').toUpperCase()
    const rc = String(json.rc ?? '')
    const success = statusStr === 'SUCCESS' || statusStr === 'SUKSES' || statusStr === '00' || rc === '00' || json.status === true
    const pending = statusStr === 'PENDING'
    const snRaw = json.sn ?? json.data?.sn ?? null
    const balRaw = json.balance ?? json.data?.balance ?? null

    return {
      success,
      pending,
      message: json.message ?? (success ? 'Berhasil' : 'Gagal'),
      serialNumber: snRaw ? String(snRaw) : null,
      balance: balRaw !== null ? Number(String(balRaw).replace(/[.,\s]/g, '')) || null : null,
      raw: text,
    }
  } catch {
    // Bukan JSON, lanjut ke plain-text parsing
  }

  const upper = text.toUpperCase()
  const isSuccess = /\bSUKSES\b|\bBERHASIL\b|\bSUCCESS\b/.test(upper)
  const isPending = /\bPENDING\b|\bPROSES\b|\bDIPROSES\b/.test(upper)
  const isFailure = /\bGAGAL\b|\bFAILED\b|\bERROR\b|\bSALAH\b|\bINVALID\b/.test(upper)

  // Ekstrak serial number — format OkeConnect: "SN:XXXXX" atau "SN/Ref:XXXXX"
  const snMatch = text.match(/\bSN\s*[:/]\s*([A-Za-z0-9]{6,})/i)

  // Ekstrak saldo — format: "Saldo: Rp 1.234.567" atau "Saldo Anda 1234567"
  const balMatch = text.match(/[Ss]aldo\D{0,20}?([\d]{3,})/i)

  // Pesan bersih: hapus prefix kode seperti "TRX123#082100000000#PULSA10#"
  const cleanMessage = text
    .replace(/^([A-Za-z0-9._-]+#){1,4}/, '')
    .replace(/^R#\.?/, '')
    .trim() || text

  const success = isSuccess || (!isFailure && !isPending && !!balMatch)

  return {
    success,
    pending: isPending,
    message: cleanMessage || (success ? 'Berhasil' : 'Gagal'),
    serialNumber: snMatch?.[1] ?? null,
    balance: balMatch ? Number(balMatch[1].replace(/[.,]/g, '')) : null,
    raw: text,
  }
}

// ─── HTTP caller ──────────────────────────────────────────────────────────────
async function h2hGet(
  creds: OkeConnectCreds,
  path: string,
  extra: Record<string, string> = {}
): Promise<ParsedH2HResponse> {
  const url = new URL(`${creds.baseUrl}${path}`)
  url.searchParams.set('memberID', creds.memberId)
  url.searchParams.set('pin', creds.pin)
  url.searchParams.set('password', creds.password)
  for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v)

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'text/plain, application/json, */*' },
    signal: AbortSignal.timeout(30_000),
  })

  const rawText = await res.text()

  if (!res.ok) {
    // Masih coba parse — OkeConnect kadang kirim error detail di body
    // dengan HTTP 4xx (mis. 401 untuk IP not whitelisted)
    const parsed = parseH2HText(rawText)
    if (parsed.message) throw new Error(parsed.message)
    throw new Error(`OkeConnect HTTP ${res.status}: ${rawText.slice(0, 200)}`)
  }

  return parseH2HText(rawText)
}

// ─── Adapter ──────────────────────────────────────────────────────────────────
export class OkeConnectAdapter implements ProviderAdapter {
  async fulfill(request: FulfillmentRequest): Promise<FulfillmentResult> {
    // refID max ~20 karakter di beberapa implementasi OkeConnect
    const refId = request.orderId.replace(/-/g, '').slice(0, 20)

    try {
      const creds = await loadCreds()
      checkCreds(creds)

      const result = await h2hGet(creds, '/trx', {
        product: request.providerProductCode,
        dest: request.target,
        refID: refId,
      })

      if (result.pending) {
        return {
          success: false,
          providerTransactionId: refId,
          message: 'Sedang diproses oleh provider. Cek status beberapa saat lagi.',
          rawResponse: result,
        }
      }

      return {
        success: result.success,
        providerTransactionId: refId,
        message: result.message,
        serialNumber: result.serialNumber ?? undefined,
        rawResponse: result,
      }
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Unknown provider error' }
    }
  }

  async checkBalance(): Promise<BalanceResult> {
    try {
      const creds = await loadCreds()
      checkCreds(creds)

      const result = await h2hGet(creds, '/trx/balance')

      if (result.success || result.balance !== null) {
        return {
          success: true,
          balance: result.balance ?? 0,
          currency: 'IDR',
        }
      }
      return { success: false, balance: 0, currency: 'IDR', message: result.message }
    } catch (err) {
      return { success: false, balance: 0, currency: 'IDR', message: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  async checkStatus(providerTransactionId: string): Promise<FulfillmentResult> {
    try {
      const creds = await loadCreds()
      checkCreds(creds)

      const result = await h2hGet(creds, '/trx/status', { refID: providerTransactionId })

      return {
        success: result.success,
        providerTransactionId,
        message: result.message,
        serialNumber: result.serialNumber ?? undefined,
        rawResponse: result,
      }
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Unknown error' }
    }
  }
}

export const okeConnectAdapter = new OkeConnectAdapter()
