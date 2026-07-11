-- ============================================================
-- 018_fix_roles_rls_admin_bug.sql
-- Admin access intermittently disappeared after deploys because the
-- `roles` table's read policy was being managed by hand in the Supabase
-- dashboard instead of in a migration — every deploy that reset the
-- dashboard-only policy (or a project the admin manually enabled RLS on)
-- left `roles` with RLS on and no SELECT policy, so lookups like
-- `users.select('roles(name)')` from the client came back empty and
-- get_user_role()/is_admin() (used throughout 002_rls_policies.sql) had
-- nothing to resolve, making admins look like they'd lost their role.
--
-- Making the policy part of the migration history means it's re-applied
-- every time migrations run, so it can no longer be silently dropped by a
-- dashboard change or a push that doesn't carry it forward.
-- ============================================================

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "roles_public_read" ON public.roles;
CREATE POLICY "roles_public_read" ON public.roles FOR SELECT USING (true);

-- Paksa PostgREST reload schema cache-nya sekarang juga, supaya policy di
-- atas langsung berlaku tanpa perlu nunggu restart/deploy berikutnya.
NOTIFY pgrst, 'reload schema';
