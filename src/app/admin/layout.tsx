'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { AdminSidebar } from '@/components/admin/sidebar'
import { AdminTopbar } from '@/components/admin/topbar'
import { usePathname } from 'next/navigation'

// ─── Page title map ───────────────────────────────────────────────────────────

const PAGE_TITLES: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/pesanan': 'Pesanan',
  '/admin/produk': 'Produk',
  '/admin/kategori': 'Kategori',
  '/admin/provider': 'Provider',
  '/admin/pembayaran': 'Pembayaran',
  '/admin/reseller': 'Refund & Reseller',
  '/admin/inventory': 'Inventory',
  '/admin/cms': 'CMS',
  '/admin/whatsapp': 'WhatsApp',
  '/admin/pengguna': 'Pengguna',
  '/admin/analitik': 'Analitik',
  '/admin/laporan': 'Laporan',
  '/admin/pengaturan': 'Pengaturan',
  '/admin/audit': 'Audit Log',
  '/admin/notifikasi': 'Notifikasi',
  '/admin/sistem': 'Sistem',
}

function getPageTitle(pathname: string): string {
  // Exact match first
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  // Prefix match for nested routes
  for (const [key, title] of Object.entries(PAGE_TITLES)) {
    if (key !== '/admin' && pathname.startsWith(key)) return title
  }
  return 'Admin'
}

// ─── Admin Layout ─────────────────────────────────────────────────────────────

interface AdminUser {
  name: string
  email: string
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [checking, setChecking] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // Basic client-side guard (middleware is the real guard)
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    async function checkAuth() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.replace('/login')
          return
        }

        // Fetch role from users table
        const { data: profile } = await supabase
          .from('users')
          .select('full_name, email, role:roles(name)')
          .eq('auth_id', user.id)
          .single()

        // Supabase returns the joined relation as an array unless the FK is
        // declared 1:1 — normalize both shapes here (see src/lib/auth-guard.ts).
        const roleRelation = profile?.role
        const roleRecord = Array.isArray(roleRelation) ? roleRelation[0] : roleRelation
        const roleName = (roleRecord as { name?: string } | null | undefined)?.name ?? null

        if (roleName !== 'ADMIN' && roleName !== 'SUPER_ADMIN') {
          router.replace('/')
          return
        }

        setAdminUser({
          name: profile?.full_name ?? user.email?.split('@')[0] ?? 'Admin',
          email: profile?.email ?? user.email ?? '',
        })
      } catch {
        router.replace('/login')
      } finally {
        setChecking(false)
      }
    }

    checkAuth()
  }, [router])

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const handleToggleCollapse = useCallback(() => setCollapsed((v) => !v), [])
  const handleMobileToggle = useCallback(() => setMobileOpen((v) => !v), [])
  const handleMobileClose = useCallback(() => setMobileOpen(false), [])

  const sidebarWidth = collapsed ? 64 : 240

  if (checking) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ background: 'hsl(var(--background))' }}
      >
        <div className="flex flex-col items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="FardaxStore" width={48} height={48} className="animate-pulse" />
          <p style={{ color: 'hsl(var(--foreground-muted))', fontSize: '14px' }}>
            Memuat...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="app-shell-height flex overflow-hidden"
      style={{ background: 'hsl(var(--background))' }}
    >
      {/* Sidebar */}
      <AdminSidebar
        collapsed={collapsed}
        onToggle={handleToggleCollapse}
        mobileOpen={mobileOpen}
        onMobileClose={handleMobileClose}
      />

      {/* Main content area — offset by sidebar width on desktop */}
      <div
        className="flex flex-col flex-1 min-w-0 overflow-hidden"
        style={{
          marginLeft: 0,
          transition: 'margin-left 280ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Desktop: push content right of sidebar */}
        <style>{`
          @media (min-width: 1024px) {
            .admin-main-area {
              margin-left: ${sidebarWidth}px;
              transition: margin-left 280ms cubic-bezier(0.4, 0, 0.2, 1);
            }
          }
        `}</style>

        <div className="admin-main-area flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Top Bar */}
          <AdminTopbar
            pageTitle={getPageTitle(pathname)}
            onMobileMenuToggle={handleMobileToggle}
            adminName={adminUser?.name}
            adminEmail={adminUser?.email}
            notificationCount={0}
          />

          {/* Page Content */}
          <main
            className="flex-1 overflow-y-auto"
            style={{ background: 'hsl(var(--background))' }}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
