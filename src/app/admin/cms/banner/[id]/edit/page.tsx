'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
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

export default function BannerEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    image_url: '',
    link_url: '',
    link_label: '',
    sort_order: 1,
    status: 'ACTIVE',
    target_blank: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/admin/cms/banners/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          const d = json.data
          setForm({
            title: d.title ?? '',
            subtitle: d.subtitle ?? '',
            image_url: d.image_url ?? '',
            link_url: d.link_url ?? '',
            link_label: d.link_label ?? '',
            sort_order: d.sort_order ?? 1,
            status: d.status ?? 'ACTIVE',
            target_blank: d.target_blank ?? false,
          })
        } else {
          setError('Banner tidak ditemukan.')
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Gagal memuat data.')
        setLoading(false)
      })
  }, [id])

  function set(k: string, v: unknown) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) {
      setError('Judul wajib diisi.')
      return
    }
    setSaving(true)
    setError('')

    const res = await fetch(`/api/admin/cms/banners/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const json = await res.json()
    setSaving(false)

    if (!res.ok) {
      setError(json.message ?? 'Gagal menyimpan.')
      return
    }

    router.push('/admin/cms?tab=banner')
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm('Hapus banner ini? Tindakan tidak dapat dibatalkan.')) return
    setDeleting(true)
    const res = await fetch(`/api/admin/cms/banners/${id}`, { method: 'DELETE' })
    setDeleting(false)
    if (res.ok) {
      router.push('/admin/cms?tab=banner')
      router.refresh()
    } else {
      const json = await res.json()
      setError(json.message ?? 'Gagal menghapus.')
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm" style={{ color: 'hsl(var(--foreground-muted))' }}>Memuat...</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/cms?tab=banner"
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
            Edit Banner
          </h1>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="px-3 py-1.5 rounded-[12px] text-xs font-medium"
          style={{
            background: 'hsl(var(--destructive) / 0.1)',
            color: 'hsl(var(--destructive))',
            border: '1px solid hsl(var(--destructive) / 0.3)',
            opacity: deleting ? 0.7 : 1,
          }}
        >
          {deleting ? 'Menghapus...' : 'Hapus'}
        </button>
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

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
              Judul *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Judul banner"
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
              Subjudul
            </label>
            <input
              type="text"
              value={form.subtitle}
              onChange={(e) => set('subtitle', e.target.value)}
              placeholder="Subjudul opsional"
              style={inputStyle}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
              URL Gambar
            </label>
            <input
              type="url"
              value={form.image_url}
              onChange={(e) => set('image_url', e.target.value)}
              placeholder="https://..."
              style={inputStyle}
            />
            {form.image_url && (
              <div className="mt-2 rounded-[12px] overflow-hidden" style={{ maxHeight: '120px' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.image_url} alt="preview" className="w-full object-cover" style={{ maxHeight: '120px' }} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
                URL Link
              </label>
              <input
                type="text"
                value={form.link_url}
                onChange={(e) => set('link_url', e.target.value)}
                placeholder="/produk/kategori-tertentu"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
                Label Tombol
              </label>
              <input
                type="text"
                value={form.link_label}
                onChange={(e) => set('link_label', e.target.value)}
                placeholder="Belanja Sekarang"
                style={inputStyle}
              />
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

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="target_blank"
              checked={form.target_blank}
              onChange={(e) => set('target_blank', e.target.checked)}
            />
            <label htmlFor="target_blank" className="text-sm" style={{ color: 'hsl(var(--foreground))' }}>
              Buka link di tab baru
            </label>
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
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
          <Link
            href="/admin/cms?tab=banner"
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
