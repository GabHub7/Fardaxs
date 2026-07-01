'use client'

import { useState, useEffect } from 'react'

interface Props {
  expiredAt: string
}

function getRemaining(expiredAt: string) {
  const diff = Math.max(0, new Date(expiredAt).getTime() - Date.now())
  const minutes = Math.floor(diff / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)
  return { diff, minutes, seconds }
}

export function PaymentCountdown({ expiredAt }: Props) {
  const [{ diff, minutes, seconds }, setRemaining] = useState(() => getRemaining(expiredAt))

  useEffect(() => {
    if (diff === 0) return
    const id = setInterval(() => {
      setRemaining(getRemaining(expiredAt))
    }, 1000)
    return () => clearInterval(id)
  }, [expiredAt, diff])

  const isUrgent = diff < 5 * 60 * 1000 && diff > 0

  return (
    <div
      className="font-mono text-lg font-bold tabular-nums"
      style={{ color: isUrgent ? 'hsl(var(--destructive))' : 'hsl(var(--warning))' }}
    >
      {diff === 0 ? '00:00' : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`}
    </div>
  )
}
