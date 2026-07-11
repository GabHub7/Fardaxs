'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ProviderForm {
  name: string
  slug: string
  api_url: string
  api_key: string
  merchant_id: string
  secret_key: string
  status: string
  priority: number
  balance: number
  metadata: string
}

const INITIAL: ProviderForm = {
  name: '',
  slug: '',
  api_url: '',
  api_key: '',
  merchant_id: '',
  secret_key: '',
  status: 'ACTIVE',
  priority: 10,
  balance: 0,
  metadata: '{}',
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '')
}

export default function ProviderBaruPage() {
  const router = useRouter()
  const [form, setForm] = useState<ProviderForm>(INITIAL)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(k: keyof ProviderForm, v: string | number) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function handleNameChange(v: string) {
    setForm((f) => ({ ...f, name: v, slug: slugify(v) }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.slug.trim()) {
      setError('Nama dan slug wajib diisi.')
      return
    }

    let metadata: Record<string, unknown> = {}
    try {
      metadata = JSON.parse(form.metadata)
    } catch {
      setError('Metadata harus berupa JSON yang valid.')
      return
    }

    setSaving(true)
    setError('')

    const res = await fetch('/api/admin/providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.trim(),
        slug: form.slug.trim(),
        api_url: form.api_url.trim() || null,
        api_key: form.api_key.trim() || null,
        merchant_id: form.merchant_id.trim() || null,
        secret_key: form.secret_key.trim() || null,
        status: form.status,
        priority: form.priority,
        balance: form.balance,
        metadata,
      }),
    })

    const json = await res.json()
    setSaving(false)

    if (!res.ok) {
      setError(json.message ?? 'Gagal menyimpan provider.')
      return
    }

    router.push('/admin/provider')
    router.refresh()
  }

  return (
    <div className="p-6 max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/provider"
          className="px-3 py-1.5 rounded-[12px] text-xs font-medium"
          style={{
            background: 'hsl(var(--background-muted))',
            color: 'hsl(var(--foreground-muted))',
            border: '1px solid hsl(var(--border))',
          }}
        >
          ← Kembali
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
            Tambah Provider
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
            Konfigurasi provider API baru
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div
            className="rounded-[12px] p-3 text-sm"
            style={{ background: 'hsl(var(--destructive) / 0.1)', color: 'hsl(var(--destructive))' }}
          >
            {error}
          </div>
        )}

        <Card title="Informasi Dasar">
          <Field label="Nama Provider *">
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Contoh: OkeConnect"
              required
              style={inputStyle}
            />
          </Field>
          <Field label="Slug *">
            <input
              type="text"
              value={form.slug}
              onChange={(e) => set('slug', slugify(e.target.value))}
              placeholder="okeconnect"
              required
              style={inputStyle}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Status">
              <select value={form.status} onChange={(e) => set('status', e.target.value)} style={inputStyle}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
              </select>
            </Field>
            <Field label="Prioritas">
              <input
                type="number"
                min={1}
                max={99}
                value={form.priority}
                onChange={(e) => set('priority', parseInt(e.target.value) || 1)}
                style={inputStyle}
              />
            </Field>
          </div>
          <Field label="Saldo Awal (IDR)">
            <input
              type="number"
              min={0}
              value={form.balance}
              onChange={(e) => set('balance', parseFloat(e.target.value) || 0)}
              style={inputStyle}
            />
          </Field>
        </Card>

        <Card title="Konfigurasi API">
          <Field label="API URL">
            <input
              type="url"
              value={form.api_url}
              onChange={(e) => set('api_url', e.target.value)}
              placeholder="https://api.example.com/v1"
              style={inputStyle}
            />
          </Field>
          <Field label="Merchant ID">
            <input
              type="text"
              value={form.merchant_id}
              onChange={(e) => set('merchant_id', e.target.value)}
              placeholder="MERCHANT_ID dari provider"
              style={inputStyle}
            />
          </Field>
          <Field label="Secret Key">
            <input
              type="password"
              value={form.secret_key}
              onChange={(e) => set('secret_key', e.target.value)}
              placeholder="Secret key (disimpan terenkripsi)"
              style={inputStyle}
            />
          </Field>
          <Field label="API Key (Bearer Token)">
            <input
              type="password"
              value={form.api_key}
              onChange={(e) => set('api_key', e.target.value)}
              placeholder="API key jika diperlukan"
              style={inputStyle}
            />
          </Field>
        </Card>

        <Card title="Metadata (JSON)">
          <textarea
            value={form.metadata}
            onChange={(e) => set('metadata', e.target.value)}
            rows={4}
            className="font-mono text-xs w-full"
            style={{ ...inputStyle, resize: 'vertical' }}
          />
          <p className="text-xs mt-1" style={{ color: 'hsl(var(--foreground-muted))' }}>
            Data tambahan dalam format JSON. Contoh: {`{"callback_url": "..."}`}
          </p>
        </Card>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-[12px] text-sm font-semibold"
            style={{
              background: 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground))',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Menyimpan...' : 'Simpan Provider'}
          </button>
          <Link
            href="/admin/provider"
            className="px-5 py-2.5 rounded-[12px] text-sm font-medium"
            style={{
              background: 'hsl(var(--background-muted))',
              color: 'hsl(var(--foreground-muted))',
              border: '1px solid hsl(var(--border))',
            }}
          >
            Batal
          </Link>
        </div>
      </form>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '10px',
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--background-muted))',
  color: 'hsl(var(--foreground))',
  fontSize: '14px',
  outline: 'none',
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-[20px] border p-5 space-y-4"
      style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
    >
      <h2 className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
        {label}
      </label>
      {children}
    </div>
  )
}
