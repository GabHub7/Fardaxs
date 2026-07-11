'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'

interface TestResult {
  success: boolean
  message: string
}

interface ProviderState {
  status: 'idle' | 'loading' | 'ok' | 'error'
  message: string
}

const PROVIDERS = [
  {
    id: 'okeconnect',
    name: 'OkeConnect',
    description: 'Provider topup & PPOB H2H',
    envKeys: ['OKECONNECT_MEMBER_ID', 'OKECONNECT_PIN', 'OKECONNECT_PASSWORD'],
  },
  {
    id: 'casaku',
    name: 'Casaku',
    description: 'Payment gateway (QRIS)',
    envKeys: ['CASAKU_BASE_URL', 'CASAKU_LICENSE_KEY', 'CASAKU_QR_ID'],
  },
]

export function ProviderConnectionTest() {
  const [states, setStates] = useState<Record<string, ProviderState>>({})

  async function testProvider(providerId: string) {
    setStates((prev) => ({ ...prev, [providerId]: { status: 'loading', message: '' } }))

    try {
      const res = await fetch('/api/admin/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId }),
      })
      const data = (await res.json()) as TestResult

      setStates((prev) => ({
        ...prev,
        [providerId]: {
          status: data.success ? 'ok' : 'error',
          message: data.message,
        },
      }))
    } catch {
      setStates((prev) => ({
        ...prev,
        [providerId]: { status: 'error', message: 'Tidak dapat menghubungi server.' },
      }))
    }
  }

  return (
    <div
      className="rounded-[20px] border p-5"
      style={{
        background: 'hsl(var(--background-card))',
        borderColor: 'hsl(var(--border))',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      <div className="mb-4">
        <h2 className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
          Tes Koneksi Pembayaran & Provider
        </h2>
        <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
          Verifikasi status koneksi ke gateway pembayaran dan provider eksternal
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PROVIDERS.map((provider) => {
          const state = states[provider.id] ?? { status: 'idle', message: '' }
          const isLoading = state.status === 'loading'

          return (
            <div
              key={provider.id}
              className="rounded-[16px] border p-4 flex flex-col gap-3"
              style={{
                background: 'hsl(var(--background-muted))',
                borderColor:
                  state.status === 'ok'
                    ? 'hsl(var(--success) / 0.4)'
                    : state.status === 'error'
                    ? 'hsl(var(--destructive) / 0.4)'
                    : 'hsl(var(--border))',
                boxShadow: 'var(--shadow)',
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                    {provider.name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
                    {provider.description}
                  </p>
                </div>

                {state.status === 'ok' && (
                  <CheckCircle2 size={18} style={{ color: 'hsl(var(--success))' }} className="flex-shrink-0 mt-0.5" />
                )}
                {state.status === 'error' && (
                  <XCircle size={18} style={{ color: 'hsl(var(--destructive))' }} className="flex-shrink-0 mt-0.5" />
                )}
              </div>

              {state.message && (
                <p
                  className="text-xs leading-relaxed"
                  style={{
                    color:
                      state.status === 'ok'
                        ? 'hsl(var(--success))'
                        : 'hsl(var(--destructive))',
                  }}
                >
                  {state.message}
                </p>
              )}

              <button
                onClick={() => testProvider(provider.id)}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 text-xs font-semibold px-4 py-2 rounded-[10px] transition-opacity disabled:opacity-60"
                style={{
                  background: 'hsl(var(--primary))',
                  color: '#fff',
                }}
              >
                {isLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : state.status !== 'idle' ? (
                  <RefreshCw size={14} />
                ) : null}
                {isLoading ? 'Menguji...' : state.status !== 'idle' ? 'Uji Ulang' : 'Tes Koneksi'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
