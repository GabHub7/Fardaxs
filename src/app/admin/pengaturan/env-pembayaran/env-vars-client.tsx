'use client'

import { useState } from 'react'
import {
  Eye,
  EyeOff,
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Cloud,
  CloudOff,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'

// ============================================================
// Types — mirrors AdminEnvVarView from lib/env-vars.ts
// ============================================================

interface EnvVarItem {
  key: string
  providerGroup: string
  description: string | null
  isSecret: boolean
  hasValue: boolean
  maskedValue: string | null
  plainValue: string | null
  vercelSyncedAt: string | null
  vercelSyncError: string | null
  updatedAt: string
}

interface SaveResult {
  saved: true
  vercelSynced: boolean
  vercelError?: string
}

interface TestResult {
  status: 'idle' | 'loading' | 'ok' | 'error'
  message: string
}

const PROVIDER_META: Record<string, { label: string; description: string; testId?: string }> = {
  CASAKU: {
    label: 'Casaku.id',
    description: 'Payment gateway untuk QRIS, Virtual Account, dan e-wallet.',
    testId: 'casaku',
  },
  OKECONNECT: {
    label: 'OkeConnect',
    description: 'Provider PPOB H2H untuk pulsa, token listrik, dan produk digital lainnya.',
    testId: 'okeconnect',
  },
}

const KEY_LABELS: Record<string, string> = {
  CASAKU_API_URL: 'API URL',
  CASAKU_MERCHANT_ID: 'Merchant ID',
  CASAKU_SECRET_KEY: 'Secret Key',
  CASAKU_WEBHOOK_SECRET: 'Webhook Secret',
  OKECONNECT_API_URL: 'API URL',
  OKECONNECT_MEMBER_ID: 'Member ID',
  OKECONNECT_PIN: 'PIN',
  OKECONNECT_PASSWORD: 'Password',
}

export function EnvVarsClient({
  initialItems,
  vercelConfigured,
}: {
  initialItems: EnvVarItem[]
  vercelConfigured: boolean
}) {
  const [items, setItems] = useState<EnvVarItem[]>(initialItems)
  // Draft values the admin is currently typing — keyed by env var key.
  // Starts empty: we never pre-fill a secret input with its real value,
  // only show the masked preview as a placeholder/label.
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const [savingGroup, setSavingGroup] = useState<string | null>(null)
  const [savedGroup, setSavedGroup] = useState<string | null>(null)
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({})
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({})

  const groups = Array.from(new Set(items.map((i) => i.providerGroup)))

  function handleChange(key: string, value: string) {
    setDrafts((prev) => ({ ...prev, [key]: value }))
    setSavedGroup(null)
  }

  async function handleSaveGroup(group: string) {
    const groupItems = items.filter((i) => i.providerGroup === group)
    const payload: Record<string, string> = {}

    for (const item of groupItems) {
      const draft = drafts[item.key]
      // Only include keys the admin actually touched this session — this
      // avoids accidentally overwriting an existing value with an empty
      // string just because the field was rendered but left untouched.
      if (draft !== undefined) {
        payload[item.key] = draft
      }
    }

    if (Object.keys(payload).length === 0) {
      return
    }

    setSavingGroup(group)
    setSaveErrors({})

    try {
      const res = await fetch('/api/admin/env-vars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = (await res.json()) as { success: boolean; message?: string; results?: Record<string, SaveResult> }

      if (!json.success) {
        setSaveErrors({ [group]: json.message ?? 'Gagal menyimpan env var.' })
        return
      }

      // Update local item state to reflect the new masked values without
      // needing a full page refetch.
      setItems((prev) =>
        prev.map((item) => {
          const draft = drafts[item.key]
          if (draft === undefined) return item
          const newSyncResult = json.results?.[item.key]
          return {
            ...item,
            hasValue: !!draft,
            maskedValue: draft ? maskClientSide(draft) : null,
            plainValue: !item.isSecret ? draft : item.plainValue,
            vercelSyncedAt: newSyncResult?.vercelSynced ? new Date().toISOString() : item.vercelSyncedAt,
            vercelSyncError: newSyncResult?.vercelError ?? null,
          }
        })
      )

      // Clear drafts + reveal state for this group so secrets don't linger
      // in the input fields after a successful save.
      setDrafts((prev) => {
        const next = { ...prev }
        for (const item of groupItems) delete next[item.key]
        return next
      })
      setRevealed((prev) => {
        const next = { ...prev }
        for (const item of groupItems) delete next[item.key]
        return next
      })

      setSavedGroup(group)
      setTimeout(() => setSavedGroup((g) => (g === group ? null : g)), 3000)
    } catch {
      setSaveErrors({ [group]: 'Tidak dapat menghubungi server.' })
    } finally {
      setSavingGroup(null)
    }
  }

  async function handleTest(testId: string) {
    setTestResults((prev) => ({ ...prev, [testId]: { status: 'loading', message: '' } }))
    try {
      const res = await fetch('/api/admin/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: testId }),
      })
      const json = (await res.json()) as { success: boolean; message: string }
      setTestResults((prev) => ({
        ...prev,
        [testId]: { status: json.success ? 'ok' : 'error', message: json.message },
      }))
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [testId]: { status: 'error', message: 'Tidak dapat menghubungi server.' },
      }))
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
          Env Pembayaran
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
          Kelola kredensial Casaku.id dan OkeConnect. Tersimpan terenkripsi di database dan disinkronkan ke environment variable Vercel.
        </p>
      </div>

      {!vercelConfigured && (
        <div
          className="rounded-[16px] border p-4 flex items-start gap-3"
          style={{ background: 'hsl(var(--warning) / 0.08)', borderColor: 'hsl(var(--warning) / 0.3)' }}
        >
          <AlertTriangle size={18} style={{ color: 'hsl(var(--warning))' }} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'hsl(var(--warning))' }}>
              Sinkronisasi ke Vercel belum aktif
            </p>
            <p className="text-xs mt-1" style={{ color: 'hsl(var(--foreground-muted))' }}>
              Perubahan tetap tersimpan dan langsung aktif di aplikasi (dibaca dari database), tapi tidak otomatis muncul di Project Settings → Environment Variables di dashboard Vercel.
              Untuk mengaktifkan, set <code className="font-mono px-1 rounded bg-black/10">VERCEL_API_TOKEN</code> dan <code className="font-mono px-1 rounded bg-black/10">VERCEL_PROJECT_ID</code> sebagai env var di project ini (lihat README atau tooltip di bawah), lalu redeploy sekali.
            </p>
          </div>
        </div>
      )}

      {groups.map((group) => {
        const meta = PROVIDER_META[group] ?? { label: group, description: '' }
        const groupItems = items.filter((i) => i.providerGroup === group)
        const isSaving = savingGroup === group
        const isSaved = savedGroup === group
        const error = saveErrors[group]
        const test = meta.testId ? testResults[meta.testId] : undefined

        return (
          <div
            key={group}
            className="rounded-[20px] border p-5 space-y-4"
            style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'hsl(var(--foreground))' }}>
                  {meta.label}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
                  {meta.description}
                </p>
              </div>
              {meta.testId && (
                <button
                  onClick={() => handleTest(meta.testId!)}
                  disabled={test?.status === 'loading'}
                  className="flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-[12px] flex-shrink-0 disabled:opacity-60"
                  style={{
                    background: 'hsl(var(--background-muted))',
                    color: 'hsl(var(--foreground))',
                    border: '1px solid hsl(var(--border))',
                  }}
                >
                  {test?.status === 'loading' ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <RefreshCw size={13} />
                  )}
                  Tes Koneksi
                </button>
              )}
            </div>

            {test && test.status !== 'idle' && test.message && (
              <div
                className="rounded-[12px] p-3 flex items-start gap-2 text-xs"
                style={{
                  background: test.status === 'ok' ? 'hsl(var(--success) / 0.1)' : 'hsl(var(--destructive) / 0.1)',
                  color: test.status === 'ok' ? 'hsl(var(--success))' : 'hsl(var(--destructive))',
                }}
              >
                {test.status === 'ok' ? (
                  <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle size={14} className="flex-shrink-0 mt-0.5" />
                )}
                <span>{test.message}</span>
              </div>
            )}

            <div className="space-y-3">
              {groupItems.map((item) => {
                const draft = drafts[item.key]
                const isRevealed = revealed[item.key]
                const label = KEY_LABELS[item.key] ?? item.key

                return (
                  <div key={item.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium" style={{ color: 'hsl(var(--foreground-muted))' }}>
                        {label}
                        <span className="ml-2 font-mono text-[10px] opacity-60">{item.key}</span>
                      </label>
                      <SyncBadge item={item} vercelConfigured={vercelConfigured} />
                    </div>

                    <div className="relative">
                      <input
                        type={item.isSecret && !isRevealed ? 'password' : 'text'}
                        value={draft ?? (item.isSecret ? '' : item.plainValue ?? '')}
                        onChange={(e) => handleChange(item.key, e.target.value)}
                        placeholder={
                          item.hasValue
                            ? item.isSecret
                              ? `Tersimpan: ${item.maskedValue} — ketik untuk mengganti`
                              : item.plainValue ?? ''
                            : `Belum dikonfigurasi — masukkan ${label.toLowerCase()}`
                        }
                        className="w-full min-h-[44px] px-3.5 py-2.5 pr-11 text-sm rounded-[14px] border outline-none transition-all"
                        style={{
                          background: 'hsl(var(--background-muted))',
                          borderColor: 'hsl(var(--border))',
                          color: 'hsl(var(--foreground))',
                        }}
                      />
                      {item.isSecret && (
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setRevealed((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                          style={{ color: 'hsl(var(--foreground-muted))' }}
                          aria-label={isRevealed ? 'Sembunyikan' : 'Tampilkan'}
                        >
                          {isRevealed ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-[11px] mt-1" style={{ color: 'hsl(var(--foreground-muted))' }}>
                        {item.description}
                      </p>
                    )}
                    {item.vercelSyncError && vercelConfigured && (
                      <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: 'hsl(var(--destructive))' }}>
                        <AlertTriangle size={11} /> Gagal sync ke Vercel: {item.vercelSyncError}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            {error && (
              <p className="text-xs" style={{ color: 'hsl(var(--destructive))' }}>
                {error}
              </p>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => handleSaveGroup(group)}
                disabled={isSaving}
                className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-[12px] disabled:opacity-60"
                style={{ background: 'hsl(var(--primary))', color: '#fff' }}
              >
                {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {isSaving ? 'Menyimpan...' : `Simpan ${meta.label}`}
              </button>
              {isSaved && (
                <span className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'hsl(var(--success))' }}>
                  <CheckCircle2 size={14} /> Tersimpan
                </span>
              )}
            </div>
          </div>
        )
      })}

      <div
        className="rounded-[16px] border p-4 flex items-start gap-3"
        style={{ background: 'hsl(var(--background-muted))', borderColor: 'hsl(var(--border))' }}
      >
        <ShieldCheck size={16} style={{ color: 'hsl(var(--foreground-muted))' }} className="flex-shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed" style={{ color: 'hsl(var(--foreground-muted))' }}>
          Semua nilai di atas dienkripsi (AES-256-GCM) sebelum disimpan dan tidak pernah ditampilkan penuh setelah disimpan — hanya 4 karakter terakhir yang terlihat. Setiap perubahan tercatat di Audit Log.
        </p>
      </div>
    </div>
  )
}

function SyncBadge({ item, vercelConfigured }: { item: EnvVarItem; vercelConfigured: boolean }) {
  if (!item.hasValue) {
    return (
      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'hsl(var(--destructive) / 0.12)', color: 'hsl(var(--destructive))' }}>
        Belum diisi
      </span>
    )
  }
  if (!vercelConfigured) {
    return (
      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: 'hsl(var(--background))', color: 'hsl(var(--foreground-muted))' }}>
        <CloudOff size={10} /> Database saja
      </span>
    )
  }
  if (item.vercelSyncError) {
    return (
      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: 'hsl(var(--destructive) / 0.12)', color: 'hsl(var(--destructive))' }}>
        <CloudOff size={10} /> Sync gagal
      </span>
    )
  }
  if (item.vercelSyncedAt) {
    return (
      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: 'hsl(var(--success) / 0.12)', color: 'hsl(var(--success))' }}>
        <Cloud size={10} /> Tersinkron
      </span>
    )
  }
  return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'hsl(var(--background))', color: 'hsl(var(--foreground-muted))' }}>
      Database saja
    </span>
  )
}

function maskClientSide(value: string): string {
  if (value.length <= 4) return '••••'
  return `••••${value.slice(-4)}`
}
