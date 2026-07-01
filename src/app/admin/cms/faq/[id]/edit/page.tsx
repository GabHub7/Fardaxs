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

export default function FaqEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [form, setForm] = useState({
    question: '',
    answer: '',
    category: '',
    sort_order: 1,
    status: 'ACTIVE',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/admin/cms/faqs/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          const d = json.data
          setForm({
            question: d.question ?? '',
            answer: d.answer ?? '',
            category: d.category ?? '',
            sort_order: d.sort_order ?? 1,
            status: d.status ?? 'ACTIVE',
          })
        } else {
          setError('FAQ tidak ditemukan.')
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
    if (!form.question.trim() || !form.answer.trim()) {
      setError('Pertanyaan dan jawaban wajib diisi.')
      return
    }
    setSaving(true)
    setError('')

    const res = await fetch(`/api/admin/cms/faqs/${id}`, {
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

    router.push('/admin/cms?tab=faq')
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm('Hapus FAQ ini? Tindakan tidak dapat dibatalkan.')) return
    setDeleting(true)
    const res = await fetch(`/api/admin/cms/faqs/${id}`, { method: 'DELETE' })
    setDeleting(false)
    if (res.ok) {
      router.push('/admin/cms?tab=faq')
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
            href="/admin/cms?tab=faq"
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
            Edit FAQ
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
              Pertanyaan *
            </label>
            <input
              type="text"
              value={form.question}
              onChange={(e) => set('question', e.target.value)}
              placeholder="Apa itu Fardax Store?"
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
              Jawaban *
            </label>
            <textarea
              value={form.answer}
              onChange={(e) => set('answer', e.target.value)}
              placeholder="Tulis jawaban lengkap di sini..."
              required
              rows={5}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
                Kategori
              </label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                placeholder="Umum"
                style={inputStyle}
              />
            </div>
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
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
          <Link
            href="/admin/cms?tab=faq"
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
