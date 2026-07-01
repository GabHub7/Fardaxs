import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/**
 * Session-bound client — respects the logged-in user's cookies and RLS policies.
 * Use this for anything that should be scoped to "the current user".
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component cannot set cookies — middleware handles this
          }
        },
      },
    }
  )
}

/**
 * Service-role client — bypasses RLS using the service role key.
 * Deliberately NOT bound to request cookies: it doesn't represent a user
 * session, so it must keep working in contexts with no cookie jar at all
 * (cron jobs, webhooks, background tasks) and must never accidentally
 * read/write auth cookies.
 */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

export type SupabaseServiceClient = ReturnType<typeof createServiceClient>

export interface StoreUserProfile {
  id: string
  authId: string
  email: string
  fullName: string | null
  phone: string | null
  avatarUrl: string | null
  createdAt: string
  membershipTier: {
    name: string
    slug: string
    badgeColor: string
    cashbackPercent: number
  } | null
}

/**
 * Fetches the logged-in user's internal profile (not the raw Supabase Auth
 * user) for use in storefront pages — includes membership tier.
 * Returns null if not authenticated; callers decide whether to redirect.
 */
export async function getCurrentUserProfile(): Promise<{
  authUser: { id: string; email?: string }
  profile: StoreUserProfile
  serviceClient: SupabaseServiceClient
} | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const serviceClient = createServiceClient()

  const { data: row } = await serviceClient
    .from('users')
    .select(
      'id, auth_id, email, full_name, phone, avatar_url, created_at, membership_tiers(name, slug, badge_color, cashback_percent)'
    )
    .eq('auth_id', user.id)
    .single()

  if (!row) return null

  const tierRelation = row.membership_tiers
  const tier = Array.isArray(tierRelation) ? tierRelation[0] : tierRelation

  return {
    authUser: { id: user.id, email: user.email ?? undefined },
    serviceClient,
    profile: {
      id: row.id as string,
      authId: row.auth_id as string,
      email: row.email as string,
      fullName: (row.full_name as string | null) ?? null,
      phone: (row.phone as string | null) ?? null,
      avatarUrl: (row.avatar_url as string | null) ?? null,
      createdAt: row.created_at as string,
      membershipTier: tier
        ? {
            name: (tier as { name: string }).name,
            slug: (tier as { slug: string }).slug,
            badgeColor: (tier as { badge_color: string }).badge_color,
            cashbackPercent: (tier as { cashback_percent: number }).cashback_percent,
          }
        : null,
    },
  }
}

/**
 * Fetches (and lazily creates) a user's wallet balance.
 * Uses the service client so it works regardless of RLS timing.
 */
export async function getWalletBalance(
  serviceClient: SupabaseServiceClient,
  userId: string
): Promise<number> {
  const { data } = await serviceClient
    .from('wallets')
    .select('balance')
    .eq('user_id', userId)
    .maybeSingle()

  return data?.balance ?? 0
}
