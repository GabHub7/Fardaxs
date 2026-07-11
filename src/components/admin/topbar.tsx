'use client'

import { useState } from 'react'
import { Menu, Bell, Search, ChevronDown, LogOut, Settings, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { ThemeToggle } from '@/components/theme-toggle'

// ─── Props ────────────────────────────────────────────────────────────────────

interface AdminTopbarProps {
  pageTitle: string
  onMobileMenuToggle: () => void
  adminName?: string
  adminEmail?: string
  notificationCount?: number
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminTopbar({
  pageTitle,
  onMobileMenuToggle,
  adminName = 'Admin',
  adminEmail = '',
  notificationCount = 0,
}: AdminTopbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const router = useRouter()

  const initials = adminName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  async function handleSignOut() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header
      className="flex items-center gap-4 px-4 lg:px-6 flex-shrink-0 sticky top-0 z-30"
      style={{
        height: '64px',
        background: 'hsl(var(--background-card))',
        borderBottom: '1px solid hsl(var(--border))',
        transform: 'translateZ(0)',
        willChange: 'transform',
      }}
    >
      {/* Hamburger (mobile) */}
      <button
        onClick={onMobileMenuToggle}
        className="lg:hidden flex items-center justify-center rounded-lg flex-shrink-0"
        style={{
          width: '36px',
          height: '36px',
          background: 'hsl(var(--background-muted))',
          border: 'none',
          color: 'hsl(var(--foreground))',
          cursor: 'pointer',
        }}
        aria-label="Toggle menu"
      >
        <Menu size={18} />
      </button>

      {/* Page Title */}
      <h1
        className="font-semibold truncate"
        style={{ color: 'hsl(var(--foreground))', fontSize: '16px', flex: '0 0 auto' }}
      >
        {pageTitle}
      </h1>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search bar — desktop only */}
      <div
        className="hidden md:flex items-center gap-2 rounded-lg px-3"
        style={{
          width: '220px',
          height: '36px',
          background: 'hsl(var(--background-muted))',
          border: '1px solid hsl(var(--border))',
        }}
      >
        <Search size={14} style={{ color: 'hsl(var(--foreground-muted))' }} />
        <input
          type="text"
          placeholder="Cari..."
          className="flex-1 bg-transparent outline-none"
          style={{
            fontSize: '13px',
            color: 'hsl(var(--foreground))',
          }}
        />
      </div>

      {/* Theme picker */}
      <ThemeToggle />

      {/* Notification Bell */}
      <button
        className="relative flex items-center justify-center rounded-lg flex-shrink-0"
        style={{
          width: '36px',
          height: '36px',
          background: 'hsl(var(--background-muted))',
          border: '1px solid hsl(var(--border))',
          color: 'hsl(var(--foreground-muted))',
          cursor: 'pointer',
        }}
        aria-label="Notifications"
      >
        <Bell size={16} />
        {notificationCount > 0 && (
          <span
            className="absolute flex items-center justify-center rounded-full font-bold"
            style={{
              top: '-4px',
              right: '-4px',
              width: '16px',
              height: '16px',
              background: 'hsl(var(--destructive))',
              color: '#fff',
              fontSize: '9px',
              lineHeight: 1,
            }}
          >
            {notificationCount > 9 ? '9+' : notificationCount}
          </span>
        )}
      </button>

      {/* Profile Dropdown */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => setDropdownOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg px-2"
          style={{
            height: '36px',
            background: dropdownOpen ? 'hsl(var(--background-muted))' : 'transparent',
            border: '1px solid transparent',
            cursor: 'pointer',
            color: 'hsl(var(--foreground))',
            transition: 'background 150ms ease',
          }}
          aria-label="Admin menu"
        >
          {/* Avatar */}
          <div
            className="flex items-center justify-center rounded-full font-semibold flex-shrink-0"
            style={{
              width: '28px',
              height: '28px',
              background: 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground))',
              fontSize: '11px',
            }}
          >
            {initials}
          </div>
          <span className="hidden sm:block text-sm font-medium max-w-[100px] truncate">
            {adminName}
          </span>
          <ChevronDown
            size={14}
            style={{
              color: 'hsl(var(--foreground-muted))',
              transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 200ms ease',
            }}
          />
        </button>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setDropdownOpen(false)}
              aria-hidden="true"
            />
            <div
              className="absolute right-0 top-full mt-2 rounded-xl overflow-hidden z-50"
              style={{
                width: '200px',
                background: 'hsl(var(--background-card))',
                border: '1px solid hsl(var(--border))',
                boxShadow: 'var(--card-shadow-hover)',
              }}
            >
              {/* User info */}
              <div
                className="px-4 py-3"
                style={{ borderBottom: '1px solid hsl(var(--border))' }}
              >
                <p className="font-semibold text-sm" style={{ color: 'hsl(var(--foreground))' }}>
                  {adminName}
                </p>
                {adminEmail && (
                  <p className="text-xs truncate mt-0.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
                    {adminEmail}
                  </p>
                )}
              </div>

              {/* Menu Items */}
              <div className="py-1">
                {[
                  { icon: User, label: 'Profil Saya', href: '/admin/pengguna' },
                  { icon: Settings, label: 'Pengaturan', href: '/admin/pengaturan' },
                ].map(({ icon: Icon, label, href }) => (
                  <a
                    key={href}
                    href={href}
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm"
                    style={{
                      color: 'hsl(var(--foreground))',
                      textDecoration: 'none',
                      transition: 'background 150ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'hsl(var(--background-muted))'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <Icon size={14} style={{ color: 'hsl(var(--foreground-muted))' }} />
                    {label}
                  </a>
                ))}
              </div>

              <div style={{ borderTop: '1px solid hsl(var(--border))' }} className="py-1">
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-4 py-2 text-sm w-full text-left"
                  style={{
                    color: 'hsl(var(--destructive))',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 150ms ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'hsl(var(--destructive) / 0.08)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <LogOut size={14} />
                  Keluar
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
