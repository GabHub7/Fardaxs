'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  Home,
  ShoppingCart,
  Package,
  Grid2x2,
  Server,
  CreditCard,
  Users,
  Archive,
  FileText,
  MessageCircle,
  User,
  BarChart3,
  FileBarChart,
  Settings,
  KeyRound,
  Shield,
  Bell,
  Activity,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

interface NavGroup {
  title: string
  items: NavItem[]
}

// ─── Navigation Config ────────────────────────────────────────────────────────

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', href: '/admin', icon: Home },
      { label: 'Pesanan', href: '/admin/pesanan', icon: ShoppingCart },
      { label: 'Produk', href: '/admin/produk', icon: Package },
      { label: 'Kategori', href: '/admin/kategori', icon: Grid2x2 },
      { label: 'Provider', href: '/admin/provider', icon: Server },
    ],
  },
  {
    title: 'Keuangan',
    items: [
      { label: 'Pembayaran', href: '/admin/pembayaran', icon: CreditCard },
      { label: 'Refund / Reseller', href: '/admin/reseller', icon: Users },
    ],
  },
  {
    title: 'Konten',
    items: [
      { label: 'Inventory', href: '/admin/inventory', icon: Archive },
      { label: 'CMS', href: '/admin/cms', icon: FileText },
      { label: 'WhatsApp', href: '/admin/whatsapp', icon: MessageCircle },
    ],
  },
  {
    title: 'Sistem',
    items: [
      { label: 'Pengguna', href: '/admin/pengguna', icon: User },
      { label: 'Notifikasi', href: '/admin/notifikasi', icon: Bell },
      { label: 'Analitik', href: '/admin/analitik', icon: BarChart3 },
      { label: 'Laporan', href: '/admin/laporan', icon: FileBarChart },
      { label: 'Pengaturan', href: '/admin/pengaturan', icon: Settings },
      { label: 'Env Pembayaran', href: '/admin/pengaturan/env-pembayaran', icon: KeyRound },
      { label: 'Audit Log', href: '/admin/audit', icon: Shield },
      { label: 'Status Sistem', href: '/admin/sistem', icon: Activity },
    ],
  },
]

// ─── Props ────────────────────────────────────────────────────────────────────

interface AdminSidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminSidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}: AdminSidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        style={{
          width: collapsed ? '64px' : '240px',
          background: 'hsl(var(--sidebar-background))',
          borderRight: '1px solid hsl(var(--sidebar-border))',
          transition: 'width 280ms cubic-bezier(0.4, 0, 0.2, 1), transform 280ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        className={cn(
          'app-shell-height fixed top-0 left-0 z-50 flex flex-col overflow-hidden',
          // Desktop: always visible, collapsed/expanded by width
          'hidden lg:flex',
          // Mobile: slide in/out as drawer
          mobileOpen && '!flex',
          // On mobile always full-width drawer
          'max-lg:!w-64',
          mobileOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full'
        )}
      >
        {/* Logo Area */}
        <div
          className="flex items-center gap-3 px-4 flex-shrink-0"
          style={{
            height: '64px',
            borderBottom: '1px solid hsl(var(--sidebar-border))',
          }}
        >
          <Image
            src="/logo.png"
            alt="FardaxStore"
            width={36}
            height={36}
            priority
            className="flex-shrink-0"
            style={{ objectFit: 'contain' }}
          />

          {/* Brand name — hidden when collapsed */}
          <div
            className="flex flex-col overflow-hidden"
            style={{
              opacity: collapsed ? 0 : 1,
              width: collapsed ? 0 : 'auto',
              transition: 'opacity 200ms ease, width 280ms ease',
              whiteSpace: 'nowrap',
            }}
          >
            <span
              className="brand-wordmark"
              style={{ fontSize: '16px', lineHeight: 1.2 }}
            >
              FardaxStore
            </span>
            <span style={{ color: 'hsl(var(--primary))', fontSize: '10px', letterSpacing: '0.06em' }}>
              Admin Panel
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3" style={{ scrollbarWidth: 'none' }}>
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="mb-1">
              {/* Group title — hidden when collapsed */}
              <div
                className="px-4 mb-1"
                style={{
                  opacity: collapsed ? 0 : 1,
                  height: collapsed ? 0 : '24px',
                  overflow: 'hidden',
                  transition: 'opacity 200ms ease, height 280ms ease',
                }}
              >
                <span
                  style={{
                    color: 'hsl(var(--foreground-muted))',
                    fontSize: '10px',
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}
                >
                  {group.title}
                </span>
              </div>

              {/* Nav items */}
              {group.items.map((item) => {
                const active = isActive(item.href)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onMobileClose}
                    title={collapsed ? item.label : undefined}
                    className="flex items-center gap-3 mx-2 mb-0.5 rounded-lg relative group"
                    style={{
                      height: '40px',
                      padding: collapsed ? '0 12px' : '0 12px',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      background: active ? 'hsl(var(--primary) / 0.12)' : 'transparent',
                      color: active ? 'hsl(var(--primary))' : 'hsl(var(--sidebar-foreground))',
                      borderLeft: active ? '3px solid hsl(var(--primary))' : '3px solid transparent',
                      transition: 'background 150ms ease, color 150ms ease, border-color 150ms ease',
                    }}
                  >
                    <Icon
                      size={18}
                      className="flex-shrink-0"
                      style={{ color: active ? 'hsl(var(--primary))' : 'hsl(var(--foreground-muted))' }}
                    />
                    <span
                      style={{
                        fontSize: '13.5px',
                        fontWeight: active ? 600 : 400,
                        opacity: collapsed ? 0 : 1,
                        width: collapsed ? 0 : 'auto',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        transition: 'opacity 200ms ease, width 280ms ease',
                      }}
                    >
                      {item.label}
                    </span>

                    {/* Tooltip on collapsed */}
                    {collapsed && (
                      <div
                        className="absolute left-full ml-2 px-2 py-1 rounded pointer-events-none
                                   opacity-0 group-hover:opacity-100 z-50 hidden lg:block"
                        style={{
                          background: 'hsl(var(--background-card))',
                          border: '1px solid hsl(var(--border))',
                          color: 'hsl(var(--foreground))',
                          fontSize: '12px',
                          whiteSpace: 'nowrap',
                          transition: 'opacity 150ms ease',
                          boxShadow: 'var(--card-shadow)',
                        }}
                      >
                        {item.label}
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Collapse Toggle — desktop only */}
        <div
          className="hidden lg:flex items-center flex-shrink-0 px-3 py-3"
          style={{ borderTop: '1px solid hsl(var(--sidebar-border))' }}
        >
          <button
            onClick={onToggle}
            className="flex items-center justify-center rounded-lg w-full"
            style={{
              height: '36px',
              background: 'hsl(var(--background-muted))',
              color: 'hsl(var(--foreground-muted))',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 150ms ease',
            }}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : (
              <span className="flex items-center gap-2 text-xs font-medium">
                <ChevronLeft size={14} />
                Collapse
              </span>
            )}
          </button>
        </div>
      </aside>
    </>
  )
}
