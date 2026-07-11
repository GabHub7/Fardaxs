'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Home, Grid3x3, Zap, Clock, User, Settings } from 'lucide-react'

type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Beranda', href: '/', icon: Home },
  { label: 'Produk', href: '/produk', icon: Grid3x3 },
  { label: 'PPOB', href: '/ppob', icon: Zap },
  { label: 'Riwayat', href: '/riwayat', icon: Clock },
  { label: 'Akun', href: '/akun', icon: User },
]

export function DesktopSidebar() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  const navLink = (href: string, icon: NavItem['icon'], label: string) => {
    const Icon = icon
    const active = isActive(href)
    return (
      <Link
        key={href}
        href={href}
        prefetch
        aria-current={active ? 'page' : undefined}
        className="flex items-center gap-3 mx-2 mb-0.5 rounded-lg transition-colors"
        style={{
          height: '40px',
          padding: '0 12px',
          background: active ? 'var(--accent-light, rgba(37,99,235,0.1))' : 'transparent',
          color: active ? '#2563eb' : 'var(--text-secondary)',
          borderLeft: active ? '3px solid #2563eb' : '3px solid transparent',
          fontSize: '13.5px',
          fontWeight: active ? 600 : 400,
        }}
        onMouseEnter={(e) => {
          if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'
        }}
        onMouseLeave={(e) => {
          if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'
        }}
      >
        <Icon
          size={18}
          className="shrink-0"
          style={{ color: active ? '#2563eb' : 'var(--text-muted)' }}
        />
        {label}
      </Link>
    )
  }

  return (
    <aside
      className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-60 md:z-40"
      style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)' }}
      aria-label="Navigasi utama"
    >
      {/* Brand */}
      <Link
        href="/"
        className="flex items-center gap-3 px-4 shrink-0"
        style={{ height: '64px', borderBottom: '1px solid var(--border)' }}
      >
        <Image src="/logo.png" alt="FardaxStore" width={36} height={36} priority style={{ objectFit: 'contain' }} />
        <div className="flex flex-col leading-none">
          <span className="brand-wordmark" style={{ fontSize: '16px' }}>FardaxStore</span>
          <span style={{ fontSize: '10px', letterSpacing: '0.06em', color: '#7c3aed' }}>Member Area</span>
        </div>
      </Link>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto py-3" style={{ scrollbarWidth: 'none' }}>
        <div className="px-4 mb-1">
          <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Menu
          </span>
        </div>
        {NAV_ITEMS.map((item) => navLink(item.href, item.icon, item.label))}
      </nav>

      {/* Pinned settings */}
      <div className="pb-4 pt-2 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
        {navLink('/akun/pengaturan', Settings, 'Pengaturan Akun')}
      </div>
    </aside>
  )
}
