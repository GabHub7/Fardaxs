'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { slugify } from '@/lib/utils'
import { ImageUploadField } from '@/components/admin/image-upload-field'
import { VariantManager } from '@/components/admin/variant-manager'

interface CategoryOption {
  id: string
  name: string
}

interface ProviderOption {
  id: string
  name: string
}

type FulfillmentType = 'AUTO_PPOB' | 'SMM' | 'INVENTORY' | 'MANUAL'
type TargetType = 'PHONE' | 'USERNAME' | 'GAME_ID' | 'EMAIL' | 'URL' | 'CUSTOM'
type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK' | 'MAINTENANCE' | 'ARCHIVED'

interface ProductFormData {
  name: string
  slug: string
  short_description: string
  description: string
  image_url: string
  selling_price: string
  reseller_price: string
  base_cost: string
  category_id: string
  provider_id: string
  provider_product_code: string
  fulfillment_type: FulfillmentType
  target_type: TargetType
  target_label: string
  target_placeholder: string
  target_validation: string
  is_featured: boolean
  sort_order: string
  status: ProductStatus
}

export default function EditProdukPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const productId = params.id

  const [form, setForm] = useState<ProductFormData | null>(null)
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [providers, setProviders] = useState<ProviderOption[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [productRes, catRes, provRes] = await Promise.all([
          fetch(`/api/admin/products/${productId}`),
          fetch('/api/admin/products/options?type=categories'),
          fetch('/api/admin/products/options?type=providers'),
        ])

        if (catRes.ok) {
          const d = await catRes.json() as { data: CategoryOption[] }
          setCategories(d.data ?? [])
        }
        if (provRes.ok) {
          const d = await provRes.json() as { data: ProviderOption[] }
          setProviders(d.data ?? [])
        }

        if (!productRes.ok) {
          setError('Produk tidak ditemukan.')
          return
        }

        const productData = await productRes.json() as { success: boolean; data: Record<string, unknown> }
        if (!productData.success) {
          setError('Produk tidak ditemukan.')
          return
        }

        const p = productData.data
        setForm({
          name: (p.name as string) ?? '',
          slug: (p.slug as string) ?? '',
          short_description: (p.short_description as string) ?? '',
          description: (p.description as string) ?? '',
          image_url: (p.image_url as string) ?? '',
          selling_price: String(p.selling_price ?? '0'),
          reseller_price: String(p.reseller_price ?? '0'),
          base_cost: String(p.base_cost ?? '0'),
          category_id: (p.category_id as string) ?? '',
          provider_id: (p.provider_id as string) ?? '',
          provider_product_code: (p.provider_product_code as string) ?? '',
          fulfillment_type: ((p.fulfillment_type as FulfillmentType) ?? 'AUTO_PPOB'),
          target_type: ((p.target_type as TargetType) ?? 'PHONE'),
          target_label: (p.target_label as string) ?? '',
          target_placeholder: (p.target_placeholder as string) ?? '',
          target_validation: (p.target_validation as string) ?? '',
          is_featured: Boolean(p.is_featured),
          sort_order: String(p.sort_order ?? '0'),
          status: ((p.status as ProductStatus) ?? 'ACTIVE'),
        })
      } catch {
        setError('Gagal memuat data produk.')
      } finally {
        setFetching(false)
      }
    }
    void load()
  }, [productId])

  useEffect(() => {
    if (!slugManuallyEdited && form?.name) {
      setForm((prev) => prev ? { ...prev, slug: slugify(form.name) } : prev)
    }
  }, [form?.name, slugManuallyEdited])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value, type } = e.target
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined
    setForm((prev) => prev ? { ...prev, [name]: type === 'checkbox' ? checked : value } : prev)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          short_description: form.short_description || undefined,
          description: form.description || undefined,
          image_url: form.image_url || undefined,
          selling_price: parseFloat(form.selling_price),
          reseller_price: parseFloat(form.reseller_price),
          base_cost: form.base_cost ? parseFloat(form.base_cost) : 0,
          category_id: form.category_id,
          provider_id: form.provider_id || undefined,
          provider_product_code: form.provider_product_code || undefined,
          fulfillment_type: form.fulfillment_type,
          target_type: form.target_type,
          target_label: form.target_label,
          target_placeholder: form.target_placeholder,
          target_validation: form.target_validation || undefined,
          is_featured: form.is_featured,
          sort_order: parseInt(form.sort_order, 10) || 0,
          status: form.status,
        }),
      })

      const data = await res.json() as { success: boolean; message: string }

      if (!res.ok || !data.success) {
        setError(data.message ?? 'Gagal menyimpan perubahan')
        return
      }

      setSuccess('Produk berhasil diperbarui!')
      setTimeout(() => router.push('/admin/produk'), 1500)
    } catch {
      setError('Terjadi kesalahan jaringan.')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="p-6 flex items-center justify-center h-48">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'hsl(var(--primary))', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!form) {
    return (
      <div className="p-6">
        <div
          className="rounded-[14px] p-4 text-sm"
          style={{ background: 'hsl(var(--destructive) / 0.1)', color: 'hsl(var(--destructive))' }}
        >
          {error ?? 'Produk tidak ditemukan.'}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/produk"
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
            Edit Produk
          </h1>
          <p className="text-sm mt-0.5 font-mono" style={{ color: 'hsl(var(--foreground-muted))' }}>
            ID: {productId.slice(0, 8)}…
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
        <FormSection title="Informasi Dasar">
          <div className="grid grid-cols-1 gap-4">
            <FormField label="Nama Produk" required>
              <input name="name" value={form.name} onChange={handleChange} required className={inputClass} style={inputStyle} />
            </FormField>
            <FormField label="Slug (URL)" required>
              <input name="slug" value={form.slug} onChange={handleChange} required className={inputClass} style={inputStyle} />
              <p className="text-xs mt-1" style={{ color: 'hsl(var(--foreground-muted))' }}>
                URL: /produk/{form.slug}
              </p>
            </FormField>
            <FormField label="Deskripsi Singkat">
              <input name="short_description" value={form.short_description} onChange={handleChange} maxLength={160} className={inputClass} style={inputStyle} />
            </FormField>
            <FormField label="Deskripsi">
              <textarea name="description" value={form.description} onChange={handleChange} rows={4} className={inputClass} style={{ ...inputStyle, resize: 'vertical' }} />
            </FormField>
            <FormField label="Gambar Produk">
              <ImageUploadField
                value={form.image_url}
                onChange={(url) => setForm((prev) => prev ? { ...prev, image_url: url } : prev)}
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Harga & Diskon">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Harga Jual" required>
              <input name="selling_price" value={form.selling_price} onChange={handleChange} required type="number" min="0" className={inputClass} style={inputStyle} />
            </FormField>
            <FormField label="Harga Normal (Coret)">
              <input name="base_cost" value={form.base_cost} onChange={handleChange} type="number" min="0" placeholder="Kosongkan jika tanpa diskon" className={inputClass} style={inputStyle} />
            </FormField>
            <FormField label="Harga Reseller" required>
              <input name="reseller_price" value={form.reseller_price} onChange={handleChange} required type="number" min="0" className={inputClass} style={inputStyle} />
            </FormField>
            <div className="flex items-end">
              <DiscountPreview base={form.base_cost} sell={form.selling_price} />
            </div>
          </div>
        </FormSection>

        <FormSection title="Klasifikasi">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Kategori" required>
              <select name="category_id" value={form.category_id} onChange={handleChange} required className={inputClass} style={inputStyle}>
                <option value="">Pilih Kategori</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </FormField>
            <FormField label="Provider">
              <select name="provider_id" value={form.provider_id} onChange={handleChange} className={inputClass} style={inputStyle}>
                <option value="">Tanpa Provider</option>
                {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </FormField>
            <FormField label="Kode Produk Provider">
              <input name="provider_product_code" value={form.provider_product_code} onChange={handleChange} className={inputClass} style={inputStyle} />
            </FormField>
            <FormField label="Tipe Fulfillment" required>
              <select name="fulfillment_type" value={form.fulfillment_type} onChange={handleChange} required className={inputClass} style={inputStyle}>
                <option value="AUTO_PPOB">AUTO PPOB</option>
                <option value="SMM">SMM Panel (Sosial Media)</option>
                <option value="INVENTORY">Inventory</option>
                <option value="MANUAL">Manual</option>
              </select>
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Konfigurasi Target">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Tipe Target" required>
              <select name="target_type" value={form.target_type} onChange={handleChange} required className={inputClass} style={inputStyle}>
                <option value="PHONE">Nomor HP</option>
                <option value="USERNAME">Username</option>
                <option value="GAME_ID">Game ID</option>
                <option value="EMAIL">Email</option>
                <option value="URL">URL / Link (SMM)</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </FormField>
            <FormField label="Label Target" required>
              <input name="target_label" value={form.target_label} onChange={handleChange} required className={inputClass} style={inputStyle} />
            </FormField>
            <FormField label="Placeholder Target">
              <input name="target_placeholder" value={form.target_placeholder} onChange={handleChange} className={inputClass} style={inputStyle} />
            </FormField>
            <FormField label="Validasi Target (Regex)">
              <input name="target_validation" value={form.target_validation} onChange={handleChange} className={inputClass} style={inputStyle} />
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Pengaturan">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Status" required>
              <select name="status" value={form.status} onChange={handleChange} required className={inputClass} style={inputStyle}>
                <option value="ACTIVE">Aktif</option>
                <option value="INACTIVE">Tidak Aktif</option>
                <option value="OUT_OF_STOCK">Stok Habis</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="ARCHIVED">Diarsipkan</option>
              </select>
            </FormField>
            <FormField label="Urutan Tampil">
              <input name="sort_order" value={form.sort_order} onChange={handleChange} type="number" min="0" className={inputClass} style={inputStyle} />
            </FormField>
            <div className="col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  name="is_featured"
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={handleChange}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: 'hsl(var(--primary))' }}
                />
                <span className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                  Tampilkan sebagai produk unggulan (featured)
                </span>
              </label>
            </div>
          </div>
        </FormSection>

        {/* Variant Manager — shown only on edit (productId exists) */}
        <div
          className="rounded-[20px] border p-5 card-hover animate-fade-in-up"
          style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
        >
          <h2 className="text-sm font-semibold mb-1" style={{ color: 'hsl(var(--foreground))' }}>
            Varian Produk
          </h2>
          <p className="text-xs mb-4" style={{ color: 'hsl(var(--foreground-muted))' }}>
            Opsional — tambah varian jika produk ini memiliki pilihan (contoh: Canva Design / Member / Head).
            Jika ada varian, pembeli akan memilih sebelum checkout.
          </p>
          <VariantManager productId={productId} />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-[12px] text-sm font-semibold press-effect hover-fade"
            style={{
              background: loading ? 'hsl(var(--primary) / 0.5)' : 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground, 0 0% 100%))',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
          <Link
            href="/admin/produk"
            className="px-6 py-2.5 rounded-[12px] text-sm font-medium press-effect hover-fade"
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
      className="rounded-[20px] border p-5 card-hover animate-fade-in-up"
      style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
    >
      <h2 className="text-sm font-semibold mb-4" style={{ color: 'hsl(var(--foreground))' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

/** Live discount badge: shows the % off when base_cost > selling_price. */
function DiscountPreview({ base, sell }: { base: string; sell: string }) {
  const b = parseFloat(base)
  const s = parseFloat(sell)
  if (!b || !s || b <= s) {
    return (
      <p className="text-xs" style={{ color: 'hsl(var(--foreground-muted))' }}>
        Isi &quot;Harga Normal&quot; lebih besar dari harga jual untuk menampilkan diskon.
      </p>
    )
  }
  const pct = Math.round(((b - s) / b) * 100)
  return (
    <span
      className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold"
      style={{ background: 'hsl(var(--destructive) / 0.12)', color: 'hsl(var(--destructive))' }}
    >
      Hemat {pct}% • diskon aktif
    </span>
  )
}

function FormField({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) {
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
