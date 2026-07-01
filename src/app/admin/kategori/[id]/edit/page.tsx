'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { slugify } from '@/lib/utils'
import { ImageUploadField } from '@/components/admin/image-upload-field'

interface CategoryFormData {
  name: string
  slug: string
  description: string
  icon_url: string
  banner_url: string
  color: string
  sort_order: string
  status: 'ACTIVE' | 'INACTIVE'
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

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
        {label}{required && ' *'}
      </label>
      {children}
    </div>
  )
}

export default function EditKategoriPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [form, setForm] = useState<CategoryFormData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/admin/categories/${id}`)
      if (!res.ok) {
        setNotFound(true)
        setLoading(false)
        return
      }
      const json = await res.json()
      const c = json.data
      setForm({
        name: c.name ?? '',
        slug: c.slug ?? '',
        description: c.description ?? '',
        icon_url: c.icon_url ?? '',
        banner_url: c.banner_url ?? '',
        color: c.color ?? '#6366f1',
        sort_order: String(c.sort_order ?? 0),
        status: c.status ?? 'ACTIVE',
      })
      setLoading(false)
    }
    load()
  }, [id])

  useEffect(() => {
    if (!slugManuallyEdited && form?.name) {
      setForm((prev) => prev ? { ...prev, slug: slugify(prev.name) } : prev)
    }
  }, [form?.name, slugManuallyEdited])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target
    if (name === 'slug') setSlugManuallyEdited(true)
    setForm((prev) => prev ? { ...prev, [name]: value } : prev)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    setSaving(true)
    setError(null)

    const res = await fetch(`/api/admin/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        slug: form.slug,
        description: form.description || null,
        icon_url: form.icon_url || null,
        banner_url: form.banner_url || null,
        color: form.color || null,
        sort_order: parseInt(form.sort_order, 10) || 0,
        status: form.status,
      }),
    })

    const json = await res.json()
    setSaving(false)

    if (!res.ok) {
      setError(json.message ?? 'Gagal menyimpan perubahan.')
      return
    }

    router.push('/admin/kategori')
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm('Yakin ingin menghapus kategori ini? Aksi ini tidak dapat dibatalkan.')) return

    const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
    const json = await res.json()

    if (!res.ok) {
      setError(json.message ?? 'Gagal menghapus kategori.')
      return
    }

    router.push('/admin/kategori')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-48">
        <p className="text-sm" style={{ color: 'hsl(var(--foreground-muted))' }}>Memuat...</p>
      </div>
    )
  }

  if (notFound || !form) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm mb-4" style={{ color: 'hsl(var(--destructive))' }}>Kategori tidak ditemukan.</p>
        <Link href="/admin/kategori" className="text-sm underline" style={{ color: 'hsl(var(--primary))' }}>
          Kembali ke daftar
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/kategori"
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
            Edit Kategori
          </h1>
          <p className="text-sm mt-0.5 font-mono" style={{ color: 'hsl(var(--foreground-muted))' }}>
            {form.slug}
          </p>
        </div>
      </div>

      {error && (
        <div
          className="rounded-[14px] p-4 text-sm"
          style={{
            background: 'hsl(var(--destructive) / 0.1)',
            color: 'hsl(var(--destructive))',
            border: '1px solid hsl(var(--destructive) / 0.3)',
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)}>
        <div
          className="rounded-[20px] border p-5 space-y-4"
          style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
        >
          <Field label="Nama Kategori" required>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              style={inputStyle}
            />
          </Field>

          <Field label="Slug (URL)" required>
            <input
              name="slug"
              value={form.slug}
              onChange={handleChange}
              required
              style={inputStyle}
            />
            <p className="text-xs mt-1" style={{ color: 'hsl(var(--foreground-muted))' }}>
              URL: /kategori/{form.slug || 'slug-kategori'}
            </p>
          </Field>

          <Field label="Deskripsi">
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </Field>

          <Field label="Ikon / Cover Kategori">
            <ImageUploadField
              value={form.icon_url}
              onChange={(url) => setForm((prev) => (prev ? { ...prev, icon_url: url } : prev))}
            />
            <p className="text-xs mt-1" style={{ color: 'hsl(var(--foreground-muted))' }}>
              Tampil sebagai cover kategori di beranda. Kosongkan untuk pakai ikon default.
            </p>
          </Field>

          <Field label="Banner Kategori (opsional)">
            <ImageUploadField
              value={form.banner_url}
              onChange={(url) => setForm((prev) => (prev ? { ...prev, banner_url: url } : prev))}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Warna Aksen">
              <div className="flex items-center gap-3">
                <input
                  name="color"
                  value={form.color}
                  onChange={handleChange}
                  type="color"
                  className="w-10 h-10 rounded-[10px] border cursor-pointer p-1"
                  style={{ borderColor: 'hsl(var(--border))' }}
                />
                <input
                  name="color"
                  value={form.color}
                  onChange={handleChange}
                  placeholder="#6366f1"
                  style={inputStyle}
                />
              </div>
            </Field>

            <Field label="Urutan Tampil">
              <input
                name="sort_order"
                value={form.sort_order}
                onChange={handleChange}
                type="number"
                min="0"
                style={inputStyle}
              />
            </Field>
          </div>

          <Field label="Status" required>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              required
              style={inputStyle}
            >
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Tidak Aktif</option>
            </select>
          </Field>
        </div>

        <div className="flex items-center justify-between mt-4">
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
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
            <Link
              href="/admin/kategori"
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

          <button
            type="button"
            onClick={() => void handleDelete()}
            className="px-4 py-2.5 rounded-[12px] text-sm font-medium"
            style={{
              background: 'hsl(var(--destructive) / 0.1)',
              color: 'hsl(var(--destructive))',
              border: '1px solid hsl(var(--destructive) / 0.3)',
            }}
          >
            Hapus Kategori
          </button>
        </div>
      </form>
    </div>
  )
}
