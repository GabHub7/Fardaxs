import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { sanitizeSearchTerm } from '@/lib/utils'
import type { ApiResponse, PaginatedResponse } from '@/types'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })
  }
  const { serviceClient } = auth

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '25'))
  const offset = (page - 1) * limit
  const role = searchParams.get('role') ?? ''
  const status = searchParams.get('status') ?? ''
  const search = searchParams.get('q') ?? ''

  let query = serviceClient
    .from('users')
    .select('id, email, full_name, phone, status, email_verified, created_at, roles(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // Filtering by role name requires going through the `roles` relation since
  // `users` only stores `role_id` — Supabase lets us filter on the embedded
  // relation's column directly.
  if (role) query = query.eq('roles.name', role)
  if (status) query = query.eq('status', status)
  if (search) {
    const safeSearch = sanitizeSearchTerm(search)
    if (safeSearch) query = query.or(`email.ilike.%${safeSearch}%,full_name.ilike.%${safeSearch}%`)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json<ApiResponse>({ success: false, message: error.message }, { status: 500 })
  }

  // Flatten roles(name) -> role for a simpler API shape for the admin UI
  const rows = (data ?? []).map((row) => {
    const r = row as Record<string, unknown>
    const rolesRelation = r.roles
    const roleRecord = Array.isArray(rolesRelation) ? rolesRelation[0] : rolesRelation
    const roleName = (roleRecord as { name?: string } | null | undefined)?.name ?? null
    const { roles: _roles, ...rest } = r
    return { ...rest, role: roleName }
  })

  const total = count ?? 0
  return NextResponse.json<PaginatedResponse<unknown>>({
    success: true,
    message: 'OK',
    data: rows,
    meta: { page, limit, total, total_pages: Math.ceil(total / limit) },
  })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })
  }
  const { serviceClient } = auth

  const body = await request.json() as { id: string; role?: string; status?: string }

  if (!body.id) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'id wajib diisi' }, { status: 400 })
  }

  const allowedRoles = ['MEMBER', 'RESELLER', 'ADMIN']
  const allowedStatuses = ['ACTIVE', 'INACTIVE', 'BANNED', 'SUSPENDED']

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  // The `users` table has no `role` column — roles are stored via `role_id`
  // pointing at the `roles` table, so we resolve the name to an id first.
  if (body.role && allowedRoles.includes(body.role)) {
    const { data: roleRow, error: roleError } = await serviceClient
      .from('roles')
      .select('id')
      .eq('name', body.role)
      .single()

    if (roleError || !roleRow) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: `Role "${body.role}" tidak ditemukan` },
        { status: 400 }
      )
    }
    updates.role_id = roleRow.id
  }

  if (body.status && allowedStatuses.includes(body.status)) updates.status = body.status

  const { error } = await serviceClient.from('users').update(updates).eq('id', body.id)

  if (error) {
    return NextResponse.json<ApiResponse>({ success: false, message: error.message }, { status: 500 })
  }

  await serviceClient.from('audit_logs').insert({
    user_id: auth.profileId,
    action: 'USER_UPDATED',
    resource_type: 'user',
    resource_id: body.id,
    new_data: updates,
  })

  return NextResponse.json<ApiResponse>({ success: true, message: 'Pengguna berhasil diperbarui' })
}
