import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AkunNav } from './akun-nav'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | Akun — Fardax Store',
    default: 'Akun Saya | Fardax Store',
  },
}

export default async function AkunLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/akun')
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <AkunNav />
      <div className="mt-6">{children}</div>
    </div>
  )
}
