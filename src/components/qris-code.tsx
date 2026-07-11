'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

// Casaku's API returns a raw QRIS payload string (qr_string), not a hosted
// image URL — this renders it into a scannable QR image entirely client-side.
export function QrisCode({ data, className }: { data: string; className?: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(data, { width: 400, margin: 1 })
      .then((url) => {
        if (!cancelled) setDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [data])

  if (error) {
    return <p className="text-xs text-red-500">Gagal menampilkan QR Code. Coba muat ulang halaman.</p>
  }

  if (!dataUrl) {
    return <div className={`animate-pulse bg-gray-200 rounded-[12px] ${className ?? 'w-52 h-52'}`} />
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={dataUrl} alt="QRIS QR Code" className={className ?? 'w-52 h-52 object-contain'} />
}
