'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Pencil, X, Check, Loader2, GripVertical } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Variant {
  id: string
  name: string
  selling_price: number
  reseller_price: number
  base_cost: number
  provider_product_code: string | null
  sort_order: number
  status: 'ACTIVE' | 'INACTIVE'
}

interface Props {
  productId: string
}

const inputClass = 'w-full px-3 py-2 text-sm rounded-[10px] border outline-none transition-colors'
const inputStyle: React.CSSProperties = {
  background: 'hsl(var(--background))',
  borderColor: 'hsl(var(--border))',
  color: 'hsl(var(--foreground))',
}

type VariantStatus = 'ACTIVE' | 'INACTIVE'

const emptyForm = {
  name: '',
  selling_price: '',
  reseller_price: '',
  base_cost: '',
  provider_product_code: '',
  sort_order: '0',
  status: 'ACTIVE' as VariantStatus,
}

export function VariantManager({ productId }: Props) {
  const [variants, setVariants] = useState<Variant[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Which variant is being edited? null = none, 'new' = add form
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState(emptyForm)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/products/${productId}/variants`)
      const json = await res.json() as { success: boolean; data: Variant[] }
      if (json.success) setVariants(json.data)
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => { void load() }, [load])

  function openNew() {
    setForm(emptyForm)
    setEditingId('new')
    setError(null)
  }

  function openEdit(v: Variant) {
    setForm({
      name: v.name,
      selling_price: String(v.selling_price),
      reseller_price: String(v.reseller_price),
      base_cost: String(v.base_cost),
      provider_product_code: v.provider_product_code ?? '',
      sort_order: String(v.sort_order),
      status: v.status as VariantStatus,
    })
    setEditingId(v.id)
    setError(null)
  }

  function cancel() {
    setEditingId(null)
    setError(null)
  }

  async function save() {
    if (!form.name.trim() || !form.selling_price) {
      setError('Nama dan harga jual wajib diisi')
      return
    }

    setSaving(true)
    setError(null)

    const payload = {
      name: form.name.trim(),
      selling_price: parseFloat(form.selling_price) || 0,
      reseller_price: parseFloat(form.reseller_price) || 0,
      base_cost: parseFloat(form.base_cost) || 0,
      provider_product_code: form.provider_product_code.trim() || null,
      sort_order: parseInt(form.sort_order, 10) || 0,
      status: form.status,
    }

    try {
      const isNew = editingId === 'new'
      const url = isNew
        ? `/api/admin/products/${productId}/variants`
        : `/api/admin/products/${productId}/variants/${editingId}`

      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json() as { success: boolean; message: string }
      if (!json.success) { setError(json.message); return }

      setEditingId(null)
      await load()
    } catch {
      setError('Terjadi kesalahan jaringan. Coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(variantId: string) {
    if (!window.confirm('Hapus varian ini?')) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/products/${productId}/variants/${variantId}`, {
        method: 'DELETE',
      })
      const json = await res.json() as { success: boolean; message: string }
      if (!json.success) { setError(json.message); return }
      await load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium" style={{ color: 'hsl(var(--foreground-muted))' }}>
            {variants.length === 0
              ? 'Belum ada varian — produk ditampilkan dengan 1 harga.'
              : `${variants.length} varian aktif`}
          </p>
        </div>
        {editingId === null && (
          <button
            type="button"
            onClick={openNew}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-semibold press-effect"
            style={{ background: 'hsl(var(--primary))', color: '#fff' }}
          >
            <Plus size={13} />
            Tambah Varian
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs px-3 py-2 rounded-[10px]"
          style={{ background: 'hsl(var(--destructive)/0.1)', color: 'hsl(var(--destructive))' }}>
          {error}
        </p>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 py-4 text-xs" style={{ color: 'hsl(var(--foreground-muted))' }}>
          <Loader2 size={14} className="animate-spin" />
          Memuat varian...
        </div>
      )}

      {/* Variant list */}
      {!loading && variants.length > 0 && (
        <div className="space-y-2">
          {variants.map((v) => (
            <div key={v.id}>
              {editingId === v.id ? (
                <VariantForm
                  form={form}
                  onChange={setForm}
                  onSave={() => void save()}
                  onCancel={cancel}
                  saving={saving}
                />
              ) : (
                <div
                  className="flex items-center gap-3 rounded-[12px] px-3 py-2.5 border"
                  style={{
                    background: v.status === 'INACTIVE' ? 'hsl(var(--background-muted))' : 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))',
                    opacity: v.status === 'INACTIVE' ? 0.6 : 1,
                  }}
                >
                  <GripVertical size={14} style={{ color: 'hsl(var(--foreground-muted))' }} className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'hsl(var(--foreground))' }}>
                      {v.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-medium" style={{ color: 'hsl(var(--primary))' }}>
                        {formatCurrency(v.selling_price)}
                      </span>
                      {v.base_cost > 0 && v.base_cost > v.selling_price && (
                        <span className="text-[10px] line-through" style={{ color: 'hsl(var(--foreground-muted))' }}>
                          {formatCurrency(v.base_cost)}
                        </span>
                      )}
                      {v.provider_product_code && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                          style={{ background: 'hsl(var(--background-muted))', color: 'hsl(var(--foreground-muted))' }}>
                          {v.provider_product_code}
                        </span>
                      )}
                      {v.status === 'INACTIVE' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                          style={{ background: 'hsl(var(--destructive)/0.1)', color: 'hsl(var(--destructive))' }}>
                          Nonaktif
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(v)}
                      className="p-1.5 rounded-[8px] press-effect"
                      style={{ color: 'hsl(var(--foreground-muted))', background: 'hsl(var(--background-muted))' }}
                      title="Edit"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(v.id)}
                      disabled={saving}
                      className="p-1.5 rounded-[8px] press-effect"
                      style={{ color: 'hsl(var(--destructive))', background: 'hsl(var(--destructive)/0.1)' }}
                      title="Hapus"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {editingId === 'new' && (
        <VariantForm
          form={form}
          onChange={setForm}
          onSave={() => void save()}
          onCancel={cancel}
          saving={saving}
          isNew
        />
      )}
    </div>
  )
}

// ─── Inline edit / add form ────────────────────────────────────────────────────

type FormState = typeof emptyForm

interface FormProps {
  form: FormState
  onChange: (f: FormState) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  isNew?: boolean
}

function VariantForm({ form, onChange, onSave, onCancel, saving, isNew }: FormProps) {
  function set(key: keyof FormState, value: string) {
    onChange({ ...form, [key]: value })
  }

  return (
    <div
      className="rounded-[14px] border p-4 space-y-3"
      style={{ background: 'hsl(var(--background-muted))', borderColor: 'hsl(var(--primary)/0.4)' }}
    >
      <p className="text-xs font-semibold" style={{ color: 'hsl(var(--primary))' }}>
        {isNew ? 'Tambah Varian Baru' : 'Edit Varian'}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs mb-1" style={{ color: 'hsl(var(--foreground-muted))' }}>
            Nama Varian <span style={{ color: 'hsl(var(--destructive))' }}>*</span>
          </label>
          <input
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Contoh: Canva Design, Member 1 Bulan"
            className={inputClass}
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-xs mb-1" style={{ color: 'hsl(var(--foreground-muted))' }}>
            Harga Jual <span style={{ color: 'hsl(var(--destructive))' }}>*</span>
          </label>
          <input
            type="number"
            min="0"
            step="1"
            value={form.selling_price}
            onChange={e => set('selling_price', e.target.value)}
            placeholder="0"
            className={inputClass}
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-xs mb-1" style={{ color: 'hsl(var(--foreground-muted))' }}>
            Harga Normal (Coret)
          </label>
          <input
            type="number"
            min="0"
            step="1"
            value={form.base_cost}
            onChange={e => set('base_cost', e.target.value)}
            placeholder="Kosongkan jika tanpa diskon"
            className={inputClass}
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-xs mb-1" style={{ color: 'hsl(var(--foreground-muted))' }}>
            Harga Reseller
          </label>
          <input
            type="number"
            min="0"
            step="1"
            value={form.reseller_price}
            onChange={e => set('reseller_price', e.target.value)}
            placeholder="0"
            className={inputClass}
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-xs mb-1" style={{ color: 'hsl(var(--foreground-muted))' }}>
            Kode Provider
          </label>
          <input
            value={form.provider_product_code}
            onChange={e => set('provider_product_code', e.target.value)}
            placeholder="Kode dari provider"
            className={inputClass}
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-xs mb-1" style={{ color: 'hsl(var(--foreground-muted))' }}>
            Urutan
          </label>
          <input
            type="number"
            min="0"
            value={form.sort_order}
            onChange={e => set('sort_order', e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-xs mb-1" style={{ color: 'hsl(var(--foreground-muted))' }}>
            Status
          </label>
          <select
            value={form.status}
            onChange={e => set('status', e.target.value)}
            className={inputClass}
            style={inputStyle}
          >
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Nonaktif</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-[10px] text-xs font-semibold press-effect"
          style={{ background: 'hsl(var(--primary))', color: '#fff', opacity: saving ? 0.6 : 1 }}
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-[10px] text-xs font-medium press-effect"
          style={{ background: 'hsl(var(--background-muted))', color: 'hsl(var(--foreground-muted))', border: '1px solid hsl(var(--border))' }}
        >
          <X size={12} />
          Batal
        </button>
      </div>
    </div>
  )
}
