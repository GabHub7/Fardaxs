import { NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/supabase/server'

/**
 * Soft-deletes (deactivates) the current account: flips status to INACTIVE.
 * The caller is expected to sign the user out afterwards. We avoid a hard
 * auth delete so the action is auditable and reversible by an admin.
 */
export async function POST() {
  const session = await getCurrentUserProfile()
  if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { error } = await session.serviceClient
    .from('users')
    .update({ status: 'INACTIVE' })
    .eq('id', session.profile.id)

  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 })

  await session.serviceClient.from('audit_logs').insert({
    action: 'ACCOUNT_DEACTIVATED',
    resource_type: 'user',
    resource_id: session.profile.id,
    new_data: { self_service: true },
  })

  return NextResponse.json({ success: true, message: 'Akun dinonaktifkan.' })
}
