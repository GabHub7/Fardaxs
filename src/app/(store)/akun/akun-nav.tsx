'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ShoppingBag, User, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  exact?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Beranda', href: '/akun', icon: Home, exact: true },
  { label: 'Pesanan', href: '/akun/pesanan', icon: ShoppingBag },
  { label: 'Profil', href: '/akun/profil', icon: User },
  { label: 'Pengaturan', href: '/akun/pengaturan', icon: Settings },
]

export function AkunNav() {
  const pathname = usePathname()

  const isActive = (item: NavItem) => {
    if (item.exact) return pathname === item.href
    return pathname.startsWith(item.href)
  }

  return (
    <nav
      className="rounded-[20px] border p-1.5 flex gap-1 overflow-x-auto scrollbar-none md:inline-flex"
      style={{
        background: 'hsl(var(--background-card))',
        borderColor: 'hsl(var(--border))',
      }}
      aria-label="Navigasi akun"
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(item)
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-[14px] text-sm font-medium',
              'transition-all duration-150 whitespace-nowrap shrink-0',
            )}
            style={
              active
                ? {
                    background: 'hsl(var(--primary))',
                    color: 'hsl(var(--primary-foreground))',
                  }
                : {
                    color: 'hsl(var(--foreground-muted))',
                  }
            }
            onMouseEnter={(e) => {
              if (!active) {
                e.currentTarget.style.background = 'hsl(var(--background-muted))'
                e.currentTarget.style.color = 'hsl(var(--foreground))'
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.currentTarget.style.background = ''
                e.currentTarget.style.color = 'hsl(var(--foreground-muted))'
              }
            }}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={16} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
