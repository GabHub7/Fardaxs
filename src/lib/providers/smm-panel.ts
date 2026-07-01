import type { ProviderAdapter, FulfillmentRequest, FulfillmentResult, BalanceResult } from './adapter'

/**
 * Adapter for the de-facto-standard SMM Panel API (Perfect Panel / SMM API v2)
 * used by most "panel SMM" resellers for social-media services (followers,
 * likes, views, subscribers).
 *
 * Single endpoint, POST form-urlencoded, authenticated by an API `key`:
 *   - action=add      → { service, link, quantity }            → { order }
 *   - action=status   → { order }   → { charge, start_count, status, remains }
 *   - action=balance  →             → { balance, currency }
 *
 * Configure via env: `SMM_PANEL_API_URL` + `SMM_PANEL_API_KEY`. When unset the
 * adapter fails gracefully (throws a clear message that callers catch), so the
 * app still builds and runs without an SMM panel configured.
 */

const API_URL = process.env.SMM_PANEL_API_URL ?? ''
const API_KEY = process.env.SMM_PANEL_API_KEY ?? ''

interface SmmResponse {
  order?: number | string
  balance?: string | number
  currency?: string
  status?: string
  charge?: string | number
  start_count?: string | number
  remains?: string | number
  error?: string
  [key: string]: unknown
}

async function callApi(params: Record<string, string>): Promise<SmmResponse> {
  if (!API_URL || !API_KEY) {
    throw new Error('SMM Panel belum dikonfigurasi (SMM_PANEL_API_URL / SMM_PANEL_API_KEY)')
  }

  const body = new URLSearchParams({ key: API_KEY, ...params })

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) {
    throw new Error(`SMM Panel API error: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<SmmResponse>
}

export class SmmPanelAdapter implements ProviderAdapter {
  async fulfill(request: FulfillmentRequest): Promise<FulfillmentResult> {
    const rawQty = request.quantity ?? (request.customerInput?.quantity as number | string | undefined)
    const quantity = Math.trunc(Number(rawQty))
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { success: false, message: 'Jumlah (quantity) layanan tidak valid' }
    }

    try {
      const result = await callApi({
        action: 'add',
        service: request.providerProductCode,
        link: request.target,
        quantity: String(quantity),
      })

      if (result.order) {
        // SMM panels process orders asynchronously — placing the order succeeds
        // but delivery happens over time. Report as pending so the order stays
        // PROCESSING and the status cron finalises it via checkStatus().
        return {
          success: false,
          providerTransactionId: String(result.order),
          message: 'Pesanan SMM sedang diproses',
          rawResponse: result,
        }
      }

      return {
        success: false,
        message: result.error ?? 'Gagal membuat order di SMM panel',
        rawResponse: result,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown SMM error'
      return { success: false, message }
    }
  }

  async checkBalance(): Promise<BalanceResult> {
    try {
      const result = await callApi({ action: 'balance' })
      if (result.balance !== undefined) {
        return {
          success: true,
          balance: Number(result.balance) || 0,
          currency: (result.currency as string) ?? 'IDR',
        }
      }
      return { success: false, balance: 0, currency: 'IDR', message: result.error ?? 'Gagal cek saldo SMM' }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return { success: false, balance: 0, currency: 'IDR', message }
    }
  }

  async checkStatus(providerTransactionId: string): Promise<FulfillmentResult> {
    try {
      const result = await callApi({ action: 'status', order: providerTransactionId })
      const status = String(result.status ?? '').toLowerCase()
      const isSuccess = status === 'completed'
      const isPending = ['pending', 'in progress', 'processing', 'queue', 'partial'].includes(status)

      return {
        success: isSuccess,
        providerTransactionId,
        message: isSuccess
          ? 'Selesai'
          : isPending
            ? 'Sedang diproses'
            : (result.status as string) ?? result.error ?? 'Status tidak diketahui',
        rawResponse: result,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return { success: false, providerTransactionId, message }
    }
  }
}

export const smmPanelAdapter = new SmmPanelAdapter()
