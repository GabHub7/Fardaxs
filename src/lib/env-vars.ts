import { createServiceClient, type SupabaseServiceClient } from '@/lib/supabase/server'
import { encrypt, decrypt } from '@/lib/encryption'

// ============================================================
// Why this file exists
// ------------------------------------------------------------
// lib/providers/casaku.ts and lib/providers/okeconnect.ts used to read
// credentials straight off `process.env` at module load time. That means
// changing a value in the admin panel — even if it gets saved correctly to
// Supabase — would never actually take effect, because the running Node
// process keeps its original `process.env` snapshot until Vercel rebuilds
// and restarts it.
//
// This module makes Supabase the actual source of truth read at request
// time: callers ask `getEnvVar('CASAKU_BASE_URL')` and get the latest saved
// value, decrypted, with `process.env` used only as a fallback for keys
// the admin hasn't configured yet (so a fresh deploy with real Vercel env
// vars but an empty payment_env_vars table still works).
// ============================================================

export const KNOWN_ENV_KEYS = [
  'CASAKU_BASE_URL',
  'CASAKU_LICENSE_KEY',
  'CASAKU_QR_ID',
  'CASAKU_WEBHOOK_SECRET',
  'OKECONNECT_API_URL',
  'OKECONNECT_MEMBER_ID',
  'OKECONNECT_PIN',
  'OKECONNECT_PASSWORD',
  'OKECONNECT_PROXY_URL',
  'OKECONNECT_PROXY_SECRET',
] as const

export type KnownEnvKey = (typeof KNOWN_ENV_KEYS)[number]

interface EnvVarRow {
  key: string
  value_encrypted: string | null
  is_secret: boolean
  provider_group: string
  description: string | null
  vercel_synced_at: string | null
  vercel_sync_error: string | null
  updated_at: string
}

// Per-request cache: a single request handler may ask for several keys of
// the same provider (e.g. casaku.ts reads API_URL, MERCHANT_ID, SECRET_KEY
// back to back) — no reason to hit Supabase 3 times for that.
let cache: Map<string, string | null> | null = null
let cacheLoadedAt = 0
const CACHE_TTL_MS = 5_000 // short TTL: long enough to dedupe one request's calls, short enough that a save in another request/instance is picked up almost immediately

async function loadAllFromDb(client: SupabaseServiceClient): Promise<Map<string, string | null>> {
  const { data, error } = await client
    .from('payment_env_vars')
    .select('key, value_encrypted')

  const map = new Map<string, string | null>()
  if (error || !data) return map

  for (const row of data as Pick<EnvVarRow, 'key' | 'value_encrypted'>[]) {
    if (!row.value_encrypted) {
      map.set(row.key, null)
      continue
    }
    try {
      map.set(row.key, decrypt(row.value_encrypted))
    } catch {
      // Corrupt ciphertext (e.g. ENCRYPTION_KEY rotated without re-saving
      // values) — treat as unset rather than crashing the caller.
      map.set(row.key, null)
    }
  }
  return map
}

/**
 * Resolves a single env var: Supabase value (if configured) wins, otherwise
 * falls back to process.env. Safe to call from anywhere on the server,
 * including provider adapters and webhook handlers.
 */
export async function getEnvVar(key: KnownEnvKey): Promise<string> {
  const now = Date.now()
  if (!cache || now - cacheLoadedAt > CACHE_TTL_MS) {
    const client = createServiceClient()
    cache = await loadAllFromDb(client)
    cacheLoadedAt = now
  }

  const dbValue = cache.get(key)
  if (dbValue) return dbValue

  return process.env[key] ?? ''
}

/**
 * Resolves several keys at once (one Supabase round trip instead of N).
 * Provider adapters should prefer this over calling getEnvVar() in a loop.
 */
export async function getEnvVars<K extends KnownEnvKey>(keys: readonly K[]): Promise<Record<K, string>> {
  const now = Date.now()
  if (!cache || now - cacheLoadedAt > CACHE_TTL_MS) {
    const client = createServiceClient()
    cache = await loadAllFromDb(client)
    cacheLoadedAt = now
  }

  const result = {} as Record<K, string>
  for (const key of keys) {
    result[key] = cache.get(key) || process.env[key] || ''
  }
  return result
}

/** Forces the next getEnvVar/getEnvVars call to re-read from Supabase. Call this right after saving new values. */
export function invalidateEnvVarCache(): void {
  cache = null
}

export interface AdminEnvVarView {
  key: string
  providerGroup: string
  description: string | null
  isSecret: boolean
  hasValue: boolean
  /** masked preview, e.g. "••••cd92" — never the real secret */
  maskedValue: string | null
  /** full plaintext value — only included for non-secret keys like *_API_URL, so the admin can read/copy URLs without an extra reveal step */
  plainValue: string | null
  vercelSyncedAt: string | null
  vercelSyncError: string | null
  updatedAt: string
}

/**
 * Returns everything the admin settings page needs to render the env var
 * list — values are masked, never sent to the client in full, except for
 * non-secret fields (URLs) which are safe to show directly.
 */
export async function listEnvVarsForAdmin(client: SupabaseServiceClient): Promise<AdminEnvVarView[]> {
  const { data, error } = await client
    .from('payment_env_vars')
    .select('*')
    .order('provider_group', { ascending: true })
    .order('key', { ascending: true })

  if (error || !data) return []

  return (data as EnvVarRow[]).map((row) => {
    let plaintext: string | null = null
    if (row.value_encrypted) {
      try {
        plaintext = decrypt(row.value_encrypted)
      } catch {
        plaintext = null
      }
    }
    // Fall back to process.env so a key that's only set via Vercel (and
    // never saved through this panel) still shows as "configured".
    const effective = plaintext ?? process.env[row.key] ?? null

    return {
      key: row.key,
      providerGroup: row.provider_group,
      description: row.description,
      isSecret: row.is_secret,
      hasValue: !!effective,
      maskedValue: effective ? maskSecret(effective) : null,
      plainValue: !row.is_secret ? effective : null,
      vercelSyncedAt: row.vercel_synced_at,
      vercelSyncError: row.vercel_sync_error,
      updatedAt: row.updated_at,
    }
  })
}

function maskSecret(value: string): string {
  if (value.length <= 4) return '••••'
  return `••••${value.slice(-4)}`
}

/** Encrypts and upserts a single env var value into Supabase. Pass `null`/`''` to clear it. */
export async function setEnvVar(
  client: SupabaseServiceClient,
  key: KnownEnvKey,
  value: string,
  updatedBy?: string
): Promise<void> {
  const value_encrypted = value ? encrypt(value) : null
  await client
    .from('payment_env_vars')
    .update({
      value_encrypted,
      updated_by: updatedBy ?? null,
      vercel_sync_error: null, // clear stale error; a fresh sync attempt follows
    })
    .eq('key', key)
}

export function recordVercelSyncResult(
  client: SupabaseServiceClient,
  key: string,
  result: { ok: true } | { ok: false; error: string }
) {
  if (result.ok) {
    return client
      .from('payment_env_vars')
      .update({ vercel_synced_at: new Date().toISOString(), vercel_sync_error: null })
      .eq('key', key)
  }
  return client
    .from('payment_env_vars')
    .update({ vercel_sync_error: result.error })
    .eq('key', key)
}
