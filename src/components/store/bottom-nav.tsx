'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Home, Grid3x3, Zap, Clock, User } from 'lucide-react'

type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Beranda', href: '/', icon: Home },
  { label: 'Produk', href: '/produk', icon: Grid3x3 },
  { label: 'PPOB', href: '/ppob', icon: Zap },
  { label: 'Riwayat', href: '/riwayat', icon: Clock },
  { label: 'Akun', href: '/akun', icon: User },
]

/** Brand gradient — blue → purple → pink, matching the Fardax logo. */
const BRAND_GRADIENT = 'linear-gradient(135deg, #2563eb 0%, #7c3aed 52%, #ec4899 100%)'

/**
 * Bottom navigation with OPTIMISTIC active state.
 *
 * The previous version derived the active item purely from usePathname(),
 * which only updates AFTER the server finishes rendering the next route.
 * On a slow connection that made taps feel dead ("ga kepencet-pencet").
 *
 * Now an onClick sets an optimistic index so the highlight + float animation
 * fire INSTANTLY on tap; a useEffect clears the override once the real route
 * catches up. Combined with Link prefetch the navigation feels immediate.
 */
export function BottomNav() {
  const pathname = usePathname()

  const pathIndex = NAV_ITEMS.findIndex((item) => {
    if (item.href === '/') return pathname === '/'
    return pathname.startsWith(item.href)
  })

  const [optimistic, setOptimistic] = useState<number | null>(null)

  // Real route caught up → drop the optimistic override.
  useEffect(() => {
    setOptimistic(null)
  }, [pathname])

  const activeIndex = optimistic ?? pathIndex

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 md:hidden z-50"
      style={{
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border)',
        borderTopLeftRadius: 'var(--radius-xl)',
        borderTopRightRadius: 'var(--radius-xl)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        overflow: 'visible',
        transform: 'translateZ(0)',
        willChange: 'transform',
        boxShadow:
          '0 -10px 28px -8px rgba(31, 45, 90, 0.16), inset 0 2px 3px rgba(255, 255, 255, 0.7)',
      }}
      aria-label="Navigasi utama"
    >
      <div className="flex" style={{ height: '60px', overflow: 'visible' }}>
        {NAV_ITEMS.map((item, index) => {
          const active = activeIndex === index
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              aria-current={active ? 'page' : undefined}
              onClick={() => setOptimistic(index)}
              style={{
                flex: 1,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'visible',
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
              }}
            >
              {/* ── Icon + circle: rises together when active ── */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: 44,
                  height: 44,
                  transform: `translate(-50%, -50%) translateY(${active ? '-18px' : '0px'})`,
                  transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  willChange: 'transform',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Gradient circle background */}
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    background: BRAND_GRADIENT,
                    transform: active ? 'scale(1)' : 'scale(0.35)',
                    opacity: active ? 1 : 0,
                    transition: [
                      'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      'opacity 0.25s ease',
                      'box-shadow 0.3s ease',
                    ].join(', '),
                    boxShadow: active
                      ? '0 8px 22px rgba(124, 58, 237, 0.45)'
                      : '0 0 0 rgba(124, 58, 237, 0)',
                  }}
                />

                {/* Icon */}
                <Icon
                  size={20}
                  strokeWidth={active ? 2.5 : 1.8}
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    color: active ? '#ffffff' : 'var(--text-muted)',
                    transition: 'color 0.25s ease',
                  }}
                />
              </div>

              {/* Label — fixed at the bottom, independent of icon position */}
              <span
                style={{
                  position: 'absolute',
                  bottom: 5,
                  fontSize: 10,
                  lineHeight: 1,
                  letterSpacing: '0.01em',
                  fontWeight: active ? 700 : 400,
                  color: active ? '#7c3aed' : 'var(--text-muted)',
                  opacity: active ? 1 : 0.6,
                  transition: 'color 0.25s ease, opacity 0.25s ease, font-weight 0.25s ease',
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                }}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
