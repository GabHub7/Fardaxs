import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { MOCK } from '@/lib/mockup-colors'
import { getCurrentUserProfile } from '@/lib/supabase/server'
import { AddressManager, type Address } from './address-manager'

export const metadata: Metadata = { title: 'Daftar Alamat' }
export const dynamic = 'force-dynamic'

export default async function AlamatPage() {
  const session = await getCurrentUserProfile()
  if (!session) redirect('/login?redirect=/akun/alamat')

  const { data } = await session.serviceClient
    .from('user_addresses')
    .select('id, label, recipient_name, phone, full_address, city, postal_code, notes, is_default')
    .eq('user_id', session.profile.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen" style={{ background: MOCK.bg }}>
      <header
        className="sticky top-0 z-40 px-4 py-4 flex items-center gap-3"
        style={{ background: MOCK.bg, borderBottom: `1px solid ${MOCK.borderSubtle}` }}
      >
        <Link
          href="/akun"
          className="flex items-center justify-center w-10 h-10 rounded-full press-effect hover-fade"
          style={{ background: MOCK.bgCard }}
        >
          <ArrowLeft size={18} style={{ color: MOCK.foreground }} />
        </Link>
        <h1 className="text-base font-bold" style={{ color: MOCK.foreground }}>Daftar Alamat</h1>
      </header>

      <AddressManager initial={(data ?? []) as Address[]} />
    </div>
  )
}
