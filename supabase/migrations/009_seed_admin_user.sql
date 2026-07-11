-- ============================================================
-- 009_seed_admin_user.sql
-- Seeds a SUPER_ADMIN test account for the panel:
--   email    : fardaxstore@gmail.com
--   password : farz1704
--
-- Creates the Supabase Auth user, its email identity, and the linked
-- public.users profile with the SUPER_ADMIN role. Idempotent — running it
-- again just resets the password and re-confirms the account.
--
-- Run in the Supabase SQL Editor (it needs access to the `auth` schema).
-- ============================================================

DO $$
DECLARE
  v_email    TEXT := 'fardaxstore@gmail.com';
  v_password TEXT := 'farz1704';
  v_role_id  UUID := '00000000-0000-0000-0000-000000000004'; -- SUPER_ADMIN (from 003_seed_data)
  v_user_id  UUID;
BEGIN
  -- 1) Auth user -------------------------------------------------------------
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id, 'authenticated', 'authenticated', v_email,
      crypt(v_password, gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Fardax Admin"}',
      NOW(), NOW(),
      '', '', '', ''
    );
  ELSE
    -- Already exists: reset password + ensure confirmed
    UPDATE auth.users
    SET encrypted_password = crypt(v_password, gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        updated_at = NOW()
    WHERE id = v_user_id;
  END IF;

  -- 2) Auth identity (email provider) ---------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM auth.identities WHERE user_id = v_user_id AND provider = 'email'
  ) THEN
    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_user_id, v_user_id::text,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
      'email', NOW(), NOW(), NOW()
    );
  END IF;

  -- 3) Public profile with SUPER_ADMIN role ---------------------------------
  INSERT INTO public.users (
    auth_id, email, username, full_name, role_id, email_verified, status
  ) VALUES (
    v_user_id, v_email, 'fardaxadmin', 'Fardax Admin', v_role_id, TRUE, 'ACTIVE'
  )
  ON CONFLICT (email) DO UPDATE
    SET auth_id        = EXCLUDED.auth_id,
        role_id        = EXCLUDED.role_id,
        status         = 'ACTIVE',
        email_verified = TRUE,
        updated_at     = NOW();

  RAISE NOTICE 'Admin seeded: % (auth id %)', v_email, v_user_id;
END $$;
