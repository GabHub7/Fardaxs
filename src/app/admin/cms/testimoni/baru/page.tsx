'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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

export default function TestimoniBaruPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    customer_name: '',
    avatar_url: '',
    message: '',
    rating: 5,
    product_name: '',
    sort_order: 1,
    status: 'ACTIVE',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(k: string, v: unknown) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.customer_name.trim() || !form.message.trim()) {
      setError('Nama pelanggan dan pesan wajib diisi.')
      return
    }

    setSaving(true)
    setError('')

    const res = await fetch('/api/admin/cms/testimonials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const json = await res.json()
    setSaving(false)

    if (!res.ok) {
      setError(json.message ?? 'Gagal menyimpan testimoni.')
      return
    }

    router.push('/admin/cms?tab=testimoni')
    router.refresh()
  }

  return (
    <div className="p-6 max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/cms?tab=testimoni"
          className="px-3 py-1.5 rounded-[12px] text-xs font-medium"
          style={{
            background: 'hsl(var(--background-muted))',
            color: 'hsl(var(--foreground-muted))',
            border: '1px solid hsl(var(--border))',
          }}
        >
          ← Kembali
        </Link>
        <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
          Tambah Testimoni
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div
          className="rounded-[20px] border p-5 space-y-4"
          style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
        >
          {error && (
            <div
              className="rounded-[12px] p-3 text-sm"
              style={{ background: 'hsl(var(--destructive) / 0.1)', color: 'hsl(var(--destructive))' }}
            >
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
                Nama Pelanggan *
              </label>
              <input
                type="text"
                value={form.customer_name}
                onChange={(e) => set('customer_name', e.target.value)}
                placeholder="Budi Santoso"
                required
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
                Produk yang Diulas
              </label>
              <input
                type="text"
                value={form.product_name}
                onChange={(e) => set('product_name', e.target.value)}
                placeholder="Diamond Mobile Legends"
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
              URL Avatar
            </label>
            <input
              type="url"
              value={form.avatar_url}
              onChange={(e) => set('avatar_url', e.target.value)}
              placeholder="https://..."
              style={inputStyle}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
              Pesan *
            </label>
            <textarea
              value={form.message}
              onChange={(e) => set('message', e.target.value)}
              placeholder="Cerita pengalaman pelanggan..."
              required
              rows={4}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'hsl(var(--foreground-muted))' }}>
              Rating: {form.rating} bintang
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => set('rating', star)}
                  className="text-2xl leading-none"
                  style={{ color: star <= form.rating ? 'hsl(var(--warning))' : 'hsl(var(--border))' }}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
                Urutan
              </label>
              <input
                type="number"
                min={1}
                value={form.sort_order}
                onChange={(e) => set('sort_order', parseInt(e.target.value) || 1)}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
                Status
              </label>
              <select value={form.status} onChange={(e) => set('status', e.target.value)} style={inputStyle}>
                <option value="ACTIVE">Aktif</option>
                <option value="INACTIVE">Nonaktif</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
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
            {saving ? 'Menyimpan...' : 'Simpan Testimoni'}
          </button>
          <Link
            href="/admin/cms?tab=testimoni"
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
