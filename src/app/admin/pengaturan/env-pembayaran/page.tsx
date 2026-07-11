import { requireAdmin } from '@/lib/auth-guard'
import { listEnvVarsForAdmin } from '@/lib/env-vars'
import { isVercelSyncConfigured } from '@/lib/vercel-sync'
import { redirect } from 'next/navigation'
import { EnvVarsClient } from './env-vars-client'

export const dynamic = 'force-dynamic'

export default async function EnvPembayaranPage() {
  const auth = await requireAdmin()
  if (!auth) redirect('/login')

  const items = await listEnvVarsForAdmin(auth.serviceClient)
  const vercelConfigured = isVercelSyncConfigured()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  return <EnvVarsClient initialItems={items} vercelConfigured={vercelConfigured} appUrl={appUrl} />
}
