-- ============================================================
-- 014_verification_modes.sql
-- Extends the single EMAIL/WA_OTP verification toggle (013) into
-- 3 selectable login/verification modes for new users, controllable
-- from the admin panel (Pengaturan → Sistem):
--
--   'NONE'           -> No verification at all. User can log in
--                        right after registering.
--   'EMAIL'          -> Must verify via email OTP before logging in.
--                        (unchanged from 013)
--   'WA_OTP'         -> Must verify via WhatsApp Bot OTP before
--                        logging in. (unchanged from 013)
--   'EMAIL_AND_OTP'  -> Two-step: must verify email OTP, THEN
--                        WhatsApp OTP, before the account is
--                        considered fully verified.
--
-- `users.email_verified` stays the single canonical "is this account
-- fully allowed to log in / checkout" flag used everywhere else in
-- the app (checkout gating, admin user list, etc). For the two-step
-- EMAIL_AND_OTP mode we track each step separately in
-- `email_step_verified` / `otp_step_verified`, and only flip the
-- canonical `email_verified` once BOTH steps are done. Single-step
-- modes (EMAIL, WA_OTP, NONE) keep working exactly as before and
-- simply don't use these two columns.
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_step_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS otp_step_verified   BOOLEAN NOT NULL DEFAULT FALSE;

-- No CHECK constraint on site_settings.value (it's JSONB / free-form),
-- so the allowed-values enforcement for 'verification_method' lives in
-- application code (src/app/api/admin/settings/route.ts). This comment
-- documents the contract:
--   'NONE' | 'EMAIL' | 'WA_OTP' | 'EMAIL_AND_OTP'
COMMENT ON TABLE site_settings IS
  'Key-value site configuration. verification_method accepts: "NONE" | "EMAIL" | "WA_OTP" | "EMAIL_AND_OTP".';

-- Make sure the setting exists with a safe default (won't override an
-- admin's existing choice from migration 013).
INSERT INTO site_settings (key, value) VALUES
  ('verification_method', '"EMAIL"')
ON CONFLICT (key) DO NOTHING;
