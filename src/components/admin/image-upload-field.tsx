'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Upload, Link2, Loader2, X, ImageIcon } from 'lucide-react'

interface Props {
  /** Current image_url value (may be a real URL or a "logo:xxx" slug). */
  value: string
  onChange: (url: string) => void
}

/**
 * Product image picker: upload a file (→ Supabase Storage via /api/admin/upload)
 * OR paste a URL. Shows a live preview. The resulting URL is written back via
 * onChange so the parent form stores it in image_url.
 */
export function ImageUploadField({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const isPreviewable = value && (value.startsWith('http') || value.startsWith('/'))

  async function handleFile(file: File) {
    setError('')
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      const json = (await res.json()) as { success: boolean; message: string; data?: { url: string } }
      if (!json.success || !json.data) {
        setError(json.message ?? 'Gagal mengunggah gambar')
        return
      }
      onChange(json.data.url)
    } catch {
      setError('Terjadi kesalahan jaringan saat mengunggah')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        {/* Preview / drop target */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="relative flex items-center justify-center flex-shrink-0 overflow-hidden rounded-[14px] border-2 border-dashed press-effect hover-fade"
          style={{
            width: 96, height: 96,
            borderColor: 'hsl(var(--border))',
            background: 'hsl(var(--background-muted))',
          }}
          aria-label="Unggah gambar"
        >
          {uploading ? (
            <Loader2 size={22} className="animate-spin" style={{ color: 'hsl(var(--primary))' }} />
          ) : isPreviewable ? (
            <Image src={value} alt="Preview" fill className="object-cover" sizes="96px" unoptimized />
          ) : (
            <ImageIcon size={26} style={{ color: 'hsl(var(--foreground-muted))' }} />
          )}
        </button>

        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[12px] text-xs font-semibold press-effect hover-fade disabled:opacity-60"
              style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground, 0 0% 100%))' }}
            >
              <Upload size={14} />
              {uploading ? 'Mengunggah...' : 'Unggah Gambar'}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[12px] text-xs font-medium press-effect hover-fade"
                style={{ background: 'hsl(var(--background-muted))', color: 'hsl(var(--foreground-muted))', border: '1px solid hsl(var(--border))' }}
              >
                <X size={14} /> Hapus
              </button>
            )}
          </div>
          <p className="text-[11px]" style={{ color: 'hsl(var(--foreground-muted))' }}>
            PNG, JPG, WEBP, atau GIF · maks 5MB. Atau tempel URL di bawah.
          </p>
        </div>
      </div>

      {/* URL fallback */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-[12px] border"
        style={{ background: 'hsl(var(--background-muted))', borderColor: 'hsl(var(--border))' }}
      >
        <Link2 size={14} style={{ color: 'hsl(var(--foreground-muted))' }} className="flex-shrink-0" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type="text"
          placeholder="https://... atau logo:netflix"
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: 'hsl(var(--foreground))' }}
        />
      </div>

      {error && (
        <p className="text-xs" style={{ color: 'hsl(var(--destructive))' }}>{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void handleFile(f)
          e.target.value = ''
        }}
      />
    </div>
  )
}
