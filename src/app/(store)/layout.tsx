import type { Metadata } from 'next'
import { BottomNav } from '@/components/store/bottom-nav'
import { DesktopSidebar } from '@/components/store/desktop-sidebar'
import { PageTransition } from '@/components/store/page-transition'
import { TopNavbar, type TopNavbarProfile } from '@/components/store/topbar'
import { getCurrentUserProfile } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: {
    template: '%s | Fardax Store',
    default: 'Fardax Store — Toko Digital Terpercaya',
  },
  description:
    'Fardax Store menyediakan layanan PPOB, Premium Apps, dan Social Media Services dengan harga terbaik.',
}

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let unreadCount = 0
  let navProfile: TopNavbarProfile | null = null

  // The navbar's profile/avatar/notification-badge data is "nice to have"
  // personalization, not something the page's core functionality depends
  // on — so a failure here (RLS hiccup, transient network issue, etc.)
  // must never take down the whole route. This matters a lot on pages
  // like /pembayaran and /pesanan, where an unhandled throw here used to
  // surface as "This page couldn't load" on top of an otherwise-working
  // checkout/order flow.
  try {
    const session = await getCurrentUserProfile()

    if (session) {
      const { count } = await session.serviceClient
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.profile.id)
        .neq('status', 'READ')
      unreadCount = count ?? 0

      navProfile = {
        fullName: session.profile.fullName,
        avatarUrl: session.profile.avatarUrl,
        tierName: session.profile.membershipTier?.name ?? 'Bronze',
        memberId: `FDX${session.profile.id.slice(0, 5).toUpperCase()}`,
      }
    }
  } catch (error) {
    console.error('[StoreLayout] Gagal memuat data navbar (profil/notifikasi):', error)
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <DesktopSidebar />

      {/* Persistent top navbar — fixed alongside the sidebar (starts at
          left-60, right at the viewport edge) and matches the sidebar's
          64px logo-row height, so the two borders line up into one
          continuous strip instead of the old per-page header that only
          spanned the inner content column and left a visible gap. */}
      <TopNavbar profile={navProfile} unreadCount={unreadCount} />

      {/* md:pl-60 makes room for the fixed sidebar; md:pt-16 makes room for
          the fixed top navbar. The inner max-width keeps content from
          stretching edge-to-edge on wide screens (the store UI is built
          mobile-first — without this, cards/grids meant for a 360px
          viewport blow up to fill a 1440px one). Mobile (below md) is
          untouched. */}
      <main className="flex-1 pb-[calc(60px+env(safe-area-inset-bottom))] md:pb-0 md:pl-60 md:pt-16">
        <div className="md:max-w-4xl md:mx-auto">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
