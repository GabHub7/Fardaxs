'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import {
  Search, ShoppingCart, MessageCircle, Bell, ChevronDown,
  User as UserIcon, Settings, Fingerprint, LogOut, ShieldCheck,
} from 'lucide-react'
import { logoutAction } from '@/features/auth/actions'

const CART_KEY = 'fardax_cart'

interface CartItem {
  quantity: number
}

function readCartCount(): number {
  if (typeof window === 'undefined') return 0
  try {
    const items = JSON.parse(localStorage.getItem(CART_KEY) || '[]') as CartItem[]
    return items.reduce((sum, i) => sum + (i.quantity ?? 1), 0)
  } catch {
    return 0
  }
}

export interface TopNavbarProfile {
  fullName: string | null
  avatarUrl: string | null
  tierName: string
  memberId: string
}

/**
 * Persistent desktop top navbar.
 *
 * Lives in the (store) layout — not per-page — so it's identical on every
 * screen instead of the old per-page PageHeader, which only spanned the
 * inner max-w-4xl content column and left a visible gap next to the
 * sidebar. This is `fixed` from the edge of DesktopSidebar (240px) to the
 * right edge of the viewport, at the same 64px height as the sidebar's
 * logo row, so the borders line up into one continuous strip.
 *
 * Mobile is untouched — this component renders `hidden md:flex`, mobile
 * keeps PageHeader + BottomNav exactly as before.
 */
export function TopNavbar({
  profile,
  unreadCount = 0,
}: {
  profile: TopNavbarProfile | null
  unreadCount?: number
}) {
  const [cartCount, setCartCount] = useState(0)
  const [accountOpen, setAccountOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setCartCount(readCartCount())
    const onUpdate = () => setCartCount(readCartCount())
    window.addEventListener('fardax_cart_update', onUpdate)
    window.addEventListener('storage', onUpdate)
    return () => {
      window.removeEventListener('fardax_cart_update', onUpdate)
      window.removeEventListener('storage', onUpdate)
    }
  }, [])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setAccountOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const initials = (profile?.fullName ?? 'F')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')

  return (
    <header
      className="hidden md:flex fixed top-0 left-60 right-0 z-40 items-center gap-4 px-6"
      style={{
        height: '64px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        boxShadow: 'var(--shadow)',
      }}
    >
      {/* Search */}
      <form action="/cari" method="GET" className="flex-1 max-w-md">
        <div
          className="flex items-center gap-2 rounded-xl px-3.5"
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', height: '38px' }}
        >
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            name="q"
            placeholder="Cari produk atau toko..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
      </form>

      <div className="flex-1" />

      {/* Icon actions */}
      <div className="flex items-center gap-2">
        <IconLink href="/keranjang" ariaLabel="Keranjang" count={cartCount}>
          <ShoppingCart size={18} />
        </IconLink>

        <IconLink href="/akun/bantuan" ariaLabel="Bantuan & Chat CS">
          <MessageCircle size={18} />
        </IconLink>

        <IconLink href="/akun/notifikasi" ariaLabel="Notifikasi" count={unreadCount} dot>
          <Bell size={18} />
        </IconLink>
      </div>

      <div style={{ width: 1, height: 28, background: 'var(--border)' }} />

      {/* Account */}
      {profile ? (
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setAccountOpen((v) => !v)}
            className="flex items-center gap-2 pl-1.5 pr-2.5 rounded-full"
            style={{ height: '44px', border: '1px solid var(--border)' }}
          >
            <Avatar avatarUrl={profile.avatarUrl} initials={initials} />
            <div className="hidden lg:flex flex-col items-start leading-none">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                {profile.fullName ?? 'Pengguna'}
              </span>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {profile.tierName} Member
              </span>
            </div>
            <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
          </button>

          {accountOpen && (
            <div
              className="absolute right-0 top-[52px] w-64 rounded-2xl overflow-hidden z-50"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}
            >
              <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <Avatar avatarUrl={profile.avatarUrl} initials={initials} size={40} />
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                    {profile.fullName ?? 'Pengguna Fardax'}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    ID Member: {profile.memberId}
                  </p>
                </div>
              </div>

              <nav className="py-1.5">
                <MenuLink href="/akun/profil" icon={UserIcon} label="Profil Saya" onClick={() => setAccountOpen(false)} />
                <MenuLink href="/akun/membership" icon={ShieldCheck} label="Membership" onClick={() => setAccountOpen(false)} />
                <MenuLink href="/akun/keamanan" icon={Fingerprint} label="Keamanan Akun" onClick={() => setAccountOpen(false)} />
                <MenuLink href="/akun/pengaturan" icon={Settings} label="Pengaturan" onClick={() => setAccountOpen(false)} />
              </nav>

              <form action={logoutAction} style={{ borderTop: '1px solid var(--border)' }}>
                <button
                  type="submit"
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium"
                  style={{ color: '#dc2626' }}
                >
                  <LogOut size={16} />
                  Keluar
                </button>
              </form>
            </div>
          )}
        </div>
      ) : (
        <Link
          href="/login"
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}
        >
          Masuk
        </Link>
      )}
    </header>
  )
}

function Avatar({
  avatarUrl,
  initials,
  size = 32,
}: {
  avatarUrl: string | null
  initials: string
  size?: number
}) {
  const hasValidUrl = !!avatarUrl && (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://'))

  if (hasValidUrl) {
    return (
      <Image
        src={avatarUrl as string}
        alt="Foto profil"
        width={size}
        height={size}
        unoptimized
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      className="flex items-center justify-center rounded-full shrink-0 text-white font-bold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
      }}
    >
      {initials || 'F'}
    </span>
  )
}

function IconLink({
  href,
  ariaLabel,
  children,
  count = 0,
  dot = false,
}: {
  href: string
  ariaLabel: string
  children: React.ReactNode
  count?: number
  dot?: boolean
}) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className="relative flex items-center justify-center rounded-full"
      style={{ width: 38, height: 38, background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
    >
      {children}
      {count > 0 && dot && (
        <span
          className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
          style={{ background: '#dc2626', border: '1.5px solid var(--bg-secondary)' }}
        />
      )}
      {count > 0 && !dot && (
        <span
          className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold text-white"
          style={{ background: '#dc2626', border: '2px solid var(--bg-secondary)' }}
        >
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  )
}

function MenuLink({
  href,
  icon: Icon,
  label,
  onClick,
}: {
  href: string
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>
  label: string
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2.5 text-sm"
      style={{ color: 'var(--text-secondary)' }}
    >
      <Icon size={16} style={{ color: 'var(--text-muted)' }} />
      {label}
    </Link>
  )
}
