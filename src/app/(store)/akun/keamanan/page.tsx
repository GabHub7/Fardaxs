import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Fingerprint } from 'lucide-react'
import { getCurrentUserProfile } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Keamanan Akun' }
export const dynamic = 'force-dynamic'

export default async function Page() {
  const session = await getCurrentUserProfile()
  if (!session) redirect('/login?redirect=/akun')

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <header className="sticky top-0 z-40 px-4 py-4 flex items-center gap-3"
        style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/akun" className="flex items-center justify-center w-10 h-10 rounded-full"
          style={{ background: 'var(--bg-tertiary)' }}>
          <ArrowLeft size={18} style={{ color: 'var(--text-primary)' }} />
        </Link>
        <h1 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Keamanan Akun</h1>
      </header>
      <div className="flex flex-col items-center justify-center py-24 gap-4 px-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: 'var(--bg-tertiary)' }}>
          <Fingerprint size={28} style={{ color: 'var(--text-muted)' }} />
        </div>
        <p className="text-sm font-semibold text-center" style={{ color: 'var(--text-primary)' }}>Keamanan Akun</p>
        <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>Atur keamanan dan privasi akunmu.</p>
      </div>
    </div>
  )
}
