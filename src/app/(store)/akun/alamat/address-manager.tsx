'use client'

import { useState } from 'react'
import { MapPin, Plus, Pencil, Trash2, Star, X, Check, Loader2, AlertCircle } from 'lucide-react'
import { MOCK } from '@/lib/mockup-colors'

export interface Address {
  id: string
  label: string
  recipient_name: string
  phone: string
  full_address: string
  city: string | null
  postal_code: string | null
  notes: string | null
  is_default: boolean
}

type FormState = Omit<Address, 'id' | 'is_default'> & { is_default: boolean }

const EMPTY: FormState = {
  label: '', recipient_name: '', phone: '', full_address: '',
  city: '', postal_code: '', notes: '', is_default: false,
}

export function AddressManager({ initial }: { initial: Address[] }) {
  const [addresses, setAddresses] = useState<Address[]>(initial)
  const [editing, setEditing] = useState<Address | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function openAdd() {
    setEditing(null)
    setForm(EMPTY)
    setError(null)
    setShowForm(true)
  }

  function openEdit(a: Address) {
    setEditing(a)
    setForm({
      label: a.label, recipient_name: a.recipient_name, phone: a.phone,
      full_address: a.full_address, city: a.city ?? '', postal_code: a.postal_code ?? '',
      notes: a.notes ?? '', is_default: a.is_default,
    })
    setError(null)
    setShowForm(true)
  }

  async function refresh() {
    const res = await fetch('/api/account/addresses')
    const json = await res.json()
    if (json.success) setAddresses(json.data as Address[])
  }

  async function save() {
    if (!form.label.trim() || !form.recipient_name.trim() || !form.phone.trim() || !form.full_address.trim()) {
      setError('Lengkapi label, nama penerima, telepon, dan alamat.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const url = editing ? `/api/account/addresses/${editing.id}` : '/api/account/addresses'
      const res = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.message ?? 'Gagal menyimpan alamat.')
        return
      }
      await refresh()
      setShowForm(false)
    } catch {
      setError('Terjadi kesalahan jaringan.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/account/addresses/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) setAddresses((prev) => prev.filter((a) => a.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  async function makeDefault(id: string) {
    setAddresses((prev) => prev.map((a) => ({ ...a, is_default: a.id === id })))
    await fetch(`/api/account/addresses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_default: true }),
    })
    refresh()
  }

  const inputStyle = {
    background: MOCK.bgCard,
    border: `1px solid ${MOCK.border}`,
    color: MOCK.foreground,
  }

  return (
    <div className="px-4 py-5 space-y-4 animate-fade-in-up">
      {/* Add button */}
      <button
        onClick={openAdd}
        className="w-full flex items-center justify-center gap-2 rounded-[14px] py-3.5 text-sm font-semibold text-white press-effect transition-transform"
        style={{ background: `linear-gradient(135deg, ${MOCK.primary}, #6366F1)` }}
      >
        <Plus size={18} />
        Tambah Alamat Baru
      </button>

      {/* Empty state */}
      {addresses.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: MOCK.bgMuted }}>
            <MapPin size={28} style={{ color: MOCK.foregroundFaint }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: MOCK.foreground }}>Belum Ada Alamat</p>
          <p className="text-xs text-center" style={{ color: MOCK.foregroundMuted }}>
            Tambahkan alamat untuk mempercepat checkout
          </p>
        </div>
      )}

      {/* Address list */}
      <div className="space-y-3">
        {addresses.map((a) => (
          <div
            key={a.id}
            className="rounded-[16px] p-4 animate-fade-in-scale"
            style={{
              background: MOCK.bgMuted,
              border: `1.5px solid ${a.is_default ? MOCK.primary : MOCK.border}`,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: MOCK.foreground }}>{a.label}</span>
                {a.is_default && (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                    style={{ background: MOCK.primary }}
                  >
                    <Star size={10} /> Utama
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEdit(a)}
                  className="w-8 h-8 rounded-full flex items-center justify-center press-effect hover-fade"
                  style={{ background: MOCK.bgCard }}
                  aria-label="Edit"
                >
                  <Pencil size={14} style={{ color: MOCK.foregroundMuted }} />
                </button>
                <button
                  onClick={() => remove(a.id)}
                  disabled={deletingId === a.id}
                  className="w-8 h-8 rounded-full flex items-center justify-center press-effect hover-fade disabled:opacity-50"
                  style={{ background: MOCK.destructiveBg }}
                  aria-label="Hapus"
                >
                  {deletingId === a.id
                    ? <Loader2 size={14} className="animate-spin" style={{ color: MOCK.destructive }} />
                    : <Trash2 size={14} style={{ color: MOCK.destructive }} />}
                </button>
              </div>
            </div>
            <p className="text-sm mt-2" style={{ color: MOCK.foreground }}>{a.recipient_name}</p>
            <p className="text-xs mt-0.5" style={{ color: MOCK.foregroundMuted }}>{a.phone}</p>
            <p className="text-xs mt-1.5 leading-relaxed" style={{ color: MOCK.foregroundMuted }}>
              {a.full_address}{a.city ? `, ${a.city}` : ''}{a.postal_code ? ` ${a.postal_code}` : ''}
            </p>
            {!a.is_default && (
              <button
                onClick={() => makeDefault(a.id)}
                className="mt-3 text-xs font-semibold press-effect hover-fade"
                style={{ color: MOCK.primaryLight }}
              >
                Jadikan alamat utama
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Form modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => !saving && setShowForm(false)}
        >
          <div
            className="w-full sm:max-w-md rounded-t-[24px] sm:rounded-[24px] p-5 animate-fade-in-up max-h-[90vh] overflow-y-auto"
            style={{ background: MOCK.bg, border: `1px solid ${MOCK.border}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold" style={{ color: MOCK.foreground }}>
                {editing ? 'Edit Alamat' : 'Tambah Alamat'}
              </h2>
              <button
                onClick={() => !saving && setShowForm(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center press-effect"
                style={{ background: MOCK.bgMuted }}
              >
                <X size={16} style={{ color: MOCK.foreground }} />
              </button>
            </div>

            {error && (
              <div
                className="flex items-center gap-2 rounded-[12px] p-3 text-xs mb-3 animate-fade-in"
                style={{ background: MOCK.destructiveBg, color: MOCK.destructive }}
              >
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <div className="space-y-3">
              {[
                { key: 'label', label: 'Label (cth: Rumah, Kantor)', type: 'text' },
                { key: 'recipient_name', label: 'Nama Penerima', type: 'text' },
                { key: 'phone', label: 'Nomor Telepon', type: 'tel' },
              ].map((f) => (
                <div key={f.key}>
                  <label className="text-xs font-medium" style={{ color: MOCK.foregroundMuted }}>{f.label}</label>
                  <input
                    type={f.type}
                    value={form[f.key as keyof FormState] as string}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 rounded-[12px] text-sm outline-none focus:ring-2"
                    style={inputStyle}
                  />
                </div>
              ))}

              <div>
                <label className="text-xs font-medium" style={{ color: MOCK.foregroundMuted }}>Alamat Lengkap</label>
                <textarea
                  value={form.full_address}
                  onChange={(e) => setForm({ ...form, full_address: e.target.value })}
                  rows={3}
                  className="w-full mt-1 px-3 py-2.5 rounded-[12px] text-sm outline-none focus:ring-2 resize-none"
                  style={inputStyle}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium" style={{ color: MOCK.foregroundMuted }}>Kota</label>
                  <input
                    value={form.city ?? ''}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 rounded-[12px] text-sm outline-none focus:ring-2"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium" style={{ color: MOCK.foregroundMuted }}>Kode Pos</label>
                  <input
                    value={form.postal_code ?? ''}
                    onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 rounded-[12px] text-sm outline-none focus:ring-2"
                    style={inputStyle}
                  />
                </div>
              </div>

              <button
                onClick={() => setForm({ ...form, is_default: !form.is_default })}
                className="flex items-center gap-2 press-effect"
              >
                <span
                  className="w-5 h-5 rounded-md flex items-center justify-center transition-all"
                  style={{
                    background: form.is_default ? MOCK.primary : 'transparent',
                    border: `1.5px solid ${form.is_default ? MOCK.primary : MOCK.border}`,
                  }}
                >
                  {form.is_default && <Check size={13} className="text-white" />}
                </span>
                <span className="text-xs" style={{ color: MOCK.foreground }}>Jadikan alamat utama</span>
              </button>

              <button
                onClick={save}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 rounded-[14px] py-3.5 text-sm font-semibold text-white press-effect mt-2 disabled:opacity-60"
                style={{ background: `linear-gradient(135deg, ${MOCK.primary}, #6366F1)` }}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {saving ? 'Menyimpan...' : 'Simpan Alamat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
