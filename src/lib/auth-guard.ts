import { createClient, createServiceClient, type SupabaseServiceClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

export interface AdminAuthContext {
  user: User
  serviceClient: SupabaseServiceClient
  /** Internal users.id (NOT the Supabase auth id) — use this for foreign keys like audit_logs.user_id */
  profileId: string
  roleName: string
}

/**
 * Verifies that the current request comes from a logged-in user whose role
 * is ADMIN or SUPER_ADMIN, and returns everything a route handler needs to
 * proceed. Returns null if the user is not authenticated or not an admin —
 * callers should respond with 401/403 in that case.
 *
 * Centralizing this avoids the two ways earlier code got it wrong:
 *  - querying `users.id` with the Supabase auth id instead of `users.auth_id`
 *  - selecting a `role` column that doesn't exist (the schema only has
 *    `role_id` + a `roles` relation, which Supabase returns as an array)
 */
export async function requireAdmin(): Promise<AdminAuthContext | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const serviceClient = createServiceClient()

  const { data: profile } = await serviceClient
    .from('users')
    .select('id, role_id, roles(name)')
    .eq('auth_id', user.id)
    .single()

  if (!profile) return null

  const rolesRelation = profile.roles
  const roleRecord = Array.isArray(rolesRelation) ? rolesRelation[0] : rolesRelation
  const roleName = (roleRecord as { name?: string } | null | undefined)?.name

  if (!roleName || !['ADMIN', 'SUPER_ADMIN'].includes(roleName)) {
    return null
  }

  return { user, serviceClient, profileId: profile.id as string, roleName }
}
