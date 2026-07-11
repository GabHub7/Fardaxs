'use client'

import { useEffect, useState } from 'react'
import { MOCK } from '@/lib/mockup-colors'

function getRemainingToMidnight() {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  const diff = Math.max(0, midnight.getTime() - now.getTime())
  const totalSeconds = Math.floor(diff / 1000)
  return {
    h: Math.floor(totalSeconds / 3600),
    m: Math.floor((totalSeconds % 3600) / 60),
    s: totalSeconds % 60,
  }
}

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

export function FlashSaleCountdown() {
  const [time, setTime] = useState(getRemainingToMidnight)

  useEffect(() => {
    const timer = setInterval(() => setTime(getRemainingToMidnight()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex items-center gap-1" aria-label="Sisa waktu flash sale">
      {[time.h, time.m, time.s].map((unit, i) => (
        <span key={i} className="flex items-center gap-1">
          <span
            className="px-2 py-1 rounded-md text-xs font-bold tabular-nums"
            style={{ background: MOCK.bgMuted, color: MOCK.foreground }}
          >
            {pad(unit)}
          </span>
          {i < 2 && <span style={{ color: MOCK.foregroundMuted }}>:</span>}
        </span>
      ))}
    </div>
  )
}
