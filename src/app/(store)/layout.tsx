import type { Metadata } from 'next'
import { BottomNav } from '@/components/store/bottom-nav'
import { PageTransition } from '@/components/store/page-transition'

export const metadata: Metadata = {
  title: {
    template: '%s | Fardax Store',
    default: 'Fardax Store — Toko Digital Terpercaya',
  },
  description:
    'Fardax Store menyediakan layanan PPOB, Premium Apps, dan Social Media Services dengan harga terbaik.',
}

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <main className="flex-1 pb-[calc(60px+env(safe-area-inset-bottom))] md:pb-0">
        <PageTransition>{children}</PageTransition>
      </main>

      <BottomNav />
    </div>
  )
}
