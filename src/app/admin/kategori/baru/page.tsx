'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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

const INITIAL_FORM: CategoryFormData = {
  name: '',
  slug: '',
  description: '',
  icon_url: '',
  banner_url: '',
  color: '#6366f1',
  sort_order: '0',
  status: 'ACTIVE',
}

export default function TambahKategoriPage() {
  const router = useRouter()
  const [form, setForm] = useState<CategoryFormData>(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  useEffect(() => {
    if (!slugManuallyEdited && form.name) {
      setForm((prev) => ({ ...prev, slug: slugify(form.name) }))
    }
  }, [form.name, slugManuallyEdited])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target
    if (name === 'slug') setSlugManuallyEdited(true)
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          description: form.description || undefined,
          icon_url: form.icon_url || undefined,
          banner_url: form.banner_url || undefined,
          color: form.color || undefined,
          sort_order: parseInt(form.sort_order, 10) || 0,
          status: form.status,
        }),
      })

      const data = await res.json() as { success: boolean; message: string }

      if (!res.ok || !data.success) {
        setError(data.message ?? 'Gagal membuat kategori')
        return
      }

      setSuccess('Kategori berhasil dibuat!')
      setTimeout(() => router.push('/admin/kategori'), 1500)
    } catch {
      setError('Terjadi kesalahan jaringan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-5 max-w-2xl">
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
            Tambah Kategori
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
            Buat kategori produk baru
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
      {success && (
        <div
          className="rounded-[14px] p-4 text-sm"
          style={{
            background: 'hsl(var(--success) / 0.1)',
            color: 'hsl(var(--success))',
            border: '1px solid hsl(var(--success) / 0.3)',
          }}
        >
          {success}
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
        <FormSection title="Informasi Kategori">
          <div className="grid grid-cols-1 gap-4">
            <FormField label="Nama Kategori" required>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="Contoh: Pulsa & Data"
                className={inputClass}
                style={inputStyle}
              />
            </FormField>

            <FormField label="Slug (URL)" required>
              <input
                name="slug"
                value={form.slug}
                onChange={handleChange}
                required
                placeholder="pulsa-data"
                className={inputClass}
                style={inputStyle}
              />
              <p className="text-xs mt-1" style={{ color: 'hsl(var(--foreground-muted))' }}>
                URL: /kategori/{form.slug || 'slug-kategori'}
              </p>
            </FormField>

            <FormField label="Deskripsi">
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                placeholder="Deskripsi singkat kategori..."
                className={inputClass}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </FormField>

            <FormField label="Ikon / Cover Kategori">
              <ImageUploadField
                value={form.icon_url}
                onChange={(url) => setForm((prev) => ({ ...prev, icon_url: url }))}
              />
              <p className="text-xs mt-1" style={{ color: 'hsl(var(--foreground-muted))' }}>
                Gambar ini tampil sebagai cover kategori di beranda. Kosongkan untuk pakai ikon default.
              </p>
            </FormField>

            <FormField label="Banner Kategori (opsional)">
              <ImageUploadField
                value={form.banner_url}
                onChange={(url) => setForm((prev) => ({ ...prev, banner_url: url }))}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Warna Aksen">
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
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
              </FormField>

              <FormField label="Urutan Tampil">
                <input
                  name="sort_order"
                  value={form.sort_order}
                  onChange={handleChange}
                  type="number"
                  min="0"
                  placeholder="0"
                  className={inputClass}
                  style={inputStyle}
                />
              </FormField>
            </div>

            <FormField label="Status" required>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                required
                className={inputClass}
                style={inputStyle}
              >
                <option value="ACTIVE">Aktif</option>
                <option value="INACTIVE">Tidak Aktif</option>
              </select>
            </FormField>
          </div>
        </FormSection>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-[12px] text-sm font-semibold"
            style={{
              background: loading ? 'hsl(var(--primary) / 0.5)' : 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground, 0 0% 100%))',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Menyimpan...' : 'Simpan Kategori'}
          </button>
          <Link
            href="/admin/kategori"
            className="px-6 py-2.5 rounded-[12px] text-sm font-medium"
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

const inputClass = 'w-full px-3 py-2.5 text-sm rounded-[12px] border outline-none transition-colors'
const inputStyle: React.CSSProperties = {
  background: 'hsl(var(--background-muted))',
  borderColor: 'hsl(var(--border))',
  color: 'hsl(var(--foreground))',
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-[20px] border p-5"
      style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
    >
      <h2 className="text-sm font-semibold mb-4" style={{ color: 'hsl(var(--foreground))' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

function FormField({
  label,
  required = false,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
        {label}
        {required && <span style={{ color: 'hsl(var(--destructive))' }}> *</span>}
      </label>
      {children}
    </div>
  )
}
