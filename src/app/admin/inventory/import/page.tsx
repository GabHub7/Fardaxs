'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ProductOption {
  id: string
  name: string
}

export default function ImportInventoryPage() {
  const router = useRouter()
  const [products, setProducts] = useState<ProductOption[]>([])
  const [productId, setProductId] = useState('')
  const [credentials, setCredentials] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchingProducts, setFetchingProducts] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null)

  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch('/api/admin/products/options?type=categories')
        // reuse products endpoint
        const res2 = await fetch('/api/admin/products?limit=200&status=ACTIVE')
        if (res2.ok) {
          const data = await res2.json() as { data: ProductOption[] }
          setProducts(data.data ?? [])
        }
      } catch {
        // non-critical
      } finally {
        setFetchingProducts(false)
      }
    }
    void loadProducts()
  }, [])

  const lineCount = credentials.split('\n').filter((l) => l.trim()).length

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResult(null)

    if (!productId) {
      setError('Pilih produk terlebih dahulu.')
      return
    }

    const lines = credentials.split('\n').map((l) => l.trim()).filter(Boolean)
    if (lines.length === 0) {
      setError('Masukkan minimal 1 credential.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/inventory/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, credentials: lines }),
      })

      const data = await res.json() as {
        success: boolean
        message: string
        data?: { imported: number; skipped: number }
      }

      if (!res.ok || !data.success) {
        setError(data.message ?? 'Gagal import inventory')
        return
      }

      setResult(data.data ?? { imported: lines.length, skipped: 0 })
      setCredentials('')
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
          href="/admin/inventory"
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
            Import Inventory
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
            Tambah credential produk secara massal
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

      {result && (
        <div
          className="rounded-[14px] p-4 text-sm"
          style={{
            background: 'hsl(var(--success) / 0.1)',
            color: 'hsl(var(--success))',
            border: '1px solid hsl(var(--success) / 0.3)',
          }}
        >
          Import selesai: <strong>{result.imported}</strong> berhasil, <strong>{result.skipped}</strong> dilewati (duplikat).{' '}
          <button
            onClick={() => router.push('/admin/inventory')}
            className="underline font-semibold"
          >
            Lihat inventory →
          </button>
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
        {/* Product selection */}
        <div
          className="rounded-[20px] border p-5"
          style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
        >
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'hsl(var(--foreground))' }}>
            Pilih Produk
          </h2>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            required
            className="w-full px-3 py-2.5 text-sm rounded-[12px] border outline-none"
            style={{
              background: 'hsl(var(--background-muted))',
              borderColor: 'hsl(var(--border))',
              color: 'hsl(var(--foreground))',
            }}
          >
            <option value="">
              {fetchingProducts ? 'Memuat produk...' : 'Pilih produk...'}
            </option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {products.length === 0 && !fetchingProducts && (
            <p className="text-xs mt-2" style={{ color: 'hsl(var(--foreground-muted))' }}>
              Tidak ada produk aktif ditemukan.
            </p>
          )}
        </div>

        {/* Credentials input */}
        <div
          className="rounded-[20px] border p-5"
          style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
              Daftar Credential
            </h2>
            {lineCount > 0 && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: 'hsl(var(--primary) / 0.1)',
                  color: 'hsl(var(--primary))',
                }}
              >
                {lineCount} baris
              </span>
            )}
          </div>
          <textarea
            value={credentials}
            onChange={(e) => setCredentials(e.target.value)}
            rows={12}
            placeholder={`Masukkan satu credential per baris. Contoh:\nemail1@example.com:password123\nemail2@example.com:password456\n...\n\nFormat tergantung jenis produk (email:pass, kode voucher, dll).`}
            className="w-full px-3 py-2.5 text-sm rounded-[12px] border outline-none font-mono"
            style={{
              background: 'hsl(var(--background-muted))',
              borderColor: 'hsl(var(--border))',
              color: 'hsl(var(--foreground))',
              resize: 'vertical',
            }}
          />
          <p className="text-xs mt-2" style={{ color: 'hsl(var(--foreground-muted))' }}>
            Satu credential per baris. Baris kosong dan duplikat akan dilewati secara otomatis.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading || lineCount === 0 || !productId}
            className="px-6 py-2.5 rounded-[12px] text-sm font-semibold"
            style={{
              background:
                loading || lineCount === 0 || !productId
                  ? 'hsl(var(--primary) / 0.5)'
                  : 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground, 0 0% 100%))',
              cursor: loading || lineCount === 0 || !productId ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Mengimport...' : `Import ${lineCount > 0 ? lineCount + ' Credential' : ''}`}
          </button>
          <Link
            href="/admin/inventory"
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
