import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import {
  KNOWN_ENV_KEYS,
  type KnownEnvKey,
  listEnvVarsForAdmin,
  setEnvVar,
  invalidateEnvVarCache,
  recordVercelSyncResult,
} from '@/lib/env-vars'
import { syncEnvVarToVercel, isVercelSyncConfigured } from '@/lib/vercel-sync'
import type { ApiResponse } from '@/types'

// GET — list all known payment env vars with masked values for the admin
// settings UI. Never returns full secret values; non-secret fields (URLs)
// are returned in full since they aren't sensitive.
export async function GET() {
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })

  const items = await listEnvVarsForAdmin(auth.serviceClient)
  return NextResponse.json({
    success: true,
    data: items,
    vercelConfigured: isVercelSyncConfigured(),
  })
}

const isKnownKey = (key: string): key is KnownEnvKey => (KNOWN_ENV_KEYS as readonly string[]).includes(key)

// POST — saves one or more env var values: encrypts + upserts into
// Supabase (always succeeds if the table write succeeds), then
// best-effort pushes the same value to Vercel's Environment Variables API
// so `vercel env ls` / the dashboard stay in sync too. A Vercel sync
// failure does NOT fail the request — Supabase is what the app actually
// reads at runtime (see lib/env-vars.ts), so payments keep working
// immediately either way; the response just reports the sync status per
// key so the admin can see if Vercel needs attention.
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Payload tidak valid.' }, { status: 400 })
  }

  const entries = Object.entries(body).filter(([key]) => isKnownKey(key)) as [KnownEnvKey, string][]
  if (entries.length === 0) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Tidak ada env var yang valid untuk disimpan.' }, { status: 400 })
  }

  const vercelConfigured = isVercelSyncConfigured()
  const results: Record<string, { saved: true; vercelSynced: boolean; vercelError?: string }> = {}

  for (const [key, rawValue] of entries) {
    const value = typeof rawValue === 'string' ? rawValue.trim() : ''

    await setEnvVar(auth.serviceClient, key, value, auth.profileId)

    if (vercelConfigured && value) {
      const syncResult = await syncEnvVarToVercel(key, value)
      await recordVercelSyncResult(auth.serviceClient, key, syncResult.ok ? { ok: true } : { ok: false, error: syncResult.error ?? 'Unknown error' })
      results[key] = { saved: true, vercelSynced: syncResult.ok, vercelError: syncResult.ok ? undefined : syncResult.error }
    } else {
      results[key] = { saved: true, vercelSynced: false, vercelError: vercelConfigured ? undefined : 'Vercel API belum dikonfigurasi (VERCEL_API_TOKEN / VERCEL_PROJECT_ID).' }
    }
  }

  invalidateEnvVarCache()

  await auth.serviceClient.from('audit_logs').insert({
    action: 'PAYMENT_ENV_VARS_UPDATED',
    resource_type: 'payment_env_vars',
    resource_id: entries.map(([k]) => k).join(','),
    new_data: { keys: entries.map(([k]) => k), updated_by: auth.user.id },
  })

  return NextResponse.json({
    success: true,
    message: 'Env var berhasil disimpan.',
    results,
  })
}
