'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { MOCK } from '@/lib/mockup-colors'

export interface PromoSlide {
  id: string
  tag: string
  title: string
  subtitle: string
  ctaText: string
  ctaHref: string
}

const DEFAULT_SLIDES: PromoSlide[] = [
  {
    id: 'default-cashback',
    tag: 'SPESIAL PROMO',
    title: 'CASHBACK 20%',
    subtitle: 'Untuk semua produk',
    ctaText: 'Belanja Sekarang',
    ctaHref: '/produk',
  },
]

function GiftIllustration() {
  return (
    <svg viewBox="0 0 160 160" className="absolute right-2 top-1/2 -translate-y-1/2 w-36 h-36 opacity-90" aria-hidden="true">
      <circle cx="80" cy="80" r="70" fill="white" opacity="0.05" />
      {/* sparkles */}
      <g fill="#FCD34D">
        <path d="M30 35 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 z" opacity="0.9" />
        <path d="M128 100 l2.5 6.5 6.5 2.5 -6.5 2.5 -2.5 6.5 -2.5 -6.5 -6.5 -2.5 6.5 -2.5 z" opacity="0.85" />
        <path d="M118 30 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z" opacity="0.8" />
      </g>
      {/* floating coins */}
      <g>
        <ellipse cx="122" cy="55" rx="13" ry="13" fill="#F5B942" stroke="#D4960F" strokeWidth="2" />
        <text x="122" y="60" fontSize="13" textAnchor="middle" fill="#D4960F" fontWeight="bold">$</text>
        <ellipse cx="40" cy="118" rx="11" ry="11" fill="#F5B942" stroke="#D4960F" strokeWidth="2" />
        <text x="40" y="122" fontSize="11" textAnchor="middle" fill="#D4960F" fontWeight="bold">$</text>
      </g>
      {/* gift box */}
      <g transform="translate(48, 60)">
        <rect x="0" y="22" width="64" height="46" rx="4" fill="#6D6FF2" />
        <rect x="0" y="22" width="64" height="14" rx="3" fill="#8284FF" />
        <rect x="27" y="0" width="10" height="68" fill="#FDE68A" />
        <rect x="0" y="22" width="64" height="6" fill="#FDE68A" />
        <path d="M32 22 C20 22 16 6 32 6 C30 14 32 22 32 22 Z" fill="#FDE68A" />
        <path d="M32 22 C44 22 48 6 32 6 C34 14 32 22 32 22 Z" fill="#FDE68A" />
      </g>
    </svg>
  )
}

export function PromoBanner({ slides = DEFAULT_SLIDES }: { slides?: PromoSlide[] }) {
  const [index, setIndex] = useState(0)
  const count = slides.length

  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count])

  useEffect(() => {
    if (count <= 1) return
    const timer = setInterval(next, 5000)
    return () => clearInterval(timer)
  }, [next, count])

  const slide = slides[index]

  return (
    <div
      className="relative overflow-hidden rounded-[20px] px-5 py-6"
      style={{ background: `linear-gradient(135deg, ${MOCK.gradientFrom}, ${MOCK.gradientTo})` }}
    >
      <GiftIllustration />

      <div className="relative max-w-[68%]">
        <p className="text-[11px] font-bold tracking-wide text-white/80 mb-1.5">{slide.tag}</p>
        <p className="text-[26px] leading-tight font-black text-white mb-1.5">{slide.title}</p>
        <p className="text-xs text-white/75 mb-4">{slide.subtitle}</p>
        <Link
          href={slide.ctaHref}
          className="inline-block px-4 py-2 rounded-[10px] text-xs font-semibold text-white"
          style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(4px)' }}
        >
          {slide.ctaText}
        </Link>
      </div>

      {count > 1 && (
        <div className="relative flex items-center gap-1.5 mt-5">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Promo ${i + 1}`}
              onClick={() => setIndex(i)}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === index ? 16 : 6,
                background: i === index ? 'white' : 'rgba(255,255,255,0.35)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
